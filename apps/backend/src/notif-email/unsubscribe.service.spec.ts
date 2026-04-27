// MP-NOTIF-2 phase 2 — Couverture du service unsubscribe.

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { EmailUnsubscribeType } from '@prisma/client';
import {
  UnsubscribeService,
  UnsubscribeTokenError,
} from './unsubscribe.service';
import { PrismaService } from '../database/prisma.service';

describe('UnsubscribeService', () => {
  let service: UnsubscribeService;
  let prisma: {
    emailUnsubscribe: { upsert: jest.Mock; count: jest.Mock };
  };
  let config: { get: jest.Mock };

  beforeEach(async () => {
    config = {
      get: jest.fn((k: string) => {
        if (k === 'UNSUBSCRIBE_JWT_SECRET') return 'test-unsub-secret-32chars-min-please-pad';
        if (k === 'JWT_SECRET') return 'fallback-secret-32chars-min-pad-padding';
        return undefined;
      }),
    };
    prisma = {
      emailUnsubscribe: {
        upsert: jest.fn().mockResolvedValue({ id: 'unsub-1' }),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      providers: [
        UnsubscribeService,
        { provide: ConfigService, useValue: config },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(UnsubscribeService);
  });

  it('generateToken puis validateToken → roundtrip OK', () => {
    const token = service.generateToken('a@x.test', EmailUnsubscribeType.RFQ_NOTIFICATIONS);
    const payload = service.validateToken(token);
    expect(payload).toMatchObject({
      email: 'a@x.test',
      type: EmailUnsubscribeType.RFQ_NOTIFICATIONS,
    });
  });

  it('email est normalisé (lowercase + trim) lors du sign + check', () => {
    const token = service.generateToken('  A@X.Test  ', EmailUnsubscribeType.TRANSACTIONAL);
    const payload = service.validateToken(token);
    expect(payload.email).toBe('a@x.test');
  });

  it('validateToken token invalide → throw UnsubscribeTokenError INVALID_TOKEN', () => {
    expect(() => service.validateToken('not.a.token')).toThrow(UnsubscribeTokenError);
    try {
      service.validateToken('not.a.token');
    } catch (err) {
      expect((err as UnsubscribeTokenError).code).toBe('INVALID_TOKEN');
    }
  });

  it('validateToken signé avec mauvais secret → INVALID_TOKEN', async () => {
    // Génère avec un secret indépendant
    const otherJwt = new JwtService({});
    const bad = otherJwt.sign(
      { email: 'x@y.test', type: 'TRANSACTIONAL' },
      { secret: 'different-secret-32chars-min-pad-padding', expiresIn: '90d' },
    );
    expect(() => service.validateToken(bad)).toThrow(UnsubscribeTokenError);
  });

  it('register → upsert appelé avec normalisation email', async () => {
    await service.register('  A@X.Test  ', EmailUnsubscribeType.RFQ_NOTIFICATIONS, 'u1', 'opt-out');
    expect(prisma.emailUnsubscribe.upsert).toHaveBeenCalledTimes(1);
    const arg = prisma.emailUnsubscribe.upsert.mock.calls[0][0];
    expect(arg.where.email_unsubscribes_email_type_uq).toEqual({
      email: 'a@x.test',
      unsubscribeType: EmailUnsubscribeType.RFQ_NOTIFICATIONS,
    });
    expect(arg.create.userId).toBe('u1');
    expect(arg.create.reason).toBe('opt-out');
  });

  it('isUnsubscribed → true si entrée matching exact', async () => {
    prisma.emailUnsubscribe.count.mockResolvedValue(1);
    const out = await service.isUnsubscribed('a@x.test', EmailUnsubscribeType.RFQ_NOTIFICATIONS);
    expect(out).toBe(true);
    const arg = prisma.emailUnsubscribe.count.mock.calls[0][0];
    expect(arg.where.email).toBe('a@x.test');
    expect(arg.where.OR).toEqual([
      { unsubscribeType: EmailUnsubscribeType.RFQ_NOTIFICATIONS },
      { unsubscribeType: EmailUnsubscribeType.ALL },
    ]);
  });

  it('isUnsubscribed → true si type ALL existe', async () => {
    // count=1 simule la présence d'au moins une ligne (ALL ou type)
    prisma.emailUnsubscribe.count.mockResolvedValue(1);
    expect(
      await service.isUnsubscribed('a@x.test', EmailUnsubscribeType.TRANSACTIONAL),
    ).toBe(true);
  });

  it('isUnsubscribed → false si count=0', async () => {
    prisma.emailUnsubscribe.count.mockResolvedValue(0);
    expect(
      await service.isUnsubscribed('a@x.test', EmailUnsubscribeType.RFQ_NOTIFICATIONS),
    ).toBe(false);
  });
});
