// PAY-1 phase 1 LOT 1 — Spec PaymentsController.

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { StripeOnboardingService } from './stripe-onboarding.service';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { STRIPE_CLIENT, type StripeClientWrapper } from './stripe.factory';
import { UserRole, RequestUser } from '@iox/shared';
import type { Request } from 'express';

describe('PaymentsController (PAY-1 phase 1 LOT 1)', () => {
  let controller: PaymentsController;
  let onboarding: {
    generateOnboardingLink: jest.Mock;
    syncAccountStatus: jest.Mock;
    getAccountStatus: jest.Mock;
  };
  let stripeWrapper: StripeClientWrapper;

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
    stripeWrapper = {
      isConfigured: () => true,
      client: () =>
        ({
          webhooks: {
            constructEvent: jest
              .fn()
              .mockImplementation((_body, _sig, _secret) => ({
                type: 'payment_intent.succeeded',
                id: 'evt_test_1',
              })),
          },
        }) as never,
    };
    const config = { get: jest.fn().mockReturnValue('whsec_test') };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: StripeOnboardingService, useValue: onboarding },
        { provide: ConfigService, useValue: config },
        { provide: STRIPE_CLIENT, useValue: stripeWrapper },
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
    await expect(controller.webhook(undefined, req)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('POST webhook : signature valide → 200 + log type', async () => {
    const req = { rawBody: Buffer.from('{}') } as unknown as Request;
    const res = await controller.webhook('sig_valid', req);
    expect(res.received).toBe(true);
    expect(res.type).toBe('payment_intent.succeeded');
  });

  it('POST webhook : signature invalide (constructEvent throw) → 400', async () => {
    stripeWrapper.client = () =>
      ({
        webhooks: {
          constructEvent: jest.fn().mockImplementation(() => {
            throw new Error('signature mismatch');
          }),
        },
      }) as never;
    const req = { rawBody: Buffer.from('{}') } as unknown as Request;
    await expect(controller.webhook('sig_bad', req)).rejects.toThrow(
      BadRequestException,
    );
  });
});
