import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MarketplaceCatalogService } from './marketplace-catalog.service';
import { PrismaService } from '../database/prisma.service';
import {
  ExportReadinessStatus,
  MarketplaceDocumentVisibility,
  MarketplacePriceMode,
  MarketplacePublicationStatus,
  MarketplaceRelatedEntityType,
  MarketplaceVerificationStatus,
  MarketplaceVisibilityScope,
  MediaAssetRole,
  MediaModerationStatus,
  SellerProfileStatus,
} from '@iox/shared';
import { CatalogSort } from './dto/catalog-query.dto';
import { ProductQualityAttribute, SeasonalityMonth } from '@iox/shared';

describe('MarketplaceCatalogService', () => {
  let service: MarketplaceCatalogService;
  let prisma: {
    marketplaceOffer: {
      findMany: jest.Mock;
      count: jest.Mock;
      groupBy: jest.Mock;
    };
    marketplaceProduct: { findFirst: jest.Mock; findMany: jest.Mock };
    sellerProfile: { findFirst: jest.Mock; findMany: jest.Mock; count: jest.Mock };
    mediaAsset: { findMany: jest.Mock };
    marketplaceDocument: { findMany: jest.Mock };
    certification: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      marketplaceOffer: {
        findMany: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      marketplaceProduct: { findFirst: jest.fn(), findMany: jest.fn() },
      sellerProfile: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
      mediaAsset: { findMany: jest.fn() },
      marketplaceDocument: { findMany: jest.fn().mockResolvedValue([]) },
      certification: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((ops: Array<Promise<unknown>>) => Promise.all(ops)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [MarketplaceCatalogService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(MarketplaceCatalogService);
  });

  // ── findCatalog ──────────────────────────────────────────────────────────

  describe('findCatalog', () => {
    it("retourne vide si aucun produit n'a d'image PRIMARY APPROVED", async () => {
      prisma.mediaAsset.findMany.mockResolvedValueOnce([]); // findProductsWithPrimaryMedia
      const res = await service.findCatalog({});
      expect(res.data).toEqual([]);
      expect(res.meta.total).toBe(0);
      expect(prisma.marketplaceOffer.findMany).not.toHaveBeenCalled();
    });

    it('force publication=PUBLISHED, visibility≠PRIVATE, mp APPROVED/PUBLISHED, seller APPROVED', async () => {
      prisma.mediaAsset.findMany
        .mockResolvedValueOnce([{ relatedId: 'mp1' }]) // eligible IDs
        .mockResolvedValueOnce([]); // loadPrimaryMediaMap
      prisma.marketplaceOffer.findMany.mockResolvedValue([]);
      prisma.marketplaceOffer.count.mockResolvedValue(0);

      await service.findCatalog({});

      const where = prisma.marketplaceOffer.findMany.mock.calls[0][0].where;
      expect(where.publicationStatus).toBe(MarketplacePublicationStatus.PUBLISHED);
      expect(where.visibilityScope).toEqual({ not: MarketplaceVisibilityScope.PRIVATE });
      expect(where.marketplaceProductId).toEqual({ in: ['mp1'] });
      expect(where.marketplaceProduct.publicationStatus).toEqual({
        in: [MarketplacePublicationStatus.APPROVED, MarketplacePublicationStatus.PUBLISHED],
      });
      expect(where.marketplaceProduct.sellerProfile).toEqual({
        status: SellerProfileStatus.APPROVED,
      });
    });

    it('recherche texte (q) construit un OR multi-champs', async () => {
      prisma.mediaAsset.findMany
        .mockResolvedValueOnce([{ relatedId: 'mp1' }])
        .mockResolvedValueOnce([]);
      prisma.marketplaceOffer.findMany.mockResolvedValue([]);
      prisma.marketplaceOffer.count.mockResolvedValue(0);

      await service.findCatalog({ q: 'café arabica' });

      const where = prisma.marketplaceOffer.findMany.mock.calls[0][0].where;
      const or = where.marketplaceProduct.OR;
      expect(or).toEqual(
        expect.arrayContaining([
          { commercialName: { contains: 'café arabica', mode: 'insensitive' } },
          { varietySpecies: { contains: 'café arabica', mode: 'insensitive' } },
          {
            sellerProfile: { publicDisplayName: { contains: 'café arabica', mode: 'insensitive' } },
          },
        ]),
      );
    });

    it('filtres readiness + priceMode + originCountry + categorySlug', async () => {
      prisma.mediaAsset.findMany
        .mockResolvedValueOnce([{ relatedId: 'mp1' }])
        .mockResolvedValueOnce([]);
      prisma.marketplaceOffer.findMany.mockResolvedValue([]);
      prisma.marketplaceOffer.count.mockResolvedValue(0);

      await service.findCatalog({
        readiness: ExportReadinessStatus.EXPORT_READY,
        priceMode: MarketplacePriceMode.FIXED,
        originCountry: 'YT',
        categorySlug: 'epices',
      });

      const where = prisma.marketplaceOffer.findMany.mock.calls[0][0].where;
      expect(where.exportReadinessStatus).toBe(ExportReadinessStatus.EXPORT_READY);
      expect(where.priceMode).toBe(MarketplacePriceMode.FIXED);
      expect(where.marketplaceProduct.originCountry).toBe('YT');
      expect(where.marketplaceProduct.category).toEqual({ slug: 'epices' });
    });

    it('filtre moqMax accepte offres sans MOQ ou MOQ ≤ valeur', async () => {
      prisma.mediaAsset.findMany
        .mockResolvedValueOnce([{ relatedId: 'mp1' }])
        .mockResolvedValueOnce([]);
      prisma.marketplaceOffer.findMany.mockResolvedValue([]);
      prisma.marketplaceOffer.count.mockResolvedValue(0);

      await service.findCatalog({ moqMax: 50 });

      const where = prisma.marketplaceOffer.findMany.mock.calls[0][0].where;
      expect(where.OR).toEqual([{ moq: null }, { moq: { lte: 50 } }]);
    });

    it('sort PRICE_ASC: unitPrice asc puis publishedAt desc', async () => {
      prisma.mediaAsset.findMany
        .mockResolvedValueOnce([{ relatedId: 'mp1' }])
        .mockResolvedValueOnce([]);
      prisma.marketplaceOffer.findMany.mockResolvedValue([]);
      prisma.marketplaceOffer.count.mockResolvedValue(0);

      await service.findCatalog({ sort: CatalogSort.PRICE_ASC });

      const orderBy = prisma.marketplaceOffer.findMany.mock.calls[0][0].orderBy;
      expect(orderBy).toEqual([{ unitPrice: 'asc' }, { publishedAt: 'desc' }]);
    });

    it('map les offres vers des cartes avec primaryImage + onQuote', async () => {
      prisma.mediaAsset.findMany
        .mockResolvedValueOnce([{ relatedId: 'mp1' }])
        .mockResolvedValueOnce([
          {
            id: 'm1',
            relatedId: 'mp1',
            publicUrl: 'https://cdn/x.jpg',
            altTextFr: 'alt',
            altTextEn: null,
          },
        ]);
      prisma.marketplaceOffer.findMany.mockResolvedValue([
        {
          id: 'o1',
          title: 'Offre A',
          priceMode: MarketplacePriceMode.QUOTE_ONLY,
          unitPrice: null,
          currency: null,
          moq: null,
          availableQuantity: null,
          leadTimeDays: 21,
          incoterm: 'FOB',
          exportReadinessStatus: ExportReadinessStatus.EXPORT_READY,
          publishedAt: new Date('2025-01-15'),
          marketplaceProduct: {
            id: 'mp1',
            slug: 'piment',
            commercialName: 'Piment',
            regulatoryName: null,
            subtitle: null,
            originCountry: 'YT',
            originRegion: null,
            varietySpecies: null,
            productionMethod: null,
            packagingDescription: null,
            defaultUnit: 'kg',
            minimumOrderQuantity: null,
            category: null,
          },
          sellerProfile: {
            id: 'sp1',
            slug: 'mm',
            publicDisplayName: 'MM Farm',
            country: 'YT',
            region: null,
          },
        },
      ]);
      prisma.marketplaceOffer.count.mockResolvedValue(1);

      const res = await service.findCatalog({});
      expect(res.data).toHaveLength(1);
      expect(res.data[0]).toMatchObject({
        offerId: 'o1',
        productSlug: 'piment',
        commercialName: 'Piment',
        priceMode: MarketplacePriceMode.QUOTE_ONLY,
        onQuote: true,
        primaryImage: { id: 'm1', publicUrl: 'https://cdn/x.jpg' },
      });
    });
  });

  // ── MP-FILTERS-1 ─────────────────────────────────────────────────────────

  describe('findCatalog — MP-FILTERS-1', () => {
    const stubEligibleAndOffers = () => {
      prisma.mediaAsset.findMany
        .mockResolvedValueOnce([{ relatedId: 'mp1' }, { relatedId: 'mp2' }])
        .mockResolvedValueOnce([]);
      prisma.marketplaceOffer.findMany.mockResolvedValue([]);
      prisma.marketplaceOffer.count.mockResolvedValue(0);
    };

    it('qualityAttribute → mpWhere.qualityAttributes = { has }', async () => {
      stubEligibleAndOffers();
      await service.findCatalog({ qualityAttribute: ProductQualityAttribute.ORGANIC });
      const where = prisma.marketplaceOffer.findMany.mock.calls[0][0].where;
      expect(where.marketplaceProduct.qualityAttributes).toEqual({
        has: ProductQualityAttribute.ORGANIC,
      });
    });

    it('temperatureRequirements → contains insensitive sur mpWhere', async () => {
      stubEligibleAndOffers();
      await service.findCatalog({ temperatureRequirements: 'Frozen' });
      const where = prisma.marketplaceOffer.findMany.mock.calls[0][0].where;
      expect(where.marketplaceProduct.temperatureRequirements).toEqual({
        contains: 'Frozen',
        mode: 'insensitive',
      });
    });

    it('seasonalityMonth → AND avec OR isYearRound | availabilityMonths.has', async () => {
      stubEligibleAndOffers();
      await service.findCatalog({ seasonalityMonth: SeasonalityMonth.JUN });
      const where = prisma.marketplaceOffer.findMany.mock.calls[0][0].where;
      expect(where.marketplaceProduct.AND).toEqual([
        {
          OR: [
            { isYearRound: true },
            { availabilityMonths: { has: SeasonalityMonth.JUN } },
          ],
        },
      ]);
    });

    it('combo qualityAttribute + seasonalityMonth + originCountry projeté simultanément', async () => {
      stubEligibleAndOffers();
      await service.findCatalog({
        qualityAttribute: ProductQualityAttribute.VEGAN,
        seasonalityMonth: SeasonalityMonth.MAR,
        originCountry: 'YT',
      });
      const where = prisma.marketplaceOffer.findMany.mock.calls[0][0].where;
      expect(where.marketplaceProduct.qualityAttributes).toEqual({
        has: ProductQualityAttribute.VEGAN,
      });
      expect(where.marketplaceProduct.originCountry).toBe('YT');
      expect(where.marketplaceProduct.AND).toEqual([
        {
          OR: [
            { isYearRound: true },
            { availabilityMonths: { has: SeasonalityMonth.MAR } },
          ],
        },
      ]);
    });

    it('hasPublicDocs=true → intersection avec pré-requête doc IDs', async () => {
      // 1) findProductsWithPrimaryMedia → mp1 + mp2
      // 2) findProductsWithPublicDocuments → mp2 only
      // 3) loadPrimaryMediaMap (vide)
      prisma.mediaAsset.findMany
        .mockResolvedValueOnce([{ relatedId: 'mp1' }, { relatedId: 'mp2' }])
        .mockResolvedValueOnce([]);
      prisma.marketplaceDocument.findMany.mockResolvedValueOnce([{ relatedId: 'mp2' }]);
      prisma.marketplaceOffer.findMany.mockResolvedValue([]);
      prisma.marketplaceOffer.count.mockResolvedValue(0);

      await service.findCatalog({ hasPublicDocs: 'true' });
      const where = prisma.marketplaceOffer.findMany.mock.calls[0][0].where;
      expect(where.marketplaceProductId).toEqual({ in: ['mp2'] });
    });
  });

  // ── findProductBySlug ────────────────────────────────────────────────────

  describe('findProductBySlug', () => {
    it('404 si produit inexistant / non publié / seller non approuvé', async () => {
      prisma.marketplaceProduct.findFirst.mockResolvedValue(null);
      await expect(service.findProductBySlug('x')).rejects.toThrow(NotFoundException);

      const where = prisma.marketplaceProduct.findFirst.mock.calls[0][0].where;
      expect(where.publicationStatus).toEqual({
        in: [MarketplacePublicationStatus.APPROVED, MarketplacePublicationStatus.PUBLISHED],
      });
      expect(where.sellerProfile).toEqual({ status: SellerProfileStatus.APPROVED });
    });

    it('404 si aucune image PRIMARY APPROVED', async () => {
      prisma.marketplaceProduct.findFirst.mockResolvedValue({
        id: 'mp1',
        slug: 'p',
        offers: [{ id: 'o1' }],
        sellerProfile: { id: 'sp1' },
      });
      prisma.mediaAsset.findMany.mockResolvedValue([
        { id: 'm1', role: MediaAssetRole.GALLERY, publicUrl: 'g' },
      ]);
      await expect(service.findProductBySlug('p')).rejects.toThrow(NotFoundException);
    });

    it('404 si aucune offre publiée', async () => {
      prisma.marketplaceProduct.findFirst.mockResolvedValue({
        id: 'mp1',
        slug: 'p',
        offers: [],
        sellerProfile: { id: 'sp1' },
      });
      prisma.mediaAsset.findMany.mockResolvedValue([
        { id: 'm1', role: MediaAssetRole.PRIMARY, publicUrl: 'p' },
      ]);
      await expect(service.findProductBySlug('p')).rejects.toThrow(NotFoundException);
    });

    it('retourne primaryImage + gallery séparées + offres avec isPrimaryOffer', async () => {
      prisma.marketplaceProduct.findFirst.mockResolvedValue({
        id: 'mp1',
        slug: 'p',
        commercialName: 'P',
        regulatoryName: null,
        subtitle: null,
        originCountry: 'YT',
        originRegion: null,
        varietySpecies: null,
        productionMethod: null,
        descriptionShort: null,
        descriptionLong: null,
        usageTips: null,
        packagingDescription: null,
        storageConditions: null,
        shelfLifeInfo: null,
        allergenInfo: null,
        nutritionInfoJson: null,
        defaultUnit: null,
        minimumOrderQuantity: null,
        exportReadinessStatus: ExportReadinessStatus.EXPORT_READY,
        category: null,
        sellerProfile: { id: 'sp1', slug: 'mm' },
        offers: [
          {
            id: 'o1',
            title: 'A',
            priceMode: MarketplacePriceMode.FIXED,
            unitPrice: 10,
            currency: 'EUR',
            moq: 5,
            availableQuantity: null,
            availabilityStart: null,
            availabilityEnd: null,
            leadTimeDays: 7,
            incoterm: 'FOB',
            departureLocation: null,
            destinationMarketsJson: null,
            exportReadinessStatus: ExportReadinessStatus.EXPORT_READY,
            visibilityScope: MarketplaceVisibilityScope.PUBLIC,
            publishedAt: new Date('2025-02-01'),
            shortDescription: null,
          },
          {
            id: 'o2',
            title: 'B',
            priceMode: MarketplacePriceMode.QUOTE_ONLY,
            unitPrice: null,
            currency: null,
            moq: null,
            availableQuantity: null,
            availabilityStart: null,
            availabilityEnd: null,
            leadTimeDays: null,
            incoterm: null,
            departureLocation: null,
            destinationMarketsJson: null,
            exportReadinessStatus: ExportReadinessStatus.EXPORT_READY,
            visibilityScope: MarketplaceVisibilityScope.BUYERS_ONLY,
            publishedAt: new Date('2025-01-01'),
            shortDescription: null,
          },
        ],
      });
      prisma.mediaAsset.findMany.mockResolvedValue([
        { id: 'm1', role: MediaAssetRole.PRIMARY, publicUrl: 'p', sortOrder: 0 },
        { id: 'm2', role: MediaAssetRole.GALLERY, publicUrl: 'g1', sortOrder: 1 },
        { id: 'm3', role: MediaAssetRole.GALLERY, publicUrl: 'g2', sortOrder: 2 },
      ]);

      const res = await service.findProductBySlug('p');
      expect(res.primaryImage.role).toBe(MediaAssetRole.PRIMARY);
      expect(res.gallery).toHaveLength(2);
      expect(res.offers[0].isPrimaryOffer).toBe(true);
      expect(res.offers[1].isPrimaryOffer).toBe(false);
      expect(res.offers[0].unitPrice).toBe(10);
    });

    it('ne remonte que les documents PUBLIC VERIFIED non expirés', async () => {
      prisma.marketplaceProduct.findFirst.mockResolvedValue({
        id: 'mp1',
        slug: 'p',
        commercialName: 'P',
        regulatoryName: null,
        subtitle: null,
        originCountry: 'YT',
        originRegion: null,
        varietySpecies: null,
        productionMethod: null,
        descriptionShort: null,
        descriptionLong: null,
        usageTips: null,
        packagingDescription: null,
        storageConditions: null,
        shelfLifeInfo: null,
        allergenInfo: null,
        nutritionInfoJson: null,
        defaultUnit: null,
        minimumOrderQuantity: null,
        exportReadinessStatus: ExportReadinessStatus.EXPORT_READY,
        category: null,
        sellerProfile: { id: 'sp1' },
        offers: [
          {
            id: 'o1',
            title: 'A',
            priceMode: MarketplacePriceMode.QUOTE_ONLY,
            unitPrice: null,
            currency: null,
            moq: null,
            availableQuantity: null,
            availabilityStart: null,
            availabilityEnd: null,
            leadTimeDays: null,
            incoterm: null,
            departureLocation: null,
            destinationMarketsJson: null,
            exportReadinessStatus: ExportReadinessStatus.EXPORT_READY,
            visibilityScope: MarketplaceVisibilityScope.BUYERS_ONLY,
            publishedAt: new Date(),
            shortDescription: null,
          },
        ],
      });
      prisma.mediaAsset.findMany.mockResolvedValue([
        { id: 'm1', role: MediaAssetRole.PRIMARY, publicUrl: 'p', sortOrder: 0 },
      ]);

      await service.findProductBySlug('p');

      const where = prisma.marketplaceDocument.findMany.mock.calls[0][0].where;
      expect(where.relatedType).toBe(MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT);
      expect(where.visibility).toBe(MarketplaceDocumentVisibility.PUBLIC);
      expect(where.verificationStatus).toBe(MarketplaceVerificationStatus.VERIFIED);
      expect(where.OR).toEqual([{ validUntil: null }, { validUntil: { gte: expect.any(Date) } }]);
    });
  });

  // ── findSellerBySlug ─────────────────────────────────────────────────────

  describe('findSellerBySlug', () => {
    it('404 si seller non approuvé', async () => {
      prisma.sellerProfile.findFirst.mockResolvedValue(null);
      await expect(service.findSellerBySlug('mm')).rejects.toThrow(NotFoundException);
      const where = prisma.sellerProfile.findFirst.mock.calls[0][0].where;
      expect(where.status).toBe(SellerProfileStatus.APPROVED);
    });

    it('ne remonte que produits publiables + media approuvé', async () => {
      prisma.sellerProfile.findFirst.mockResolvedValue({
        id: 'sp1',
        slug: 'mm',
        publicDisplayName: 'MM',
        country: 'YT',
        region: null,
        cityOrZone: null,
        descriptionShort: null,
        descriptionLong: null,
        story: null,
        languages: null,
        supportedIncoterms: null,
        destinationsServed: null,
        averageLeadTimeDays: null,
        website: null,
      });
      // media seller
      prisma.mediaAsset.findMany
        .mockResolvedValueOnce([
          { id: 'ml', role: MediaAssetRole.LOGO, publicUrl: 'logo', altTextFr: null },
        ])
        // eligible products
        .mockResolvedValueOnce([{ relatedId: 'mp1' }])
        // primary media map
        .mockResolvedValueOnce([
          { id: 'mp', relatedId: 'mp1', publicUrl: 'p', altTextFr: null, altTextEn: null },
        ]);
      prisma.marketplaceProduct.findMany.mockResolvedValue([
        {
          id: 'mp1',
          slug: 'p',
          commercialName: 'P',
          subtitle: null,
          originCountry: 'YT',
          originRegion: null,
          exportReadinessStatus: ExportReadinessStatus.EXPORT_READY,
        },
      ]);

      const res = await service.findSellerBySlug('mm');
      expect(res.logo).toEqual(expect.objectContaining({ role: MediaAssetRole.LOGO }));
      expect(res.products).toHaveLength(1);
      expect(res.products[0].primaryImage).toEqual(expect.objectContaining({ publicUrl: 'p' }));

      // Vérifie que les produits passent par le filtre eligible + offres publiées
      const where = prisma.marketplaceProduct.findMany.mock.calls[0][0].where;
      expect(where.id).toEqual({ in: ['mp1'] });
      expect(where.offers.some.publicationStatus).toBe(MarketplacePublicationStatus.PUBLISHED);
      expect(where.offers.some.visibilityScope).toEqual({
        not: MarketplaceVisibilityScope.PRIVATE,
      });
    });
  });

  // ── listSellers (MP-S-INDEX) ─────────────────────────────────────────────

  describe('listSellers (MP-S-INDEX)', () => {
    /** Construit un seller mocké minimaliste (champs whitelist projection). */
    function fakeSeller(overrides: Partial<Record<string, unknown>> = {}) {
      return {
        id: overrides.id ?? 's1',
        slug: overrides.slug ?? 'seller-1',
        publicDisplayName: overrides.publicDisplayName ?? 'Seller One',
        country: overrides.country ?? 'YT',
        region: overrides.region ?? null,
        cityOrZone: overrides.cityOrZone ?? null,
        descriptionShort: overrides.descriptionShort ?? null,
        logoMediaId: overrides.logoMediaId ?? null,
        bannerMediaId: overrides.bannerMediaId ?? null,
        averageLeadTimeDays: overrides.averageLeadTimeDays ?? null,
        destinationsServed: overrides.destinationsServed ?? null,
        supportedIncoterms: overrides.supportedIncoterms ?? null,
        isFeatured: overrides.isFeatured ?? false,
        _count: overrides._count ?? { marketplaceProducts: 0 },
      };
    }

    it('force status=APPROVED dur dans le where (filtre non surchargeable)', async () => {
      prisma.sellerProfile.findMany.mockResolvedValue([]);
      prisma.sellerProfile.count.mockResolvedValue(0);

      // Même si le caller passe un status quelconque (impossible via DTO mais
      // on garde l'invariant), on reste sur APPROVED.
      await service.listSellers({});

      const where = prisma.sellerProfile.findMany.mock.calls[0][0].where;
      expect(where.status).toBe(SellerProfileStatus.APPROVED);
    });

    it('filtre country et l\'upper-case', async () => {
      prisma.sellerProfile.findMany.mockResolvedValue([fakeSeller({ country: 'YT' })]);
      prisma.sellerProfile.count.mockResolvedValue(1);

      await service.listSellers({ country: 'yt' });

      const where = prisma.sellerProfile.findMany.mock.calls[0][0].where;
      expect(where.country).toBe('YT');
    });

    it('featured=true active le filtre isFeatured=true', async () => {
      prisma.sellerProfile.findMany.mockResolvedValue([]);
      prisma.sellerProfile.count.mockResolvedValue(0);

      await service.listSellers({ featured: 'true' });

      const where = prisma.sellerProfile.findMany.mock.calls[0][0].where;
      expect(where.isFeatured).toBe(true);
    });

    it('sort featured (default) place isFeatured desc puis approvedAt desc', async () => {
      prisma.sellerProfile.findMany.mockResolvedValue([]);
      prisma.sellerProfile.count.mockResolvedValue(0);

      await service.listSellers({});

      const orderBy = prisma.sellerProfile.findMany.mock.calls[0][0].orderBy;
      expect(orderBy).toEqual([{ isFeatured: 'desc' }, { approvedAt: 'desc' }]);
    });

    it('projection ne contient AUCUN champ privé (legalName, salesEmail, companyId, rejectionReason)', async () => {
      prisma.sellerProfile.findMany.mockResolvedValue([fakeSeller()]);
      prisma.sellerProfile.count.mockResolvedValue(1);

      const res = await service.listSellers({});

      // Vérifie que le `select` Prisma n'a PAS demandé ces champs.
      const select = prisma.sellerProfile.findMany.mock.calls[0][0].select;
      expect(select).not.toHaveProperty('legalName');
      expect(select).not.toHaveProperty('companyId');
      expect(select).not.toHaveProperty('salesEmail');
      expect(select).not.toHaveProperty('salesPhone');
      expect(select).not.toHaveProperty('rejectionReason');
      expect(select).not.toHaveProperty('suspendedAt');
      expect(select).not.toHaveProperty('createdById');
      expect(select).not.toHaveProperty('updatedById');
      expect(select).not.toHaveProperty('approvedAt');
      expect(select).not.toHaveProperty('story');
      expect(select).not.toHaveProperty('descriptionLong');
      expect(select).not.toHaveProperty('languages');
      expect(select).not.toHaveProperty('website');

      // Et que la projection (data[0]) n'expose pas ces champs non plus.
      const item = res.data[0];
      expect(item).not.toHaveProperty('legalName');
      expect(item).not.toHaveProperty('companyId');
      expect(item).not.toHaveProperty('salesEmail');
      expect(item).not.toHaveProperty('salesPhone');
      expect(item).not.toHaveProperty('rejectionReason');
      expect(item).not.toHaveProperty('suspendedAt');
      expect(item).not.toHaveProperty('createdById');
      expect(item).not.toHaveProperty('updatedById');
      expect(item).not.toHaveProperty('approvedAt');
      expect(item).toHaveProperty('publishedProductsCount');
    });
  });

  // ── findProductsWithPrimaryMedia ─────────────────────────────────────────

  describe('findProductsWithPrimaryMedia', () => {
    it('filtre MediaAsset sur relatedType=MARKETPLACE_PRODUCT + role=PRIMARY + APPROVED', async () => {
      prisma.mediaAsset.findMany.mockResolvedValue([]);
      prisma.marketplaceOffer.findMany.mockResolvedValue([]);
      prisma.marketplaceOffer.count.mockResolvedValue(0);
      await service.findCatalog({});
      const where = prisma.mediaAsset.findMany.mock.calls[0][0].where;
      expect(where.relatedType).toBe(MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT);
      expect(where.role).toBe(MediaAssetRole.PRIMARY);
      expect(where.moderationStatus).toBe(MediaModerationStatus.APPROVED);
    });
  });
});
