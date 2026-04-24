import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SupplyContractsService } from './supply-contracts.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CodeGeneratorService } from '../common/services/code-generator.service';
import { SupplyContractStatus } from '@iox/shared';

const mockSupplier = {
  id: 'uuid-s1',
  code: 'ENT-0001',
  name: 'Fournisseur Test',
  isActive: true,
  deletedAt: null,
};

const mockContract = {
  id: 'uuid-ct1',
  code: 'SC-0001',
  status: SupplyContractStatus.DRAFT,
  supplierId: 'uuid-s1',
  startDate: new Date('2026-01-01'),
  deletedAt: null,
  supplier: mockSupplier,
  products: [],
  _count: { inboundBatches: 0, documents: 0 },
};

describe('SupplyContractsService', () => {
  let service: SupplyContractsService;
  let prisma: {
    supplyContract: jest.Mocked<Record<string, jest.Mock>>;
    company: jest.Mocked<Record<string, jest.Mock>>;
    $transaction: jest.Mock;
  };
  let auditService: jest.Mocked<AuditService>;
  let codeGen: jest.Mocked<CodeGeneratorService>;

  beforeEach(async () => {
    prisma = {
      supplyContract: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      company: { findFirst: jest.fn() },
      $transaction: jest.fn((fns: Array<Promise<unknown>>) => Promise.all(fns)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplyContractsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { log: jest.fn() } },
        {
          provide: CodeGeneratorService,
          useValue: { generate: jest.fn().mockResolvedValue('SC-0001') },
        },
      ],
    }).compile();

    service = module.get(SupplyContractsService);
    auditService = module.get(AuditService);
    codeGen = module.get(CodeGeneratorService);
  });

  describe('create', () => {
    it('génère SC-0001 et crée le contrat', async () => {
      prisma.company.findFirst.mockResolvedValue(mockSupplier);
      prisma.supplyContract.create.mockResolvedValue(mockContract);
      auditService.log.mockResolvedValue(undefined);

      const result = await service.create(
        { supplierId: 'uuid-s1', startDate: '2026-01-01' },
        'actor-id',
      );

      expect(codeGen.generate).toHaveBeenCalledWith('supplyContract');
      expect(result.code).toBe('SC-0001');
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SUPPLY_CONTRACT_CREATED' }),
      );
    });

    it('lève NotFoundException si le fournisseur est introuvable', async () => {
      prisma.company.findFirst.mockResolvedValue(null);
      await expect(
        service.create({ supplierId: 'xxx', startDate: '2026-01-01' }, 'actor'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('changeStatus', () => {
    it('accepte DRAFT → ACTIVE', async () => {
      prisma.supplyContract.findFirst.mockResolvedValue(mockContract);
      prisma.supplyContract.update.mockResolvedValue({
        ...mockContract,
        status: SupplyContractStatus.ACTIVE,
      });
      auditService.log.mockResolvedValue(undefined);

      const result = await service.changeStatus(
        'uuid-ct1',
        { status: SupplyContractStatus.ACTIVE },
        'actor',
      );
      expect(result.status).toBe(SupplyContractStatus.ACTIVE);
    });

    it('rejette DRAFT → TERMINATED (saut interdit)', async () => {
      prisma.supplyContract.findFirst.mockResolvedValue(mockContract);
      await expect(
        service.changeStatus('uuid-ct1', { status: SupplyContractStatus.TERMINATED }, 'actor'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejette EXPIRED → tout (statut terminal)', async () => {
      prisma.supplyContract.findFirst.mockResolvedValue({
        ...mockContract,
        status: SupplyContractStatus.EXPIRED,
      });
      await expect(
        service.changeStatus('uuid-ct1', { status: SupplyContractStatus.ACTIVE }, 'actor'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
