// PAY-1 phase 1 LOT 3 — Spec PaymentsWebhookService.

import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsWebhookService } from './payments-webhook.service';
import { PrismaService } from '../database/prisma.service';
import { StripeOnboardingService } from './stripe-onboarding.service';
import { PaymentStatus, SellerStripeAccountStatus } from '@iox/shared';

describe('PaymentsWebhookService', () => {
  let service: PaymentsWebhookService;
  let prisma: {
    payment: { update: jest.Mock };
    sellerStripeAccount: { update: jest.Mock };
  };
  let onboarding: { computeStatus: jest.Mock };

  beforeEach(async () => {
    prisma = {
      payment: { update: jest.fn().mockResolvedValue({}) },
      sellerStripeAccount: { update: jest.fn().mockResolvedValue({}) },
    };
    onboarding = {
      computeStatus: jest.fn().mockReturnValue(SellerStripeAccountStatus.PAYOUTS_ENABLED),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsWebhookService,
        { provide: PrismaService, useValue: prisma },
        { provide: StripeOnboardingService, useValue: onboarding },
      ],
    }).compile();
    service = module.get(PaymentsWebhookService);
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
});
