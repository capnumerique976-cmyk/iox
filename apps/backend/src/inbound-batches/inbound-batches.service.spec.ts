import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InboundBatchesService } from './inbound-batches.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CodeGeneratorService } from '../common/services/code-generator.service';
import { InboundBatchStatus } from '@iox/shared';

const mockSupplier = {
  id: 'uuid-s1',
  code: 'ENT-0001',
  name: 'Fournisseur Test',
  isActive: true,
  deletedAt: null,
};
const mockProduct = { id: 'uuid-p1', code: 'PRD-0001', name: 'Rougail Mangue', deletedAt: null };

const mockBatch = {
  id: 'uuid-ib1',
  code: 'IB-2026-0001',
  status: InboundBatchStatus.RECEIVED,
  supplierId: 'uuid-s1',
  productId: 'uuid-p1',
  receivedAt: new Date('2026-03-15'),
  quantity: 500,
  unit: 'kg',
  deletedAt: null,
  supplier: mockSupplier,
  product: mockProduct,
  supplyContract: null,
  _count: { transformationOperations: 0, documents: 0 },
};

describe('InboundBatchesService', () => {
  let service: InboundBatchesService;
  let prisma: {
    inboundBatch: jest.Mocked<Record<string, jest.Mock>>;
    company: jest.Mocked<Record<string, jest.Mock>>;
    product: jest.Mocked<Record<string, jest.Mock>>;
    supplyContract: jest.Mocked<Record<string, jest.Mock>>;
    $transaction: jest.Mock;
  };
  let auditService: jest.Mocked<AuditService>;
  let codeGen: jest.Mocked<CodeGeneratorService>;

  beforeEach(async () => {
    prisma = {
      inboundBatch: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      company: { findFirst: jest.fn() },
      product: { findFirst: jest.fn() },
      supplyContract: { findFirst: jest.fn() },
      $transaction: jest.fn((fns: Array<Promise<unknown>>) => Promise.all(fns)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InboundBatchesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { log: jest.fn() } },
        {
          provide: CodeGeneratorService,
          useValue: { generate: jest.fn().mockResolvedValue('IB-2026-0001') },
        },
      ],
    }).compile();

    service = module.get(InboundBatchesService);
    auditService = module.get(AuditService);
    codeGen = module.get(CodeGeneratorService);
  });

  describe('create', () => {
    it('génère IB-2026-0001 et crée le lot', async () => {
      prisma.company.findFirst.mockResolvedValue(mockSupplier);
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.inboundBatch.create.mockResolvedValue(mockBatch);
      auditService.log.mockResolvedValue(undefined);

      const result = await service.create(
        {
          supplierId: 'uuid-s1',
          productId: 'uuid-p1',
          receivedAt: '2026-03-15T08:00:00Z',
          quantity: 500,
          unit: 'kg',
        },
        'actor-id',
      );

      expect(codeGen.generate).toHaveBeenCalledWith('inboundBatch');
      expect(result.code).toBe('IB-2026-0001');
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'INBOUND_BATCH_CREATED' }),
      );
    });

    it('lève NotFoundException si fournisseur introuvable', async () => {
      prisma.company.findFirst.mockResolvedValue(null);
      await expect(
        service.create(
          {
            supplierId: 'xxx',
            productId: 'uuid-p1',
            receivedAt: '2026-03-15T08:00:00Z',
            quantity: 100,
            unit: 'kg',
          },
          'actor',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('lève NotFoundException si produit introuvable', async () => {
      prisma.company.findFirst.mockResolvedValue(mockSupplier);
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(
        service.create(
          {
            supplierId: 'uuid-s1',
            productId: 'xxx',
            receivedAt: '2026-03-15T08:00:00Z',
            quantity: 100,
            unit: 'kg',
          },
          'actor',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('met à jour un lot RECEIVED', async () => {
      prisma.inboundBatch.findFirst.mockResolvedValue(mockBatch);
      prisma.inboundBatch.update.mockResolvedValue({ ...mockBatch, quantity: 450 });
      auditService.log.mockResolvedValue(undefined);

      const result = await service.update('uuid-ib1', { quantity: 450 }, 'actor');
      expect(result.quantity).toBe(450);
    });

    it("rejette la modification d'un lot IN_CONTROL", async () => {
      prisma.inboundBatch.findFirst.mockResolvedValue({
        ...mockBatch,
        status: InboundBatchStatus.IN_CONTROL,
      });
      await expect(service.update('uuid-ib1', { quantity: 450 }, 'actor')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('changeStatus', () => {
    it('accepte RECEIVED → IN_CONTROL', async () => {
      prisma.inboundBatch.findFirst.mockResolvedValue(mockBatch);
      prisma.inboundBatch.update.mockResolvedValue({
        ...mockBatch,
        status: InboundBatchStatus.IN_CONTROL,
      });
      auditService.log.mockResolvedValue(undefined);

      const result = await service.changeStatus(
        'uuid-ib1',
        { status: InboundBatchStatus.IN_CONTROL },
        'actor',
      );
      expect(result.status).toBe(InboundBatchStatus.IN_CONTROL);
    });

    it('accepte IN_CONTROL → ACCEPTED avec notes', async () => {
      prisma.inboundBatch.findFirst.mockResolvedValue({
        ...mockBatch,
        status: InboundBatchStatus.IN_CONTROL,
      });
      prisma.inboundBatch.update.mockResolvedValue({
        ...mockBatch,
        status: InboundBatchStatus.ACCEPTED,
      });
      auditService.log.mockResolvedValue(undefined);

      const result = await service.changeStatus(
        'uuid-ib1',
        { status: InboundBatchStatus.ACCEPTED, controlNotes: 'RAS' },
        'actor',
      );
      expect(result.status).toBe(InboundBatchStatus.ACCEPTED);
    });

    it('rejette RECEIVED → ACCEPTED (saut interdit)', async () => {
      prisma.inboundBatch.findFirst.mockResolvedValue(mockBatch);
      await expect(
        service.changeStatus('uuid-ib1', { status: InboundBatchStatus.ACCEPTED }, 'actor'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejette ACCEPTED → tout (statut terminal)', async () => {
      prisma.inboundBatch.findFirst.mockResolvedValue({
        ...mockBatch,
        status: InboundBatchStatus.ACCEPTED,
      });
      await expect(
        service.changeStatus('uuid-ib1', { status: InboundBatchStatus.REJECTED }, 'actor'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
