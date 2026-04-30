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
    emailUnsubscribe: {
      upsert: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
      deleteMany: jest.Mock;
    };
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
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
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

  // MP-NOTIF-3 phase 4 — listUnsubscribes
  describe('listUnsubscribes', () => {
    const sampleRow = {
      id: 'unsub-1',
      email: 'a@x.test',
      unsubscribeType: EmailUnsubscribeType.RFQ_NOTIFICATIONS,
      userId: 'u-1',
      reason: 'opt-out',
      createdAt: new Date('2026-04-25T10:00:00Z'),
    };

    it('paginé par défaut (page=1, limit=20) — orderBy createdAt desc', async () => {
      prisma.emailUnsubscribe.count.mockResolvedValue(0);
      prisma.emailUnsubscribe.findMany.mockResolvedValue([]);
      const res = await service.listUnsubscribes({});
      expect(res.meta).toEqual({ total: 0, page: 1, limit: 20, totalPages: 0 });
      const args = prisma.emailUnsubscribe.findMany.mock.calls[0][0];
      expect(args.skip).toBe(0);
      expect(args.take).toBe(20);
      expect(args.orderBy).toEqual({ createdAt: 'desc' });
    });

    it('filtre type + email contains insensitive', async () => {
      prisma.emailUnsubscribe.count.mockResolvedValue(1);
      prisma.emailUnsubscribe.findMany.mockResolvedValue([sampleRow]);
      await service.listUnsubscribes({
        type: EmailUnsubscribeType.RFQ_NOTIFICATIONS,
        email: 'A@X',
      });
      const args = prisma.emailUnsubscribe.findMany.mock.calls[0][0];
      expect(args.where.unsubscribeType).toBe(EmailUnsubscribeType.RFQ_NOTIFICATIONS);
      expect(args.where.email).toEqual({ contains: 'A@X', mode: 'insensitive' });
    });

    it('mappe les rows en items normalisés (createdAt ISO)', async () => {
      prisma.emailUnsubscribe.count.mockResolvedValue(1);
      prisma.emailUnsubscribe.findMany.mockResolvedValue([sampleRow]);
      const res = await service.listUnsubscribes({});
      expect(res.data).toHaveLength(1);
      expect(res.data[0].createdAt).toBe('2026-04-25T10:00:00.000Z');
      expect(res.data[0].userId).toBe('u-1');
      expect(res.data[0].unsubscribeType).toBe(EmailUnsubscribeType.RFQ_NOTIFICATIONS);
    });

    it('limit cappé à 100, page minimum à 1', async () => {
      prisma.emailUnsubscribe.count.mockResolvedValue(0);
      prisma.emailUnsubscribe.findMany.mockResolvedValue([]);
      await service.listUnsubscribes({ page: 0, limit: 9999 });
      const args = prisma.emailUnsubscribe.findMany.mock.calls[0][0];
      expect(args.take).toBe(100);
      expect(args.skip).toBe(0);
    });
  });

  // BUYER-DASHBOARD-4 — listForEmail + deleteForEmail
  describe('listForEmail', () => {
    it('normalise email + retourne items mappés ISO', async () => {
      prisma.emailUnsubscribe.findMany.mockResolvedValue([
        {
          unsubscribeType: EmailUnsubscribeType.RFQ_NOTIFICATIONS,
          createdAt: new Date('2026-04-25T10:00:00Z'),
        },
      ]);
      const res = await service.listForEmail('A@X.TEST');
      expect(res).toEqual([
        {
          unsubscribeType: EmailUnsubscribeType.RFQ_NOTIFICATIONS,
          createdAt: '2026-04-25T10:00:00.000Z',
        },
      ]);
      expect(prisma.emailUnsubscribe.findMany.mock.calls[0][0].where).toEqual({
        email: 'a@x.test',
      });
    });

    it('vide → []', async () => {
      prisma.emailUnsubscribe.findMany.mockResolvedValue([]);
      const res = await service.listForEmail('a@x.test');
      expect(res).toEqual([]);
    });
  });

  describe('deleteForEmail', () => {
    it('appelle deleteMany avec email normalisé + type', async () => {
      await service.deleteForEmail('A@X.TEST', EmailUnsubscribeType.ALL, 'actor-1');
      expect(prisma.emailUnsubscribe.deleteMany).toHaveBeenCalledWith({
        where: { email: 'a@x.test', unsubscribeType: EmailUnsubscribeType.ALL },
      });
    });

    it('idempotent : si rien à delete, ne throw pas', async () => {
      prisma.emailUnsubscribe.deleteMany.mockResolvedValue({ count: 0 });
      await expect(
        service.deleteForEmail('a@x.test', EmailUnsubscribeType.RFQ_NOTIFICATIONS),
      ).resolves.toBeUndefined();
    });
  });
});
