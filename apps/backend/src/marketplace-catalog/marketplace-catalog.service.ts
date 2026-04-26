import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CatalogQueryDto, CatalogSort } from './dto/catalog-query.dto';
import { SellersQueryDto, SellersSort } from './dto/sellers-query.dto';
import {
  MarketplaceDocumentVisibility,
  MarketplacePublicationStatus,
  MarketplacePriceMode,
  MarketplaceRelatedEntityType,
  MarketplaceVerificationStatus,
  MarketplaceVisibilityScope,
  MediaAssetRole,
  MediaModerationStatus,
  SellerProfileStatus,
} from '@iox/shared';
import type { Prisma } from '@prisma/client';

/**
 * Service public de consultation du catalogue marketplace.
 *
 * Règles de visibilité publique (toutes appliquées simultanément) :
 *  - MarketplaceOffer.publicationStatus = PUBLISHED
 *  - MarketplaceOffer.visibilityScope ≠ PRIVATE
 *  - MarketplaceProduct.publicationStatus ∈ {APPROVED, PUBLISHED}
 *  - SellerProfile.status = APPROVED
 *  - Au moins un MediaAsset PRIMARY APPROVED sur le produit marketplace
 *
 * Les médias galerie exposés sont uniquement APPROVED.
 * Les documents exposés sont uniquement visibility=PUBLIC + verificationStatus=VERIFIED,
 * non expirés (validUntil null ou futur).
 *
 * Stratégie multi-offres sur un même produit :
 *  - Listing catalogue = offer-centric (une carte par offre)
 *  - Fiche produit = renvoie toutes les offres publiables, la première
 *    (featuredRank asc, publishedAt desc) porte `isPrimaryOffer: true`
 *
 * Le MediaAsset étant polymorphique (pas de back-relation Prisma sur
 * MarketplaceProduct/SellerProfile), on résout la gate « image PRIMARY
 * APPROVED » via une pré-requête qui collecte les IDs de produits éligibles,
 * puis applique un filtre `marketplaceProductId: { in: [...] }` sur les offres.
 */
@Injectable()
export class MarketplaceCatalogService {
  constructor(private prisma: PrismaService) {}

  // ─── Catalogue ────────────────────────────────────────────────────────────

  async findCatalog(query: CatalogQueryDto) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const skip = (page - 1) * limit;

    const eligibleProductIds = await this.findProductsWithPrimaryMedia();
    if (eligibleProductIds.length === 0) {
      return {
        data: [],
        meta: { total: 0, page, limit, totalPages: 0 },
        facets: { readiness: [], priceMode: [] },
      };
    }

    const where = this.buildCatalogWhere(query, eligibleProductIds);
    const orderBy = this.buildOrderBy(query.sort);

