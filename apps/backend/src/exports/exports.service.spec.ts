import { Test, TestingModule } from '@nestjs/testing';
import { ExportsService } from './exports.service';
import { PrismaService } from '../database/prisma.service';

/**
 * Tests focalisés sur :
 *  - Le générateur CSV (échappement, séparateurs, CRLF).
 *  - La construction des `where` clauses pour les filtres partagés (status/from/to).
 *  - La forme des lignes pour un échantillon représentatif d'export.
 * Les exports suivent tous le même pattern, on couvre donc intentionnellement
 * le pattern plutôt que chaque méthode ligne à ligne.
 */
describe('ExportsService', () => {
  let service: ExportsService;
  let prisma: Record<string, { findMany: jest.Mock }>;

  beforeEach(async () => {
    prisma = {
      productBatch: { findMany: jest.fn() },
      inboundBatch: { findMany: jest.fn() },
      marketReleaseDecision: { findMany: jest.fn() },
      incident: { findMany: jest.fn() },
      company: { findMany: jest.fn() },
      product: { findMany: jest.fn() },
      supplyContract: { findMany: jest.fn() },
      beneficiary: { findMany: jest.fn() },
      distribution: { findMany: jest.fn() },
      transformationOperation: { findMany: jest.fn() },
      labelValidation: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ExportsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(ExportsService);
  });

  describe('CSV builder (via exportProductBatchesCsv)', () => {
    it("sépare l'entête et les lignes par CRLF", async () => {
      prisma.productBatch.findMany.mockResolvedValue([]);
      const csv = await service.exportProductBatchesCsv();
      expect(csv.includes('\r\n')).toBe(false); // pas de data row
      expect(csv.split('\r\n')).toHaveLength(1);
      expect(csv).toContain('Code lot,Produit,');
    });

    it('échappe virgules, guillemets et sauts de ligne', async () => {
      prisma.productBatch.findMany.mockResolvedValue([
        {
          code: 'A,B',
          status: 'ok',
          quantity: 1,
          unit: 'kg',
          productionDate: null,
          expiryDate: null,
          createdAt: null,
          product: { name: 'Prod "Bio"', code: 'P1' },
          labelValidations: [],
          marketReleaseDecisions: [],
        },
      ]);
      const csv = await service.exportProductBatchesCsv();
      const dataLine = csv.split('\r\n')[1];
      expect(dataLine).toContain('"A,B"');
      expect(dataLine).toContain('"Prod ""Bio"""');
    });

    it('mappe isValid=true → Conforme, false → Non conforme, absence → vide', async () => {
      prisma.productBatch.findMany.mockResolvedValue([
        {
          code: 'L1',
          status: 's',
          quantity: 0,
          unit: 'kg',
          productionDate: null,
          expiryDate: null,
          createdAt: null,
          product: null,
          labelValidations: [{ isValid: true }],
          marketReleaseDecisions: [],
        },
        {
          code: 'L2',
          status: 's',
          quantity: 0,
          unit: 'kg',
          productionDate: null,
          expiryDate: null,
          createdAt: null,
          product: null,
          labelValidations: [{ isValid: false }],
          marketReleaseDecisions: [],
        },
        {
          code: 'L3',
          status: 's',
          quantity: 0,
          unit: 'kg',
          productionDate: null,
          expiryDate: null,
          createdAt: null,
          product: null,
          labelValidations: [],
          marketReleaseDecisions: [],
        },
      ]);
      const csv = await service.exportProductBatchesCsv();
      const [, l1, l2, l3] = csv.split('\r\n');
      expect(l1).toContain('Conforme');
      expect(l2).toContain('Non conforme');
      // L3 : étiquetage vide entre deux virgules
      expect(l3).toMatch(/,,/);
    });
  });

  describe('filter construction', () => {
    it('exportProductBatchesCsv : status + range from+to', async () => {
      prisma.productBatch.findMany.mockResolvedValue([]);
      await service.exportProductBatchesCsv({
        status: 'RELEASED',
        from: '2025-01-01',
        to: '2025-12-31',
      });
      const call = prisma.productBatch.findMany.mock.calls[0][0];
      expect(call.where.deletedAt).toBeNull();
      expect(call.where.status).toBe('RELEASED');
      expect(call.where.createdAt.gte).toEqual(new Date('2025-01-01'));
      expect(call.where.createdAt.lte).toEqual(new Date('2025-12-31'));
    });

    it('exportIncidentsCsv : status + severity + range sur incidentDate', async () => {
      prisma.incident.findMany.mockResolvedValue([]);
      await service.exportIncidentsCsv({
        status: 'OPEN',
        severity: 'HIGH',
        from: '2025-06-01',
      });
      const call = prisma.incident.findMany.mock.calls[0][0];
      expect(call.where.status).toBe('OPEN');
      expect(call.where.severity).toBe('HIGH');
      expect(call.where.incidentDate.gte).toEqual(new Date('2025-06-01'));
      expect(call.where.incidentDate.lte).toBeUndefined();
    });

    it('exportCompaniesCsv : types.has et isActive coerced', async () => {
      prisma.company.findMany.mockResolvedValue([]);
      await service.exportCompaniesCsv({ type: 'SUPPLIER', isActive: 'true' });
      const call = prisma.company.findMany.mock.calls[0][0];
      expect(call.where.types).toEqual({ has: 'SUPPLIER' });
      expect(call.where.isActive).toBe(true);
    });

    it('exportMarketDecisionsCsv : where.isActive=true toujours, décision optionnelle', async () => {
      prisma.marketReleaseDecision.findMany.mockResolvedValue([]);
      await service.exportMarketDecisionsCsv({ decision: 'RELEASE' });
      const call = prisma.marketReleaseDecision.findMany.mock.calls[0][0];
      expect(call.where.isActive).toBe(true);
      expect(call.where.decision).toBe('RELEASE');
    });

    it('exportLabelValidationsCsv : isValid="true" coerced en boolean', async () => {
      prisma.labelValidation.findMany.mockResolvedValue([]);
      await service.exportLabelValidationsCsv({ isValid: 'false' });
      const call = prisma.labelValidation.findMany.mock.calls[0][0];
      expect(call.where.isValid).toBe(false);
    });

    it('exportLabelValidationsCsv : isValid vide → pas de filtre', async () => {
      prisma.labelValidation.findMany.mockResolvedValue([]);
      await service.exportLabelValidationsCsv({ isValid: '' });
      const call = prisma.labelValidation.findMany.mock.calls[0][0];
      expect(call.where.isValid).toBeUndefined();
    });
  });

  describe('row shape', () => {
    it('exportTransformationOperationsCsv : agrège productBatches en totalProduced', async () => {
      prisma.transformationOperation.findMany.mockResolvedValue([
        {
          code: 'OP1',
          name: 'Broyage',
          operationDate: null,
          site: 'S1',
          yieldRate: 92.5,
          description: null,
          operatorNotes: null,
          createdAt: null,
          inboundBatch: {
            code: 'IB1',
            product: { name: 'P', code: 'PC' },
            supplier: { name: 'S', code: 'SC' },
          },
          productBatches: [
            { code: 'LF1', quantity: 10, unit: 'kg' },
            { code: 'LF2', quantity: 5.5, unit: 'kg' },
          ],
        },
      ]);
      const csv = await service.exportTransformationOperationsCsv();
      const line = csv.split('\r\n')[1];
      expect(line).toContain('LF1 | LF2');
      expect(line).toContain('15.5');
      expect(line).toContain('92.5');
    });

    it('exportBeneficiariesCsv : concat référent prénom nom + certifications pipe-séparées', async () => {
      prisma.beneficiary.findMany.mockResolvedValue([
        {
          code: 'B1',
          name: 'Asso',
          type: 'NGO',
          status: 'ACTIVE',
          sector: 'FOOD',
          city: 'Paris',
          postalCode: '75000',
          email: null,
          phone: null,
          siret: null,
          legalStatus: null,
          employeeCount: 12,
          certifications: ['BIO', 'LABEL ROUGE'],
          createdAt: null,
          referent: { firstName: 'Jean', lastName: 'Dupont', email: 'j@d.fr' },
          diagnostic: null,
          _count: { actions: 3, documents: 1 },
        },
      ]);
      const csv = await service.exportBeneficiariesCsv();
      const line = csv.split('\r\n')[1];
      expect(line).toContain('BIO | LABEL ROUGE');
      expect(line).toContain('Jean Dupont');
      expect(line).toContain('j@d.fr');
    });
  });
});
