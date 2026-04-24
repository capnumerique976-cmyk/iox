import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ProductBatchesService } from './product-batches.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CodeGeneratorService } from '../common/services/code-generator.service';
import { ProductsService } from '../products/products.service';
import { ProductBatchStatus } from '@iox/shared';

const mockBatch = {
  id: 'uuid-pb1',
  code: 'PB-2026-0001',
  status: ProductBatchStatus.CREATED,
  productId: 'uuid-p1',
  quantity: 350,
  unit: 'kg',
  productionDate: new Date('2026-04-11'),
  deletedAt: null,
  product: { id: 'uuid-p1', code: 'PRD-0001', name: 'Rougail Mangue', status: 'COMPLIANT' },
  transformationOp: null,
  _count: { labelValidations: 0, marketReleaseDecisions: 0, documents: 0 },
};

describe('ProductBatchesService', () => {
  let service: ProductBatchesService;
  let prisma: {
    productBatch: jest.Mocked<Record<string, jest.Mock>>;
    transformationOperation: jest.Mocked<Record<string, jest.Mock>>;
    $transaction: jest.Mock;
  };
  let auditService: jest.Mocked<AuditService>;
  let productsService: jest.Mocked<ProductsService>;
  let codeGen: jest.Mocked<CodeGeneratorService>;

  beforeEach(async () => {
    prisma = {
      productBatch: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      transformationOperation: { findFirst: jest.fn() },
      $transaction: jest.fn((fns: Array<Promise<unknown>>) => Promise.all(fns)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductBatchesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { log: jest.fn() } },
        {
          provide: CodeGeneratorService,
          useValue: { generate: jest.fn().mockResolvedValue('PB-2026-0001') },
        },
        {
          provide: ProductsService,
          useValue: { assertProductEligible: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get(ProductBatchesService);
    auditService = module.get(AuditService);
    productsService = module.get(ProductsService);
    codeGen = module.get(CodeGeneratorService);
  });

  describe('create', () => {
    it('génère PB-2026-0001 et crée le lot', async () => {
      prisma.productBatch.create.mockResolvedValue(mockBatch);
      auditService.log.mockResolvedValue(undefined);

      const result = await service.create(
        {
          productId: 'uuid-p1',
          quantity: 350,
          unit: 'kg',
          productionDate: '2026-04-11',
        },
        'actor-id',
      );

      expect(productsService.assertProductEligible).toHaveBeenCalledWith('uuid-p1');
      expect(codeGen.generate).toHaveBeenCalledWith('productBatch');
      expect(result.code).toBe('PB-2026-0001');
    });

    it("propage l'exception si le produit est BLOCKED", async () => {
      productsService.assertProductEligible.mockRejectedValue(
        new BadRequestException('Produit bloqué'),
      );
      await expect(
        service.create(
          { productId: 'uuid-p1', quantity: 100, unit: 'kg', productionDate: '2026-04-11' },
          'actor',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('met à jour un lot CREATED', async () => {
      prisma.productBatch.findFirst.mockResolvedValue(mockBatch);
      prisma.productBatch.update.mockResolvedValue({ ...mockBatch, quantity: 300 });
      auditService.log.mockResolvedValue(undefined);

      const result = await service.update('uuid-pb1', { quantity: 300 }, 'actor');
      expect(result.quantity).toBe(300);
    });

    it("rejette la modification d'un lot AVAILABLE", async () => {
      prisma.productBatch.findFirst.mockResolvedValue({
        ...mockBatch,
        status: ProductBatchStatus.AVAILABLE,
      });
      await expect(service.update('uuid-pb1', { quantity: 300 }, 'actor')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('changeStatus', () => {
    it('accepte CREATED → READY_FOR_VALIDATION', async () => {
      prisma.productBatch.findFirst.mockResolvedValue(mockBatch);
      prisma.productBatch.update.mockResolvedValue({
        ...mockBatch,
        status: ProductBatchStatus.READY_FOR_VALIDATION,
      });
      auditService.log.mockResolvedValue(undefined);

      const result = await service.changeStatus(
        'uuid-pb1',
        { status: ProductBatchStatus.READY_FOR_VALIDATION },
        'actor',
      );
      expect(result.status).toBe(ProductBatchStatus.READY_FOR_VALIDATION);
    });

    it('accepte BLOCKED → DESTROYED', async () => {
      prisma.productBatch.findFirst.mockResolvedValue({
        ...mockBatch,
        status: ProductBatchStatus.BLOCKED,
      });
      prisma.productBatch.update.mockResolvedValue({
        ...mockBatch,
        status: ProductBatchStatus.DESTROYED,
      });
      auditService.log.mockResolvedValue(undefined);

      const result = await service.changeStatus(
        'uuid-pb1',
        { status: ProductBatchStatus.DESTROYED },
        'actor',
      );
      expect(result.status).toBe(ProductBatchStatus.DESTROYED);
    });

    it('rejette CREATED → SHIPPED (saut interdit)', async () => {
      prisma.productBatch.findFirst.mockResolvedValue(mockBatch);
      await expect(
        service.changeStatus('uuid-pb1', { status: ProductBatchStatus.SHIPPED }, 'actor'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejette SHIPPED → tout (statut terminal)', async () => {
      prisma.productBatch.findFirst.mockResolvedValue({
        ...mockBatch,
        status: ProductBatchStatus.SHIPPED,
      });
      await expect(
        service.changeStatus('uuid-pb1', { status: ProductBatchStatus.AVAILABLE }, 'actor'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
