import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BeneficiariesService } from './beneficiaries.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CodeGeneratorService } from '../common/services/code-generator.service';
import { BeneficiaryStatus } from '@iox/shared';

const mockBen = {
  id: 'uuid-ben-1',
  code: 'BEN-0001',
  name: 'Coopérative Test',
  type: 'coopérative',
  status: BeneficiaryStatus.DRAFT,
  deletedAt: null,
};

describe('BeneficiariesService', () => {
  let service: BeneficiariesService;
  let prismaMock: {
    beneficiary: jest.Mocked<Record<string, jest.Mock>>;
    beneficiaryDiagnostic: jest.Mocked<Record<string, jest.Mock>>;
    accompanimentAction: jest.Mocked<Record<string, jest.Mock>>;
    $transaction: jest.Mock;
  };
  let auditService: jest.Mocked<AuditService>;
  let codeGen: jest.Mocked<CodeGeneratorService>;

  beforeEach(async () => {
    prismaMock = {
      beneficiary: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      beneficiaryDiagnostic: { upsert: jest.fn() },
      accompanimentAction: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((fns: Array<Promise<unknown>>) => Promise.all(fns)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BeneficiariesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditService, useValue: { log: jest.fn() } },
        {
          provide: CodeGeneratorService,
          useValue: { generate: jest.fn().mockResolvedValue('BEN-0001') },
        },
      ],
    }).compile();

    service = module.get(BeneficiariesService);
    auditService = module.get(AuditService);
    codeGen = module.get(CodeGeneratorService);
  });

  describe('create', () => {
    it('génère un code fonctionnel et persiste le bénéficiaire', async () => {
      prismaMock.beneficiary.create.mockResolvedValue({
        ...mockBen,
        _count: { actions: 0, products: 0, documents: 0 },
        referent: null,
        diagnostic: null,
      });
      auditService.log.mockResolvedValue(undefined);

      const result = await service.create(
        { name: 'Coopérative Test', type: 'coopérative' },
        'actor-id',
      );

      expect(codeGen.generate).toHaveBeenCalledWith('beneficiary');
      expect(result.code).toBe('BEN-0001');
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'BENEFICIARY_CREATED' }),
      );
    });
  });

  describe('changeStatus', () => {
    it('accepte une transition valide DRAFT → QUALIFIED', async () => {
      prismaMock.beneficiary.findFirst.mockResolvedValue(mockBen);
      prismaMock.beneficiary.update.mockResolvedValue({
        ...mockBen,
        status: BeneficiaryStatus.QUALIFIED,
        _count: { actions: 0, products: 0, documents: 0 },
        referent: null,
        diagnostic: null,
      });
      auditService.log.mockResolvedValue(undefined);

      const result = await service.changeStatus(
        mockBen.id,
        { status: BeneficiaryStatus.QUALIFIED },
        'actor-id',
      );
      expect(result.status).toBe(BeneficiaryStatus.QUALIFIED);
    });

    it('rejette une transition invalide DRAFT → EXITED', async () => {
      prismaMock.beneficiary.findFirst.mockResolvedValue(mockBen);
      await expect(
        service.changeStatus(mockBen.id, { status: BeneficiaryStatus.EXITED }, 'actor-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('lève NotFoundException si bénéficiaire inexistant', async () => {
      prismaMock.beneficiary.findFirst.mockResolvedValue(null);
      await expect(
        service.changeStatus('inexistant', { status: BeneficiaryStatus.QUALIFIED }, 'actor-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
