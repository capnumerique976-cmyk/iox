import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CodeGeneratorService } from '../common/services/code-generator.service';
import { ProductStatus } from '@iox/shared';

const mockProduct = {
  id: 'uuid-p1',
  code: 'PRD-0001',
  name: 'Rougail Mangue',
  category: 'conserve',
  status: ProductStatus.DRAFT,
  version: 1,
  beneficiaryId: 'uuid-ben-1',
  deletedAt: null,
  allergens: [],
};

const mockBeneficiary = { id: 'uuid-ben-1', code: 'BEN-0001', name: 'Coop Test', deletedAt: null };

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: {
    product: jest.Mocked<Record<string, jest.Mock>>;
    beneficiary: jest.Mocked<Record<string, jest.Mock>>;
    $transaction: jest.Mock;
  };
  let auditService: jest.Mocked<AuditService>;
  let codeGen: jest.Mocked<CodeGeneratorService>;

  beforeEach(async () => {
    prisma = {
      product: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      beneficiary: { findFirst: jest.fn() },
      $transaction: jest.fn((fns: Array<Promise<unknown>>) => Promise.all(fns)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { log: jest.fn() } },
        {
          provide: CodeGeneratorService,
          useValue: { generate: jest.fn().mockResolvedValue('PRD-0001') },
        },
      ],
    }).compile();

    service = module.get(ProductsService);
    auditService = module.get(AuditService);
    codeGen = module.get(CodeGeneratorService);
  });

  describe('create', () => {
    it('génère PRD-0001 et crée le produit associé au bénéficiaire', async () => {
      prisma.beneficiary.findFirst.mockResolvedValue(mockBeneficiary);
      prisma.product.create.mockResolvedValue({
        ...mockProduct,
        beneficiary: mockBeneficiary,
        _count: { productBatches: 0, documents: 0 },
      });
      auditService.log.mockResolvedValue(undefined);

      const result = await service.create(
        { name: 'Rougail Mangue', category: 'conserve', beneficiaryId: 'uuid-ben-1' },
        'actor-id',
      );

      expect(codeGen.generate).toHaveBeenCalledWith('product');
      expect(result.code).toBe('PRD-0001');
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PRODUCT_CREATED' }),
      );
    });

    it('lève NotFoundException si bénéficiaire inexistant', async () => {
      prisma.beneficiary.findFirst.mockResolvedValue(null);
      await expect(
        service.create({ name: 'Test', category: 'conserve', beneficiaryId: 'xxx' }, 'actor'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('changeStatus', () => {
    it('accepte DRAFT → IN_PREPARATION', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.product.update.mockResolvedValue({
        ...mockProduct,
        status: ProductStatus.IN_PREPARATION,
        beneficiary: mockBeneficiary,
        _count: { productBatches: 0, documents: 0 },
      });
      auditService.log.mockResolvedValue(undefined);

      const result = await service.changeStatus(
        'uuid-p1',
        { status: ProductStatus.IN_PREPARATION },
        'actor',
      );
      expect(result.status).toBe(ProductStatus.IN_PREPARATION);
    });

    it('rejette DRAFT → COMPLIANT (saut de statut interdit)', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      await expect(
        service.changeStatus('uuid-p1', { status: ProductStatus.COMPLIANT }, 'actor'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejette ARCHIVED → tout (statut terminal)', async () => {
      prisma.product.findFirst.mockResolvedValue({
        ...mockProduct,
        status: ProductStatus.ARCHIVED,
      });
      await expect(
        service.changeStatus('uuid-p1', { status: ProductStatus.DRAFT }, 'actor'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('assertProductEligible', () => {
    it("ne lève pas d'exception si DRAFT ou IN_PREPARATION", async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      await expect(service.assertProductEligible('uuid-p1')).resolves.not.toThrow();
    });

    it('lève BadRequestException si BLOCKED', async () => {
      prisma.product.findFirst.mockResolvedValue({ ...mockProduct, status: ProductStatus.BLOCKED });
      await expect(service.assertProductEligible('uuid-p1')).rejects.toThrow(BadRequestException);
    });
  });
});
