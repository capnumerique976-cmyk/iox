import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  QueryReviewQueueDto,
  EnqueueReviewDto,
  DecideReviewDto,
} from './dto/marketplace-review.dto';
import {
  EntityType,
  MarketplaceRelatedEntityType,
  MarketplaceReviewStatus,
  MarketplaceReviewType,
} from '@iox/shared';
import type { Prisma } from '@prisma/client';

const REVIEW_INCLUDE = {
  reviewedByUser: {
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
  },
} as const;

/**
 * File d'attente de revue qualité pour le marketplace.
 *
 * Un item de la queue = une demande de décision (PUBLICATION, MEDIA, DOCUMENT)
 * sur une entité donnée. Les modules métiers appellent `enqueue` lorsqu'un
 * changement nécessite une validation staff (ex : `submitForReview`).
 *
 * Le staff traite la queue via `findAll`, `approve`, `reject`. Les décisions
 * sont traçables en audit mais n'appliquent pas elles-mêmes les transitions
 * métiers — le staff reste libre d'agir via les endpoints dédiés des modules
 * (approve/reject seller/product/offer) en parallèle. La queue est un indicateur
 * d'activité et un point de coordination, pas un exécuteur d'effets de bord.
 */
@Injectable()
export class MarketplaceReviewService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // ─── Lecture ──────────────────────────────────────────────────────────────

  async findAll(query: QueryReviewQueueDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.MarketplaceReviewQueueWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.reviewType) where.reviewType = query.reviewType;
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;
    if (query.reviewedByUserId) where.reviewedByUserId = query.reviewedByUserId;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.marketplaceReviewQueue.findMany({
        where,
        include: REVIEW_INCLUDE,
        skip,
        take: limit,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.marketplaceReviewQueue.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string) {
    const item = await this.prisma.marketplaceReviewQueue.findUnique({
      where: { id },
      include: REVIEW_INCLUDE,
    });
    if (!item) throw new NotFoundException('Item de revue introuvable');
    return item;
  }

  async countPending() {
    const [publication, media, document] = await this.prisma.$transaction([
      this.prisma.marketplaceReviewQueue.count({
        where: {
          status: MarketplaceReviewStatus.PENDING,
          reviewType: MarketplaceReviewType.PUBLICATION,
        },
      }),
      this.prisma.marketplaceReviewQueue.count({
        where: { status: MarketplaceReviewStatus.PENDING, reviewType: MarketplaceReviewType.MEDIA },
      }),
      this.prisma.marketplaceReviewQueue.count({
        where: {
          status: MarketplaceReviewStatus.PENDING,
          reviewType: MarketplaceReviewType.DOCUMENT,
        },
      }),
    ]);
    return {
      total: publication + media + document,
      byType: { publication, media, document },
    };
  }

  // ─── Enqueue (appelé par les autres modules) ──────────────────────────────

  /**
   * Ajoute un item à la queue, ou réactive un PENDING existant.
   *
   * Politique idempotente : si un item PENDING existe déjà pour le trio
   * (entityType, entityId, reviewType), on le retourne sans doublon.
   * Si le dernier item est APPROVED/REJECTED, on en crée un nouveau (nouvelle
   * itération de revue).
   */
  async enqueue(dto: EnqueueReviewDto, actorId?: string) {
    const existingPending = await this.prisma.marketplaceReviewQueue.findFirst({
      where: {
        entityType: dto.entityType,
        entityId: dto.entityId,
        reviewType: dto.reviewType,
        status: MarketplaceReviewStatus.PENDING,
      },
    });
    if (existingPending) return existingPending;

    const item = await this.prisma.marketplaceReviewQueue.create({
      data: {
        entityType: dto.entityType,
        entityId: dto.entityId,
        reviewType: dto.reviewType,
        status: MarketplaceReviewStatus.PENDING,
        reviewReason: dto.reason,
      },
    });

    await this.auditService.log({
      action: 'MARKETPLACE_REVIEW_ENQUEUED',
      entityType: EntityType.MARKETPLACE_REVIEW,
      entityId: item.id,
      userId: actorId,
      newData: {
        targetEntityType: item.entityType,
        targetEntityId: item.entityId,
        reviewType: item.reviewType,
      },
    });

    return item;
  }

  // ─── Décisions ────────────────────────────────────────────────────────────

  async approve(id: string, dto: DecideReviewDto, actorId?: string) {
    const item = await this.prisma.marketplaceReviewQueue.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item de revue introuvable');
    if (item.status !== MarketplaceReviewStatus.PENDING) {
      throw new BadRequestException('Seul un item PENDING peut être décidé');
    }

    const updated = await this.prisma.marketplaceReviewQueue.update({
      where: { id },
      data: {
        status: MarketplaceReviewStatus.APPROVED,
        reviewedByUserId: actorId,
        reviewReason: dto.reason ?? item.reviewReason,
      },
      include: REVIEW_INCLUDE,
    });

    await this.auditService.log({
      action: 'MARKETPLACE_REVIEW_APPROVED',
      entityType: EntityType.MARKETPLACE_REVIEW,
      entityId: id,
      userId: actorId,
      previousData: { status: item.status },
      newData: { status: updated.status, reviewReason: updated.reviewReason },
    });

    return updated;
  }

  async reject(id: string, dto: DecideReviewDto, actorId?: string) {
    if (!dto.reason || dto.reason.trim().length === 0) {
      throw new BadRequestException('Motif obligatoire pour un rejet');
    }
    const item = await this.prisma.marketplaceReviewQueue.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item de revue introuvable');
    if (item.status !== MarketplaceReviewStatus.PENDING) {
      throw new BadRequestException('Seul un item PENDING peut être décidé');
    }

    const updated = await this.prisma.marketplaceReviewQueue.update({
      where: { id },
      data: {
        status: MarketplaceReviewStatus.REJECTED,
        reviewedByUserId: actorId,
        reviewReason: dto.reason,
      },
      include: REVIEW_INCLUDE,
    });

    await this.auditService.log({
      action: 'MARKETPLACE_REVIEW_REJECTED',
      entityType: EntityType.MARKETPLACE_REVIEW,
      entityId: id,
      userId: actorId,
      previousData: { status: item.status },
      newData: { status: updated.status, reviewReason: updated.reviewReason },
    });

    return updated;
  }

  /**
   * Helper pour les autres modules : marquer tous les PENDING d'une entité
   * comme obsolètes (p. ex. quand une publication est annulée/archivée).
   * Journalisé mais ne supprime rien (historique conservé).
   */
  async resolvePendingForEntity(
    entityType: MarketplaceRelatedEntityType,
    entityId: string,
    reviewType: MarketplaceReviewType,
    resolution: MarketplaceReviewStatus.APPROVED | MarketplaceReviewStatus.REJECTED,
    reason: string,
    actorId?: string,
  ) {
    const pendings = await this.prisma.marketplaceReviewQueue.findMany({
      where: { entityType, entityId, reviewType, status: MarketplaceReviewStatus.PENDING },
    });
    for (const p of pendings) {
      await this.prisma.marketplaceReviewQueue.update({
        where: { id: p.id },
        data: {
          status: resolution,
          reviewedByUserId: actorId,
          reviewReason: reason,
        },
      });
      await this.auditService.log({
        action:
          resolution === MarketplaceReviewStatus.APPROVED
            ? 'MARKETPLACE_REVIEW_AUTO_APPROVED'
            : 'MARKETPLACE_REVIEW_AUTO_REJECTED',
        entityType: EntityType.MARKETPLACE_REVIEW,
        entityId: p.id,
        userId: actorId,
        newData: { resolution, reason },
      });
    }
    return pendings.length;
  }
}
