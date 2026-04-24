import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { LabelValidationsService } from './label-validations.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';

const mockBatch = {
  id: 'uuid-pb1',
  code: 'PB-2026-0001',
  status: 'CREATED',
  deletedAt: null,
};

const mockValidation = {
  id: 'uuid-lv1',
  productBatchId: 'uuid-pb1',
  isValid: true,
  notes: 'OK',
  reservations: [],
  validatedAt: new Date(),
  createdById: 'actor',
  productBatch: {
    id: 'uuid-pb1',
    code: 'PB-2026-0001',
    status: 'CREATED',
    product: { id: 'uuid-p1', name: 'Rougail Mangue' },
  },
  validatedBy: null,
};

describe('LabelValidationsService', () => {
  let service: LabelValidationsService;
  let prisma: {
    labelValidation: jest.Mocked<Record<string, jest.Mock>>;
    productBatch: jest.Mocked<Record<string, jest.Mock>>;
    $transaction: jest.Mock;
  };
  let _auditService: jest.Mocked<AuditService>;

  beforeEach(async () => {
    prisma = {
      labelValidation: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      productBatch: { findFirst: jest.fn() },
      $transaction: jest.fn((fns: Array<Promise<unknown>>) => Promise.all(fns)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabelValidationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get(LabelValidationsService);
    _auditService = module.get(AuditService);
  });

  describe('create', () => {
    it('crée une validation pour un lot CREATED', async () => {
      prisma.productBatch.findFirst.mockResolvedValue(mockBatch);
      prisma.labelValidation.create.mockResolvedValue(mockValidation);

      const result = await service.create(
        { productBatchId: 'uuid-pb1', isValid: true, notes: 'OK' },
        'actor',
      );
      expect(result.isValid).toBe(true);
      expect(prisma.labelValidation.create).toHaveBeenCalled();
    });

    it('rejette si le lot est DESTROYED', async () => {
      prisma.productBatch.findFirst.mockResolvedValue({ ...mockBatch, status: 'DESTROYED' });
      await expect(
        service.create({ productBatchId: 'uuid-pb1', isValid: false }, 'actor'),
      ).rejects.toThrow(BadRequestException);
    });

    it('lève NotFoundException si le lot est introuvable', async () => {
      prisma.productBatch.findFirst.mockResolvedValue(null);
      await expect(
        service.create({ productBatchId: 'uuid-pb1', isValid: true }, 'actor'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('met à jour une validation existante', async () => {
      prisma.labelValidation.findUnique.mockResolvedValue(mockValidation);
      prisma.labelValidation.update.mockResolvedValue({ ...mockValidation, isValid: false });

      const result = await service.update('uuid-lv1', { isValid: false }, 'actor');
      expect(result.isValid).toBe(false);
    });

    it('lève NotFoundException si la validation est introuvable', async () => {
      prisma.labelValidation.findUnique.mockResolvedValue(null);
      await expect(service.update('unknown', { isValid: true }, 'actor')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
