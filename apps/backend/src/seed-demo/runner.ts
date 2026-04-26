/**
 * SEED-DEMO — runner idempotent du jeu de fixtures marketplace.
 *
 * Conçu pour la **pré-production uniquement** : peuple la base avec un
 * dataset cohérent (4 sellers APPROVED, 8 produits PUBLISHED, 8 offres,
 * certifs, 1 compte smoke-seller) afin de rendre la marketplace
 * démontrable / testable en black-box.
 *
 * Garde-fous :
 *   1. `IOX_DEMO_SEED !== '1'`                       → no-op silencieux.
 *   2. `NODE_ENV === 'production'` sans `IOX_DEMO_SEED=1` → throw.
 *      (le flag est un double opt-in explicite pour autoriser la prod —
 *      à n'utiliser que sur les environnements de démo, JAMAIS sur la prod
 *      réelle).
 *
 * Idempotence : toutes les écritures passent par `upsert` sur des clés
 * naturelles préfixées `demo-` (slugs, codes). Ré-exécution = 0 nouvelle
 * entité, mêmes IDs.
 */
import * as bcrypt from 'bcryptjs';
import {
  PrismaClient,
  UserRole,
  BeneficiaryStatus,
  ProductStatus,
  SellerProfileStatus,
  MarketplacePublicationStatus,
  MarketplacePriceMode,
  MarketplaceVisibilityScope,
  ExportReadinessStatus,
  MarketplaceVerificationStatus,
  MarketplaceRelatedEntityType,
} from '@prisma/client';
import { DEMO_DATASET, smokeSellerEmail } from './dataset';

export interface RunnerEnv {
  IOX_DEMO_SEED?: string;
  NODE_ENV?: string;
  SMOKE_SELLER_PASSWORD?: string;
}

export interface RunnerOptions {
  prisma: Pick<
    PrismaClient,
    | 'user'
    | 'company'
    | 'userCompanyMembership'
    | 'beneficiary'
    | 'product'
    | 'sellerProfile'
    | 'marketplaceProduct'
    | 'marketplaceOffer'
    | 'certification'
  >;
  env: RunnerEnv;
  log?: (msg: string) => void;
}

export interface RunnerSummary {
  enabled: boolean;
  sellers: number;
  products: number;
  offers: number;
  certifications: number;
  smokeSeller: string | null;
}

const SMOKE_SELLER_DEFAULT_PASSWORD = 'IoxSmoke2026!';

/**
 * Vérifie les garde-fous d'environnement.
 * - throw si NODE_ENV=production ET IOX_DEMO_SEED!=1.
 * - retourne `false` si IOX_DEMO_SEED!=1 (no-op désiré).
 * - retourne `true` si l'exécution est autorisée.
 */
export function shouldRun(env: RunnerEnv): boolean {
  const flagOn = env.IOX_DEMO_SEED === '1';
  if (env.NODE_ENV === 'production' && !flagOn) {
    throw new Error(
      'Demo seed disabled in production. Set IOX_DEMO_SEED=1 to override (use only on demo/preprod environments).',
    );
  }
  return flagOn;
}

