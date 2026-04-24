import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MarketplaceReviewService } from './marketplace-review.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  MarketplaceRelatedEntityType,
  MarketplaceReviewStatus,
  MarketplaceReviewType,
} from '@iox/shared';

describe('MarketplaceReviewService', () => {
  let service: MarketplaceReviewService;
  let prisma: {
    marketplaceReviewQueue: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let audit: { log: jest.Mock };

  beforeEach(async () => {
    prisma = {
      marketplaceReviewQueue: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn((ops: Array<Promise<unknown>>) => Promise.all(ops)),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceReviewService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(MarketplaceReviewService);
  });

  describe('findAll', () => {
    it('applique les filtres status/reviewType et pagination', async () => {
      prisma.marketplaceReviewQueue.findMany.mockResolvedValue([]);
      prisma.marketplaceReviewQueue.count.mockResolvedValue(0);
      await service.findAll({
        status: MarketplaceReviewStatus.PENDING,
        reviewType: MarketplaceReviewType.PUBLICATION,
        page: 2,
        limit: 10,
      });
      const args = prisma.marketplaceReviewQueue.findMany.mock.calls[0][0];
      expect(args.where.status).toBe(MarketplaceReviewStatus.PENDING);
      expect(args.where.reviewType).toBe(MarketplaceReviewType.PUBLICATION);
      expect(args.skip).toBe(10);
      expect(args.take).toBe(10);
      expect(args.orderBy).toEqual([{ status: 'asc' }, { createdAt: 'desc' }]);
    });
  });

  describe('findById', () => {
    it('404 si introuvable', async () => {
      prisma.marketplaceReviewQueue.findUnique.mockResolvedValue(null);
      await expect(service.findById('x')).rejects.toThrow(NotFoundException);
    });

    it("renvoie l'item", async () => {
      prisma.marketplaceReviewQueue.findUnique.mockResolvedValue({ id: 'r1' });
      const res = await service.findById('r1');
      expect(res.id).toBe('r1');
    });
  });

  describe('countPending', () => {
    it('retourne le total et la répartition par type', async () => {
      prisma.marketplaceReviewQueue.count
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1);
      const res = await service.countPending();
      expect(res).toEqual({
        total: 6,
        byType: { publication: 3, media: 2, document: 1 },
      });
    });
  });

  describe('enqueue', () => {
    const dto = {
      entityType: MarketplaceRelatedEntityType.SELLER_PROFILE,
      entityId: 'sp1',
      reviewType: MarketplaceReviewType.PUBLICATION,
      reason: 'soumission',
    };

    it('idempotent : retourne le PENDING existant sans create', async () => {
      prisma.marketplaceReviewQueue.findFirst.mockResolvedValue({ id: 'r-existing' });
      const res = await service.enqueue(dto, 'u1');
      expect(res).toEqual({ id: 'r-existing' });
      expect(prisma.marketplaceReviewQueue.create).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });

    it('crée un nouvel item + audit si aucun PENDING', async () => {
      prisma.marketplaceReviewQueue.findFirst.mockResolvedValue(null);
      prisma.marketplaceReviewQueue.create.mockResolvedValue({
        id: 'r-new',
        entityType: dto.entityType,
        entityId: dto.entityId,
        reviewType: dto.reviewType,
      });
      const res = await service.enqueue(dto, 'u1');
      expect(res.id).toBe('r-new');
      expect(prisma.marketplaceReviewQueue.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entityType: dto.entityType,
          entityId: dto.entityId,
          reviewType: dto.reviewType,
          status: MarketplaceReviewStatus.PENDING,
          reviewReason: 'soumission',
        }),
      });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MARKETPLACE_REVIEW_ENQUEUED',
        }),
      );
    });
  });

  describe('approve', () => {
    it('404 si item inexistant', async () => {
      prisma.marketplaceReviewQueue.findUnique.mockResolvedValue(null);
      await expect(service.approve('r1', {})).rejects.toThrow(NotFoundException);
    });

    it('400 si déjà décidé', async () => {
      prisma.marketplaceReviewQueue.findUnique.mockResolvedValue({
        id: 'r1',
        status: MarketplaceReviewStatus.APPROVED,
      });
      await expect(service.approve('r1', {})).rejects.toThrow(BadRequestException);
    });

    it('PENDING → APPROVED + audit', async () => {
      prisma.marketplaceReviewQueue.findUnique.mockResolvedValue({
        id: 'r1',
        status: MarketplaceReviewStatus.PENDING,
        reviewReason: null,
      });
      prisma.marketplaceReviewQueue.update.mockResolvedValue({
        id: 'r1',
        status: MarketplaceReviewStatus.APPROVED,
      });
      await service.approve('r1', { reason: 'ok' }, 'admin');
      const data = prisma.marketplaceReviewQueue.update.mock.calls[0][0].data;
      expect(data.status).toBe(MarketplaceReviewStatus.APPROVED);
      expect(data.reviewedByUserId).toBe('admin');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MARKETPLACE_REVIEW_APPROVED',
        }),
      );
    });
  });

  describe('reject', () => {
    it('400 si motif absent', async () => {
      await expect(service.reject('r1', {})).rejects.toThrow(BadRequestException);
    });

    it('400 si motif vide', async () => {
      await expect(service.reject('r1', { reason: '   ' })).rejects.toThrow(BadRequestException);
    });

    it('404 si item inexistant', async () => {
      prisma.marketplaceReviewQueue.findUnique.mockResolvedValue(null);
      await expect(service.reject('r1', { reason: 'bad' })).rejects.toThrow(NotFoundException);
    });

    it('400 si déjà décidé', async () => {
      prisma.marketplaceReviewQueue.findUnique.mockResolvedValue({
        id: 'r1',
        status: MarketplaceReviewStatus.REJECTED,
      });
      await expect(service.reject('r1', { reason: 'bad' })).rejects.toThrow(BadRequestException);
    });

    it('PENDING → REJECTED avec motif + audit', async () => {
      prisma.marketplaceReviewQueue.findUnique.mockResolvedValue({
        id: 'r1',
        status: MarketplaceReviewStatus.PENDING,
      });
      prisma.marketplaceReviewQueue.update.mockResolvedValue({
        id: 'r1',
        status: MarketplaceReviewStatus.REJECTED,
      });
      await service.reject('r1', { reason: 'non conforme' }, 'admin');
      const data = prisma.marketplaceReviewQueue.update.mock.calls[0][0].data;
      expect(data.status).toBe(MarketplaceReviewStatus.REJECTED);
      expect(data.reviewReason).toBe('non conforme');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MARKETPLACE_REVIEW_REJECTED',
        }),
      );
    });
  });

  describe('resolvePendingForEntity', () => {
    it('ne fait rien si aucun PENDING', async () => {
      prisma.marketplaceReviewQueue.findMany.mockResolvedValue([]);
      const n = await service.resolvePendingForEntity(
        MarketplaceRelatedEntityType.SELLER_PROFILE,
        'sp1',
        MarketplaceReviewType.PUBLICATION,
        MarketplaceReviewStatus.APPROVED,
        'ok',
        'u1',
      );
      expect(n).toBe(0);
      expect(prisma.marketplaceReviewQueue.update).not.toHaveBeenCalled();
    });

    it('résout tous les PENDING avec audit AUTO_APPROVED', async () => {
      prisma.marketplaceReviewQueue.findMany.mockResolvedValue([{ id: 'r1' }, { id: 'r2' }]);
      prisma.marketplaceReviewQueue.update.mockResolvedValue({});
      const n = await service.resolvePendingForEntity(
        MarketplaceRelatedEntityType.SELLER_PROFILE,
        'sp1',
        MarketplaceReviewType.PUBLICATION,
        MarketplaceReviewStatus.APPROVED,
        'ok',
        'u1',
      );
      expect(n).toBe(2);
      expect(prisma.marketplaceReviewQueue.update).toHaveBeenCalledTimes(2);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MARKETPLACE_REVIEW_AUTO_APPROVED',
        }),
      );
    });

    it('résolution REJECTED → audit AUTO_REJECTED', async () => {
      prisma.marketplaceReviewQueue.findMany.mockResolvedValue([{ id: 'r1' }]);
      prisma.marketplaceReviewQueue.update.mockResolvedValue({});
      await service.resolvePendingForEntity(
        MarketplaceRelatedEntityType.MARKETPLACE_OFFER,
        'o1',
        MarketplaceReviewType.PUBLICATION,
        MarketplaceReviewStatus.REJECTED,
        'motif',
        'u1',
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MARKETPLACE_REVIEW_AUTO_REJECTED',
        }),
      );
    });
  });
});
