/**
 * SEED-DEMO — couverture du runner.
 *
 * On mock entièrement le client Prisma : aucun accès DB. Les tests
 * ciblent les garde-fous (flag, NODE_ENV) et l'idempotence comportementale
 * (la 2ᵉ exécution ne crée rien — la résolution des `findFirst` /
 * `findUnique` retourne les entités déjà présentes).
 */
import { runDemoSeed, shouldRun, RunnerOptions } from './runner';
import { DEMO_DATASET } from './dataset';

interface MockedPrisma {
  user: { upsert: jest.Mock; findUnique: jest.Mock; findFirst: jest.Mock };
  company: { upsert: jest.Mock; findUnique: jest.Mock };
  userCompanyMembership: { upsert: jest.Mock };
  beneficiary: { upsert: jest.Mock; findUnique: jest.Mock };
  product: { upsert: jest.Mock };
  sellerProfile: { upsert: jest.Mock };
  marketplaceProduct: { upsert: jest.Mock; update: jest.Mock };
  marketplaceOffer: {
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  certification: { upsert: jest.Mock };
  mediaAsset: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
  // SEED-DEMO-FIX-3
  document: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
  marketplaceDocument: {
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  quoteRequest: {
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  quoteRequestMessage: { findFirst: jest.Mock; create: jest.Mock };
  // M62-DEMO
  payment: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
  invoice: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
}

// Nombre de RFQ WON dans le dataset (ont un paymentAmountCents).
const WON_RFQ_COUNT = DEMO_DATASET.quoteRequests.filter(
  (r) => r.status === 'WON' && r.paymentAmountCents,
).length;

// Nombre de documents de conformité seedés pour le smoke-seller.
const COMPLIANCE_DOCS_COUNT = 3;


function makePrismaMock(opts: {
  offerExists?: boolean;
  mediaAssetExists?: boolean;
  publicDocExists?: boolean;
  rfqExists?: boolean;
  rfqMessageExists?: boolean;
  paymentExists?: boolean;
  invoiceExists?: boolean;
} = {}): MockedPrisma {
  // Les upserts renvoient un objet avec `id` dérivé de la clé naturelle —
  // suffisant pour que le runner enchaîne les FK.
  const upsertReturning = (idField: 'slug' | 'code' | 'email' = 'slug') =>
    jest.fn().mockImplementation(({ where, create }: any) => {
      const key = where[idField] ?? where.code ?? where.slug ?? where.email ?? 'mock-id';
      return Promise.resolve({ id: `mock-${key}`, ...create, ...where });
    });

  return {
    user: {
      upsert: jest.fn().mockResolvedValue({ id: 'mock-smoke-user-id' }),
      // SEED-DEMO-FIX : le runner cherche le smoke seller pour devenir
      // l'uploader des MediaAssets PRIMARY APPROVED.
      findUnique: jest.fn().mockResolvedValue({ id: 'mock-smoke-user-id' }),
      findFirst: jest.fn().mockResolvedValue({ id: 'mock-admin-user-id' }),
    },
    company: {
      upsert: upsertReturning('code'),
      findUnique: jest
        .fn()
        .mockImplementation(({ where }: any) =>
          Promise.resolve({ id: `mock-${where.code}` }),
        ),
    },
    userCompanyMembership: { upsert: jest.fn().mockResolvedValue({}) },
    beneficiary: {
      upsert: upsertReturning('code'),
      findUnique: jest
        .fn()
        .mockImplementation(({ where }: any) =>
          Promise.resolve({ id: `mock-${where.code}` }),
        ),
    },
    product: { upsert: upsertReturning('code') },
    sellerProfile: { upsert: upsertReturning('slug') },
    marketplaceProduct: {
      upsert: upsertReturning('slug'),
      // SEED-DEMO-FIX : le runner met à jour `mainMediaId` après création
      // du MediaAsset PRIMARY.
      update: jest.fn().mockResolvedValue({ id: 'mock-mp-id' }),
    },
    marketplaceOffer: {
      // findFirst sert deux usages :
      //  1. recherche "offre principale du produit" (looks up `where.marketplaceProductId`)
      //     → renvoie toujours un id pour permettre au RFQ-seed de cibler l'offre.
      //  2. recherche "offre déjà créée pour ce produit + ce title" (looks up `where.title`)
      //     → respecte `opts.offerExists` (existante vs nouvelle).
      findFirst: jest.fn().mockImplementation(({ where }: { where: Record<string, unknown> }) => {
        if (where && 'title' in where) {
          return Promise.resolve(opts.offerExists ? { id: 'existing-offer-id' } : null);
        }
        return Promise.resolve({ id: 'mock-offer-id' });
      }),
      create: jest.fn().mockResolvedValue({ id: 'mock-offer-id' }),
      update: jest.fn().mockResolvedValue({ id: 'existing-offer-id' }),
    },
    certification: { upsert: jest.fn().mockResolvedValue({ id: 'mock-cert-id' }) },
    mediaAsset: {
      findFirst: jest
        .fn()
        .mockResolvedValue(opts.mediaAssetExists ? { id: 'existing-media-id' } : null),
      create: jest.fn().mockResolvedValue({ id: 'mock-media-id' }),
      update: jest.fn().mockResolvedValue({ id: 'existing-media-id' }),
    },
    // SEED-DEMO-FIX-3
    document: {
      findFirst: jest
        .fn()
        .mockResolvedValue(opts.publicDocExists ? { id: 'existing-doc-id' } : null),
      create: jest.fn().mockResolvedValue({ id: 'mock-doc-id' }),
      update: jest.fn().mockResolvedValue({ id: 'existing-doc-id' }),
    },
    marketplaceDocument: {
      findFirst: jest
        .fn()
        .mockResolvedValue(opts.publicDocExists ? { id: 'existing-mp-doc-id' } : null),
      create: jest.fn().mockResolvedValue({ id: 'mock-mp-doc-id' }),
      update: jest.fn().mockResolvedValue({ id: 'existing-mp-doc-id' }),
    },
    quoteRequest: {
      findFirst: jest
        .fn()
        .mockResolvedValue(opts.rfqExists ? { id: 'existing-rfq-id' } : null),
      create: jest.fn().mockResolvedValue({ id: 'mock-rfq-id' }),
      update: jest.fn().mockResolvedValue({ id: 'existing-rfq-id' }),
    },
    quoteRequestMessage: {
      findFirst: jest
        .fn()
        .mockResolvedValue(opts.rfqMessageExists ? { id: 'existing-msg-id' } : null),
      create: jest.fn().mockResolvedValue({ id: 'mock-msg-id' }),
    },
    // M62-DEMO
    payment: {
      findFirst: jest
        .fn()
        .mockResolvedValue(opts.paymentExists ? { id: 'existing-payment-id' } : null),
      create: jest.fn().mockResolvedValue({ id: 'mock-payment-id' }),
      update: jest.fn().mockResolvedValue({ id: 'existing-payment-id' }),
    },
    invoice: {
      findFirst: jest
        .fn()
        .mockResolvedValue(opts.invoiceExists ? { id: 'existing-invoice-id' } : null),
      create: jest.fn().mockResolvedValue({ id: 'mock-invoice-id' }),
      update: jest.fn().mockResolvedValue({ id: 'existing-invoice-id' }),
    },
  };
}

function buildOpts(env: Record<string, string | undefined>, prismaMock?: MockedPrisma): RunnerOptions {
  return {
    prisma: (prismaMock ?? makePrismaMock()) as unknown as RunnerOptions['prisma'],
    env,
    log: () => {},
  };
}

describe('SEED-DEMO runner', () => {
  describe('safeguards', () => {
    it('IOX_DEMO_SEED absent + NODE_ENV=development → no-op, aucune écriture Prisma', async () => {
      const prismaMock = makePrismaMock();
      const summary = await runDemoSeed(buildOpts({ NODE_ENV: 'development' }, prismaMock));
      expect(summary.enabled).toBe(false);
      expect(prismaMock.company.upsert).not.toHaveBeenCalled();
      expect(prismaMock.sellerProfile.upsert).not.toHaveBeenCalled();
      expect(prismaMock.marketplaceProduct.upsert).not.toHaveBeenCalled();
      expect(prismaMock.user.upsert).not.toHaveBeenCalled();
    });

    it('NODE_ENV=production sans IOX_DEMO_SEED → throw avec message explicite', () => {
      expect(() => shouldRun({ NODE_ENV: 'production' })).toThrow(
        /Demo seed disabled in production/,
      );
    });

    it('NODE_ENV=production + IOX_DEMO_SEED=1 → autorisé (exécute les upserts)', async () => {
      const prismaMock = makePrismaMock();
      const summary = await runDemoSeed(
        buildOpts({ NODE_ENV: 'production', IOX_DEMO_SEED: '1' }, prismaMock),
      );
      expect(summary.enabled).toBe(true);
      expect(prismaMock.sellerProfile.upsert).toHaveBeenCalledTimes(
        DEMO_DATASET.sellers.length,
      );
    });
  });

  describe('exécution gardée', () => {
    it('IOX_DEMO_SEED=1 → upserts cohérents avec la cardinalité du dataset', async () => {
      const prismaMock = makePrismaMock();
      const summary = await runDemoSeed(
        buildOpts({ IOX_DEMO_SEED: '1' }, prismaMock),
      );
      expect(summary).toMatchObject({
        enabled: true,
        sellers: DEMO_DATASET.sellers.length,
        products: DEMO_DATASET.products.length,
        offers: DEMO_DATASET.products.length,
        certifications: DEMO_DATASET.certifications.length,
        smokeSeller: 'smoke-seller@iox.mch',
        // SEED-DEMO-FIX : 1 MediaAsset PRIMARY APPROVED par produit demo.
        mediaAssets: DEMO_DATASET.products.length,
        // M62-DEMO : 1 Payment + 1 Invoice pour la RFQ WON, 3 compliance docs.
        payments: WON_RFQ_COUNT,
        invoices: WON_RFQ_COUNT,
        sellerComplianceDocs: COMPLIANCE_DOCS_COUNT,
      });
      // SEED-DEMO-FIX-3 : +1 Company pour le smoke-buyer.
      expect(prismaMock.company.upsert).toHaveBeenCalledTimes(
        DEMO_DATASET.sellers.length + 1,
      );
      expect(prismaMock.product.upsert).toHaveBeenCalledTimes(
        DEMO_DATASET.products.length,
      );
      expect(prismaMock.certification.upsert).toHaveBeenCalledTimes(
        DEMO_DATASET.certifications.length,
      );
      // Tous les sellers seedés sont APPROVED (sinon ils n'apparaîtraient pas
      // dans MP-S-INDEX). On valide la donnée passée au upsert.
      const calls = prismaMock.sellerProfile.upsert.mock.calls;
      for (const [arg] of calls) {
        expect(arg.create.status).toBe('APPROVED');
        expect(arg.update.status).toBe('APPROVED');
      }
    });

    it('idempotence : 2ᵉ run avec offres déjà présentes → aucun create offer (uniquement update)', async () => {
      const prismaMock = makePrismaMock({ offerExists: true });
      await runDemoSeed(buildOpts({ IOX_DEMO_SEED: '1' }, prismaMock));
      expect(prismaMock.marketplaceOffer.create).not.toHaveBeenCalled();
      expect(prismaMock.marketplaceOffer.update).toHaveBeenCalledTimes(
        DEMO_DATASET.products.length,
      );
      // Les autres entités passent par upsert — donc 100% idempotent par
      // construction (Prisma résout automatiquement à un update si la clé
      // existe déjà).
      expect(prismaMock.sellerProfile.upsert).toHaveBeenCalledTimes(
        DEMO_DATASET.sellers.length,
      );
    });
  });

  describe('SEED-DEMO-FIX — MediaAssets PRIMARY APPROVED', () => {
    it('crée 1 MediaAsset PRIMARY APPROVED par produit demo (1ʳᵉ exécution)', async () => {
      const prismaMock = makePrismaMock();
      const summary = await runDemoSeed(buildOpts({ IOX_DEMO_SEED: '1' }, prismaMock));
      expect(summary.mediaAssets).toBe(DEMO_DATASET.products.length);
      expect(prismaMock.mediaAsset.create).toHaveBeenCalledTimes(
        DEMO_DATASET.products.length,
      );
      expect(prismaMock.mediaAsset.update).not.toHaveBeenCalled();

      // Tous les assets créés sont role=PRIMARY moderationStatus=APPROVED
      for (const [arg] of prismaMock.mediaAsset.create.mock.calls) {
        expect(arg.data.role).toBe('PRIMARY');
        expect(arg.data.moderationStatus).toBe('APPROVED');
        expect(arg.data.relatedType).toBe('MARKETPLACE_PRODUCT');
        expect(arg.data.uploadedByUserId).toBe('mock-smoke-user-id');
      }

      // mainMediaId est lié à l'asset après création
      expect(prismaMock.marketplaceProduct.update).toHaveBeenCalledTimes(
        DEMO_DATASET.products.length,
      );
      const mpUpdateCall = prismaMock.marketplaceProduct.update.mock.calls[0][0];
      expect(mpUpdateCall.data.mainMediaId).toBe('mock-media-id');
    });

    it("idempotent : 2ᵉ exécution avec MediaAssets déjà présents → 0 create, N updates", async () => {
      const prismaMock = makePrismaMock({ mediaAssetExists: true });
      const summary = await runDemoSeed(buildOpts({ IOX_DEMO_SEED: '1' }, prismaMock));
      expect(summary.mediaAssets).toBe(DEMO_DATASET.products.length);
      expect(prismaMock.mediaAsset.create).not.toHaveBeenCalled();
      expect(prismaMock.mediaAsset.update).toHaveBeenCalledTimes(
        DEMO_DATASET.products.length,
      );
    });

    it('si aucun uploader (smoke seller absent et aucun ADMIN) → mediaAssets=0, log warning, pas de throw', async () => {
      const prismaMock = makePrismaMock();
      // Force smoke seller introuvable ET aucun admin
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.findFirst.mockResolvedValue(null);
      const summary = await runDemoSeed(buildOpts({ IOX_DEMO_SEED: '1' }, prismaMock));
      expect(summary.mediaAssets).toBe(0);
      expect(prismaMock.mediaAsset.create).not.toHaveBeenCalled();
      // Le reste du seed s'est bien exécuté
      expect(summary.products).toBe(DEMO_DATASET.products.length);
    });
  });

  describe('SEED-DEMO-FIX-2 — hydratation FP-5/FP-7/FP-8', () => {
    it('chaque produit dispose de qualityAttributes (FP-7) avec >= 2 valeurs', () => {
      for (const p of DEMO_DATASET.products) {
        expect(Array.isArray(p.qualityAttributes)).toBe(true);
        expect(p.qualityAttributes.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('au moins 4 produits ont temperatureRequirements (FP-8) non vide', () => {
      const withTemp = DEMO_DATASET.products.filter(
        (p) => typeof p.temperatureRequirements === 'string' && p.temperatureRequirements.length > 0,
      );
      expect(withTemp.length).toBeGreaterThanOrEqual(4);
      // Au moins un produit avec "Frozen" pour valider le filtre catalog.
      expect(
        DEMO_DATASET.products.some((p) =>
          p.temperatureRequirements.toLowerCase().includes('frozen'),
        ),
      ).toBe(true);
    });

    it('au moins 4 produits ont packagingFormats (FP-8) non vide', () => {
      const withFormats = DEMO_DATASET.products.filter(
        (p) => Array.isArray(p.packagingFormats) && p.packagingFormats.length >= 1,
      );
      expect(withFormats.length).toBeGreaterThanOrEqual(4);
    });

    it('au moins 6 produits ont annualProductionCapacity (FP-5) non null', () => {
      const withCapacity = DEMO_DATASET.products.filter(
        (p) => p.annualProductionCapacity != null,
      );
      expect(withCapacity.length).toBeGreaterThanOrEqual(6);
    });

    it('upsert Prisma propage les nouveaux champs FP-5/FP-7/FP-8 (update + create)', async () => {
      const prismaMock = makePrismaMock();
      await runDemoSeed(buildOpts({ IOX_DEMO_SEED: '1' }, prismaMock));
      const calls = prismaMock.marketplaceProduct.upsert.mock.calls;
      expect(calls.length).toBe(DEMO_DATASET.products.length);
      for (const [arg] of calls) {
        // FP-7
        expect(Array.isArray(arg.update.qualityAttributes)).toBe(true);
        expect(arg.update.qualityAttributes.length).toBeGreaterThanOrEqual(2);
        expect(Array.isArray(arg.create.qualityAttributes)).toBe(true);
        // FP-8
        expect(typeof arg.update.temperatureRequirements).toBe('string');
        expect(Array.isArray(arg.update.packagingFormats)).toBe(true);
        expect(arg.update.grossWeight).toBeDefined();
        expect(arg.update.netWeight).toBeDefined();
        expect(typeof arg.update.palletization).toBe('string');
        // FP-5
        expect(arg.update.annualProductionCapacity).toBeDefined();
        expect(typeof arg.update.capacityUnit).toBe('string');
        expect(arg.update.availableQuantity).toBeDefined();
        expect(typeof arg.update.availableQuantityUnit).toBe('string');
        expect(typeof arg.update.restockFrequency).toBe('string');
      }
    });
  });

  describe('smoke seller', () => {
    it('utilise SMOKE_SELLER_PASSWORD si fourni (smoke-seller + smoke-buyer)', async () => {
      const prismaMock = makePrismaMock();
      await runDemoSeed(
        buildOpts(
          { IOX_DEMO_SEED: '1', SMOKE_SELLER_PASSWORD: 'CustomPwd!' },
          prismaMock,
        ),
      );
      // SEED-DEMO-FIX-3 : 2 user.upsert (smoke-seller puis smoke-buyer).
      expect(prismaMock.user.upsert).toHaveBeenCalledTimes(2);
      const sellerCall = prismaMock.user.upsert.mock.calls.find(
        (c) => c[0].where.email === 'smoke-seller@iox.mch',
      );
      const buyerCall = prismaMock.user.upsert.mock.calls.find(
        (c) => c[0].where.email === 'smoke-buyer@iox.mch',
      );
      expect(sellerCall).toBeDefined();
      expect(buyerCall).toBeDefined();
      expect(sellerCall![0].create.role).toBe('MARKETPLACE_SELLER');
      expect(buyerCall![0].create.role).toBe('MARKETPLACE_BUYER');
      // bcrypt produit un hash > 50 chars : on vérifie juste qu'il est non vide
      // et différent du mot de passe en clair.
      expect(typeof sellerCall![0].create.passwordHash).toBe('string');
      expect(sellerCall![0].create.passwordHash.length).toBeGreaterThan(20);
      expect(sellerCall![0].create.passwordHash).not.toBe('CustomPwd!');
    });
  });

  // ── SEED-DEMO-FIX-3 ────────────────────────────────────────────────────

  describe('SEED-DEMO-FIX-3 — MarketplaceDocument PUBLIC + RFQ', () => {
    it('summary expose publicDocs/quoteRequests/quoteRequestMessages cohérents', async () => {
      const prismaMock = makePrismaMock();
      const summary = await runDemoSeed(buildOpts({ IOX_DEMO_SEED: '1' }, prismaMock));
      expect(summary).toMatchObject({
        publicDocs: DEMO_DATASET.publicDocuments.length,
        quoteRequests: DEMO_DATASET.quoteRequests.length,
        quoteRequestMessages: DEMO_DATASET.quoteRequests.length * 2,
        smokeBuyer: 'smoke-buyer@iox.mch',
      });
    });

    it('crée 1 MarketplaceDocument PUBLIC par produit cible (1ʳᵉ exécution)', async () => {
      const prismaMock = makePrismaMock();
      await runDemoSeed(buildOpts({ IOX_DEMO_SEED: '1' }, prismaMock));
      // Total create = PUBLIC docs + compliance docs (PRIVATE/SELLER_PROFILE).
      const allDocCalls: any[] = prismaMock.marketplaceDocument.create.mock.calls;
      expect(allDocCalls.length).toBe(
        DEMO_DATASET.publicDocuments.length + COMPLIANCE_DOCS_COUNT,
      );
      // PUBLIC docs : visibility=PUBLIC, relatedType=MARKETPLACE_PRODUCT.
      const publicCalls = allDocCalls.filter((c) => c[0].data.visibility === 'PUBLIC');
      expect(publicCalls).toHaveLength(DEMO_DATASET.publicDocuments.length);
      for (const [arg] of publicCalls) {
        expect(arg.data.verificationStatus).toBe('VERIFIED');
        expect(arg.data.relatedType).toBe('MARKETPLACE_PRODUCT');
      }
      // Compliance docs : visibility=PRIVATE, relatedType=SELLER_PROFILE.
      const complianceCalls = allDocCalls.filter((c) => c[0].data.visibility === 'PRIVATE');
      expect(complianceCalls).toHaveLength(COMPLIANCE_DOCS_COUNT);
      for (const [arg] of complianceCalls) {
        expect(arg.data.relatedType).toBe('SELLER_PROFILE');
      }
    });

    it("idempotent : 2ᵉ run avec docs/RFQ/payment déjà présents → 0 create, N updates", async () => {
      const prismaMock = makePrismaMock({
        publicDocExists: true,
        rfqExists: true,
        rfqMessageExists: true,
        paymentExists: true,
        invoiceExists: true,
      });
      const summary = await runDemoSeed(buildOpts({ IOX_DEMO_SEED: '1' }, prismaMock));
      expect(prismaMock.marketplaceDocument.create).not.toHaveBeenCalled();
      // PUBLIC docs + compliance docs all update.
      expect(prismaMock.marketplaceDocument.update).toHaveBeenCalledTimes(
        DEMO_DATASET.publicDocuments.length + COMPLIANCE_DOCS_COUNT,
      );
      expect(prismaMock.quoteRequest.create).not.toHaveBeenCalled();
      expect(prismaMock.quoteRequestMessage.create).not.toHaveBeenCalled();
      expect(prismaMock.payment.create).not.toHaveBeenCalled();
      expect(prismaMock.invoice.create).not.toHaveBeenCalled();
      expect(prismaMock.invoice.update).toHaveBeenCalledTimes(WON_RFQ_COUNT); // corrects sellerProfileId
      expect(summary.publicDocs).toBe(DEMO_DATASET.publicDocuments.length);
      expect(summary.payments).toBe(WON_RFQ_COUNT); // paymentsCount increments even for existing
      expect(summary.invoices).toBe(0); // invoicesCount only increments on new invoice
    });

    it("crée N RFQ + 2N messages (1ʳᵉ exécution, RFQ absentes)", async () => {
      const prismaMock = makePrismaMock();
      await runDemoSeed(buildOpts({ IOX_DEMO_SEED: '1' }, prismaMock));
      expect(prismaMock.quoteRequest.create).toHaveBeenCalledTimes(
        DEMO_DATASET.quoteRequests.length,
      );
      expect(prismaMock.quoteRequestMessage.create).toHaveBeenCalledTimes(
        DEMO_DATASET.quoteRequests.length * 2,
      );
      // Les RFQ portent un `targetMarket` = seedKey (pour idempotence).
      const targetMarkets = prismaMock.quoteRequest.create.mock.calls.map(
        (c) => c[0].data.targetMarket,
      );
      expect(targetMarkets).toEqual(
        expect.arrayContaining([
          'rfq-vanille-poudre-init',
          'rfq-mangue-maya-quoted',
          'rfq-ylang-extra-won',
        ]),
      );
    });

    it('compte smoke-buyer créé avec role MARKETPLACE_BUYER + Company DEMO-BUYER-001', async () => {
      const prismaMock = makePrismaMock();
      await runDemoSeed(buildOpts({ IOX_DEMO_SEED: '1' }, prismaMock));
      const buyerUserCall = prismaMock.user.upsert.mock.calls.find(
        (c) => c[0].where.email === 'smoke-buyer@iox.mch',
      );
      expect(buyerUserCall).toBeDefined();
      expect(buyerUserCall![0].create.role).toBe('MARKETPLACE_BUYER');
      const buyerCompanyCall = prismaMock.company.upsert.mock.calls.find(
        (c) => c[0].where.code === 'DEMO-BUYER-001',
      );
      expect(buyerCompanyCall).toBeDefined();
      expect(buyerCompanyCall![0].create.types).toContain('BUYER');
    });
  });

  // ── M62-DEMO ───────────────────────────────────────────────────────────────

  describe('M62-DEMO — Payment SUCCEEDED + Invoice ISSUED + compliance docs', () => {
    it('crée 1 Payment SUCCEEDED + 1 Invoice ISSUED pour la RFQ WON (1ʳᵉ exécution)', async () => {
      const prismaMock = makePrismaMock();
      const summary = await runDemoSeed(buildOpts({ IOX_DEMO_SEED: '1' }, prismaMock));
      expect(summary.payments).toBe(WON_RFQ_COUNT);
      expect(summary.invoices).toBe(WON_RFQ_COUNT);
      expect(prismaMock.payment.create).toHaveBeenCalledTimes(WON_RFQ_COUNT);
      expect(prismaMock.invoice.create).toHaveBeenCalledTimes(WON_RFQ_COUNT);

      const paymentCall = prismaMock.payment.create.mock.calls[0][0];
      expect(paymentCall.data.status).toBe('SUCCEEDED');
      expect(paymentCall.data.currency).toBe('EUR');
      expect(paymentCall.data.amountCents).toBe(240000);
      expect(paymentCall.data.stripePaymentIntentId).toMatch(/^pi_demo_/);

      const invoiceCall = prismaMock.invoice.create.mock.calls[0][0];
      expect(invoiceCall.data.status).toBe('ISSUED');
      expect(invoiceCall.data.invoiceNumber).toMatch(/^INV-DEMO-/);
      expect(invoiceCall.data.amountCents).toBe(240000);
    });

    it('idempotent Payment+Invoice : 2ᵉ exécution avec payment+invoice existants → 0 create, updates', async () => {
      const prismaMock = makePrismaMock({ paymentExists: true, invoiceExists: true });
      const summary = await runDemoSeed(buildOpts({ IOX_DEMO_SEED: '1' }, prismaMock));
      expect(prismaMock.payment.create).not.toHaveBeenCalled();
      expect(prismaMock.payment.update).toHaveBeenCalledTimes(WON_RFQ_COUNT);
      // Invoice update also called with corrected sellerProfileId.
      expect(prismaMock.invoice.create).not.toHaveBeenCalled();
      expect(prismaMock.invoice.update).toHaveBeenCalledTimes(WON_RFQ_COUNT);
      expect(summary.payments).toBe(WON_RFQ_COUNT); // compte même si update
      expect(summary.invoices).toBe(0); // invoicesCount ne compte que les nouvelles
    });

    it('crée 3 compliance docs PRIVATE pour le smoke-seller SellerProfile', async () => {
      const prismaMock = makePrismaMock();
      const summary = await runDemoSeed(buildOpts({ IOX_DEMO_SEED: '1' }, prismaMock));
      expect(summary.sellerComplianceDocs).toBe(COMPLIANCE_DOCS_COUNT);
      const complianceCalls: any[] = prismaMock.marketplaceDocument.create.mock.calls.filter(
        (c: any[]) => c[0].data.relatedType === 'SELLER_PROFILE',
      );
      expect(complianceCalls).toHaveLength(COMPLIANCE_DOCS_COUNT);
      // Statuts attendus : 1 VERIFIED, 1 PENDING, 1 REJECTED.
      const statuses = complianceCalls.map((c: any[]) => c[0].data.verificationStatus);
      expect(statuses).toEqual(expect.arrayContaining(['VERIFIED', 'PENDING', 'REJECTED']));
    });
  });
});
