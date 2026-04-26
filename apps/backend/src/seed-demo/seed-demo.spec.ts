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
  marketplaceOffer: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
  certification: { upsert: jest.Mock };
  mediaAsset: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
}

function makePrismaMock(opts: {
  offerExists?: boolean;
  mediaAssetExists?: boolean;
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
      findFirst: jest
        .fn()
        .mockResolvedValue(opts.offerExists ? { id: 'existing-offer-id' } : null),
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
      });
      expect(prismaMock.company.upsert).toHaveBeenCalledTimes(
        DEMO_DATASET.sellers.length,
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

  describe('smoke seller', () => {
    it('utilise SMOKE_SELLER_PASSWORD si fourni', async () => {
      const prismaMock = makePrismaMock();
      await runDemoSeed(
        buildOpts(
          { IOX_DEMO_SEED: '1', SMOKE_SELLER_PASSWORD: 'CustomPwd!' },
          prismaMock,
        ),
      );
      expect(prismaMock.user.upsert).toHaveBeenCalledTimes(1);
      const call = prismaMock.user.upsert.mock.calls[0][0];
      expect(call.where.email).toBe('smoke-seller@iox.mch');
      expect(call.create.email).toBe('smoke-seller@iox.mch');
      expect(call.create.role).toBe('MARKETPLACE_SELLER');
      // bcrypt produit un hash > 50 chars : on vérifie juste qu'il est non vide
      // et différent du mot de passe en clair.
      expect(typeof call.create.passwordHash).toBe('string');
      expect(call.create.passwordHash.length).toBeGreaterThan(20);
      expect(call.create.passwordHash).not.toBe('CustomPwd!');
    });
  });
});
