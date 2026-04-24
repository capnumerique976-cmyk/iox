import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CodeGeneratorService } from '../common/services/code-generator.service';
import { CompanyType } from '@iox/shared';

const mockCompany = {
  id: 'uuid-c1',
  code: 'ENT-0001',
  name: 'Coopérative Peche Mayotte',
  types: [CompanyType.SUPPLIER],
  email: 'contact@cpm.yt',
  isActive: true,
  deletedAt: null,
  _count: { supplyContracts: 0, inboundBatches: 0, documents: 0 },
};

describe('CompaniesService', () => {
  let service: CompaniesService;
  let prisma: { company: jest.Mocked<Record<string, jest.Mock>>; $transaction: jest.Mock };
  let auditService: jest.Mocked<AuditService>;
  let codeGen: jest.Mocked<CodeGeneratorService>;

  beforeEach(async () => {
    prisma = {
      company: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn((fns: Array<Promise<unknown>>) => Promise.all(fns)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { log: jest.fn() } },
        {
          provide: CodeGeneratorService,
          useValue: { generate: jest.fn().mockResolvedValue('ENT-0001') },
        },
      ],
    }).compile();

    service = module.get(CompaniesService);
    auditService = module.get(AuditService);
    codeGen = module.get(CodeGeneratorService);
  });

  describe('create', () => {
    it("génère ENT-0001 et crée l'entreprise", async () => {
      prisma.company.create.mockResolvedValue(mockCompany);
      auditService.log.mockResolvedValue(undefined);

      const result = await service.create(
        { name: 'Coopérative Peche Mayotte', types: [CompanyType.SUPPLIER] },
        'actor-id',
      );

      expect(codeGen.generate).toHaveBeenCalledWith('company');
      expect(result.code).toBe('ENT-0001');
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'COMPANY_CREATED' }),
      );
    });
  });

  describe('update', () => {
    it('met à jour une entreprise existante', async () => {
      prisma.company.findFirst.mockResolvedValue(mockCompany);
      prisma.company.update.mockResolvedValue({ ...mockCompany, name: 'CPM Modifié' });
      auditService.log.mockResolvedValue(undefined);

      const result = await service.update('uuid-c1', { name: 'CPM Modifié' }, 'actor');
      expect(result.name).toBe('CPM Modifié');
    });

    it("lève NotFoundException si l'entreprise est introuvable", async () => {
      prisma.company.findFirst.mockResolvedValue(null);
      await expect(service.update('xxx', { name: 'Test' }, 'actor')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deactivate', () => {
    it('désactive une entreprise active', async () => {
      prisma.company.findFirst.mockResolvedValue(mockCompany);
      prisma.company.update.mockResolvedValue({ ...mockCompany, isActive: false });
      auditService.log.mockResolvedValue(undefined);

      const result = await service.deactivate('uuid-c1', 'actor');
      expect(result.isActive).toBe(false);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'COMPANY_DEACTIVATED' }),
      );
    });

    it('lève NotFoundException si introuvable', async () => {
      prisma.company.findFirst.mockResolvedValue(null);
      await expect(service.deactivate('xxx', 'actor')).rejects.toThrow(NotFoundException);
    });
  });
});
