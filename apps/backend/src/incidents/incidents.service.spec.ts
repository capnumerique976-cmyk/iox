import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { IncidentsService } from './incidents.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CodeGeneratorService } from '../common/services/code-generator.service';
import { IncidentStatus } from '@iox/shared';

const baseIncident = {
  id: 'inc-1',
  code: 'INC-0001',
  title: 'Rupture de la chaîne du froid',
  description: 'Camion #3',
  status: IncidentStatus.OPEN,
  severity: 'HIGH',
  incidentDate: new Date('2026-04-10'),
  resolvedAt: null,
  resolution: null,
  actionsTaken: null,
  linkedEntityType: null,
  linkedEntityId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  createdById: 'user-1',
  assignedToId: null,
  documents: [],
  _count: { documents: 0 },
};

describe('IncidentsService', () => {
  let service: IncidentsService;
  let prisma: { incident: Record<string, jest.Mock> };
  let audit: { log: jest.Mock };
  let codeGen: { generate: jest.Mock };

  beforeEach(async () => {
    prisma = {
      incident: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        groupBy: jest.fn(),
      },
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    codeGen = { generate: jest.fn().mockResolvedValue('INC-0001') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncidentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
        { provide: CodeGeneratorService, useValue: codeGen },
      ],
    }).compile();

    service = module.get(IncidentsService);
  });

  describe('findOne', () => {
    it("retourne l'incident", async () => {
      prisma.incident.findFirst.mockResolvedValue(baseIncident);
      const r = await service.findOne('inc-1');
      expect(r.id).toBe('inc-1');
    });

    it('NotFoundException si introuvable', async () => {
      prisma.incident.findFirst.mockResolvedValue(null);
      await expect(service.findOne('inc-x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it("génère un code puis crée l'incident", async () => {
      prisma.incident.create.mockResolvedValue(baseIncident);
      const r = await service.create(
        {
          title: 'T',
          description: 'D',
          severity: 'HIGH',
          incidentDate: '2026-04-10',
        } as any,
        'user-1',
      );
      expect(codeGen.generate).toHaveBeenCalledWith('incident');
      expect(r.id).toBe('inc-1');
      expect(audit.log).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it("refuse la modification d'un incident CLOSED", async () => {
      prisma.incident.findFirst.mockResolvedValue({
        ...baseIncident,
        status: IncidentStatus.CLOSED,
      });
      await expect(service.update('inc-1', { title: 'X' } as any, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('met à jour sinon', async () => {
      prisma.incident.findFirst.mockResolvedValue(baseIncident);
      prisma.incident.update.mockResolvedValue({ ...baseIncident, title: 'Nouveau' });
      const r = await service.update('inc-1', { title: 'Nouveau' } as any, 'user-1');
      expect(r.title).toBe('Nouveau');
    });
  });

  describe('changeStatus', () => {
    it('refuse une transition directe OPEN → CLOSED', async () => {
      prisma.incident.findFirst.mockResolvedValue(baseIncident);
      await expect(
        service.changeStatus('inc-1', { status: IncidentStatus.CLOSED } as any, 'user-1'),
      ).rejects.toThrow(/non autorisée/);
    });

    it('accepte OPEN → ANALYZING', async () => {
      prisma.incident.findFirst.mockResolvedValue(baseIncident);
      prisma.incident.update.mockResolvedValue({
        ...baseIncident,
        status: IncidentStatus.ANALYZING,
      });
      await service.changeStatus('inc-1', { status: IncidentStatus.ANALYZING } as any, 'user-1');
      expect(prisma.incident.update).toHaveBeenCalled();
    });

    it('positionne resolvedAt à la clôture (CONTROLLED → CLOSED)', async () => {
      prisma.incident.findFirst.mockResolvedValue({
        ...baseIncident,
        status: IncidentStatus.CONTROLLED,
      });
      prisma.incident.update.mockResolvedValue({ ...baseIncident, status: IncidentStatus.CLOSED });
      await service.changeStatus('inc-1', { status: IncidentStatus.CLOSED } as any, 'user-1');
      const call = prisma.incident.update.mock.calls[0][0];
      expect(call.data.resolvedAt).toBeInstanceOf(Date);
      expect(call.data.status).toBe(IncidentStatus.CLOSED);
    });

    it('refuse toute transition depuis CLOSED', async () => {
      prisma.incident.findFirst.mockResolvedValue({
        ...baseIncident,
        status: IncidentStatus.CLOSED,
      });
      await expect(
        service.changeStatus('inc-1', { status: IncidentStatus.ANALYZING } as any, 'user-1'),
      ).rejects.toThrow(/non autorisée/);
    });
  });

  describe('remove', () => {
    it("soft-delete l'incident", async () => {
      prisma.incident.findFirst.mockResolvedValue(baseIncident);
      prisma.incident.update.mockResolvedValue({ ...baseIncident, deletedAt: new Date() });
      await service.remove('inc-1', 'user-1');
      expect(prisma.incident.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });
  });
});
