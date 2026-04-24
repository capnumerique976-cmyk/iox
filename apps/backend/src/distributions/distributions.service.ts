import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CodeGeneratorService } from '../common/services/code-generator.service';
import {
  DISTRIBUTION_STATUS_TRANSITIONS,
  DistributionStatus,
  EntityType,
  ProductBatchStatus,
} from '@iox/shared';
import {
  CreateDistributionDto,
  UpdateDistributionDto,
  ChangeDistributionStatusDto,
  QueryDistributionsDto,
} from './dto/distribution.dto';

const ALLOWED_TRANSITIONS = DISTRIBUTION_STATUS_TRANSITIONS;

const DETAIL_SELECT = {
  id: true,
  code: true,
  status: true,
  distributionDate: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  beneficiary: { select: { id: true, code: true, name: true, city: true } },
  lines: {
    select: {
      id: true,
      quantity: true,
      unit: true,
      notes: true,
      productBatch: {
        select: {
          id: true,
          code: true,
          status: true,
          quantity: true,
          unit: true,
          product: { select: { id: true, code: true, name: true } },
        },
      },
    },
  },
  _count: { select: { lines: true } },
};

@Injectable()
export class DistributionsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private codeGen: CodeGeneratorService,
  ) {}

  async findAll(query: QueryDistributionsDto) {
    const page = Math.max(1, parseInt(query.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20', 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.DistributionWhereInput = { deletedAt: null };
    if (query.beneficiaryId) where.beneficiaryId = query.beneficiaryId;
    if (query.status) where.status = query.status as DistributionStatus;
    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { beneficiary: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }
    if (query.dateFrom || query.dateTo) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (query.dateFrom) dateFilter.gte = new Date(query.dateFrom);
      if (query.dateTo) dateFilter.lte = new Date(query.dateTo);
      where.distributionDate = dateFilter;
    }

    const [data, total] = await Promise.all([
      this.prisma.distribution.findMany({
        where,
        skip,
        take: limit,
        orderBy: { distributionDate: 'desc' },
        select: {
          id: true,
          code: true,
          status: true,
          distributionDate: true,
          notes: true,
          createdAt: true,
          beneficiary: { select: { id: true, code: true, name: true } },
          _count: { select: { lines: true } },
        },
      }),
      this.prisma.distribution.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const dist = await this.prisma.distribution.findFirst({
      where: { id, deletedAt: null },
      select: DETAIL_SELECT,
    });
    if (!dist) throw new NotFoundException('Distribution introuvable');
    return dist;
  }

  async create(dto: CreateDistributionDto, userId: string) {
    if (!dto.lines || dto.lines.length === 0)
      throw new BadRequestException('Au moins une ligne est requise');

    // Vérifier les lots existent et sont disponibles
    const batchIds = dto.lines.map((l) => l.productBatchId);
    const batches = await this.prisma.productBatch.findMany({
      where: { id: { in: batchIds }, deletedAt: null },
      select: { id: true, status: true, code: true },
    });
    if (batches.length !== batchIds.length)
      throw new BadRequestException('Certains lots finis sont introuvables');
    const unavailable = batches.filter((b) => !['AVAILABLE', 'RESERVED'].includes(b.status));
    if (unavailable.length > 0)
      throw new BadRequestException(
        `Lots non disponibles : ${unavailable.map((b) => b.code).join(', ')}`,
      );

    const code = await this.codeGen.generate('distribution');

    const dist = await this.prisma.distribution.create({
      data: {
        code,
        beneficiaryId: dto.beneficiaryId,
        distributionDate: new Date(dto.distributionDate),
        notes: dto.notes,
        createdById: userId,
        lines: {
          create: dto.lines.map((l) => ({
            productBatchId: l.productBatchId,
            quantity: l.quantity,
            unit: l.unit,
            notes: l.notes,
          })),
        },
      },
      select: DETAIL_SELECT,
    });

    await this.audit.log({
      action: 'DISTRIBUTION_CREATED',
      entityType: EntityType.DISTRIBUTION,
      entityId: dist.id,
      newData: dist,
      userId,
    });

    return dist;
  }

  async update(id: string, dto: UpdateDistributionDto, userId: string) {
    const dist = await this.prisma.distribution.findFirst({
      where: { id, deletedAt: null },
    });
    if (!dist) throw new NotFoundException('Distribution introuvable');
    if (['COMPLETED', 'CANCELLED'].includes(dist.status))
      throw new BadRequestException(
        'Une distribution terminée ou annulée ne peut pas être modifiée',
      );

    const updated = await this.prisma.distribution.update({
      where: { id },
      data: {
        ...(dto.distributionDate ? { distributionDate: new Date(dto.distributionDate) } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        updatedById: userId,
      },
      select: DETAIL_SELECT,
    });

    await this.audit.log({
      action: 'DISTRIBUTION_UPDATED',
      entityType: EntityType.DISTRIBUTION,
      entityId: id,
      previousData: dist,
      newData: updated,
      userId,
    });

    return updated;
  }

  async changeStatus(id: string, dto: ChangeDistributionStatusDto, userId: string) {
    const dist = await this.prisma.distribution.findFirst({
      where: { id, deletedAt: null },
      include: { lines: { select: { productBatchId: true } } },
    });
    if (!dist) throw new NotFoundException('Distribution introuvable');

    const allowed = ALLOWED_TRANSITIONS[dist.status as DistributionStatus] ?? [];
    if (!allowed.includes(dto.status))
      throw new BadRequestException(`Transition invalide : ${dist.status} → ${dto.status}`);

    const updated = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Quand COMPLETED : passer les lots à SHIPPED
      if (dto.status === DistributionStatus.COMPLETED) {
        const batchIds = dist.lines.map((l) => l.productBatchId);
        await tx.productBatch.updateMany({
          where: { id: { in: batchIds } },
          data: { status: ProductBatchStatus.SHIPPED, updatedById: userId },
        });
      }

      return tx.distribution.update({
        where: { id },
        data: {
          status: dto.status,
          updatedById: userId,
          ...(dto.notes ? { notes: dto.notes } : {}),
        },
        select: DETAIL_SELECT,
      });
    });

    await this.audit.log({
      action: 'DISTRIBUTION_STATUS_CHANGED',
      entityType: EntityType.DISTRIBUTION,
      entityId: id,
      previousData: { status: dist.status },
      newData: { status: dto.status, notes: dto.notes },
      userId,
    });

    return updated;
  }

  async remove(id: string, userId: string) {
    const dist = await this.prisma.distribution.findFirst({
      where: { id, deletedAt: null },
    });
    if (!dist) throw new NotFoundException('Distribution introuvable');
    if (dist.status === DistributionStatus.COMPLETED)
      throw new BadRequestException('Une distribution complétée ne peut pas être supprimée');

    await this.prisma.distribution.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: userId },
    });

    await this.audit.log({
      action: 'DISTRIBUTION_DELETED',
      entityType: EntityType.DISTRIBUTION,
      entityId: id,
      userId,
    });
  }

  async getStats() {
    const [byStatus, recentCompleted] = await Promise.all([
      this.prisma.distribution.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.distribution.count({
        where: {
          deletedAt: null,
          status: 'COMPLETED',
          distributionDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    const counts = Object.fromEntries(byStatus.map((r) => [r.status, r._count.id])) as Record<
      string,
      number
    >;

    return {
      total: Object.values(counts).reduce<number>((s, v) => s + v, 0),
      planned: counts['PLANNED'] ?? 0,
      inProgress: counts['IN_PROGRESS'] ?? 0,
      completed: counts['COMPLETED'] ?? 0,
      cancelled: counts['CANCELLED'] ?? 0,
      completedLast30Days: recentCompleted,
    };
  }
}
