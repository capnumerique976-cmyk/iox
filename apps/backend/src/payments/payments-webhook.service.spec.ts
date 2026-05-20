// PAY-1 phase 1 LOT 3 — Spec PaymentsWebhookService.
// PAY-2 — Email notification specs.

import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsWebhookService } from './payments-webhook.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StripeOnboardingService } from './stripe-onboarding.service';
import { NotifEmailService } from '../notif-email/notif-email.service';
import { PaymentStatus, SellerStripeAccountStatus } from '@iox/shared';
import { ConfigService } from '@nestjs/config';
import { PAYMENT_PROVIDER, type PaymentProvider } from './provider/payment-provider.interface';
import { WebhookSignatureError } from './provider/payment-provider.errors';

describe('PaymentsWebhookService', () => {
  let service: PaymentsWebhookService;
  let prisma: {
    payment: { update: jest.Mock; findUnique: jest.Mock };
    sellerStripeAccount: { update: jest.Mock };
    user: { findUnique: jest.Mock };
    marketplaceOffer: { findUnique: jest.Mock };
  };
  let onboarding: { computeStatus: jest.Mock };
  let notifEmail: { send: jest.Mock };
  let providerMock: PaymentProvider;

  beforeEach(async () => {
    prisma = {
      payment: {
        update: jest.fn().mockResolvedValue({
          id: 'pay_1',
          buyerUserId: 'u-buyer',
          amountCents: 10000,
          currency: 'EUR',
          marketplaceOfferId: 'offer-1',
        }),
        // M136 — default: payment in PENDING state (not yet SUCCEEDED)
        findUnique: jest.fn().mockResolvedValue({
          id: 'pay_1',
          status: 'PENDING',
          buyerUserId: 'u-buyer',
          amountCents: 10000,
          currency: 'EUR',
          marketplaceOfferId: 'offer-1',
        }),
      },
      sellerStripeAccount: { update: jest.fn().mockResolvedValue({}) },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          email: 'buyer@test.com',
          firstName: 'Jean',
          lastName: 'Dupont',
          preferredLocale: 'fr',
        }),
      },
      marketplaceOffer: {
        findUnique: jest.fn().mockResolvedValue({ title: 'Vanille premium' }),
      },
    };
    onboarding = {
      computeStatus: jest.fn().mockReturnValue(SellerStripeAccountStatus.PAYOUTS_ENABLED),
    };
    notifEmail = {
      send: jest.fn().mockResolvedValue({ success: true, messageId: 'msg-1', transport: 'mock' }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsWebhookService,
        { provide: PrismaService, useValue: prisma },
        { provide: StripeOnboardingService, useValue: onboarding },
        { provide: NotifEmailService, useValue: notifEmail },
        { provide: AuditService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
        {
          provide: PAYMENT_PROVIDER,
          useValue: {
            verifyWebhookEvent: jest.fn(),
            isConfigured: jest.fn().mockReturnValue(true),
            createCheckoutSession: jest.fn(),
            createRefund: jest.fn(),
            createConnectedAccount: jest.fn(),
            generateOnboardingLink: jest.fn(),
            retrieveAccountFlags: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_test';
              if (key === 'FRONTEND_URL') return 'https://iox.mycloud.yt';
              return undefined;
            }),
          },
        },
      ],
    }).compile();
    service = module.get(PaymentsWebhookService);
    providerMock = module.get<PaymentProvider>(PAYMENT_PROVIDER as string);
  });

  it('payment_intent.succeeded → Payment status SUCCEEDED + IDs', async () => {
    const event = {
      id: 'evt_1',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_1',
          metadata: { payment_id: 'pay_1' },
          latest_charge: 'ch_abc',
          amount: 10000,
        },
      },
    };
    const res = await service.handleEvent(event);
    expect(res.action).toBe('payment-succeeded');
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'pay_1' },
      data: expect.objectContaining({
        status: PaymentStatus.SUCCEEDED,
        stripePaymentIntentId: 'pi_1',
        stripeChargeId: 'ch_abc',
      }),
    });
  });

  it('payment_intent.payment_failed → Payment status FAILED + error', async () => {
    const event = {
      id: 'evt_2',
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: 'pi_2',
          metadata: { payment_id: 'pay_2' },
          last_payment_error: { code: 'card_declined', message: 'Card declined' },
        },
      },
    };
    const res = await service.handleEvent(event);
    expect(res.action).toBe('payment-failed');
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'pay_2' },
      data: expect.objectContaining({
        status: PaymentStatus.FAILED,
        errorCode: 'card_declined',
        errorMessage: 'Card declined',
      }),
    });
  });

  it('account.updated → SellerStripeAccount status sync', async () => {
    const event = {
      id: 'evt_3',
      type: 'account.updated',
      data: {
        object: {
          id: 'acct_1',
          metadata: { seller_profile_id: 'sp1' },
          details_submitted: true,
          charges_enabled: true,
          payouts_enabled: true,
          capabilities: { transfers: 'active' },
          requirements: { disabled_reason: null },
        },
      },
    };
    const res = await service.handleEvent(event);
    expect(res.action).toBe('account-updated');
    expect(prisma.sellerStripeAccount.update).toHaveBeenCalledWith({
      where: { sellerProfileId: 'sp1' },
      data: expect.objectContaining({
        status: SellerStripeAccountStatus.PAYOUTS_ENABLED,
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
      }),
    });
  });

  it('event inconnu → ignored, return 200', async () => {
    const event = {
      id: 'evt_4',
      type: 'invoice.created',
      data: { object: {} },
    };
    const res = await service.handleEvent(event);
    expect(res.handled).toBe(false);
    expect(res.action).toBe('ignored');
    expect(prisma.payment.update).not.toHaveBeenCalled();
    expect(prisma.sellerStripeAccount.update).not.toHaveBeenCalled();
  });

  it('payment_intent.succeeded sans payment_id metadata → no-payment-id', async () => {
    const event = {
      id: 'evt_5',
      type: 'payment_intent.succeeded',
      data: {
        object: { id: 'pi_5', metadata: {}, amount: 0 },
      },
    };
    const res = await service.handleEvent(event);
    expect(res.action).toBe('no-payment-id');
    expect(prisma.payment.update).not.toHaveBeenCalled();
  });

  // PAY-2 — Email notification on payment_intent.succeeded.

  it('payment_intent.succeeded sends email to buyer', async () => {
    const event = {
      id: 'evt_email_1',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_e1',
          metadata: { payment_id: 'pay_e1' },
          latest_charge: 'ch_e1',
          amount: 10000,
        },
      },
    };
    await service.handleEvent(event);

    expect(notifEmail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'buyer@test.com',
        templateId: 'payment-confirmed-to-buyer',
        templateData: expect.objectContaining({
          buyerDisplayName: 'Jean Dupont',
          offerTitle: 'Vanille premium',
        }),
      }),
    );
  });

  it('M137 — payment_intent.succeeded email ctaUrl = FRONTEND_URL/buyer/payments', async () => {
    const event = {
      id: 'evt_cta_1',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_cta1',
          metadata: { payment_id: 'pay_cta1' },
          latest_charge: 'ch_cta1',
          amount: 10000,
        },
      },
    };
    await service.handleEvent(event);

    expect(notifEmail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        templateData: expect.objectContaining({
          ctaUrl: 'https://iox.mycloud.yt/buyer/payments',
        }),
      }),
    );
  });

  it('payment_intent.succeeded still succeeds if email send fails', async () => {
    notifEmail.send.mockRejectedValueOnce(new Error('SMTP down'));

    const event = {
      id: 'evt_email_2',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_e2',
          metadata: { payment_id: 'pay_e2' },
          latest_charge: 'ch_e2',
          amount: 5000,
        },
      },
    };
    const res = await service.handleEvent(event);

    // Payment status update still succeeded.
    expect(res.action).toBe('payment-succeeded');
    expect(res.handled).toBe(true);
    expect(prisma.payment.update).toHaveBeenCalled();
  });

  it('payment_intent.succeeded with no buyer email skips email', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);

    const event = {
      id: 'evt_email_3',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_e3',
          metadata: { payment_id: 'pay_e3' },
          latest_charge: 'ch_e3',
          amount: 7500,
        },
      },
    };
    const res = await service.handleEvent(event);

    expect(res.action).toBe('payment-succeeded');
    expect(notifEmail.send).not.toHaveBeenCalled();
  });

  describe('receiveRaw', () => {
    it('valid signature → dispatches event, returns result', async () => {
      const fakeEvent = {
        id: 'evt_raw_1',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_raw',
            metadata: { payment_id: 'pay_raw' },
            latest_charge: 'ch_raw',
            amount: 5000,
          },
        },
      };
      (providerMock.verifyWebhookEvent as jest.Mock).mockResolvedValue(fakeEvent);

      const res = await service.receiveRaw(Buffer.from('{}'), 'sig_valid');

      expect(providerMock.verifyWebhookEvent).toHaveBeenCalledWith(
        Buffer.from('{}'),
        'sig_valid',
        'whsec_test',
      );
      expect(res.handled).toBe(true);
      expect(res.action).toBe('payment-succeeded');
      expect(res.eventType).toBe('payment_intent.succeeded');
    });

    it('WebhookSignatureError from provider bubbles up', async () => {
      (providerMock.verifyWebhookEvent as jest.Mock).mockRejectedValue(
        new WebhookSignatureError(),
      );
      await expect(service.receiveRaw(Buffer.from('{}'), 'bad_sig')).rejects.toBeInstanceOf(
        WebhookSignatureError,
      );
    });

    it('unknown event type → handled=false, action=ignored', async () => {
      const unknownEvent = {
        id: 'evt_u',
        type: 'invoice.created',
        data: { object: {} },
      };
      (providerMock.verifyWebhookEvent as jest.Mock).mockResolvedValue(unknownEvent);

      const res = await service.receiveRaw(Buffer.from('{}'), 'sig_ok');
      expect(res.handled).toBe(false);
      expect(res.action).toBe('ignored');
    });
  });

  // M136 — Idempotency tests.

  describe('idempotency — payment_intent.succeeded', () => {
    it('webhook dupliqué avec Payment déjà SUCCEEDED → skip silencieux, pas de double update', async () => {
      // Payment is already in SUCCEEDED state (duplicate webhook delivery).
      prisma.payment.findUnique.mockResolvedValue({
        id: 'pay_dup',
        status: 'SUCCEEDED',
        buyerUserId: 'u-buyer',
        amountCents: 10000,
        currency: 'EUR',
        marketplaceOfferId: 'offer-1',
      });

      const event = {
        id: 'evt_dup',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_dup',
            metadata: { payment_id: 'pay_dup' },
            latest_charge: 'ch_dup',
            amount: 10000,
          },
        },
      };

      const res = await service.handleEvent(event);

      // Should be handled=true but action indicates duplicate was skipped.
      expect(res.handled).toBe(true);
      expect(res.action).toBe('payment-succeeded-duplicate');
      // prisma.payment.update must NOT have been called (no double update).
      expect(prisma.payment.update).not.toHaveBeenCalled();
      // Email must NOT be sent again.
      expect(notifEmail.send).not.toHaveBeenCalled();
    });

    it('premier webhook avec Payment en PENDING → traité normalement', async () => {
      // Default mock is PENDING — first event processes normally.
      const event = {
        id: 'evt_first',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_first',
            metadata: { payment_id: 'pay_1' },
            latest_charge: 'ch_first',
            amount: 10000,
          },
        },
      };

      const res = await service.handleEvent(event);

      expect(res.action).toBe('payment-succeeded');
      expect(prisma.payment.update).toHaveBeenCalledTimes(1);
    });
  });

  // M136 — account.updated without seller_profile_id metadata.

  describe('account.updated edge cases', () => {
    it('account.updated sans seller_profile_id metadata → no-seller-profile-id', async () => {
      const event = {
        id: 'evt_acct_noid',
        type: 'account.updated',
        data: {
          object: {
            id: 'acct_no_meta',
            metadata: {}, // no seller_profile_id
            details_submitted: true,
            charges_enabled: true,
            payouts_enabled: true,
          },
        },
      };

      const res = await service.handleEvent(event);

      expect(res.handled).toBe(false);
      expect(res.action).toBe('no-seller-profile-id');
      expect(prisma.sellerStripeAccount.update).not.toHaveBeenCalled();
    });
  });
});
