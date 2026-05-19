// PAY-1 phase 1 LOT 1 — Spec PaymentsController.

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { StripeOnboardingService } from './stripe-onboarding.service';
import { PaymentsService } from './payments.service';
import { PaymentsWebhookService } from './payments-webhook.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { WebhookSignatureError } from './provider/payment-provider.errors';
import { UserRole, RequestUser } from '@iox/shared';
import type { Request } from 'express';

describe('PaymentsController (PAY-1 phase 1 LOT 1)', () => {
  let controller: PaymentsController;
  let module: TestingModule;
  let onboarding: {
    generateOnboardingLink: jest.Mock;
    syncAccountStatus: jest.Mock;
    getAccountStatus: jest.Mock;
  };

  const sellerActor: RequestUser = {
    id: 'u-seller',
    email: 's@s',
    role: UserRole.MARKETPLACE_SELLER,
    sellerProfileIds: ['sp1'],
    companyIds: [],
  };

  beforeEach(async () => {
    onboarding = {
      generateOnboardingLink: jest.fn(),
      syncAccountStatus: jest.fn(),
      getAccountStatus: jest.fn(),
    };
    const paymentsSvc = { createCheckoutSession: jest.fn() };
    const webhookSvc = {
      receiveRaw: jest.fn().mockResolvedValue({
        handled: true,
        action: 'payment-succeeded',
        eventType: 'payment_intent.succeeded',
      }),
    };
    module = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: StripeOnboardingService, useValue: onboarding },
        { provide: PaymentsService, useValue: paymentsSvc },
        { provide: PaymentsWebhookService, useValue: webhookSvc },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(PaymentsController);
  });

  it('POST onboarding-link : délègue au service avec sellerProfileId', async () => {
    onboarding.generateOnboardingLink.mockResolvedValue({
      url: 'https://stripe/x',
      expiresAt: 123,
    });
    const res = await controller.generateOnboardingLink(
      { returnUrl: 'https://iox/r', refreshUrl: 'https://iox/f' },
      sellerActor,
    );
    expect(res.url).toContain('stripe');
    expect(onboarding.generateOnboardingLink).toHaveBeenCalledWith(
      'sp1',
      'https://iox/r',
      'https://iox/f',
      sellerActor,
    );
  });

  it('POST onboarding-link : 400 si pas de sellerProfile', async () => {
    const noSeller: RequestUser = { ...sellerActor, sellerProfileIds: [] };
    await expect(
      controller.generateOnboardingLink(
        { returnUrl: 'https://iox/r', refreshUrl: 'https://iox/f' },
        noSeller,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('GET account-status : retourne PENDING_ONBOARDING si pas encore créé', async () => {
    onboarding.getAccountStatus.mockResolvedValue(null);
    const res = await controller.getAccountStatus(sellerActor);
    expect(res.status).toBe('PENDING_ONBOARDING');
    expect(res.chargesEnabled).toBe(false);
  });

  it('GET account-status : retourne le row existant', async () => {
    onboarding.getAccountStatus.mockResolvedValue({
      status: 'CHARGES_ENABLED',
      chargesEnabled: true,
      payoutsEnabled: false,
      detailsSubmitted: true,
    });
    const res = await controller.getAccountStatus(sellerActor);
    expect(res.status).toBe('CHARGES_ENABLED');
  });

  it('POST webhook : signature manquante → 400', async () => {
    const req = { rawBody: Buffer.from('{}') } as unknown as Request;
    await expect(controller.webhook(undefined as unknown as string, req)).rejects.toThrow(BadRequestException);
  });

  it('POST webhook : signature valide → 200 + type dans réponse', async () => {
    const req = { rawBody: Buffer.from('{}') } as unknown as Request;
    const res = await controller.webhook('sig_valid', req);
    expect(res.received).toBe(true);
    expect(res.type).toBe('payment_intent.succeeded');
  });

  it('POST webhook : WebhookSignatureError → 400', async () => {
    const wh = module.get(PaymentsWebhookService);
    (wh.receiveRaw as jest.Mock).mockRejectedValueOnce(new WebhookSignatureError());
    const req = { rawBody: Buffer.from('{}') } as unknown as Request;
    await expect(controller.webhook('sig_bad', req)).rejects.toThrow(BadRequestException);
  });
});
