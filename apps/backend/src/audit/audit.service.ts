import { Injectable, Logger } from '@nestjs/common';
import { EntityType } from '@iox/shared';
import { PrismaService } from '../database/prisma.service';

interface CreateAuditLogParams {
  action: string;
  entityType: EntityType;
  entityId: string;
  userId?: string;
  previousData?: unknown;
  newData?: unknown;
  ipAddress?: string;
  userAgent?: string;
  notes?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async log(params: CreateAuditLogParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          userId: params.userId ?? null,
          previousData: params.previousData ? (params.previousData as object) : undefined,
          newData: params.newData ? (params.newData as object) : undefined,
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
          notes: params.notes ?? null,
        },
      });
    } catch (error) {
      // L'audit ne doit jamais faire échouer une opération métier
      this.logger.error(`Erreur audit log [${params.action}] : ${(error as Error).message}`);
    }
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    entityType?: EntityType;
    entityId?: string;
    userId?: string;
    action?: string;
    from?: Date;
    to?: Date;
  }) {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 50, 200);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (params.entityType) where.entityType = params.entityType;
    if (params.entityId) where.entityId = params.entityId;
    if (params.userId) where.userId = params.userId;
    if (params.action) where.action = { contains: params.action, mode: 'insensitive' };
    if (params.from || params.to) {
      where.createdAt = {
        ...(params.from && { gte: params.from }),
        ...(params.to && { lte: params.to }),
      };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true, role: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
