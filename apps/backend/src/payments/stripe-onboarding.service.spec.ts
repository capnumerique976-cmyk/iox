// PAY-1 phase 1 LOT 1 — Spec StripeOnboardingService.

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StripeOnboardingService } from './stripe-onboarding.service';
import { PrismaService } from '../database/prisma.service';
import { SellerOwnershipService } from '../common/services/seller-ownership.service';
import { STRIPE_CLIENT, type StripeClientWrapper } from './stripe.factory';
import { SellerStripeAccountStatus } from '@iox/shared';

const ownershipMock = {
  isStaff: () => true,
  assertSellerProfileOwnership: jest.fn().mockResolvedValue(undefined),
};

function makeStripeMock(opts: { configured?: boolean } = {}): StripeClientWrapper {
  const configured = opts.configured ?? true;
  return {
    isConfigured: () => configured,
    client: () =>
      ({
        accounts: {
          create: jest.fn().mockResolvedValue({ id: 'acct_test_123' }),
          retrieve: jest.fn().mockResolvedValue({
            id: 'acct_test_123',
            details_submitted: true,
            charges_enabled: true,
            payouts_enabled: true,
            capabilities: { transfers: 'active' },
            requirements: { disabled_reason: null },
          }),
        },
        accountLinks: {
          create: jest.fn().mockResolvedValue({
            url: 'https://stripe.com/onboarding/abc',
            expires_at: 1234567890,
          }),
        },
      }) as never,
  };
}

describe('StripeOnboardingService (PAY-1 phase 1 LOT 1)', () => {
  let service: StripeOnboardingService;
  let prisma: {
    sellerProfile: { findUnique: jest.Mock };
    sellerStripeAccount: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      sellerProfile: { findUnique: jest.fn() },
      sellerStripeAccount: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeOnboardingService,
        { provide: PrismaService, useValue: prisma },
        { provide: SellerOwnershipService, useValue: ownershipMock },
        { provide: STRIPE_CLIENT, useValue: makeStripeMock() },
      ],
    }).compile();
    service = module.get(StripeOnboardingService);
  });

  describe('createOrGetStripeAccount', () => {
    it('crée un nouveau compte Stripe Express si pas existant', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'sp1',
        country: 'FR',
        companyId: 'co1',
        company: { email: 'seller@test.com' },
        stripeAccount: null,
      });
      prisma.sellerStripeAccount.create.mockResolvedValue({
        id: 'ssa1',
        sellerProfileId: 'sp1',
        stripeAccountId: 'acct_test_123',
        status: SellerStripeAccountStatus.PENDING_ONBOARDING,
      });

      const res = await service.createOrGetStripeAccount('sp1');
      expect(res.stripeAccountId).toBe('acct_test_123');
      expect(prisma.sellerStripeAccount.create).toHaveBeenCalled();
    });

    it('retourne existant si déjà présent (idempotent)', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'sp1',
        company: { email: 'x' },
        stripeAccount: {
          id: 'ssa1',
          stripeAccountId: 'acct_existing',
          status: SellerStripeAccountStatus.CHARGES_ENABLED,
        },
      });
      const res = await service.createOrGetStripeAccount('sp1');
      expect(res.stripeAccountId).toBe('acct_existing');
      expect(prisma.sellerStripeAccount.create).not.toHaveBeenCalled();
    });

    it('throw NotFoundException si seller introuvable', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue(null);
      await expect(service.createOrGetStripeAccount('sp404')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('generateOnboardingLink', () => {
    it('génère un AccountLink Stripe via SDK', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'sp1',
        country: 'FR',
        companyId: 'co1',
        company: { email: 'seller@test.com' },
        stripeAccount: null,
      });
      prisma.sellerStripeAccount.create.mockResolvedValue({
        id: 'ssa1',
        sellerProfileId: 'sp1',
        stripeAccountId: 'acct_test_123',
        status: SellerStripeAccountStatus.PENDING_ONBOARDING,
      });

      const res = await service.generateOnboardingLink(
        'sp1',
        'https://iox.test/return',
        'https://iox.test/refresh',
      );
      expect(res.url).toContain('stripe.com');
      expect(res.expiresAt).toBe(1234567890);
    });

    it('throw BadRequestException si Stripe non configuré', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          StripeOnboardingService,
          { provide: PrismaService, useValue: prisma },
          { provide: SellerOwnershipService, useValue: ownershipMock },
          { provide: STRIPE_CLIENT, useValue: makeStripeMock({ configured: false }) },
        ],
      }).compile();
      const localService = module.get(StripeOnboardingService);
      await expect(
        localService.generateOnboardingLink('sp1', 'a', 'b'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('syncAccountStatus', () => {
    it('sync status depuis Stripe → PAYOUTS_ENABLED si tout OK', async () => {
      prisma.sellerStripeAccount.findUnique.mockResolvedValue({
        id: 'ssa1',
        sellerProfileId: 'sp1',
        stripeAccountId: 'acct_test_123',
      });
      prisma.sellerStripeAccount.update.mockResolvedValue({
        id: 'ssa1',
        status: SellerStripeAccountStatus.PAYOUTS_ENABLED,
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
      });

      const res = await service.syncAccountStatus('sp1');
      expect(res.status).toBe(SellerStripeAccountStatus.PAYOUTS_ENABLED);
    });

    it('throw NotFoundException si compte Stripe pas créé', async () => {
      prisma.sellerStripeAccount.findUnique.mockResolvedValue(null);
      await expect(service.syncAccountStatus('sp1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('computeStatus', () => {
    it('PAYOUTS_ENABLED si tous flags true', () => {
      expect(
        service.computeStatus({
          detailsSubmitted: true,
          chargesEnabled: true,
          payoutsEnabled: true,
        }),
      ).toBe(SellerStripeAccountStatus.PAYOUTS_ENABLED);
    });

    it('CHARGES_ENABLED si charges seul', () => {
      expect(
        service.computeStatus({
          detailsSubmitted: true,
          chargesEnabled: true,
          payoutsEnabled: false,
        }),
      ).toBe(SellerStripeAccountStatus.CHARGES_ENABLED);
    });

    it('ONBOARDING_INCOMPLETE si details_submitted seul', () => {
      expect(
        service.computeStatus({
          detailsSubmitted: true,
          chargesEnabled: false,
          payoutsEnabled: false,
        }),
      ).toBe(SellerStripeAccountStatus.ONBOARDING_INCOMPLETE);
    });

    it('RESTRICTED si requirements.disabled_reason présent', () => {
      expect(
        service.computeStatus({
          detailsSubmitted: true,
          chargesEnabled: true,
          payoutsEnabled: true,
          requirements: { disabled_reason: 'rejected.fraud' },
        }),
      ).toBe(SellerStripeAccountStatus.RESTRICTED);
    });

    it('PENDING_ONBOARDING par défaut', () => {
      expect(
        service.computeStatus({
          detailsSubmitted: false,
          chargesEnabled: false,
          payoutsEnabled: false,
        }),
      ).toBe(SellerStripeAccountStatus.PENDING_ONBOARDING);
    });
  });
});
