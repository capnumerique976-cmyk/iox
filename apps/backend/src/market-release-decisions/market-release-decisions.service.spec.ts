import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MarketReleaseDecisionsService } from './market-release-decisions.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MarketReleaseDecision } from '@iox/shared';

/* ──────── Fixtures ─────────────────────────────────────────────────────── */

const mockBatchReadyValid = {
  id: 'uuid-pb1',
  code: 'PB-2026-0001',
  status: 'READY_FOR_VALIDATION',
  quantity: 350,
  unit: 'kg',
  productionDate: new Date('2026-04-01'),
  deletedAt: null,
  product: { id: 'uuid-p1', status: 'COMPLIANT', name: 'Rougail Mangue' },
  transformationOp: {
    id: 'uuid-to1',
    code: 'TO-2026-0001',
    inboundBatch: { id: 'uuid-ib1', status: 'ACCEPTED' },
  },
  labelValidations: [{ id: 'uuid-lv1' }],
  _count: { documents: 2, marketReleaseDecisions: 0 },
};

const mockDecision = {
  id: 'uuid-mrd1',
  decision: 'COMPLIANT',
  isActive: true,
  decidedAt: new Date(),
  notes: null,
  blockingReason: null,
  reservations: [],
  checklist: {},
  productBatchId: 'uuid-pb1',
  validatedById: 'actor',
  productBatch: {
    id: 'uuid-pb1',
    code: 'PB-2026-0001',
    status: 'AVAILABLE',
    product: { id: 'uuid-p1', name: 'Rougail Mangue' },
  },
  validatedBy: { id: 'actor', firstName: 'Alice', lastName: 'Dupont' },
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('MarketReleaseDecisionsService', () => {
  let service: MarketReleaseDecisionsService;
  let prisma: {
    productBatch: jest.Mocked<Record<string, jest.Mock>>;
    document: jest.Mocked<Record<string, jest.Mock>>;
    marketReleaseDecision: jest.Mocked<Record<string, jest.Mock>>;
    $transaction: jest.Mock;
  };
  let _auditService: jest.Mocked<AuditService>;

  beforeEach(async () => {
    prisma = {
      productBatch: { findFirst: jest.fn(), update: jest.fn() },
      document: { count: jest.fn() },
      marketReleaseDecision: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn((fns: Array<Promise<unknown>>) => Promise.all(fns)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketReleaseDecisionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get(MarketReleaseDecisionsService);
    _auditService = module.get(AuditService);
  });

  /* ── evaluateChecklist ─────────────────────────────────────────────────── */

  describe('evaluateChecklist', () => {
    it('retourne allPass=true quand toutes les conditions sont réunies', async () => {
      prisma.productBatch.findFirst.mockResolvedValue(mockBatchReadyValid);
      prisma.document.count.mockResolvedValue(2);
      prisma.marketReleaseDecision.findFirst.mockResolvedValue(null);

      const result = await service.evaluateChecklist('uuid-pb1');

      expect(result.allPass).toBe(true);
      expect(result.canRelease).toBe(true);
      expect(result.items).toHaveLength(7);
    });

    it('identifie les conditions échouées quand le lot est CREATED et le produit BLOCKED', async () => {
      prisma.productBatch.findFirst.mockResolvedValue({
        ...mockBatchReadyValid,
        status: 'CREATED',
        product: { id: 'uuid-p1', status: 'BLOCKED', name: 'Rougail Mangue' },
        labelValidations: [],
      });
      prisma.document.count.mockResolvedValue(0);
      prisma.marketReleaseDecision.findFirst.mockResolvedValue(null);

      const result = await service.evaluateChecklist('uuid-pb1');

      expect(result.allPass).toBe(false);
      expect(result.items.filter((i) => !i.pass).length).toBeGreaterThanOrEqual(3);
    });

    it('lève NotFoundException si le lot est introuvable', async () => {
      prisma.productBatch.findFirst.mockResolvedValue(null);
      await expect(service.evaluateChecklist('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  /* ── create ────────────────────────────────────────────────────────────── */

  describe('create', () => {
    it('crée une décision COMPLIANT et passe le lot à AVAILABLE', async () => {
      prisma.productBatch.findFirst.mockResolvedValue(mockBatchReadyValid);
      prisma.document.count.mockResolvedValue(2);
      prisma.marketReleaseDecision.findFirst.mockResolvedValue(null);
      prisma.marketReleaseDecision.updateMany.mockResolvedValue({ count: 0 });
      prisma.marketReleaseDecision.create.mockResolvedValue(mockDecision);
      prisma.productBatch.update.mockResolvedValue({ ...mockBatchReadyValid, status: 'AVAILABLE' });

      const result = await service.create(
        { productBatchId: 'uuid-pb1', decision: MarketReleaseDecision.COMPLIANT },
        'actor',
      );

      expect(result.decision.decision).toBe('COMPLIANT');
      expect(prisma.productBatch.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'AVAILABLE' }) }),
      );
    });

    it('crée une décision NON_COMPLIANT et bloque le lot', async () => {
      prisma.productBatch.findFirst.mockResolvedValue({
        ...mockBatchReadyValid,
        status: 'READY_FOR_VALIDATION',
      });
      prisma.document.count.mockResolvedValue(2);
      prisma.marketReleaseDecision.findFirst.mockResolvedValue(null);
      prisma.marketReleaseDecision.updateMany.mockResolvedValue({ count: 0 });
      prisma.marketReleaseDecision.create.mockResolvedValue({
        ...mockDecision,
        decision: 'NON_COMPLIANT',
      });
      prisma.productBatch.update.mockResolvedValue({ ...mockBatchReadyValid, status: 'BLOCKED' });

      await service.create(
        {
          productBatchId: 'uuid-pb1',
          decision: MarketReleaseDecision.NON_COMPLIANT,
          blockingReason: 'Contamination micro-biologique détectée',
        },
        'actor',
      );

      expect(prisma.productBatch.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'BLOCKED' }) }),
      );
    });

    it('rejette NON_COMPLIANT sans blockingReason', async () => {
      prisma.productBatch.findFirst.mockResolvedValue(mockBatchReadyValid);
      await expect(
        service.create(
          {
            productBatchId: 'uuid-pb1',
            decision: MarketReleaseDecision.NON_COMPLIANT,
          },
          'actor',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejette COMPLIANT si une condition n'est pas remplie (lot CREATED)", async () => {
      prisma.productBatch.findFirst.mockResolvedValue({
        ...mockBatchReadyValid,
        status: 'CREATED',
        labelValidations: [],
      });
      prisma.document.count.mockResolvedValue(0);
      prisma.marketReleaseDecision.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          {
            productBatchId: 'uuid-pb1',
            decision: MarketReleaseDecision.COMPLIANT,
          },
          'actor',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('lève NotFoundException si le lot est introuvable', async () => {
      prisma.productBatch.findFirst.mockResolvedValue(null);
      await expect(
        service.create(
          {
            productBatchId: 'unknown',
            decision: MarketReleaseDecision.COMPLIANT,
          },
          'actor',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
