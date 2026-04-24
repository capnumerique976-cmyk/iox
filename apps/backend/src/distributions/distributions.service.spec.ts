import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DistributionsService } from './distributions.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CodeGeneratorService } from '../common/services/code-generator.service';
import { DistributionStatus } from '@iox/shared';

const mockBatchAvailable = { id: 'pb-1', status: 'AVAILABLE', code: 'PB-2026-0001' };
const mockBatchReserved = { id: 'pb-2', status: 'RESERVED', code: 'PB-2026-0002' };
const mockBatchBlocked = { id: 'pb-3', status: 'BLOCKED', code: 'PB-2026-0003' };

const mockDist = {
  id: 'dist-1',
  code: 'DIST-2026-0001',
  status: DistributionStatus.PLANNED,
  distributionDate: new Date('2026-04-20'),
  notes: null,
  beneficiary: { id: 'ben-1', code: 'BEN-0001', name: 'École' },
  lines: [],
  _count: { lines: 1 },
};

describe('DistributionsService', () => {
  let service: DistributionsService;
  let prisma: {
    distribution: Record<string, jest.Mock>;
    productBatch: Record<string, jest.Mock>;
    $transaction: jest.Mock;
  };
  let audit: { log: jest.Mock };
  let codeGen: { generate: jest.Mock };

  beforeEach(async () => {
    prisma = {
      distribution: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        groupBy: jest.fn(),
      },
      productBatch: { findMany: jest.fn(), updateMany: jest.fn() },
      $transaction: jest.fn(async (fn: any) => {
        if (typeof fn === 'function') {
          return fn({
            distribution: prisma.distribution,
            productBatch: prisma.productBatch,
          });
        }
        return Promise.all(fn);
      }),
    };

    audit = { log: jest.fn().mockResolvedValue(undefined) };
    codeGen = { generate: jest.fn().mockResolvedValue('DIST-2026-0001') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DistributionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
        { provide: CodeGeneratorService, useValue: codeGen },
      ],
    }).compile();

    service = module.get(DistributionsService);
  });

  describe('findOne', () => {
    it('retourne la distribution quand elle existe', async () => {
      prisma.distribution.findFirst.mockResolvedValue(mockDist);
      const r = await service.findOne('dist-1');
      expect(r).toEqual(mockDist);
    });

    it('jette NotFoundException si absente', async () => {
      prisma.distribution.findFirst.mockResolvedValue(null);
      await expect(service.findOne('dist-x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const dto = {
      beneficiaryId: 'ben-1',
      distributionDate: '2026-04-20',
      notes: 'x',
      lines: [{ productBatchId: 'pb-1', quantity: 10, unit: 'kg', notes: undefined }],
    };

    it('refuse si aucune ligne', async () => {
      await expect(service.create({ ...dto, lines: [] } as any, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('refuse si un lot est introuvable', async () => {
      prisma.productBatch.findMany.mockResolvedValue([]); // aucun match
      await expect(service.create(dto as any, 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('refuse si un lot est BLOCKED', async () => {
      prisma.productBatch.findMany.mockResolvedValue([mockBatchBlocked]);
      await expect(
        service.create(
          { ...dto, lines: [{ productBatchId: 'pb-3', quantity: 5, unit: 'kg' }] } as any,
          'user-1',
        ),
      ).rejects.toThrow(/non disponibles/);
    });

    it('accepte AVAILABLE et RESERVED', async () => {
      prisma.productBatch.findMany.mockResolvedValue([mockBatchAvailable, mockBatchReserved]);
      prisma.distribution.create.mockResolvedValue(mockDist);
      await expect(
        service.create(
          {
            ...dto,
            lines: [
              { productBatchId: 'pb-1', quantity: 1, unit: 'kg' },
              { productBatchId: 'pb-2', quantity: 2, unit: 'kg' },
            ],
          } as any,
          'user-1',
        ),
      ).resolves.toEqual(mockDist);
      expect(codeGen.generate).toHaveBeenCalledWith('distribution');
      expect(audit.log).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('refuse la modification si statut COMPLETED', async () => {
      prisma.distribution.findFirst.mockResolvedValue({
        ...mockDist,
        status: DistributionStatus.COMPLETED,
      });
      await expect(service.update('dist-1', { notes: 'x' } as any, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('refuse la modification si statut CANCELLED', async () => {
      prisma.distribution.findFirst.mockResolvedValue({
        ...mockDist,
        status: DistributionStatus.CANCELLED,
      });
      await expect(service.update('dist-1', { notes: 'x' } as any, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('changeStatus', () => {
    it('refuse une transition invalide (PLANNED → COMPLETED direct)', async () => {
      prisma.distribution.findFirst.mockResolvedValue({
        ...mockDist,
        lines: [{ productBatchId: 'pb-1' }],
      });
      await expect(
        service.changeStatus('dist-1', { status: DistributionStatus.COMPLETED } as any, 'user-1'),
      ).rejects.toThrow(/Transition invalide/);
    });

    it('accepte PLANNED → IN_PROGRESS sans toucher aux lots', async () => {
      prisma.distribution.findFirst.mockResolvedValue({
        ...mockDist,
        lines: [{ productBatchId: 'pb-1' }],
      });
      prisma.distribution.update.mockResolvedValue({
        ...mockDist,
        status: DistributionStatus.IN_PROGRESS,
      });

      await service.changeStatus(
        'dist-1',
        { status: DistributionStatus.IN_PROGRESS } as any,
        'user-1',
      );
      expect(prisma.productBatch.updateMany).not.toHaveBeenCalled();
    });

    it('IN_PROGRESS → COMPLETED passe les lots à SHIPPED', async () => {
      prisma.distribution.findFirst.mockResolvedValue({
        ...mockDist,
        status: DistributionStatus.IN_PROGRESS,
        lines: [{ productBatchId: 'pb-1' }, { productBatchId: 'pb-2' }],
      });
      prisma.distribution.update.mockResolvedValue({
        ...mockDist,
        status: DistributionStatus.COMPLETED,
      });

      await service.changeStatus(
        'dist-1',
        { status: DistributionStatus.COMPLETED } as any,
        'user-1',
      );
      expect(prisma.productBatch.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['pb-1', 'pb-2'] } },
        data: { status: 'SHIPPED', updatedById: 'user-1' },
      });
    });
  });

  describe('remove', () => {
    it("refuse la suppression d'une distribution COMPLETED", async () => {
      prisma.distribution.findFirst.mockResolvedValue({
        ...mockDist,
        status: DistributionStatus.COMPLETED,
      });
      await expect(service.remove('dist-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('soft-delete une distribution PLANNED', async () => {
      prisma.distribution.findFirst.mockResolvedValue(mockDist);
      prisma.distribution.update.mockResolvedValue({ ...mockDist, deletedAt: new Date() });
      await service.remove('dist-1', 'user-1');
      expect(prisma.distribution.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });
  });
});
