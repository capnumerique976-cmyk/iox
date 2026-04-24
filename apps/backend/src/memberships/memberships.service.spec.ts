import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UserRole } from '@iox/shared';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Reflector } from '@nestjs/core';

const mockSeller = {
  id: 'u1',
  email: 'seller@example.com',
  role: UserRole.MARKETPLACE_SELLER,
};
const mockCompany = { id: 'c1', code: 'SELL-0001', name: 'Seller SARL' };
const mockMembership = {
  id: 'm1',
  userId: 'u1',
  companyId: 'c1',
  isPrimary: false,
  createdAt: new Date('2025-01-01'),
  user: mockSeller,
  company: {
    ...mockCompany,
    sellerProfile: { id: 'sp1', publicDisplayName: 'X', status: 'PUBLISHED' },
  },
};

describe('MembershipsService', () => {
  let service: MembershipsService;
  let prisma: any;
  let audit: { log: jest.Mock };

  beforeEach(async () => {
    const tx = {
      userCompanyMembership: {
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        delete: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    prisma = {
      user: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
      company: { findFirst: jest.fn() },
      userCompanyMembership: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        delete: jest.fn(),
      },
      $transaction: jest.fn((arg: any) => {
        if (typeof arg === 'function') return arg(tx);
        return Promise.all(arg);
      }),
      __tx: tx,
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(MembershipsService);
  });

  describe('create', () => {
    it('crée un membership', async () => {
      prisma.user.findFirst.mockResolvedValue(mockSeller);
      prisma.company.findFirst.mockResolvedValue(mockCompany);
      prisma.userCompanyMembership.findUnique.mockResolvedValue(null);
      prisma.__tx.userCompanyMembership.create.mockResolvedValue(mockMembership);

      const result = await service.create({ userId: 'u1', companyId: 'c1' }, 'admin-id');
      expect(result).toEqual(mockMembership);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'MEMBERSHIP_CREATED' }),
      );
    });

    it('lève 409 si doublon', async () => {
      prisma.user.findFirst.mockResolvedValue(mockSeller);
      prisma.company.findFirst.mockResolvedValue(mockCompany);
      prisma.userCompanyMembership.findUnique.mockResolvedValue(mockMembership);

      await expect(service.create({ userId: 'u1', companyId: 'c1' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('lève 404 si user inexistant', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.company.findFirst.mockResolvedValue(mockCompany);
      await expect(service.create({ userId: 'u1', companyId: 'c1' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lève 404 si company inexistante', async () => {
      prisma.user.findFirst.mockResolvedValue(mockSeller);
      prisma.company.findFirst.mockResolvedValue(null);
      await expect(service.create({ userId: 'u1', companyId: 'c1' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('unset les autres primary si isPrimary=true', async () => {
      prisma.user.findFirst.mockResolvedValue(mockSeller);
      prisma.company.findFirst.mockResolvedValue(mockCompany);
      prisma.userCompanyMembership.findUnique.mockResolvedValue(null);
      prisma.__tx.userCompanyMembership.create.mockResolvedValue({
        ...mockMembership,
        isPrimary: true,
      });

      await service.create({ userId: 'u1', companyId: 'c1', isPrimary: true }, 'admin-id');
      expect(prisma.__tx.userCompanyMembership.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', isPrimary: true },
        data: { isPrimary: false },
      });
    });
  });

  describe('delete', () => {
    it('supprime un membership simple', async () => {
      prisma.userCompanyMembership.findUnique.mockResolvedValue({
        ...mockMembership,
        isPrimary: false,
      });
      prisma.__tx.userCompanyMembership.findMany.mockResolvedValue([]);

      const res = await service.delete('m1', 'admin-id');
      expect(res.autoPromotedMembershipId).toBeNull();
      expect(prisma.__tx.userCompanyMembership.delete).toHaveBeenCalledWith({
        where: { id: 'm1' },
      });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'MEMBERSHIP_DELETED' }),
      );
    });

    it('auto-promote le plus ancien membership restant si primary supprimé', async () => {
      prisma.userCompanyMembership.findUnique.mockResolvedValue({
        ...mockMembership,
        isPrimary: true,
      });
      prisma.__tx.userCompanyMembership.findMany.mockResolvedValue([{ id: 'm2', userId: 'u1' }]);

      const res = await service.delete('m1', 'admin-id');
      expect(res.autoPromotedMembershipId).toBe('m2');
      expect(prisma.__tx.userCompanyMembership.update).toHaveBeenCalledWith({
        where: { id: 'm2' },
        data: { isPrimary: true },
      });
    });

    it('lève 404 si membership introuvable', async () => {
      prisma.userCompanyMembership.findUnique.mockResolvedValue(null);
      await expect(service.delete('nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('setPrimary', () => {
    it('unset les autres puis marque celui-ci primary', async () => {
      prisma.userCompanyMembership.findUnique.mockResolvedValue(mockMembership);
      prisma.__tx.userCompanyMembership.update.mockResolvedValue({
        ...mockMembership,
        isPrimary: true,
      });

      await service.setPrimary('m1', 'admin-id');
      expect(prisma.__tx.userCompanyMembership.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', isPrimary: true },
        data: { isPrimary: false },
      });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'MEMBERSHIP_PRIMARY_CHANGED' }),
      );
    });
  });

  describe('findAll', () => {
    it('applique page/limit par défaut', async () => {
      prisma.userCompanyMembership.findMany.mockResolvedValue([mockMembership]);
      prisma.userCompanyMembership.count.mockResolvedValue(1);
      const res = await service.findAll({});
      expect(res.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
    });

    it('filtre par userId/companyId', async () => {
      prisma.userCompanyMembership.findMany.mockResolvedValue([]);
      prisma.userCompanyMembership.count.mockResolvedValue(0);
      await service.findAll({ userId: 'u1', companyId: 'c1' });
      expect(prisma.userCompanyMembership.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u1', companyId: 'c1' } }),
      );
    });
  });

  describe('findOrphanSellers', () => {
    it('retourne les sellers sans membership', async () => {
      prisma.user.findMany.mockResolvedValue([mockSeller]);
      const res = await service.findOrphanSellers();
      expect(res.data).toEqual([mockSeller]);
      const call = prisma.user.findMany.mock.calls[0][0];
      expect(call.where.role).toBe(UserRole.MARKETPLACE_SELLER);
      expect(call.where.companyMemberships).toEqual({ none: {} });
    });

    it('ne remonte pas les buyers/beneficiaries (filtre role strict sur MARKETPLACE_SELLER)', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      await service.findOrphanSellers();
      const call = prisma.user.findMany.mock.calls[0][0];
      expect(call.where.role).toBe(UserRole.MARKETPLACE_SELLER);
      expect(call.where.role).not.toBe(UserRole.MARKETPLACE_BUYER);
    });
  });

  describe('diagnostic', () => {
    it('agrège les compteurs ownership', async () => {
      prisma.user.count
        .mockResolvedValueOnce(10) // totalSellerUsers
        .mockResolvedValueOnce(3); // sellersWithoutMembership
      prisma.userCompanyMembership.count
        .mockResolvedValueOnce(12) // totalMemberships
        .mockResolvedValueOnce(1); // membershipsWithoutSellerProfile

      const res = await service.diagnostic();
      expect(res).toEqual({
        totalSellerUsers: 10,
        sellersWithMembership: 7,
        sellersWithoutMembership: 3,
        totalMemberships: 12,
        membershipsWithoutSellerProfile: 1,
      });
    });
  });
});

/**
 * Test de régression : garantit que le RolesGuard refuse explicitement
 * les rôles non-admin sur le controller (aucun seller ne peut créer un
 * membership pour lui-même).
 */
describe('MembershipsController · ownership guard', () => {
  it('RolesGuard refuse un MARKETPLACE_SELLER', () => {
    const reflector = new Reflector();
    const guard = new RolesGuard(reflector);
    const ctx: any = {
      getHandler: () => () => undefined,
      getClass: () => class Dummy {},
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: UserRole.MARKETPLACE_SELLER } }),
      }),
    };
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.ADMIN, UserRole.COORDINATOR]);
    expect(() => guard.canActivate(ctx)).toThrow(/Accès refusé/);
  });

  it('RolesGuard accepte un ADMIN', () => {
    const reflector = new Reflector();
    const guard = new RolesGuard(reflector);
    const ctx: any = {
      getHandler: () => () => undefined,
      getClass: () => class Dummy {},
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: UserRole.ADMIN } }),
      }),
    };
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.ADMIN, UserRole.COORDINATOR]);
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
