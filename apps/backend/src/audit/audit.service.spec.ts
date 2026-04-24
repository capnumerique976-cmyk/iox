import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../database/prisma.service';
import { EntityType } from '@iox/shared';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: {
    auditLog: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      auditLog: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn((ops: Array<Promise<unknown>>) => Promise.all(ops)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(AuditService);
  });

  describe('log', () => {
    it('crée une entrée avec tous les champs mappés', async () => {
      prisma.auditLog.create.mockResolvedValue({});
      await service.log({
        action: 'USER_CREATED',
        entityType: EntityType.USER,
        entityId: 'uuid-1',
        userId: 'actor-id',
        newData: { foo: 'bar' },
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'USER_CREATED',
          entityType: EntityType.USER,
          entityId: 'uuid-1',
          userId: 'actor-id',
          newData: { foo: 'bar' },
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
        }),
      });
    });

    it('normalise userId/ipAddress/userAgent manquants à null', async () => {
      prisma.auditLog.create.mockResolvedValue({});
      await service.log({
        action: 'X',
        entityType: EntityType.USER,
        entityId: 'uuid',
      });
      const call = prisma.auditLog.create.mock.calls[0][0];
      expect(call.data.userId).toBeNull();
      expect(call.data.ipAddress).toBeNull();
      expect(call.data.userAgent).toBeNull();
      expect(call.data.previousData).toBeUndefined();
      expect(call.data.newData).toBeUndefined();
    });

    it("n'échoue jamais si Prisma lève (audit non bloquant)", async () => {
      prisma.auditLog.create.mockRejectedValue(new Error('DB down'));
      await expect(
        service.log({ action: 'X', entityType: EntityType.USER, entityId: 'uuid' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);
    });

    it('applique les défauts page=1, limit=50', async () => {
      const res = await service.findAll({});
      expect(res.meta).toEqual({ total: 0, page: 1, limit: 50, totalPages: 0 });
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 50, orderBy: { createdAt: 'desc' } }),
      );
    });

    it('clamp limit à 200', async () => {
      await service.findAll({ limit: 10000 });
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 200 }));
    });

    it('calcule skip depuis page/limit', async () => {
      await service.findAll({ page: 4, limit: 25 });
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 75, take: 25 }),
      );
    });

    it('filtre par entityType/entityId/userId', async () => {
      await service.findAll({
        entityType: EntityType.USER,
        entityId: 'e-id',
        userId: 'u-id',
      });
      const call = prisma.auditLog.findMany.mock.calls[0][0];
      expect(call.where).toMatchObject({
        entityType: EntityType.USER,
        entityId: 'e-id',
        userId: 'u-id',
      });
    });

    it('construit un contains insensitive pour action', async () => {
      await service.findAll({ action: 'CREATE' });
      const call = prisma.auditLog.findMany.mock.calls[0][0];
      expect(call.where.action).toEqual({ contains: 'CREATE', mode: 'insensitive' });
    });

    it('construit createdAt.gte si from seul', async () => {
      const from = new Date('2025-01-01');
      await service.findAll({ from });
      const call = prisma.auditLog.findMany.mock.calls[0][0];
      expect(call.where.createdAt).toEqual({ gte: from });
    });

    it('construit createdAt.lte si to seul', async () => {
      const to = new Date('2025-12-31');
      await service.findAll({ to });
      const call = prisma.auditLog.findMany.mock.calls[0][0];
      expect(call.where.createdAt).toEqual({ lte: to });
    });

    it('construit un range gte+lte si from et to', async () => {
      const from = new Date('2025-01-01');
      const to = new Date('2025-12-31');
      await service.findAll({ from, to });
      const call = prisma.auditLog.findMany.mock.calls[0][0];
      expect(call.where.createdAt).toEqual({ gte: from, lte: to });
    });

    it("inclut l'utilisateur relié (id, email, firstName, lastName, role)", async () => {
      await service.findAll({});
      const call = prisma.auditLog.findMany.mock.calls[0][0];
      expect(call.include.user.select).toEqual({
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      });
    });

    it('totalPages calculé correctement', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(123);
      const res = await service.findAll({ limit: 50 });
      expect(res.meta.totalPages).toBe(3);
    });
  });
});
