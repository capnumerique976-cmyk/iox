// PAY-1 phase 1 LOT 1+3 — Spec PaymentsService.
// PAY-2 — refund specs.

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { APPLICATION_FEE_PERCENT, PaymentsService } from './payments.service';
import { PrismaService } from '../database/prisma.service';
import { SellerOwnershipService } from '../common/services/seller-ownership.service';
import { AuditService } from '../audit/audit.service';
import { PAYMENT_PROVIDER, type PaymentProvider } from './provider/payment-provider.interface';
import {
  PaymentStatus,
  QuoteRequestStatus,
  UserRole,
  RequestUser,
} from '@iox/shared';

const createRefundMock = jest.fn().mockResolvedValue({ refundId: 're_test_123' });

function makeProviderMock(opts: { configured?: boolean } = {}): PaymentProvider {
  return {
    isConfigured: jest.fn().mockReturnValue(opts.configured ?? true),
    createCheckoutSession: jest.fn().mockResolvedValue({
      sessionId: 'cs_test_abc',
      url: 'https://checkout.stripe.com/c/pay/cs_test_abc',
    }),
    createRefund: createRefundMock,
    createConnectedAccount: jest.fn().mockResolvedValue({ accountId: 'acct_test' }),
    generateOnboardingLink: jest.fn().mockResolvedValue({ url: 'https://stripe.com/ob', expiresAt: 9999 }),
    retrieveAccountFlags: jest.fn().mockResolvedValue({ detailsSubmitted: true, chargesEnabled: true, payoutsEnabled: true }),
    verifyWebhookEvent: jest.fn(),
  };
}

