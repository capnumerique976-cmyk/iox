import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TransformationOperationsService } from './transformation-operations.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CodeGeneratorService } from '../common/services/code-generator.service';
import { InboundBatchStatus } from '@iox/shared';

const mockBatchAccepted = {
  id: 'uuid-ib1',
  code: 'IB-2026-0001',
  status: InboundBatchStatus.ACCEPTED,
  quantity: 500,
  unit: 'kg',
  deletedAt: null,
};
const mockBatchReceived = { ...mockBatchAccepted, status: InboundBatchStatus.RECEIVED };

const mockOp = {
  id: 'uuid-to1',
  code: 'TO-2026-0001',
  name: 'Cuisson conserve',
  inboundBatchId: 'uuid-ib1',
  operationDate: new Date('2026-04-10'),
  yieldRate: 72.5,
  _count: { productBatches: 0 },
};

describe('TransformationOperationsService', () => {
  let service: TransformationOperationsService;
  let prisma: {
    transformationOperation: jest.Mocked<Record<string, jest.Mock>>;
    inboundBatch: jest.Mocked<Record<string, jest.Mock>>;
    $transaction: jest.Mock;
  };
  let auditService: jest.Mocked<AuditService>;
  let codeGen: jest.Mocked<CodeGeneratorService>;

  beforeEach(async () => {
    prisma = {
      transformationOperation: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      inboundBatch: { findFirst: jest.fn() },
      $transaction: jest.fn((fns: Array<Promise<unknown>>) => Promise.all(fns)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransformationOperationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { log: jest.fn() } },
        {
          provide: CodeGeneratorService,
          useValue: { generate: jest.fn().mockResolvedValue('TO-2026-0001') },
        },
      ],
    }).compile();

    service = module.get(TransformationOperationsService);
    auditService = module.get(AuditService);
    codeGen = module.get(CodeGeneratorService);
  });

  describe('create', () => {
    it("génère TO-2026-0001 et crée l'opération sur un lot ACCEPTED", async () => {
      prisma.inboundBatch.findFirst.mockResolvedValue(mockBatchAccepted);
      prisma.transformationOperation.create.mockResolvedValue(mockOp);
      auditService.log.mockResolvedValue(undefined);

      const result = await service.create(
        {
          inboundBatchId: 'uuid-ib1',
          name: 'Cuisson conserve',
          operationDate: '2026-04-10T09:00:00Z',
        },
        'actor-id',
      );

      expect(codeGen.generate).toHaveBeenCalledWith('transformationOperation');
      expect(result.code).toBe('TO-2026-0001');
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'TRANSFORMATION_OP_CREATED' }),
      );
    });

    it("lève BadRequestException si le lot n'est pas ACCEPTED", async () => {
      prisma.inboundBatch.findFirst.mockResolvedValue(mockBatchReceived);
      await expect(
        service.create(
          { inboundBatchId: 'uuid-ib1', name: 'Test', operationDate: '2026-04-10T09:00:00Z' },
          'actor',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('lève NotFoundException si le lot est introuvable', async () => {
      prisma.inboundBatch.findFirst.mockResolvedValue(null);
      await expect(
        service.create(
          { inboundBatchId: 'xxx', name: 'Test', operationDate: '2026-04-10T09:00:00Z' },
          'actor',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('met à jour une opération existante', async () => {
      prisma.transformationOperation.findFirst.mockResolvedValue(mockOp);
      prisma.transformationOperation.update.mockResolvedValue({ ...mockOp, yieldRate: 80 });
      auditService.log.mockResolvedValue(undefined);

      const result = await service.update('uuid-to1', { yieldRate: 80 }, 'actor');
      expect(result.yieldRate).toBe(80);
    });

    it('lève NotFoundException si introuvable', async () => {
      prisma.transformationOperation.findFirst.mockResolvedValue(null);
      await expect(service.update('xxx', { yieldRate: 80 }, 'actor')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
