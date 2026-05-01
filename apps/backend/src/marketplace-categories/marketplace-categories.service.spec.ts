// MP-CATEGORY-1 — Spec MarketplaceCategoriesService.

import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { MarketplaceCategoriesService } from './marketplace-categories.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';

describe('MarketplaceCategoriesService', () => {
  let service: MarketplaceCategoriesService;
  let prisma: {
    marketplaceCategory: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
  };
  let audit: { log: jest.Mock };

  beforeEach(async () => {
    prisma = {
      marketplaceCategory: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn().mockResolvedValue({}),
        count: jest.fn(),
      },
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceCategoriesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = module.get(MarketplaceCategoriesService);
  });

  describe('findAllTree', () => {
    it('construit arbre parent → children', async () => {
      prisma.marketplaceCategory.findMany.mockResolvedValue([
        {
          id: 'root1',
          slug: 'epices',
          nameFr: 'Épices',
          nameEn: 'Spices',
          description: null,
          parentId: null,
          sortOrder: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { marketplaceProducts: 5 },
        },
        {
          id: 'child1',
          slug: 'vanille',
          nameFr: 'Vanille',
          nameEn: 'Vanilla',
          description: null,
          parentId: 'root1',
          sortOrder: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { marketplaceProducts: 3 },
        },
      ]);

      const tree = await service.findAllTree();
      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe('root1');
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children[0].id).toBe('child1');
      expect(tree[0].productsCount).toBe(5);
    });

    it('filtre isActive=true par défaut', async () => {
      prisma.marketplaceCategory.findMany.mockResolvedValue([]);
      await service.findAllTree();
      const where = prisma.marketplaceCategory.findMany.mock.calls[0][0].where;
      expect(where.isActive).toBe(true);
    });

    it('includeInactive=true → retourne tout', async () => {
      prisma.marketplaceCategory.findMany.mockResolvedValue([]);
      await service.findAllTree(true);
      const where = prisma.marketplaceCategory.findMany.mock.calls[0][0].where;
      expect(where.isActive).toBeUndefined();
    });
  });

  describe('create', () => {
    it('happy path : crée + log audit', async () => {
      prisma.marketplaceCategory.findUnique.mockResolvedValue(null); // pas de slug existant
      prisma.marketplaceCategory.create.mockResolvedValue({
        id: 'cat1',
        slug: 'epices',
        nameFr: 'Épices',
        parentId: null,
      });
      const res = await service.create(
        { slug: 'epices', nameFr: 'Épices', nameEn: 'Spices' },
        'admin-1',
      );
      expect(res.id).toBe('cat1');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'MARKETPLACE_CATEGORY_CREATED' }),
      );
    });

    it('slug déjà utilisé → ConflictException', async () => {
      prisma.marketplaceCategory.findUnique.mockResolvedValue({
        id: 'existing',
        slug: 'epices',
      });
      await expect(
        service.create({ slug: 'epices', nameFr: 'Épices', nameEn: 'Spices' }, 'admin-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('parentId inexistant → BadRequestException', async () => {
      prisma.marketplaceCategory.findUnique
        .mockResolvedValueOnce(null) // slug check
        .mockResolvedValueOnce(null); // parent check
      await expect(
        service.create(
          { slug: 'x', nameFr: 'X', nameEn: 'X', parentId: 'nope' },
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('happy path', async () => {
      prisma.marketplaceCategory.findUnique.mockResolvedValue({
        id: 'cat1',
        nameFr: 'Old',
        parentId: null,
        isActive: true,
        _count: { marketplaceProducts: 0 },
      });
      prisma.marketplaceCategory.update.mockResolvedValue({
        id: 'cat1',
        nameFr: 'New',
        parentId: null,
        isActive: true,
      });
      const res = await service.update('cat1', { nameFr: 'New' }, 'admin-1');
      expect(res.nameFr).toBe('New');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'MARKETPLACE_CATEGORY_UPDATED' }),
      );
    });

    it('parentId === id → BadRequestException (cycle self)', async () => {
      prisma.marketplaceCategory.findUnique.mockResolvedValueOnce({
        id: 'cat1',
        _count: { marketplaceProducts: 0 },
      });
      await expect(
        service.update('cat1', { parentId: 'cat1' }, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('hard delete si pas de products ni children', async () => {
      prisma.marketplaceCategory.findUnique.mockResolvedValue({
        id: 'cat1',
        slug: 'x',
        nameFr: 'X',
        _count: { marketplaceProducts: 0 },
      });
      prisma.marketplaceCategory.count.mockResolvedValue(0); // pas de children
      const res = await service.delete('cat1', 'admin-1');
      expect(res.deleted).toBe(true);
      expect(res.deactivated).toBe(false);
      expect(prisma.marketplaceCategory.delete).toHaveBeenCalledWith({
        where: { id: 'cat1' },
      });
    });

    it('soft delete (isActive=false) si products attachés', async () => {
      prisma.marketplaceCategory.findUnique.mockResolvedValue({
        id: 'cat1',
        _count: { marketplaceProducts: 5 },
      });
      prisma.marketplaceCategory.count.mockResolvedValue(0);
      prisma.marketplaceCategory.update.mockResolvedValue({ id: 'cat1', isActive: false });
      const res = await service.delete('cat1', 'admin-1');
      expect(res.deleted).toBe(false);
      expect(res.deactivated).toBe(true);
      expect(prisma.marketplaceCategory.delete).not.toHaveBeenCalled();
    });

    it('soft delete si children attachés (même sans products)', async () => {
      prisma.marketplaceCategory.findUnique.mockResolvedValue({
        id: 'cat1',
        _count: { marketplaceProducts: 0 },
      });
      prisma.marketplaceCategory.count.mockResolvedValue(3); // 3 children
      prisma.marketplaceCategory.update.mockResolvedValue({ id: 'cat1', isActive: false });
      const res = await service.delete('cat1', 'admin-1');
      expect(res.deactivated).toBe(true);
    });

    it('NotFoundException si introuvable', async () => {
      prisma.marketplaceCategory.findUnique.mockResolvedValue(null);
      await expect(service.delete('nope', 'admin-1')).rejects.toThrow(NotFoundException);
    });
  });
});