describe('PaymentsService', () => {
  let service: PaymentsService;
  let providerMock: PaymentProvider;
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
  const auditMock = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
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
    providerMock = makeProviderMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: SellerOwnershipService, useValue: ownershipMock },
        { provide: AuditService, useValue: auditMock },
        { provide: PAYMENT_PROVIDER, useValue: providerMock },
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
      // M133 — montant verrouillé serveur
      agreedAmountCents: 100000,
      agreedCurrency: 'EUR',
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

    it('happy path : crée Payment + Stripe session depuis rfq.agreedAmountCents, retourne checkoutUrl', async () => {
      // M133 — amountCents n'est plus transmis depuis le frontend, montant lu depuis rfq
      prisma.quoteRequest.findUnique.mockResolvedValue(validRfq); // agreedAmountCents=100000
      prisma.payment.create.mockResolvedValue({ id: 'pay1' });
      const res = await service.createCheckoutSession(
        {
          quoteRequestId: 'rfq1',
          marketplaceOfferId: 'o1',
          returnUrl: 'https://iox/r',
          cancelUrl: 'https://iox/c',
        },
        buyer,
      );
      expect(res.paymentId).toBe('pay1');
      expect(res.checkoutUrl).toContain('stripe.com');
      const data = prisma.payment.create.mock.calls[0][0].data;
      expect(data.amountCents).toBe(100000); // depuis rfq.agreedAmountCents
      expect(data.applicationFeeCents).toBe(5000);
      expect(data.currency).toBe('EUR'); // depuis rfq.agreedCurrency
      expect(data.status).toBe(PaymentStatus.PENDING);
      expect(providerMock.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          amountCents: 100000,
          currency: 'EUR',
          destinationAccountId: expect.any(String),
        }),
      );
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

    it('M59 — agreedCurrency USD → Payment créé avec currency=USD', async () => {
      // M133 : devise lue depuis rfq.agreedCurrency, pas depuis input.currency
      prisma.quoteRequest.findUnique.mockResolvedValue({
        ...validRfq,
        agreedAmountCents: 150000,
        agreedCurrency: 'USD',
      });
      prisma.payment.create.mockResolvedValue({ id: 'pay-usd' });
      const res = await service.createCheckoutSession(
        {
          quoteRequestId: 'rfq1',
          marketplaceOfferId: 'o1',
          returnUrl: 'https://iox/r',
          cancelUrl: 'https://iox/c',
        },
        buyer,
      );
      expect(res.paymentId).toBe('pay-usd');
      const data = prisma.payment.create.mock.calls[0][0].data;
      expect(data.currency).toBe('USD');
      expect(data.amountCents).toBe(150000);
    });

    it('M59 — agreedCurrency usd (lowercase) → normalisé USD, accepté', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue({
        ...validRfq,
        agreedAmountCents: 5000,
        agreedCurrency: 'usd',
      });
      prisma.payment.create.mockResolvedValue({ id: 'pay-usd2' });
      await service.createCheckoutSession(
        {
          quoteRequestId: 'rfq1',
          marketplaceOfferId: 'o1',
          returnUrl: 'r',
          cancelUrl: 'c',
        },
        buyer,
      );
      const data = prisma.payment.create.mock.calls[0][0].data;
      expect(data.currency).toBe('USD');
    });

    it('M59 — agreedCurrency GBP non supporté → BadRequestException', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue({
        ...validRfq,
        agreedAmountCents: 1000,
        agreedCurrency: 'GBP',
      });
      await expect(
        service.createCheckoutSession(
          { quoteRequestId: 'rfq1', marketplaceOfferId: 'o1', returnUrl: 'r', cancelUrl: 'c' },
          buyer,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('M133 — agreedAmountCents null → BadRequestException (montant non verrouillé)', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue({
        ...validRfq,
        agreedAmountCents: null,
        agreedCurrency: null,
      });
      await expect(
        service.createCheckoutSession(
          { quoteRequestId: 'rfq1', marketplaceOfferId: 'o1', returnUrl: 'r', cancelUrl: 'c' },
          buyer,
        ),
      ).rejects.toThrow(/montant payable n'a pas été verrouillé/);
    });

    it('M133 — agreedAmountCents = 0 → BadRequestException (montant invalide)', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue({
        ...validRfq,
        agreedAmountCents: 0,
        agreedCurrency: 'EUR',
      });
      await expect(
        service.createCheckoutSession(
          { quoteRequestId: 'rfq1', marketplaceOfferId: 'o1', returnUrl: 'r', cancelUrl: 'c' },
          buyer,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('M133 — body amountCents ignoré, seul rfq.agreedAmountCents compte', async () => {
      // Client envoie amountCents=1 (tentative de manipulation), serveur utilise 100000
      prisma.quoteRequest.findUnique.mockResolvedValue({
        ...validRfq,
        agreedAmountCents: 100000,
        agreedCurrency: 'EUR',
      });
      prisma.payment.create.mockResolvedValue({ id: 'pay-locked' });
      await service.createCheckoutSession(
        {
          quoteRequestId: 'rfq1',
          marketplaceOfferId: 'o1',
          amountCents: 1, // doit être ignoré
          returnUrl: 'r',
          cancelUrl: 'c',
        },
        buyer,
      );
      const data = prisma.payment.create.mock.calls[0][0].data;
      expect(data.amountCents).toBe(100000); // montant serveur, pas le body
      expect(providerMock.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({ amountCents: 100000 }),
      );
    });

    it('throws BadRequestException when provider not configured', async () => {
      const module = await Test.createTestingModule({
        providers: [
          PaymentsService,
          { provide: PrismaService, useValue: prisma },
          { provide: SellerOwnershipService, useValue: ownershipMock },
          { provide: AuditService, useValue: auditMock },
          { provide: PAYMENT_PROVIDER, useValue: makeProviderMock({ configured: false }) },
        ],
      }).compile();
      const svc = module.get(PaymentsService);
      await expect(
        svc.createCheckoutSession(
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
  });

  // PAY-2 — refund specs.

  describe('refund', () => {
    const admin: RequestUser = {
      id: 'u-admin',
      email: 'admin@iox.co',
      role: UserRole.ADMIN,
      sellerProfileIds: [],
      companyIds: [],
    };

    const seller: RequestUser = {
      id: 'u-seller',
      email: 'seller@iox.co',
      role: UserRole.MARKETPLACE_SELLER,
      sellerProfileIds: ['sp1'],
      companyIds: [],
    };

    const succeededPayment = {
      id: 'pay1',
      status: PaymentStatus.SUCCEEDED,
      stripePaymentIntentId: 'pi_test',
      sellerProfileId: 'sp1',
      buyerUserId: 'u-buyer',
      buyerCompanyId: 'co-buyer',
      amountCents: 10000,
      currency: 'EUR',
      metadataJson: null,
    };

    it('happy path : SUCCEEDED → REFUNDED, stripe refunds.create called', async () => {
      prisma.payment.findUnique.mockResolvedValue(succeededPayment);
      prisma.payment.update.mockResolvedValue({
        ...succeededPayment,
        status: PaymentStatus.REFUNDED,
      });
      ownershipMock.isStaff.mockReturnValue(true);

      const result = await service.refund('pay1', {}, admin);

      expect(result.status).toBe(PaymentStatus.REFUNDED);
      expect(createRefundMock).toHaveBeenCalledWith({
        paymentIntentId: 'pi_test',
        amountCents: undefined,
      });
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay1' },
        data: expect.objectContaining({
          status: PaymentStatus.REFUNDED,
        }),
      });
      expect(auditMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PAYMENT_REFUNDED' }),
      );
    });

    it('refund on non-SUCCEEDED payment throws BadRequestException', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        ...succeededPayment,
        status: PaymentStatus.PENDING,
      });

      await expect(service.refund('pay1', {}, admin)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('refund on non-existent payment throws NotFoundException', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);

      await expect(service.refund('pay404', {}, admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('partial refund passes amountCents to stripe', async () => {
      prisma.payment.findUnique.mockResolvedValue(succeededPayment);
      prisma.payment.update.mockResolvedValue({
        ...succeededPayment,
        status: PaymentStatus.REFUNDED,
      });
      ownershipMock.isStaff.mockReturnValue(true);

      await service.refund('pay1', { amountCents: 5000 }, admin);

      expect(createRefundMock).toHaveBeenCalledWith({
        paymentIntentId: 'pi_test',
        amountCents: 5000,
      });
    });

    it('seller who does not own payment → ForbiddenException', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        ...succeededPayment,
        sellerProfileId: 'sp-other',
      });
      ownershipMock.isStaff.mockReturnValue(false);

      await expect(
        service.refund('pay1', {}, seller),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
