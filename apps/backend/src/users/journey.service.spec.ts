// Spec — JourneyService

import { JourneyService, JourneyResponse } from './journey.service';
import { PrismaService } from '../database/prisma.service';
import { UserRole, RequestUser } from '@iox/shared';

// ── helpers ──

function makeActor(overrides: Partial<RequestUser> = {}): RequestUser {
  return {
    id: 'user-1',
    email: 'farmer@test.yt',
    role: UserRole.MARKETPLACE_SELLER,
    companyIds: ['comp-1'],
    sellerProfileIds: ['sp-1'],
    preferredLocale: 'fr',
    ...overrides,
  };
}

function makePrisma() {
  return {
    sellerProfile: { findUnique: jest.fn().mockResolvedValue(null) },
    marketplaceProduct: { count: jest.fn().mockResolvedValue(0) },
    marketplaceDocument: { count: jest.fn().mockResolvedValue(0) },
    quoteRequest: { count: jest.fn().mockResolvedValue(0) },
    invoice: { count: jest.fn().mockResolvedValue(0) },
    company: { findUnique: jest.fn().mockResolvedValue(null) },
  };
}

// ── tests ──

describe('JourneyService', () => {
  let service: JourneyService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new JourneyService(prisma as unknown as PrismaService);
  });

  // ────────────────────────────────
  // SELLER JOURNEY
  // ────────────────────────────────

  describe('seller journey', () => {
    const actor = makeActor();

    it('returns 0 % when seller has no profile data', async () => {
      const res = await service.getJourney(actor);

      expect(res.role).toBe(UserRole.MARKETPLACE_SELLER);
      expect(res.completionPercentage).toBe(0);
      expect(res.data.hasSellerProfile).toBe(false);
      expect(res.steps.length).toBe(6);
      expect(res.nextAction).not.toBeNull();
      expect(res.nextAction?.label).toBe('Compléter mon profil vendeur');
    });

    it('marks profile step complete when profile fields filled', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        status: 'APPROVED',
        publicDisplayName: 'Ferme Bio',
        descriptionShort: 'Vanille de Mayotte',
        descriptionLong: 'Longue desc',
        salesEmail: 'sales@ferme.yt',
        logoMediaId: 'logo-1',
        country: 'YT',
        slug: 'ferme-bio',
      });

      const res = await service.getJourney(actor);

      expect(res.data.hasSellerProfile).toBe(true);
      expect(res.data.sellerProfileComplete).toBe(true);
      expect(res.steps[0].completed).toBe(true);
      // Next action should be documents
      expect(res.nextAction?.label).toBe('Ajouter mes documents');
    });

    it('profile incomplete when missing salesEmail', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        status: 'APPROVED',
        publicDisplayName: 'Ferme',
        descriptionShort: 'Short',
        descriptionLong: null,
        salesEmail: null, // missing
        logoMediaId: null,
        country: 'YT',
        slug: 'ferme',
      });

      const res = await service.getJourney(actor);

      expect(res.data.sellerProfileComplete).toBe(false);
      expect(res.steps[0].completed).toBe(false);
    });

    it('returns 100 % when all steps completed', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        status: 'APPROVED',
        publicDisplayName: 'Ferme Bio',
        descriptionShort: 'Vanille',
        descriptionLong: 'Longue',
        salesEmail: 'sales@ferme.yt',
        logoMediaId: 'logo-1',
        country: 'YT',
        slug: 'ferme-bio',
      });
      prisma.marketplaceProduct.count
        .mockResolvedValueOnce(3) // total products
        .mockResolvedValueOnce(2); // published products
      prisma.marketplaceDocument.count.mockResolvedValue(5);
      prisma.quoteRequest.count.mockResolvedValue(2);
      prisma.invoice.count.mockResolvedValue(1);

      const res = await service.getJourney(actor);

      expect(res.completionPercentage).toBe(100);
      expect(res.nextAction).toBeNull();
      expect(res.data.productCount).toBe(3);
      expect(res.data.publishedProductCount).toBe(2);
    });

    it('handles seller with no sellerProfileIds', async () => {
      const noProfileActor = makeActor({ sellerProfileIds: [] });
      const res = await service.getJourney(noProfileActor);

      expect(res.completionPercentage).toBe(0);
      expect(res.data.hasSellerProfile).toBe(false);
      // Prisma should NOT have been called for seller profile
      expect(prisma.sellerProfile.findUnique).not.toHaveBeenCalled();
    });

    it('sets current only on first incomplete step', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        status: 'APPROVED',
        publicDisplayName: 'F',
        descriptionShort: 'S',
        descriptionLong: null,
        salesEmail: 's@f.yt',
        logoMediaId: null,
        country: 'YT',
        slug: 'f',
      });
      prisma.marketplaceDocument.count.mockResolvedValue(2);
      // products = 0

      const res = await service.getJourney(actor);

      const currentSteps = res.steps.filter((s) => s.current);
      expect(currentSteps).toHaveLength(1);
      expect(currentSteps[0].id).toBe('products');
    });
  });

  // ────────────────────────────────
  // BUYER JOURNEY
  // ────────────────────────────────

  describe('buyer journey', () => {
    const actor = makeActor({
      role: UserRole.MARKETPLACE_BUYER,
      sellerProfileIds: [],
    });

    it('returns buyer role with 5 steps', async () => {
      const res = await service.getJourney(actor);

      expect(res.role).toBe(UserRole.MARKETPLACE_BUYER);
      expect(res.steps.length).toBe(5);
    });

    it('profile complete when company has name, address, email', async () => {
      prisma.company.findUnique.mockResolvedValue({
        name: 'BuyerCo',
        address: '123 Rue',
        email: 'buy@co.fr',
        vatNumber: 'FR12345',
      });

      const res = await service.getJourney(actor);

      expect(res.data.hasCompany).toBe(true);
      expect(res.steps[0].completed).toBe(true);
    });

    it('browse step always completed', async () => {
      const res = await service.getJourney(actor);

      const browseStep = res.steps.find((s) => s.id === 'browse');
      expect(browseStep?.completed).toBe(true);
    });

    it('returns 100 % when buyer has rfqs and invoices', async () => {
      prisma.company.findUnique.mockResolvedValue({
        name: 'BuyerCo',
        address: '123',
        email: 'b@c.fr',
        vatNumber: null,
      });
      prisma.quoteRequest.count.mockResolvedValue(3);
      prisma.invoice.count.mockResolvedValue(1);

      const res = await service.getJourney(actor);

      expect(res.completionPercentage).toBe(100);
      expect(res.nextAction).toBeNull();
    });
  });

  // ────────────────────────────────
  // STAFF JOURNEY
  // ────────────────────────────────

  describe('staff journey', () => {
    it('returns 100 % with no steps for admin', async () => {
      const admin = makeActor({ role: UserRole.ADMIN });
      const res = await service.getJourney(admin);

      expect(res.role).toBe(UserRole.ADMIN);
      expect(res.completionPercentage).toBe(100);
      expect(res.steps).toHaveLength(0);
      expect(res.nextAction).toBeNull();
    });

    it('returns 100 % for coordinator', async () => {
      const coord = makeActor({ role: UserRole.COORDINATOR });
      const res = await service.getJourney(coord);

      expect(res.completionPercentage).toBe(100);
    });
  });
});
