import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TraceabilityService } from './traceability.service';
import { PrismaService } from '../database/prisma.service';

const mockBatch = {
  id: 'uuid-pb1',
  code: 'PB-2026-0001',
  createdAt: new Date('2026-04-01T10:00:00Z'),
};

const mockBatchFull = {
  ...mockBatch,
  status: 'AVAILABLE',
  quantity: 350,
  unit: 'kg',
  productionDate: new Date('2026-04-01'),
  expiryDate: new Date('2026-07-01'),
  product: { id: 'uuid-p1', code: 'PRD-0001', name: 'Rougail Mangue', status: 'COMPLIANT' },
  transformationOp: {
    id: 'uuid-to1',
    code: 'TO-2026-0001',
    name: 'Cuisson',
    operationDate: new Date('2026-03-30'),
    yieldRate: 72,
    inboundBatch: {
      id: 'uuid-ib1',
      code: 'IB-2026-0001',
      status: 'ACCEPTED',
      quantity: 500,
      unit: 'kg',
      supplier: { id: 'uuid-s1', name: 'Coop Mahoraise' },
      product: { id: 'uuid-p1', name: 'Mangue fraîche' },
      supplyContract: { id: 'uuid-sc1', code: 'SC-0001' },
      controlledAt: new Date('2026-03-28'),
    },
  },
  labelValidations: [{ id: 'uuid-lv1', isValid: true, validatedAt: new Date('2026-04-02') }],
  marketReleaseDecisions: [
    { id: 'uuid-mrd1', decision: 'COMPLIANT', decidedAt: new Date('2026-04-03'), isActive: true },
  ],
  _count: { documents: 2, labelValidations: 1, marketReleaseDecisions: 1 },
};

describe('TraceabilityService', () => {
  let service: TraceabilityService;
  let prisma: {
    productBatch: jest.Mocked<Record<string, jest.Mock>>;
    auditLog: jest.Mocked<Record<string, jest.Mock>>;
    labelValidation: jest.Mocked<Record<string, jest.Mock>>;
    marketReleaseDecision: jest.Mocked<Record<string, jest.Mock>>;
    document: jest.Mocked<Record<string, jest.Mock>>;
  };

  beforeEach(async () => {
    prisma = {
      productBatch: { findFirst: jest.fn() },
      auditLog: { findMany: jest.fn() },
      labelValidation: { findMany: jest.fn() },
      marketReleaseDecision: { findMany: jest.fn() },
      document: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TraceabilityService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(TraceabilityService);
  });

  describe('getTimeline', () => {
    it('retourne une timeline triée chronologiquement', async () => {
      prisma.productBatch.findFirst.mockResolvedValue(mockBatch);
      prisma.auditLog.findMany.mockResolvedValue([
        {
          id: 'al-1',
          action: 'PRODUCT_BATCH_STATUS_CHANGED',
          createdAt: new Date('2026-04-02T08:00:00Z'),
          newData: { status: 'READY_FOR_VALIDATION' },
          notes: null,
          user: { firstName: 'Alice', lastName: 'Dupont' },
        },
      ]);
      prisma.labelValidation.findMany.mockResolvedValue([]);
      prisma.marketReleaseDecision.findMany.mockResolvedValue([]);
      prisma.document.findMany.mockResolvedValue([]);

      const result = await service.getTimeline('uuid-pb1');

      expect(result).toHaveLength(2); // creation + status change
      expect(result[0].type).toBe('BATCH_CREATED');
      expect(result[1].date.getTime()).toBeGreaterThan(result[0].date.getTime());
    });

    it('lève NotFoundException si le lot est introuvable', async () => {
      prisma.productBatch.findFirst.mockResolvedValue(null);
      await expect(service.getTimeline('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getChain', () => {
    it('retourne la chaîne complète avec lot entrant, transformation, lot fini, décision', async () => {
      prisma.productBatch.findFirst.mockResolvedValue(mockBatchFull);

      const result = await service.getChain('uuid-pb1');

      expect(result.inboundBatch).not.toBeNull();
      expect(result.inboundBatch?.code).toBe('IB-2026-0001');
      expect(result.transformationOp?.code).toBe('TO-2026-0001');
      expect(result.productBatch.code).toBe('PB-2026-0001');
      expect(result.activeMarketDecision?.decision).toBe('COMPLIANT');
      expect(result.latestLabelValidation?.isValid).toBe(true);
    });

    it('retourne null pour lot entrant et transformation si lot créé manuellement', async () => {
      prisma.productBatch.findFirst.mockResolvedValue({
        ...mockBatchFull,
        transformationOp: null,
      });

      const result = await service.getChain('uuid-pb1');

      expect(result.inboundBatch).toBeNull();
      expect(result.transformationOp).toBeNull();
    });

    it('lève NotFoundException si le lot est introuvable', async () => {
      prisma.productBatch.findFirst.mockResolvedValue(null);
      await expect(service.getChain('unknown')).rejects.toThrow(NotFoundException);
    });
  });
});
