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
  DocumentStatus,
  EntityType,
  ProductStatus,
  QuoteRequestStatus,
  SellerProfileStatus,
  MarketplacePublicationStatus,
  MarketplaceDocumentVisibility,
  MarketplacePriceMode,
  MarketplaceVisibilityScope,
  ExportReadinessStatus,
  MarketplaceVerificationStatus,
  MarketplaceRelatedEntityType,
  MediaAssetRole,
  MediaAssetType,
  MediaModerationStatus,
  Prisma,
} from '@prisma/client';
import {
  DEMO_DATASET,
  smokeSellerEmail,
  SMOKE_BUYER_EMAIL,
  SMOKE_BUYER_COMPANY_CODE,
} from './dataset';

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
    | 'mediaAsset'
    // SEED-DEMO-FIX-3 :
    | 'document'
    | 'marketplaceDocument'
    | 'quoteRequest'
    | 'quoteRequestMessage'
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
  mediaAssets: number;
  // SEED-DEMO-FIX-3
  publicDocs: number;
  quoteRequests: number;
  quoteRequestMessages: number;
  smokeBuyer: string | null;
}

const SMOKE_SELLER_DEFAULT_PASSWORD = 'IoxSmoke2026!';

// SEED-DEMO-FIX-3 — bornes de validité des documents PUBLIC seedés.
const SEED_VALID_FROM = new Date('2025-01-01T00:00:00.000Z');
const SEED_VALID_UNTIL = new Date('2027-12-31T00:00:00.000Z');

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
    mediaAssets: 0,
    publicDocs: 0,
    quoteRequests: 0,
    quoteRequestMessages: 0,
    smokeBuyer: null,
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

    // SEED-DEMO-FIX-2 — bloc commun update/create incluant FP-5/FP-7/FP-8.
    const mpFields = {
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
      // FP-7 — qualité structurée.
      qualityAttributes: p.qualityAttributes,
      // FP-8 — logistique structurée.
      packagingFormats: p.packagingFormats,
      temperatureRequirements: p.temperatureRequirements,
      grossWeight: p.grossWeight,
      netWeight: p.netWeight,
      palletization: p.palletization,
      // FP-5 — volumes & capacités.
      annualProductionCapacity: p.annualProductionCapacity,
      capacityUnit: p.capacityUnit,
      availableQuantity: p.availableQuantity,
      availableQuantityUnit: p.availableQuantityUnit,
      restockFrequency: p.restockFrequency,
      exportReadinessStatus: ExportReadinessStatus.EXPORT_READY,
      publicationStatus: MarketplacePublicationStatus.PUBLISHED,
      publishedAt: p.publishedAt,
      approvedAt: p.publishedAt,
    } as const;

    const mp = await prisma.marketplaceProduct.upsert({
      where: { slug: p.slug },
      update: mpFields,
      create: {
        slug: p.slug,
        productId: product.id,
        sellerProfileId: profileId,
        ...mpFields,
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

  // --- MediaAssets PRIMARY APPROVED placeholders (SEED-DEMO-FIX) -----------
  //
  // Le service `marketplaceProductsApi.publish()` exige au moins 1 MediaAsset
  // role=PRIMARY moderationStatus=APPROVED rattaché au produit avant de
  // basculer en PUBLISHED. Le seed force PUBLISHED via upsert direct
  // (court-circuite ce gate), mais le **catalogue public** filtre sur la
  // présence d'une image PRIMARY APPROVED pour décider quoi afficher — d'où
  // les 0 lignes constatées en pré-prod malgré 8 produits PUBLISHED.
  //
  // On crée un placeholder par produit (relatedType=MARKETPLACE_PRODUCT,
  // role=PRIMARY, moderationStatus=APPROVED). storageKey unique et stable
  // par slug → idempotent : la 2e exécution retombe sur le même asset via
  // findFirst+update. publicUrl pointe vers placehold.co (aucun upload réel
  // requis pour la démo).
  let mediaAssetsCount = 0;
  // L'uploader doit exister : on prend le smoke seller s'il a été créé,
  // sinon on tombe sur le 1er admin disponible (toujours présent dans une
  // DB seedée). Aucun fallback requis quand smokeSellerCreated n'est pas null.
  let uploaderUserId: string | null = null;
  if (smokeSellerCreated) {
    const u = await prisma.user.findUnique({
      where: { email: smokeSellerCreated },
      select: { id: true },
    });
    uploaderUserId = u?.id ?? null;
  }
  if (!uploaderUserId) {
    const fallback = await prisma.user.findFirst({
      where: { role: UserRole.ADMIN },
      select: { id: true },
    });
    uploaderUserId = fallback?.id ?? null;
  }

  if (!uploaderUserId) {
    log(
      '⚠️ Demo seed: aucun utilisateur uploader (smoke seller absent et aucun ADMIN) — MediaAssets ignorés.',
    );
  } else {
    for (const [slug, mpId] of mpProductIdBySlug.entries()) {
      const storageKey = `demo/marketplace-products/${slug}/primary.jpg`;
      const publicUrl = `https://placehold.co/800x600/e5e7eb/6b7280?text=${encodeURIComponent(slug)}`;

      // Pas d'@@unique (relatedType, relatedId, role) côté schéma → upsert
      // manuel via findFirst + update/create. La clé naturelle est la triple
      // (relatedType, relatedId, role=PRIMARY) — un seul PRIMARY par produit
      // par convention.
      const existing = await prisma.mediaAsset.findFirst({
        where: {
          relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
          relatedId: mpId,
          role: MediaAssetRole.PRIMARY,
        },
        select: { id: true },
      });

      const data = {
        mediaType: MediaAssetType.IMAGE,
        role: MediaAssetRole.PRIMARY,
        storageKey,
        publicUrl,
        mimeType: 'image/jpeg',
        sizeBytes: 0,
        altTextFr: `Photo principale (placeholder démo) — ${slug}`,
        altTextEn: `Primary photo (demo placeholder) — ${slug}`,
        sortOrder: 0,
        moderationStatus: MediaModerationStatus.APPROVED,
        moderationReason: null,
      } as const;

      let assetId: string;
      if (existing) {
        await prisma.mediaAsset.update({ where: { id: existing.id }, data });
        assetId = existing.id;
      } else {
        const created = await prisma.mediaAsset.create({
          data: {
            ...data,
            relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
            relatedId: mpId,
            uploadedByUserId: uploaderUserId,
          },
          select: { id: true },
        });
        assetId = created.id;
      }
      mediaAssetsCount++;

      // Lie le mainMediaId du produit à cet asset si pas déjà fait — permet
      // au catalogue de résoudre l'image principale sans nouvelle requête.
      await prisma.marketplaceProduct.update({
        where: { id: mpId },
        data: { mainMediaId: assetId },
      });
    }
  }

  // ─── SEED-DEMO-FIX-3 — MarketplaceDocument PUBLIC ────────────────────────
  //
  // 1 Document MCH par produit demo cible + 1 MarketplaceDocument PUBLIC le
  // référençant. Le filtre catalog `?hasPublicDocs=true` lit cette table.
  // Pas d'unique index `(relatedType, relatedId, documentType)` côté
  // schema → idempotence via lookup `Document.code` (unique implicite via
  // upsert sur `code`) puis `MarketplaceDocument.documentId` (un PUBLIC par
  // document MCH suffit en démo).
  let publicDocsCount = 0;
  if (uploaderUserId) {
    for (const doc of DEMO_DATASET.publicDocuments) {
      const mpId = mpProductIdBySlug.get(doc.productSlug);
      if (!mpId) continue;

      // Document MCH (idempotence via `storageKey` — pas d'unique formel
      // sur le schéma, mais le storageKey est unique par convention seed).
      // Le seed n'a pas l'autonomie de créer un fichier réel : storageKey
      // pointe vers un placeholder, sizeBytes synthétique. Suffisant pour
      // la démo (le filtre catalog ne télécharge pas le fichier).
      const existingDoc = await prisma.document.findFirst({
        where: { storageKey: doc.storageKey },
        select: { id: true },
      });
      const mchDoc = existingDoc
        ? await prisma.document.update({
            where: { id: existingDoc.id },
            data: { name: doc.documentName, status: DocumentStatus.ACTIVE },
          })
        : await prisma.document.create({
            data: {
              name: doc.documentName,
              originalFilename: doc.documentName,
              mimeType: 'application/pdf',
              storageKey: doc.storageKey,
              sizeBytes: doc.fileSize,
              status: DocumentStatus.ACTIVE,
              linkedEntityType: EntityType.MARKETPLACE_PRODUCT,
              linkedEntityId: mpId,
            },
          });

      // MarketplaceDocument (1 PUBLIC par produit). Idempotence via
      // findFirst sur (relatedId + documentId).
      const existing = await prisma.marketplaceDocument.findFirst({
        where: {
          relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
          relatedId: mpId,
          documentId: mchDoc.id,
        },
        select: { id: true },
      });
      const data = {
        title: doc.marketplaceTitle,
        documentType: doc.documentType,
        visibility: MarketplaceDocumentVisibility.PUBLIC,
        verificationStatus: MarketplaceVerificationStatus.VERIFIED,
        validFrom: SEED_VALID_FROM,
        validUntil: SEED_VALID_UNTIL,
      } as const;
      if (existing) {
        await prisma.marketplaceDocument.update({ where: { id: existing.id }, data });
      } else {
        await prisma.marketplaceDocument.create({
          data: {
            ...data,
            relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
            relatedId: mpId,
            documentId: mchDoc.id,
            createdById: uploaderUserId,
          },
        });
      }
      publicDocsCount++;
    }
  } else {
    log('⚠️ Demo seed: aucun uploader → skip MarketplaceDocument PUBLIC.');
  }

  // ─── SEED-DEMO-FIX-3 — Smoke buyer + Company ─────────────────────────────
  let smokeBuyerCreated: string | null = null;
  let smokeBuyerUserId: string | null = null;
  {
    const smokeBuyerPassword = env.SMOKE_SELLER_PASSWORD ?? SMOKE_SELLER_DEFAULT_PASSWORD;
    const smokeBuyerHash = await bcrypt.hash(smokeBuyerPassword, 10);

    const buyerCompany = await prisma.company.upsert({
      where: { code: SMOKE_BUYER_COMPANY_CODE },
      update: { name: 'Acme Foods Importer (demo)', country: 'FR', isActive: true },
      create: {
        code: SMOKE_BUYER_COMPANY_CODE,
        name: 'Acme Foods Importer (demo)',
        types: ['BUYER'],
        country: 'FR',
        city: 'Paris',
        isActive: true,
      },
    });

    const buyerUser = await prisma.user.upsert({
      where: { email: SMOKE_BUYER_EMAIL },
      update: {
        passwordHash: smokeBuyerHash,
        role: UserRole.MARKETPLACE_BUYER,
      },
      create: {
        email: SMOKE_BUYER_EMAIL,
        passwordHash: smokeBuyerHash,
        firstName: 'Smoke',
        lastName: 'Buyer',
        role: UserRole.MARKETPLACE_BUYER,
      },
    });

    await prisma.userCompanyMembership.upsert({
      where: {
        userId_companyId: { userId: buyerUser.id, companyId: buyerCompany.id },
      },
      update: { isPrimary: true },
      create: {
        userId: buyerUser.id,
        companyId: buyerCompany.id,
        isPrimary: true,
      },
    });

    smokeBuyerCreated = SMOKE_BUYER_EMAIL;
    smokeBuyerUserId = buyerUser.id;
  }

  // ─── SEED-DEMO-FIX-3 — QuoteRequest + QuoteRequestMessage ────────────────
  //
  // Pas d'index unique sur RFQ (buyer x offer) → idempotence via le
  // findFirst sur le triplet (buyerCompanyId, marketplaceOfferId, message)
  // approximé par le `seedKey` injecté en `targetMarket` (champ utilisé
  // comme tag interne — pas affiché côté UI).
  let rfqCount = 0;
  let rfqMessagesCount = 0;
  if (smokeBuyerUserId) {
    const buyerCompany = await prisma.company.findUnique({
      where: { code: SMOKE_BUYER_COMPANY_CODE },
      select: { id: true },
    });
    if (!buyerCompany) {
      throw new Error('Demo seed: smoke-buyer Company introuvable post-upsert');
    }

    for (const rfqDef of DEMO_DATASET.quoteRequests) {
      // Localiser l'offre cible : 1ère offre publiable du produit demo.
      const mpId = mpProductIdBySlug.get(rfqDef.productSlug);
      if (!mpId) continue;
      const targetOffer = await prisma.marketplaceOffer.findFirst({
        where: { marketplaceProductId: mpId },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      });
      if (!targetOffer) continue;

      const existingRfq = await prisma.quoteRequest.findFirst({
        where: {
          buyerCompanyId: buyerCompany.id,
          marketplaceOfferId: targetOffer.id,
          targetMarket: rfqDef.seedKey,
        },
        select: { id: true },
      });
      const rfqData = {
        requestedQuantity: new Prisma.Decimal(rfqDef.requestedQuantity),
        requestedUnit: rfqDef.requestedUnit,
        deliveryCountry: rfqDef.deliveryCountry,
        targetMarket: rfqDef.seedKey,
        message: rfqDef.initialMessage,
        status: QuoteRequestStatus[rfqDef.status],
      } as const;

      let rfqId: string;
      if (existingRfq) {
        await prisma.quoteRequest.update({ where: { id: existingRfq.id }, data: rfqData });
        rfqId = existingRfq.id;
      } else {
        const created = await prisma.quoteRequest.create({
          data: {
            ...rfqData,
            buyerCompanyId: buyerCompany.id,
            buyerUserId: smokeBuyerUserId,
            marketplaceOfferId: targetOffer.id,
          },
          select: { id: true },
        });
        rfqId = created.id;
      }
      rfqCount++;

      // 2 messages par RFQ : init buyer + reply seller. Auteurs :
      // smokeBuyerUserId pour init, smoke-seller pour la reply (déjà créé
      // avant — uploaderUserId fallback admin si absent).
      const sellerAuthorId = uploaderUserId ?? smokeBuyerUserId;

      const messages = [
        { authorUserId: smokeBuyerUserId, message: rfqDef.initialMessage },
        { authorUserId: sellerAuthorId, message: rfqDef.sellerReply },
      ];
      for (const m of messages) {
        const existingMsg = await prisma.quoteRequestMessage.findFirst({
          where: {
            quoteRequestId: rfqId,
            authorUserId: m.authorUserId,
            message: m.message,
          },
          select: { id: true },
        });
        if (!existingMsg) {
          await prisma.quoteRequestMessage.create({
            data: {
              quoteRequestId: rfqId,
              authorUserId: m.authorUserId,
              message: m.message,
              isInternalNote: false,
            },
          });
        }
        rfqMessagesCount++;
      }
    }
  }

  log(
    `✅ Demo seed done — sellers: ${sellersCount}, products: ${productsCount}, offers: ${offersCount}, certifications: ${certsCount}, mediaAssets: ${mediaAssetsCount}, publicDocs: ${publicDocsCount}, quoteRequests: ${rfqCount}, quoteRequestMessages: ${rfqMessagesCount}, smokeSeller: ${smokeSellerCreated ?? 'n/a'}, smokeBuyer: ${smokeBuyerCreated ?? 'n/a'}`,
  );

  return {
    enabled: true,
    sellers: sellersCount,
    products: productsCount,
    offers: offersCount,
    certifications: certsCount,
    smokeSeller: smokeSellerCreated,
    mediaAssets: mediaAssetsCount,
    publicDocs: publicDocsCount,
    quoteRequests: rfqCount,
    quoteRequestMessages: rfqMessagesCount,
    smokeBuyer: smokeBuyerCreated,
  };
}
