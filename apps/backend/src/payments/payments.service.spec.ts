// PAY-1 phase 1 LOT 1+3 — Spec PaymentsService.

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { APPLICATION_FEE_PERCENT, PaymentsService } from './payments.service';
import { PrismaService } from '../database/prisma.service';
import { SellerOwnershipService } from '../common/services/seller-ownership.service';
import { STRIPE_CLIENT, type StripeClientWrapper } from './stripe.factory';
import {
  PaymentStatus,
  QuoteRequestStatus,
  UserRole,
  RequestUser,
} from '@iox/shared';

function makeStripeMock(opts: { configured?: boolean } = {}): StripeClientWrapper {
  return {
    isConfigured: () => opts.configured ?? true,
    client: () =>
      ({
        checkout: {
          sessions: {
            create: jest.fn().mockResolvedValue({
              id: 'cs_test_abc',
              url: 'https://checkout.stripe.com/c/pay/cs_test_abc',
            }),
          },
        },
      }) as never,
  };
}

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: {
    payment: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    quoteRequest: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  const ownershipMock = {
    isStaff: jest.fn().mockReturnValue(true),
    assertSellerProfileOwnership: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    prisma = {
      payment: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      quoteRequest: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(async (arr: unknown[]) =>
      Promise.all(arr as Promise<unknown>[]),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: SellerOwnershipService, useValue: ownershipMock },
        { provide: STRIPE_CLIENT, useValue: makeStripeMock() },
      ],
    }).compile();
    service = module.get(PaymentsService);
  });

  describe('getPaymentById', () => {
    it('happy path : retourne le paiement', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'p1',
        sellerProfileId: 'sp1',
        buyerUserId: 'u1',
      });
      const res = await service.getPaymentById('p1');
      expect(res.id).toBe('p1');
    });

    it('throw NotFoundException si pas trouvé', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);
      await expect(service.getPaymentById('p404')).rejects.toThrow(NotFoundException);
    });

    it('seller non propriétaire → NotFoundException (scope ownership)', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'p1',
        sellerProfileId: 'sp-other',
        buyerUserId: 'u-other',
      });
      ownershipMock.isStaff.mockReturnValueOnce(false);
      const actor: RequestUser = {
        id: 'u-seller',
        email: 'a@a',
        role: UserRole.MARKETPLACE_SELLER,
        sellerProfileIds: ['sp-mine'],
        companyIds: [],
      };
      await expect(service.getPaymentById('p1', actor)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listPaymentsBySeller', () => {
    it('pagination correcte (page=2, limit=10)', async () => {
      prisma.payment.findMany.mockResolvedValue([]);
      prisma.payment.count.mockResolvedValue(25);
      const res = await service.listPaymentsBySeller('sp1', { page: 2, limit: 10 });
      const call = prisma.payment.findMany.mock.calls[0][0];
      expect(call.skip).toBe(10);
      expect(call.take).toBe(10);
      expect(res.meta.totalPages).toBe(3);
    });

    it('clamp limit à 100', async () => {
      prisma.payment.findMany.mockResolvedValue([]);
      prisma.payment.count.mockResolvedValue(0);
      await service.listPaymentsBySeller('sp1', { limit: 9999 });
      expect(prisma.payment.findMany.mock.calls[0][0].take).toBe(100);
    });
  });

  // PAY-1 phase 1 LOT 3 — createCheckoutSession.

  describe('computeApplicationFeeCents', () => {
    it('5% gross (Math.floor pour rester ≤ amount)', () => {
      expect(service.computeApplicationFeeCents(10000)).toBe(500);
      expect(service.computeApplicationFeeCents(99999)).toBe(4999);
      expect(APPLICATION_FEE_PERCENT).toBe(0.05);
    });
  });

  describe('createCheckoutSession', () => {
    const buyer: RequestUser = {
      id: 'u-buyer',
      email: 'b@b',
      role: UserRole.MARKETPLACE_BUYER,
      sellerProfileIds: [],
      companyIds: ['co-buyer'],
    };

    const validRfq = {
      id: 'rfq1',
      status: QuoteRequestStatus.WON,
      buyerUserId: 'u-buyer',
      buyerCompanyId: 'co-buyer',
      marketplaceOffer: {
        id: 'o1',
        title: 'Vanille premium 1kg',
        sellerProfile: {
          id: 'sp1',
          stripeAccount: {
            stripeAccountId: 'acct_seller',
            chargesEnabled: true,
          },
        },
      },
    };

    it('happy path : crée Payment + Stripe session, retourne checkoutUrl', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue(validRfq);
      prisma.payment.create.mockResolvedValue({ id: 'pay1' });
      const res = await service.createCheckoutSession(
        {
          quoteRequestId: 'rfq1',
          marketplaceOfferId: 'o1',
          amountCents: 100000,
          returnUrl: 'https://iox/r',
          cancelUrl: 'https://iox/c',
        },
        buyer,
      );
      expect(res.paymentId).toBe('pay1');
      expect(res.checkoutUrl).toContain('stripe.com');
      const data = prisma.payment.create.mock.calls[0][0].data;
      expect(data.applicationFeeCents).toBe(5000);
      expect(data.currency).toBe('EUR');
      expect(data.status).toBe(PaymentStatus.PENDING);
    });

    it('RFQ pas WON → BadRequestException', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue({
        ...validRfq,
        status: QuoteRequestStatus.QUOTED,
      });
      await expect(
        service.createCheckoutSession(
          {
            quoteRequestId: 'rfq1',
            marketplaceOfferId: 'o1',
            amountCents: 1000,
            returnUrl: 'r',
            cancelUrl: 'c',
          },
          buyer,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('seller pas chargesEnabled → BadRequestException', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue({
        ...validRfq,
        marketplaceOffer: {
          ...validRfq.marketplaceOffer,
          sellerProfile: {
            id: 'sp1',
            stripeAccount: { stripeAccountId: 'acct', chargesEnabled: false },
          },
        },
      });
      await expect(
        service.createCheckoutSession(
          {
            quoteRequestId: 'rfq1',
            marketplaceOfferId: 'o1',
            amountCents: 1000,
            returnUrl: 'r',
            cancelUrl: 'c',
          },
          buyer,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('seller sans stripeAccount → BadRequestException', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue({
        ...validRfq,
        marketplaceOffer: {
          ...validRfq.marketplaceOffer,
          sellerProfile: { id: 'sp1', stripeAccount: null },
        },
      });
      await expect(
        service.createCheckoutSession(
          {
            quoteRequestId: 'rfq1',
            marketplaceOfferId: 'o1',
            amountCents: 1000,
            returnUrl: 'r',
            cancelUrl: 'c',
          },
          buyer,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('buyer ownership : RFQ d\'un autre user → BadRequestException', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue({
        ...validRfq,
        buyerUserId: 'u-other',
      });
      await expect(
        service.createCheckoutSession(
          {
            quoteRequestId: 'rfq1',
            marketplaceOfferId: 'o1',
            amountCents: 1000,
            returnUrl: 'r',
            cancelUrl: 'c',
          },
          buyer,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('currency non-EUR → BadRequestException', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue(validRfq);
      await expect(
        service.createCheckoutSession(
          {
            quoteRequestId: 'rfq1',
            marketplaceOfferId: 'o1',
            amountCents: 1000,
            currency: 'USD',
            returnUrl: 'r',
            cancelUrl: 'c',
          },
          buyer,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
