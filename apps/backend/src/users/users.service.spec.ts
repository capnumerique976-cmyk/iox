import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UserRole } from '@iox/shared';

const mockUser = {
  id: 'uuid-1',
  email: 'test@iox.mch',
  firstName: 'Test',
  lastName: 'User',
  role: UserRole.COORDINATOR,
  isActive: true,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('UsersService', () => {
  let service: UsersService;
  let prisma: { user: jest.Mocked<Record<string, jest.Mock>> };
  let auditService: jest.Mocked<AuditService>;

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            ...prisma,
            $transaction: jest.fn((fns: Array<Promise<unknown>>) => Promise.all(fns)),
          },
        },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get(UsersService);
    auditService = module.get(AuditService);
  });

  describe('create', () => {
    it('crée un utilisateur si email libre', async () => {
      jest.spyOn(service, 'findByEmail').mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      auditService.log.mockResolvedValue(undefined);

      const result = await service.create(
        {
          email: 'new@iox.mch',
          password: 'Pass@1234',
          firstName: 'New',
          lastName: 'User',
          role: UserRole.COORDINATOR,
        },
        'actor-id',
      );

      expect(result.email).toBe(mockUser.email);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_CREATED' }),
      );
    });

    it('lève ConflictException si email déjà utilisé', async () => {
      jest.spyOn(service, 'findByEmail').mockResolvedValue(mockUser as never);

      await expect(
        service.create({
          email: 'test@iox.mch',
          password: 'Pass@1234',
          firstName: 'X',
          lastName: 'Y',
          role: UserRole.COORDINATOR,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deactivate', () => {
    it('désactive un utilisateur', async () => {
      jest.spyOn(service, 'findById').mockResolvedValue(mockUser as never);
      (prisma.user.update as jest.Mock).mockResolvedValue({ ...mockUser, isActive: false });
      auditService.log.mockResolvedValue(undefined);

      const result = await service.deactivate('uuid-1', 'actor-id');
      expect(result.isActive).toBe(false);
    });

    it('lève NotFoundException si utilisateur inexistant', async () => {
      jest.spyOn(service, 'findById').mockResolvedValue(null);
      await expect(service.deactivate('inexistant', 'actor-id')).rejects.toThrow(NotFoundException);
    });

    it("lève BadRequestException si l'acteur se désactive lui-même", async () => {
      jest.spyOn(service, 'findById').mockResolvedValue(mockUser as never);
      await expect(service.deactivate('uuid-1', 'uuid-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([mockUser]);
      (prisma.user.count as jest.Mock).mockResolvedValue(1);
    });

    it('applique les défauts page=1, limit=20 quand aucun paramètre fourni', async () => {
      const res = await service.findAll();
      expect(res.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20, orderBy: { createdAt: 'desc' } }),
      );
    });

    it('clamp le limit à 100 quand > 100 est demandé', async () => {
      await service.findAll({ limit: 500 });
      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));
    });

    it('calcule skip à partir de page/limit', async () => {
      await service.findAll({ page: 3, limit: 10 });
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('construit un OR insensible pour search sur email/firstName/lastName', async () => {
      await service.findAll({ search: 'ALICE' });
      const call = (prisma.user.findMany as jest.Mock).mock.calls[0][0];
      expect(call.where.OR).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ email: expect.objectContaining({ mode: 'insensitive' }) }),
          expect.objectContaining({ firstName: expect.objectContaining({ contains: 'ALICE' }) }),
        ]),
      );
    });

    it('filtre par rôle quand fourni', async () => {
      await service.findAll({ role: UserRole.ADMIN });
      const call = (prisma.user.findMany as jest.Mock).mock.calls[0][0];
      expect(call.where.role).toBe(UserRole.ADMIN);
    });

    it('filtre par isActive true/false distinctement', async () => {
      await service.findAll({ isActive: false });
      const call = (prisma.user.findMany as jest.Mock).mock.calls[0][0];
      expect(call.where.isActive).toBe(false);

      (prisma.user.findMany as jest.Mock).mockClear();
      await service.findAll({ isActive: true });
      const call2 = (prisma.user.findMany as jest.Mock).mock.calls[0][0];
      expect(call2.where.isActive).toBe(true);
    });

    it('exclut toujours les utilisateurs soft-deleted', async () => {
      await service.findAll();
      const call = (prisma.user.findMany as jest.Mock).mock.calls[0][0];
      expect(call.where.deletedAt).toBe(null);
    });
  });
});
