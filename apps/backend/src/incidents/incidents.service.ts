import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CodeGeneratorService } from '../common/services/code-generator.service';
import { CreateIncidentDto, UpdateIncidentDto, ChangeIncidentStatusDto } from './dto/incident.dto';
import { IncidentStatus, EntityType, IncidentSeverity } from '@iox/shared';

/* ------------------------------------------------------------------ */
/*  Transitions autorisées                                             */
/* ------------------------------------------------------------------ */

const ALLOWED_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  [IncidentStatus.OPEN]: [IncidentStatus.ANALYZING],
  [IncidentStatus.ANALYZING]: [IncidentStatus.ACTION_IN_PROGRESS, IncidentStatus.CONTROLLED],
  [IncidentStatus.ACTION_IN_PROGRESS]: [IncidentStatus.CONTROLLED],
  [IncidentStatus.CONTROLLED]: [IncidentStatus.CLOSED, IncidentStatus.ACTION_IN_PROGRESS],
  [IncidentStatus.CLOSED]: [],
};

/* ------------------------------------------------------------------ */
/*  Sélecteur commun                                                   */
/* ------------------------------------------------------------------ */

const SELECT = {
  id: true,
  code: true,
  title: true,
  description: true,
  status: true,
  severity: true,
  incidentDate: true,
  resolvedAt: true,
  resolution: true,
  actionsTaken: true,
  linkedEntityType: true,
  linkedEntityId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  createdById: true,
  assignedToId: true,
  _count: { select: { documents: true } },
};

@Injectable()
export class IncidentsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private codeGen: CodeGeneratorService,
  ) {}

  /* ---------------------------------------------------------------- */
  /*  Liste paginée                                                    */
  /* ---------------------------------------------------------------- */

  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    severity?: string;
    linkedEntityType?: string;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.IncidentWhereInput = { deletedAt: null };

    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
        { code: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params.status) where.status = params.status as IncidentStatus;
    if (params.severity) where.severity = params.severity as IncidentSeverity;
    if (params.linkedEntityType) where.linkedEntityType = params.linkedEntityType as EntityType;

    const [data, total] = await Promise.all([
      this.prisma.incident.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        select: SELECT,
      }),
      this.prisma.incident.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /* ---------------------------------------------------------------- */
  /*  Détail                                                           */
  /* ---------------------------------------------------------------- */

  async findOne(id: string) {
    const incident = await this.prisma.incident.findFirst({
      where: { id, deletedAt: null },
      select: {
        ...SELECT,
        documents: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            originalFilename: true,
            mimeType: true,
            sizeBytes: true,
            createdAt: true,
          },
        },
      },
    });

    if (!incident) throw new NotFoundException(`Incident ${id} introuvable`);
    return incident;
  }

  /* ---------------------------------------------------------------- */
  /*  Création                                                         */
  /* ---------------------------------------------------------------- */

  async create(dto: CreateIncidentDto, userId: string) {
    const code = await this.codeGen.generate('incident');

    const incident = await this.prisma.incident.create({
      data: {
        code,
        title: dto.title,
        description: dto.description,
        severity: dto.severity as IncidentSeverity,
        incidentDate: new Date(dto.incidentDate),
        linkedEntityType: (dto.linkedEntityType as EntityType | undefined) ?? null,
        linkedEntityId: dto.linkedEntityId ?? null,
        assignedToId: dto.assignedToId ?? null,
        createdById: userId,
        updatedById: userId,
      },
      select: SELECT,
    });

    await this.audit.log({
      action: 'INCIDENT_CREATED',
      entityType: EntityType.INCIDENT,
      entityId: incident.id,
      newData: incident,
      userId,
    });

    return incident;
  }

  /* ---------------------------------------------------------------- */
  /*  Mise à jour                                                      */
  /* ---------------------------------------------------------------- */

  async update(id: string, dto: UpdateIncidentDto, userId: string) {
    const existing = await this.findOne(id);

    if (existing.status === IncidentStatus.CLOSED) {
      throw new BadRequestException('Impossible de modifier un incident clôturé.');
    }

    const data: Prisma.IncidentUpdateInput = { updatedById: userId };
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.severity !== undefined) data.severity = dto.severity as IncidentSeverity;
    if (dto.incidentDate !== undefined) data.incidentDate = new Date(dto.incidentDate);
    if (dto.resolution !== undefined) data.resolution = dto.resolution;
    if (dto.actionsTaken !== undefined) data.actionsTaken = dto.actionsTaken;
    if (dto.assignedToId !== undefined) data.assignedToId = dto.assignedToId;
    if (dto.linkedEntityType !== undefined) data.linkedEntityType = dto.linkedEntityType as EntityType;
    if (dto.linkedEntityId !== undefined) data.linkedEntityId = dto.linkedEntityId;

    const updated = await this.prisma.incident.update({
      where: { id },
      data,
      select: SELECT,
    });

    await this.audit.log({
      action: 'INCIDENT_UPDATED',
      entityType: EntityType.INCIDENT,
      entityId: id,
      previousData: existing,
      newData: updated,
      userId,
    });

    return updated;
  }

  /* ---------------------------------------------------------------- */
  /*  Changement de statut                                             */
  /* ---------------------------------------------------------------- */

  async changeStatus(id: string, dto: ChangeIncidentStatusDto, userId: string) {
    const incident = await this.findOne(id);
    const current = incident.status as IncidentStatus;
    const next = dto.status as IncidentStatus;

    const allowed = ALLOWED_TRANSITIONS[current] ?? [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Transition ${current} → ${next} non autorisée. Transitions valides : ${allowed.join(', ') || 'aucune'}`,
      );
    }

    const data: Prisma.IncidentUpdateInput = { status: next, updatedById: userId };

    /* Résolution automatique à la clôture */
    if (next === IncidentStatus.CLOSED) {
      data.resolvedAt = new Date();
    }

    const updated = await this.prisma.incident.update({
      where: { id },
      data,
      select: SELECT,
    });

    await this.audit.log({
      action: 'INCIDENT_STATUS_CHANGED',
      entityType: EntityType.INCIDENT,
      entityId: id,
      previousData: { status: current },
      newData: { status: next, notes: dto.notes },
      userId,
    });

    return updated;
  }

  /* ---------------------------------------------------------------- */
  /*  Suppression (soft)                                              */
  /* ---------------------------------------------------------------- */

  async remove(id: string, userId: string) {
    await this.findOne(id);

    await this.prisma.incident.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: userId },
    });

    await this.audit.log({
      action: 'INCIDENT_DELETED',
      entityType: EntityType.INCIDENT,
      entityId: id,
      userId,
    });

    return { message: 'Incident supprimé' };
  }

  /* ---------------------------------------------------------------- */
  /*  Statistiques pour le dashboard                                  */
  /* ---------------------------------------------------------------- */

  async getStats() {
    const [byStatus, bySeverity, openCount] = await Promise.all([
      this.prisma.incident.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.incident.groupBy({
        by: ['severity'],
        where: { deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.incident.count({
        where: { deletedAt: null, status: { not: IncidentStatus.CLOSED } },
      }),
    ]);

    return {
      byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count.id])),
      bySeverity: Object.fromEntries(bySeverity.map((r) => [r.severity, r._count.id])),
      openCount,
    };
  }
}
