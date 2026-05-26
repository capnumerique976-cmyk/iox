import { Injectable, Logger } from '@nestjs/common';
import { EntityType, RequestUser } from '@iox/shared';
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

/**
 * ADR-0007 — Params typés pour `recordAction(actor, params)`.
 * Le `userId` est extrait automatiquement de `actor.id` — ne pas le
 * passer ici (forçage de la convention).
 */
export interface AuditActionParams {
  action: string;
  entityType: EntityType;
  entityId: string;
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

  /**
   * ADR-0007 — Helper typé enforçant actor.id positionnel requis.
   *
   * Usage recommandé pour tout nouveau call-site. Évite l'oubli de
   * `userId` (anti-pattern audit anonyme).
   *
   * Pour les call-sites système (webhooks, cron, seed) sans actor,
   * utiliser `log()` directement avec `userId: undefined`.
   */
  async recordAction(
    actor: RequestUser,
    params: AuditActionParams,
  ): Promise<void> {
    return this.log({
      ...params,
      userId: actor.id,
    });
  }

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