export async function runDemoSeed(opts: RunnerOptions): Promise<RunnerSummary> {
  const log = opts.log ?? (() => {});
  const empty: RunnerSummary = {
    enabled: false,
    sellers: 0,
    products: 0,
    offers: 0,
    certifications: 0,
    smokeSeller: null,
  };

  if (!shouldRun(opts.env)) {
    log('Demo seed skipped (set IOX_DEMO_SEED=1 to enable).');
    return empty;
  }

  const { prisma, env } = opts;
  log('🌱 Demo seed starting…');

  // --- Sellers (Company + SellerProfile + Beneficiary) ----------------------
  let sellersCount = 0;
  const sellerProfileIdBySlug = new Map<string, string>();

  for (const s of DEMO_DATASET.sellers) {
    const company = await prisma.company.upsert({
      where: { code: s.companyCode },
      update: {
        name: s.companyName,
        country: s.country,
        city: s.cityOrZone ?? undefined,
        isActive: true,
      },
      create: {
        code: s.companyCode,
        name: s.companyName,
        types: ['SUPPLIER', 'COOPERATIVE'],
        country: s.country,
        city: s.cityOrZone ?? undefined,
        isActive: true,
      },
    });

    // Beneficiary requis pour ancrer les Products MCH.
    await prisma.beneficiary.upsert({
      where: { code: s.beneficiaryCode },
      update: { name: s.companyName, status: BeneficiaryStatus.IN_PROGRESS },
      create: {
        code: s.beneficiaryCode,
        name: s.companyName,
        type: 'producteur',
        status: BeneficiaryStatus.IN_PROGRESS,
        sector: s.sector,
        city: s.cityOrZone ?? undefined,
      },
    });

    const profile = await prisma.sellerProfile.upsert({
      where: { slug: s.slug },
      update: {
        publicDisplayName: s.publicDisplayName,
        descriptionShort: s.descriptionShort,
        descriptionLong: s.descriptionLong,
        country: s.country,
        region: s.region,
        cityOrZone: s.cityOrZone,
        supportedIncoterms: s.supportedIncoterms,
        destinationsServed: s.destinationsServed,
        averageLeadTimeDays: s.averageLeadTimeDays,
        isFeatured: s.isFeatured,
        logoMediaId: s.logoMediaId,
        bannerMediaId: s.bannerMediaId,
        status: SellerProfileStatus.APPROVED,
        approvedAt: s.approvedAt,
      },
      create: {
        companyId: company.id,
        slug: s.slug,
        publicDisplayName: s.publicDisplayName,
        descriptionShort: s.descriptionShort,
        descriptionLong: s.descriptionLong,
        country: s.country,
        region: s.region,
        cityOrZone: s.cityOrZone,
        supportedIncoterms: s.supportedIncoterms,
        destinationsServed: s.destinationsServed,
        averageLeadTimeDays: s.averageLeadTimeDays,
        isFeatured: s.isFeatured,
        logoMediaId: s.logoMediaId,
        bannerMediaId: s.bannerMediaId,
        status: SellerProfileStatus.APPROVED,
        approvedAt: s.approvedAt,
      },
    });
    sellerProfileIdBySlug.set(s.slug, profile.id);
    sellersCount++;
  }

  // --- Produits + MarketplaceProducts + Offres ------------------------------
  let productsCount = 0;
  let offersCount = 0;
  const mpProductIdBySlug = new Map<string, string>();

  for (const p of DEMO_DATASET.products) {
    const profileId = sellerProfileIdBySlug.get(p.sellerSlug);
    if (!profileId) {
      throw new Error(`Demo seed: unknown seller slug '${p.sellerSlug}' in product '${p.slug}'`);
    }
    const benef = await prisma.beneficiary.findUnique({
      where: { code: p.beneficiaryCode },
    });
    if (!benef) {
      throw new Error(`Demo seed: missing beneficiary '${p.beneficiaryCode}' for product '${p.slug}'`);
    }

    const product = await prisma.product.upsert({
      where: { code: p.productCode },
      update: {
        name: p.commercialName,
        category: p.category,
        description: p.descriptionShort,
        status: ProductStatus.COMPLIANT,
      },
      create: {
        code: p.productCode,
        name: p.commercialName,
        category: p.category,
        description: p.descriptionShort,
        status: ProductStatus.COMPLIANT,
        beneficiaryId: benef.id,
      },
    });

    const mp = await prisma.marketplaceProduct.upsert({
      where: { slug: p.slug },
      update: {
        commercialName: p.commercialName,
        subtitle: p.subtitle,
        originCountry: p.originCountry,
        originRegion: p.originRegion,
        originLocality: p.originLocality,
        altitudeMeters: p.altitudeMeters,
        gpsLat: p.gpsLat,
        gpsLng: p.gpsLng,
        varietySpecies: p.varietySpecies,
        productionMethod: p.productionMethod,
        descriptionShort: p.descriptionShort,
        descriptionLong: p.descriptionLong,
        packagingDescription: p.packagingDescription,
        defaultUnit: p.defaultUnit,
        minimumOrderQuantity: p.minimumOrderQuantity,
        harvestMonths: p.harvestMonths,
        availabilityMonths: p.availabilityMonths,
        isYearRound: p.isYearRound,
        exportReadinessStatus: ExportReadinessStatus.EXPORT_READY,
        publicationStatus: MarketplacePublicationStatus.PUBLISHED,
        publishedAt: p.publishedAt,
        approvedAt: p.publishedAt,
      },
      create: {
        slug: p.slug,
        productId: product.id,
        sellerProfileId: profileId,
        commercialName: p.commercialName,
        subtitle: p.subtitle,
        originCountry: p.originCountry,
        originRegion: p.originRegion,
        originLocality: p.originLocality,
        altitudeMeters: p.altitudeMeters,
        gpsLat: p.gpsLat,
        gpsLng: p.gpsLng,
        varietySpecies: p.varietySpecies,
        productionMethod: p.productionMethod,
        descriptionShort: p.descriptionShort,
        descriptionLong: p.descriptionLong,
        packagingDescription: p.packagingDescription,
        defaultUnit: p.defaultUnit,
        minimumOrderQuantity: p.minimumOrderQuantity,
        harvestMonths: p.harvestMonths,
        availabilityMonths: p.availabilityMonths,
        isYearRound: p.isYearRound,
        exportReadinessStatus: ExportReadinessStatus.EXPORT_READY,
        publicationStatus: MarketplacePublicationStatus.PUBLISHED,
        publishedAt: p.publishedAt,
        approvedAt: p.publishedAt,
      },
    });
    mpProductIdBySlug.set(p.slug, mp.id);
    productsCount++;

    // Une offre par produit, slug d'offre dérivé : `${productSlug}-offer-1`.
    // On utilise le titre comme clé naturelle (pas d'unique sur slug d'offre,
    // mais l'offre est cherchée par marketplaceProductId+title via findFirst).
    const offerTitle = `${p.commercialName} — offre principale`;
    const existing = await prisma.marketplaceOffer.findFirst({
      where: { marketplaceProductId: mp.id, title: offerTitle },
      select: { id: true },
    });
    const offerData = {
      title: offerTitle,
      shortDescription: p.descriptionShort,
      priceMode: p.offer.priceMode,
      unitPrice: p.offer.unitPrice,
      currency: p.offer.unitPrice ? 'EUR' : null,
      moq: p.offer.moq,
      availableQuantity: p.offer.availableQuantity,
      leadTimeDays: p.offer.leadTimeDays,
      incoterm: p.offer.incoterm,
      destinationMarketsJson: p.offer.destinationMarketsJson,
      visibilityScope: MarketplaceVisibilityScope.PUBLIC,
      exportReadinessStatus: ExportReadinessStatus.EXPORT_READY,
      publicationStatus: MarketplacePublicationStatus.PUBLISHED,
      approvedAt: p.publishedAt,
      publishedAt: p.publishedAt,
    } as const;
    if (existing) {
      await prisma.marketplaceOffer.update({
        where: { id: existing.id },
        data: offerData,
      });
    } else {
      await prisma.marketplaceOffer.create({
        data: {
          ...offerData,
          marketplaceProductId: mp.id,
          sellerProfileId: profileId,
        },
      });
    }
    offersCount++;
  }

  // --- Certifications -------------------------------------------------------
  let certsCount = 0;
  for (const c of DEMO_DATASET.certifications) {
    let relatedId: string | undefined;
    if (c.scope === 'SELLER_PROFILE') {
      relatedId = sellerProfileIdBySlug.get(c.relatedSlug);
    } else {
      relatedId = mpProductIdBySlug.get(c.relatedSlug);
    }
    if (!relatedId) {
      throw new Error(
        `Demo seed: cannot resolve relatedId for certification ${c.scope}/${c.relatedSlug}`,
      );
    }
    const relatedType =
      c.scope === 'SELLER_PROFILE'
        ? MarketplaceRelatedEntityType.SELLER_PROFILE
        : MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT;

    await prisma.certification.upsert({
      where: {
        uniq_certification_scope_type_code: {
          relatedType,
          relatedId,
          type: c.type,
          code: c.code,
        },
      },
      update: {
        issuingBody: c.issuingBody,
        validFrom: c.validFrom,
        validUntil: c.validUntil,
        verificationStatus: MarketplaceVerificationStatus.VERIFIED,
        verifiedAt: c.validFrom,
      },
      create: {
        relatedType,
        relatedId,
        type: c.type,
        code: c.code,
        issuingBody: c.issuingBody,
        validFrom: c.validFrom,
        validUntil: c.validUntil,
        verificationStatus: MarketplaceVerificationStatus.VERIFIED,
        verifiedAt: c.validFrom,
      },
    });
    certsCount++;
  }

  // --- Smoke seller user (rattaché au 1er seller demo) ----------------------
  let smokeSellerCreated: string | null = null;
  const firstSeller = DEMO_DATASET.sellers[0];
  if (firstSeller) {
    const smokePassword = env.SMOKE_SELLER_PASSWORD ?? SMOKE_SELLER_DEFAULT_PASSWORD;
    const passwordHash = await bcrypt.hash(smokePassword, 10);
    const smokeUser = await prisma.user.upsert({
      where: { email: smokeSellerEmail },
      update: {
        passwordHash,
        role: UserRole.MARKETPLACE_SELLER,
      },
      create: {
        email: smokeSellerEmail,
        passwordHash,
        firstName: 'Smoke',
        lastName: 'Seller',
        role: UserRole.MARKETPLACE_SELLER,
      },
    });
    const company = await prisma.company.findUnique({
      where: { code: firstSeller.companyCode },
      select: { id: true },
    });
    if (company) {
      await prisma.userCompanyMembership.upsert({
        where: {
          userId_companyId: { userId: smokeUser.id, companyId: company.id },
        },
        update: { isPrimary: true },
        create: {
          userId: smokeUser.id,
          companyId: company.id,
          isPrimary: true,
        },
      });
    }
    smokeSellerCreated = smokeSellerEmail;
  }

  log(
    `✅ Demo seed done — sellers: ${sellersCount}, products: ${productsCount}, offers: ${offersCount}, certifications: ${certsCount}, smokeSeller: ${smokeSellerCreated ?? 'n/a'}`,
  );

  return {
    enabled: true,
    sellers: sellersCount,
    products: productsCount,
    offers: offersCount,
    certifications: certsCount,
    smokeSeller: smokeSellerCreated,
  };
}