    const [offers, total] = await this.prisma.$transaction([
      this.prisma.marketplaceOffer.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          marketplaceProduct: {
            select: {
              id: true,
              slug: true,
              commercialName: true,
              regulatoryName: true,
              subtitle: true,
              originCountry: true,
              originRegion: true,
              // FP-6 — origine fine projetée publiquement.
              originLocality: true,
              altitudeMeters: true,
              gpsLat: true,
              gpsLng: true,
              varietySpecies: true,
              productionMethod: true,
              packagingDescription: true,
              defaultUnit: true,
              minimumOrderQuantity: true,
              category: { select: { id: true, slug: true, nameFr: true, nameEn: true } },
            },
          },
          sellerProfile: {
            select: {
              id: true,
              slug: true,
              publicDisplayName: true,
              country: true,
              region: true,
            },
          },
        },
      }),
      this.prisma.marketplaceOffer.count({ where }),
    ]);

    const [byReadiness, byPriceMode] = await Promise.all([
      this.prisma.marketplaceOffer.groupBy({
        by: ['exportReadinessStatus'],
        where,
        _count: true,
      }),
      this.prisma.marketplaceOffer.groupBy({
        by: ['priceMode'],
        where,
        _count: true,
      }),
    ]);

    // Hydrate primary media en un seul round-trip pour éviter le N+1
    const primaryMediaMap = await this.loadPrimaryMediaMap(
      offers.map((o) => o.marketplaceProduct.id),
    );

    const data = offers.map((o) =>
      this.toCatalogCard(o, primaryMediaMap.get(o.marketplaceProduct.id) ?? null),
    );

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      facets: {
        readiness: byReadiness.map((r) => ({ value: r.exportReadinessStatus, count: r._count })),
        priceMode: byPriceMode.map((r) => ({ value: r.priceMode, count: r._count })),
      },
    };
  }

  // ─── Fiche produit (slug du MarketplaceProduct) ───────────────────────────

  async findProductBySlug(slug: string) {
    const product = await this.prisma.marketplaceProduct.findFirst({
      where: {
        slug,
        publicationStatus: {
          in: [MarketplacePublicationStatus.APPROVED, MarketplacePublicationStatus.PUBLISHED],
        },
        sellerProfile: { status: SellerProfileStatus.APPROVED },
      },
      include: {
        category: { select: { id: true, slug: true, nameFr: true, nameEn: true } },
        sellerProfile: {
          select: {
            id: true,
            slug: true,
            publicDisplayName: true,
            country: true,
            region: true,
            cityOrZone: true,
            descriptionShort: true,
            languages: true,
            supportedIncoterms: true,
            destinationsServed: true,
            averageLeadTimeDays: true,
          },
        },
        offers: {
          where: {
            publicationStatus: MarketplacePublicationStatus.PUBLISHED,
            visibilityScope: { not: MarketplaceVisibilityScope.PRIVATE },
          },
          orderBy: [{ featuredRank: 'asc' }, { publishedAt: 'desc' }],
          select: {
            id: true,
            title: true,
            shortDescription: true,
            priceMode: true,
            unitPrice: true,
            currency: true,
            moq: true,
            availableQuantity: true,
            availabilityStart: true,
            availabilityEnd: true,
            leadTimeDays: true,
            incoterm: true,
            departureLocation: true,
            destinationMarketsJson: true,
            exportReadinessStatus: true,
            visibilityScope: true,
            publishedAt: true,
          },
        },
      },
    });

    if (!product) throw new NotFoundException('Produit marketplace introuvable ou non publié');

    const media = await this.prisma.mediaAsset.findMany({
      where: {
        relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
        relatedId: product.id,
        moderationStatus: MediaModerationStatus.APPROVED,
      },
      orderBy: [{ role: 'asc' }, { sortOrder: 'asc' }],
      select: {
        id: true,
        role: true,
        publicUrl: true,
        altTextFr: true,
        altTextEn: true,
        sortOrder: true,
      },
    });

    const primary = media.find((m) => m.role === MediaAssetRole.PRIMARY);
    if (!primary) {
      throw new NotFoundException('Produit marketplace sans image principale approuvée');
    }
    const gallery = media.filter((m) => m.role !== MediaAssetRole.PRIMARY);

    const offersOut = product.offers.map((o, idx) => ({
      ...o,
      unitPrice: o.unitPrice ? Number(o.unitPrice) : null,
      moq: o.moq ? Number(o.moq) : null,
      availableQuantity: o.availableQuantity ? Number(o.availableQuantity) : null,
      isPrimaryOffer: idx === 0,
    }));

    if (offersOut.length === 0) {
      throw new NotFoundException('Aucune offre publiée pour ce produit');
    }

    const documents = await this.findPublicDocuments(
      MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
      product.id,
    );

    // FP-2 — certifications publiques (VERIFIED + non expirées) du produit ET
    // du vendeur. On agrège les deux scopes dans une seule liste pour la fiche
    // produit (le scope reste exposé pour permettre au front de filtrer/grouper).
    const certifications = await this.findPublicCertifications([
      { relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT, relatedId: product.id },
      {
        relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
        relatedId: product.sellerProfile.id,
      },
    ]);

    return {
      id: product.id,
      slug: product.slug,
      commercialName: product.commercialName,
      regulatoryName: product.regulatoryName,
      subtitle: product.subtitle,
      originCountry: product.originCountry,
      originRegion: product.originRegion,
      // FP-6 — gpsLat/gpsLng arrivent en Decimal (Prisma) ; on stringify
      // pour rester JSON-safe (la précision est conservée).
      originLocality: product.originLocality,
      altitudeMeters: product.altitudeMeters,
      gpsLat: product.gpsLat != null ? product.gpsLat.toString() : null,
      gpsLng: product.gpsLng != null ? product.gpsLng.toString() : null,
      varietySpecies: product.varietySpecies,
      productionMethod: product.productionMethod,
      descriptionShort: product.descriptionShort,
      descriptionLong: product.descriptionLong,
      usageTips: product.usageTips,
      packagingDescription: product.packagingDescription,
      storageConditions: product.storageConditions,
      shelfLifeInfo: product.shelfLifeInfo,
      allergenInfo: product.allergenInfo,
      nutritionInfoJson: product.nutritionInfoJson,
      defaultUnit: product.defaultUnit,
      minimumOrderQuantity: product.minimumOrderQuantity
        ? Number(product.minimumOrderQuantity)
        : null,
      // FP-8 — logistique structurée (rattrapage projection : FP-8 avait
      // étendu schéma + DTO + UI seller mais oublié la projection publique).
      packagingFormats: product.packagingFormats ?? [],
      temperatureRequirements: product.temperatureRequirements,
      grossWeight: product.grossWeight != null ? Number(product.grossWeight) : null,
      netWeight: product.netWeight != null ? Number(product.netWeight) : null,
      palletization: product.palletization,
      // FP-5 — volumes et capacités.
      annualProductionCapacity:
        product.annualProductionCapacity != null
          ? Number(product.annualProductionCapacity)
          : null,
      capacityUnit: product.capacityUnit,
      availableQuantity:
        product.availableQuantity != null ? Number(product.availableQuantity) : null,
      availableQuantityUnit: product.availableQuantityUnit,
      restockFrequency: product.restockFrequency,
      // FP-1 — saisonnalité (lecture publique, écriture côté seller).
      harvestMonths: product.harvestMonths ?? [],
      availabilityMonths: product.availabilityMonths ?? [],
      isYearRound: product.isYearRound ?? false,
      exportReadinessStatus: product.exportReadinessStatus,
      category: product.category,
      seller: product.sellerProfile,
      primaryImage: primary,
      gallery,
      offers: offersOut,
      documents,
      certifications,
    };
  }

  // ─── Page seller publique ─────────────────────────────────────────────────

  async findSellerBySlug(slug: string) {
    const seller = await this.prisma.sellerProfile.findFirst({
      where: { slug, status: SellerProfileStatus.APPROVED },
    });
    if (!seller) throw new NotFoundException('Vendeur introuvable ou non approuvé');

    const media = await this.prisma.mediaAsset.findMany({
      where: {
        relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
        relatedId: seller.id,
        role: { in: [MediaAssetRole.LOGO, MediaAssetRole.BANNER] },
        moderationStatus: MediaModerationStatus.APPROVED,
      },
      select: { id: true, role: true, publicUrl: true, altTextFr: true },
    });
    const logo = media.find((m) => m.role === MediaAssetRole.LOGO) ?? null;
    const banner = media.find((m) => m.role === MediaAssetRole.BANNER) ?? null;

    // Produits publiables de ce vendeur (avec au moins une offre publiée)
    const eligibleProductIds = await this.findProductsWithPrimaryMedia();
    const products = await this.prisma.marketplaceProduct.findMany({
      where: {
        sellerProfileId: seller.id,
        id: { in: eligibleProductIds },
        publicationStatus: {
          in: [MarketplacePublicationStatus.APPROVED, MarketplacePublicationStatus.PUBLISHED],
        },
        offers: {
          some: {
            publicationStatus: MarketplacePublicationStatus.PUBLISHED,
            visibilityScope: { not: MarketplaceVisibilityScope.PRIVATE },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        slug: true,
        commercialName: true,
        subtitle: true,
        originCountry: true,
        originRegion: true,
        exportReadinessStatus: true,
      },
    });

    const primaryMediaMap = await this.loadPrimaryMediaMap(products.map((p) => p.id));

    // FP-2 — certifications publiques du vendeur (VERIFIED + non expirées).
    const certifications = await this.findPublicCertifications([
      { relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE, relatedId: seller.id },
    ]);

    return {
      id: seller.id,
      slug: seller.slug,
      publicDisplayName: seller.publicDisplayName,
      country: seller.country,
      region: seller.region,
      cityOrZone: seller.cityOrZone,
      descriptionShort: seller.descriptionShort,
      descriptionLong: seller.descriptionLong,
      story: seller.story,
      languages: seller.languages,
      supportedIncoterms: seller.supportedIncoterms,
      destinationsServed: seller.destinationsServed,
      averageLeadTimeDays: seller.averageLeadTimeDays,
      website: seller.website,
      logo,
      banner,
      products: products.map((p) => ({
        id: p.id,
        slug: p.slug,
        commercialName: p.commercialName,
        subtitle: p.subtitle,
        originCountry: p.originCountry,
        originRegion: p.originRegion,
        exportReadinessStatus: p.exportReadinessStatus,
        primaryImage: primaryMediaMap.get(p.id) ?? null,
      })),
      certifications,
    };
  }

  // ─── Annuaire seller public (MP-S-INDEX) ──────────────────────────────────

  /**
   * MP-S-INDEX — Liste publique paginée des vendeurs `APPROVED`.
   *
   * Règles de visibilité publique :
   *  - `status = APPROVED` (toujours, jamais surchargeable par query).
   *  - Aucun champ privé exposé : `select` Prisma whitelist stricte. Les
   *    champs `legalName`, `companyId`, `salesEmail`, `salesPhone`,
   *    `rejectionReason`, `suspendedAt`, `createdById`, `updatedById` ne
   *    sont JAMAIS sélectionnés (testé explicitement dans le spec).
   *  - Compteur `publishedProductsCount` = nombre de
   *    `MarketplaceProduct.publicationStatus = PUBLISHED` du vendeur,
   *    via `_count` Prisma.
   *
   * Filtres :
   *  - `q` → OR insensitive sur `publicDisplayName` + `cityOrZone`.
   *  - `country` → match exact upper-case (codes ISO).
   *  - `region` → contains insensitive.
   *  - `featured=true` → restreint à `isFeatured=true`.
   *
   * Tri :
   *  - `featured` (default) → featured en tête puis `approvedAt` desc.
   *  - `recent` → `approvedAt` desc.
   *  - `name_asc` → `publicDisplayName` asc.
   */
  async listSellers(query: SellersQueryDto) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const skip = (page - 1) * limit;

    const where = this.buildSellersWhere(query);
    const orderBy = this.buildSellersOrderBy(query.sort);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.sellerProfile.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          slug: true,
          publicDisplayName: true,
          country: true,
          region: true,
          cityOrZone: true,
          descriptionShort: true,
          logoMediaId: true,
          bannerMediaId: true,
          averageLeadTimeDays: true,
          destinationsServed: true,
          supportedIncoterms: true,
          isFeatured: true,
          _count: {
            select: {
              marketplaceProducts: {
                where: { publicationStatus: MarketplacePublicationStatus.PUBLISHED },
              },
            },
          },
        },
      }),
      this.prisma.sellerProfile.count({ where }),
    ]);

    const data = rows.map((s) => ({
      id: s.id,
      slug: s.slug,
      publicDisplayName: s.publicDisplayName,
      country: s.country,
      region: s.region,
      cityOrZone: s.cityOrZone,
      descriptionShort: s.descriptionShort,
      logoMediaId: s.logoMediaId,
      bannerMediaId: s.bannerMediaId,
      averageLeadTimeDays: s.averageLeadTimeDays,
      destinationsServed: s.destinationsServed,
      supportedIncoterms: s.supportedIncoterms,
      isFeatured: s.isFeatured,
      publishedProductsCount: s._count?.marketplaceProducts ?? 0,
    }));

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  private buildSellersWhere(q: SellersQueryDto): Prisma.SellerProfileWhereInput {
    // Filtre dur — non surchargeable par la query, garantit l'invariant
    // "aucun seller non APPROVED dans la projection publique".
    const where: Prisma.SellerProfileWhereInput = {
      status: SellerProfileStatus.APPROVED,
    };

    if (q.country) where.country = q.country.toUpperCase();
    if (q.region) where.region = { contains: q.region, mode: 'insensitive' };
    if (q.featured === 'true') where.isFeatured = true;

    if (q.q) {
      where.OR = [
        { publicDisplayName: { contains: q.q, mode: 'insensitive' } },
        { cityOrZone: { contains: q.q, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private buildSellersOrderBy(
    sort?: SellersSort,
  ): Prisma.SellerProfileOrderByWithRelationInput[] {
    switch (sort) {
      case SellersSort.RECENT:
        return [{ approvedAt: 'desc' }];
      case SellersSort.NAME_ASC:
        return [{ publicDisplayName: 'asc' }];
      case SellersSort.FEATURED:
      default:
        return [{ isFeatured: 'desc' }, { approvedAt: 'desc' }];
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Liste des marketplaceProductId ayant au moins un MediaAsset PRIMARY APPROVED.
   * Résout la gate polymorphique côté DB en une seule requête.
   */
  private async findProductsWithPrimaryMedia(): Promise<string[]> {
    const rows = await this.prisma.mediaAsset.findMany({
      where: {
        relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
        role: MediaAssetRole.PRIMARY,
        moderationStatus: MediaModerationStatus.APPROVED,
      },
      distinct: ['relatedId'],
      select: { relatedId: true },
    });
    return rows.map((r) => r.relatedId);
  }

  /** Map productId → primary image approuvée (1 query, batch par IN). */
  private async loadPrimaryMediaMap(productIds: string[]) {
    const map = new Map<
      string,
      {
        id: string;
        publicUrl: string | null;
        altTextFr: string | null;
        altTextEn: string | null;
      }
    >();
    if (productIds.length === 0) return map;

    const rows = await this.prisma.mediaAsset.findMany({
      where: {
        relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
        relatedId: { in: productIds },
        role: MediaAssetRole.PRIMARY,
        moderationStatus: MediaModerationStatus.APPROVED,
      },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        relatedId: true,
        publicUrl: true,
        altTextFr: true,
        altTextEn: true,
      },
    });
    for (const r of rows) {
      if (!map.has(r.relatedId)) {
        map.set(r.relatedId, {
          id: r.id,
          publicUrl: r.publicUrl,
          altTextFr: r.altTextFr,
          altTextEn: r.altTextEn,
        });
      }
    }
    return map;
  }

  private buildCatalogWhere(
    q: CatalogQueryDto,
    eligibleProductIds: string[],
  ): Prisma.MarketplaceOfferWhereInput {
    const mpWhere: Prisma.MarketplaceProductWhereInput = {
      publicationStatus: {
        in: [MarketplacePublicationStatus.APPROVED, MarketplacePublicationStatus.PUBLISHED],
      },
      sellerProfile: { status: SellerProfileStatus.APPROVED },
    };

    if (q.categoryId) mpWhere.categoryId = q.categoryId;
    if (q.categorySlug) mpWhere.category = { slug: q.categorySlug };

    if (q.originCountry) mpWhere.originCountry = q.originCountry;
    if (q.originRegion) {
      mpWhere.originRegion = { contains: q.originRegion, mode: 'insensitive' };
    }
    if (q.productionMethod) {
      mpWhere.productionMethod = { contains: q.productionMethod, mode: 'insensitive' };
    }
    if (q.sellerSlug) {
      mpWhere.sellerProfile = {
        status: SellerProfileStatus.APPROVED,
        slug: q.sellerSlug,
      };
    }
    if (q.q) {
      const needle = q.q;
      mpWhere.OR = [
        { commercialName: { contains: needle, mode: 'insensitive' } },
        { regulatoryName: { contains: needle, mode: 'insensitive' } },
        { varietySpecies: { contains: needle, mode: 'insensitive' } },
        { originCountry: { contains: needle, mode: 'insensitive' } },
        { originRegion: { contains: needle, mode: 'insensitive' } },
        { descriptionShort: { contains: needle, mode: 'insensitive' } },
        { sellerProfile: { publicDisplayName: { contains: needle, mode: 'insensitive' } } },
      ];
    }

    const where: Prisma.MarketplaceOfferWhereInput = {
      publicationStatus: MarketplacePublicationStatus.PUBLISHED,
      visibilityScope: { not: MarketplaceVisibilityScope.PRIVATE },
      marketplaceProductId: { in: eligibleProductIds },
      marketplaceProduct: mpWhere,
    };

    if (q.readiness) where.exportReadinessStatus = q.readiness;
    if (q.priceMode) where.priceMode = q.priceMode;
    if (q.moqMax !== undefined && q.moqMax !== null) {
      where.OR = [{ moq: null }, { moq: { lte: q.moqMax } }];
    }
    if (q.availableOnly === 'true') {
      const now = new Date();
      where.AND = [
        { OR: [{ availableQuantity: null }, { availableQuantity: { gt: 0 } }] },
        { OR: [{ availabilityStart: null }, { availabilityStart: { lte: now } }] },
        { OR: [{ availabilityEnd: null }, { availabilityEnd: { gte: now } }] },
      ];
    }

    return where;
  }

  private buildOrderBy(sort?: CatalogSort): Prisma.MarketplaceOfferOrderByWithRelationInput[] {
    switch (sort) {
      case CatalogSort.RECENT:
        return [{ publishedAt: 'desc' }];
      case CatalogSort.NAME_ASC:
        return [{ marketplaceProduct: { commercialName: 'asc' } }];
      case CatalogSort.NAME_DESC:
        return [{ marketplaceProduct: { commercialName: 'desc' } }];
      case CatalogSort.PRICE_ASC:
        return [{ unitPrice: 'asc' }, { publishedAt: 'desc' }];
      case CatalogSort.PRICE_DESC:
        return [{ unitPrice: 'desc' }, { publishedAt: 'desc' }];
      case CatalogSort.READINESS:
        return [{ exportReadinessStatus: 'asc' }, { publishedAt: 'desc' }];
      case CatalogSort.FEATURED:
      default:
        return [{ featuredRank: 'asc' }, { publishedAt: 'desc' }];
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toCatalogCard(
    o: any,
    primaryImage: {
      id: string;
      publicUrl: string | null;
      altTextFr: string | null;
      altTextEn: string | null;
    } | null,
  ) {
    const mp = o.marketplaceProduct;
    return {
      offerId: o.id,
      offerTitle: o.title,
      productSlug: mp.slug,
      commercialName: mp.commercialName,
      subtitle: mp.subtitle,
      category: mp.category,
      origin: { country: mp.originCountry, region: mp.originRegion },
      varietySpecies: mp.varietySpecies,
      productionMethod: mp.productionMethod,
      packagingDescription: mp.packagingDescription,
      defaultUnit: mp.defaultUnit,
      minimumOrderQuantity: mp.minimumOrderQuantity ? Number(mp.minimumOrderQuantity) : null,
      primaryImage,
      seller: o.sellerProfile,
      priceMode: o.priceMode,
      unitPrice: o.unitPrice ? Number(o.unitPrice) : null,
      currency: o.currency,
      moq: o.moq ? Number(o.moq) : null,
      onQuote: o.priceMode === MarketplacePriceMode.QUOTE_ONLY,
      availableQuantity: o.availableQuantity ? Number(o.availableQuantity) : null,
      leadTimeDays: o.leadTimeDays,
      incoterm: o.incoterm,
      exportReadinessStatus: o.exportReadinessStatus,
      publishedAt: o.publishedAt,
    };
  }

  private async findPublicDocuments(relatedType: MarketplaceRelatedEntityType, relatedId: string) {
    const now = new Date();
    return this.prisma.marketplaceDocument.findMany({
      where: {
        relatedType,
        relatedId,
        visibility: MarketplaceDocumentVisibility.PUBLIC,
        verificationStatus: MarketplaceVerificationStatus.VERIFIED,
        OR: [{ validUntil: null }, { validUntil: { gte: now } }],
      },
      select: {
        id: true,
        documentType: true,
        title: true,
        validFrom: true,
        validUntil: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * FP-2 — Lecture publique des certifications structurées.
   *
   * Filtre :
   *   - verificationStatus = VERIFIED
   *   - validUntil null OU dans le futur (les expirées ne sortent pas)
   *
   * Accepte plusieurs scopes (typiquement [produit, vendeur]) en une seule
   * requête pour éviter le N+1 sur la fiche produit. Le scope reste exposé
   * dans la projection pour permettre au front de grouper/badger.
   */
  private async findPublicCertifications(
    scopes: Array<{ relatedType: MarketplaceRelatedEntityType; relatedId: string }>,
  ) {
    if (scopes.length === 0) return [];
    const now = new Date();
    const rows = await this.prisma.certification.findMany({
      where: {
        verificationStatus: MarketplaceVerificationStatus.VERIFIED,
        AND: [
          { OR: scopes.map((s) => ({ relatedType: s.relatedType, relatedId: s.relatedId })) },
          { OR: [{ validUntil: null }, { validUntil: { gt: now } }] },
        ],
      },
      select: {
        id: true,
        relatedType: true,
        relatedId: true,
        type: true,
        code: true,
        issuingBody: true,
        issuedAt: true,
        validFrom: true,
        validUntil: true,
        documentMediaId: true,
      },
      orderBy: [{ type: 'asc' }, { issuedAt: 'desc' }],
    });
    return rows;
  }
}
