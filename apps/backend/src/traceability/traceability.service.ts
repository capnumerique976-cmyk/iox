import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

/* ──────────────────────────────────────────────────────────────────────────────
 *  Types — Timeline & Chain
 * ──────────────────────────────────────────────────────────────────────────────*/

export type TimelineEventType =
  | 'BATCH_CREATED'
  | 'BATCH_STATUS_CHANGED'
  | 'LABEL_VALIDATION'
  | 'MARKET_DECISION'
  | 'DOCUMENT_ADDED'
  | 'AUDIT';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  date: Date;
  title: string;
  detail?: string;
  actor?: string;
  icon: 'package' | 'status' | 'file-text' | 'shield' | 'upload' | 'eye';
  variant: 'default' | 'success' | 'warning' | 'error' | 'info';
}

@Injectable()
export class TraceabilityService {
  constructor(private prisma: PrismaService) {}

  /* ─── Timeline complète d'un lot fini ─────────────────────────────────────*/

  async getTimeline(batchId: string): Promise<TimelineEvent[]> {
    const batch = await this.prisma.productBatch.findFirst({
      where: { id: batchId, deletedAt: null },
      select: { id: true, code: true, createdAt: true },
    });
    if (!batch) throw new NotFoundException('Lot produit introuvable');

    const events: TimelineEvent[] = [];

    // ── 1. Création du lot ──────────────────────────────────────────────────
    events.push({
      id: `created-${batch.id}`,
      type: 'BATCH_CREATED',
      date: batch.createdAt,
      title: `Lot ${batch.code} créé`,
      icon: 'package',
      variant: 'info',
    });

    // ── 2. Logs d'audit pour ce lot ─────────────────────────────────────────
    const auditLogs = await this.prisma.auditLog.findMany({
      where: { entityId: batchId },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { firstName: true, lastName: true } } },
      take: 200,
    });

    for (const log of auditLogs) {
      if (log.action === 'PRODUCT_BATCH_CREATED') continue; // déjà ajouté

      let title = log.action.replace(/_/g, ' ').toLowerCase();
      let variant: TimelineEvent['variant'] = 'default';
      let icon: TimelineEvent['icon'] = 'eye';

      if (log.action === 'PRODUCT_BATCH_STATUS_CHANGED') {
        const nd = log.newData as Record<string, string> | null;
        title = `Statut → ${STATUS_LABEL[nd?.status ?? ''] ?? nd?.status ?? '?'}`;
        variant = STATUS_VARIANT[nd?.status ?? ''] ?? 'default';
        icon = 'status';
      } else if (log.action === 'LABEL_VALIDATION_CREATED') {
        title = 'Validation étiquetage enregistrée';
        icon = 'file-text';
        variant = 'info';
      } else if (log.action === 'MARKET_RELEASE_DECISION_CREATED') {
        const nd = log.newData as Record<string, string> | null;
        title = `Décision de mise en marché : ${DECISION_LABEL[nd?.decision ?? ''] ?? nd?.decision ?? '?'}`;
        icon = 'shield';
        variant = DECISION_VARIANT[nd?.decision ?? ''] ?? 'default';
      } else if (log.action === 'DOCUMENT_UPLOADED') {
        const nd = log.newData as Record<string, string> | null;
        title = `Document ajouté : ${nd?.name ?? '—'}`;
        icon = 'upload';
        variant = 'default';
      }

      events.push({
        id: log.id,
        type: 'AUDIT',
        date: log.createdAt,
        title,
        detail: log.notes ?? undefined,
        actor: log.user ? `${log.user.firstName} ${log.user.lastName}` : undefined,
        icon,
        variant,
      });
    }

    // ── 3. Validations d'étiquetage (enrichissement) ──────────────────────
    const labelValidations = await this.prisma.labelValidation.findMany({
      where: { productBatchId: batchId },
      orderBy: { createdAt: 'asc' },
      include: { validatedBy: { select: { firstName: true, lastName: true } } },
    });

    for (const lv of labelValidations) {
      // Évite les doublons si l'audit log existe déjà
      const alreadyIn = events.some(
        (e) =>
          e.id === lv.id || (e.type === 'AUDIT' && e.date.getTime() === lv.createdAt.getTime()),
      );
      if (!alreadyIn) {
        events.push({
          id: lv.id,
          type: 'LABEL_VALIDATION',
          date: lv.createdAt,
          title: `Étiquetage ${lv.isValid ? 'conforme ✅' : 'non conforme ❌'}`,
          detail: lv.reservations?.join(', ') || lv.notes || undefined,
          actor: lv.validatedBy
            ? `${lv.validatedBy.firstName} ${lv.validatedBy.lastName}`
            : undefined,
          icon: 'file-text',
          variant: lv.isValid ? 'success' : 'error',
        });
      }
    }

    // ── 4. Décisions de mise en marché (enrichissement) ───────────────────
    const decisions = await this.prisma.marketReleaseDecision.findMany({
      where: { productBatchId: batchId },
      orderBy: { createdAt: 'asc' },
      include: { validatedBy: { select: { firstName: true, lastName: true } } },
    });

    for (const d of decisions) {
      const alreadyIn = events.some((e) => e.id === d.id);
      if (!alreadyIn) {
        events.push({
          id: d.id,
          type: 'MARKET_DECISION',
          date: d.createdAt,
          title: `Décision : ${DECISION_LABEL[d.decision as string] ?? d.decision}`,
          detail: d.notes ?? d.blockingReason ?? undefined,
          actor: `${d.validatedBy.firstName} ${d.validatedBy.lastName}`,
          icon: 'shield',
          variant: DECISION_VARIANT[d.decision as string] ?? 'default',
        });
      }
    }

    // ── 5. Documents (enrichissement) ─────────────────────────────────────
    const docs = await this.prisma.document.findMany({
      where: { productBatchId: batchId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, createdAt: true },
    });

    for (const doc of docs) {
      const alreadyIn = events.some((e) => e.id === doc.id);
      if (!alreadyIn) {
        events.push({
          id: doc.id,
          type: 'DOCUMENT_ADDED',
          date: doc.createdAt,
          title: `Document : ${doc.name}`,
          icon: 'upload',
          variant: 'default',
        });
      }
    }

    // Tri chronologique final
    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /* ─── Chaîne de traçabilité complète ─────────────────────────────────────*/

  async getChain(batchId: string) {
    const batch = await this.prisma.productBatch.findFirst({
      where: { id: batchId, deletedAt: null },
      include: {
        product: { select: { id: true, code: true, name: true, status: true } },
        transformationOp: {
          select: {
            id: true,
            code: true,
            name: true,
            operationDate: true,
            yieldRate: true,
            inboundBatch: {
              select: {
                id: true,
                code: true,
                status: true,
                quantity: true,
                unit: true,
                supplier: { select: { id: true, name: true } },
                product: { select: { id: true, name: true } },
                supplyContract: { select: { id: true, code: true } },
                controlledAt: true,
              },
            },
          },
        },
        labelValidations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, isValid: true, validatedAt: true },
        },
        marketReleaseDecisions: {
          where: { isActive: true },
          take: 1,
          select: { id: true, decision: true, decidedAt: true, isActive: true },
        },
        _count: {
          select: { documents: true, labelValidations: true, marketReleaseDecisions: true },
        },
      },
    });

    if (!batch) throw new NotFoundException('Lot produit introuvable');

    return {
      // Nœud 1 — Lot entrant (matière première)
      inboundBatch: batch.transformationOp?.inboundBatch ?? null,

      // Nœud 2 — Opération de transformation
      transformationOp: batch.transformationOp
        ? {
            id: batch.transformationOp.id,
            code: batch.transformationOp.code,
            name: batch.transformationOp.name,
            operationDate: batch.transformationOp.operationDate,
            yieldRate: batch.transformationOp.yieldRate,
          }
        : null,

      // Nœud 3 — Lot fini
      productBatch: {
        id: batch.id,
        code: batch.code,
        status: batch.status,
        quantity: batch.quantity,
        unit: batch.unit,
        productionDate: batch.productionDate,
        expiryDate: batch.expiryDate,
      },

      // Nœud 4 — Produit
      product: batch.product,

      // Nœud 5 — Dernier état étiquetage & décision
      latestLabelValidation: batch.labelValidations[0] ?? null,
      activeMarketDecision: batch.marketReleaseDecisions[0] ?? null,

      // Compteurs
      counts: batch._count,
    };
  }
}

/* ──────────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                       */

const STATUS_LABEL: Record<string, string> = {
  CREATED: 'Créé',
  READY_FOR_VALIDATION: 'Prêt à valider',
  AVAILABLE: 'Disponible',
  RESERVED: 'Réservé',
  SHIPPED: 'Expédié',
  BLOCKED: 'Bloqué',
  DESTROYED: 'Détruit',
};

const STATUS_VARIANT: Record<string, TimelineEvent['variant']> = {
  AVAILABLE: 'success',
  SHIPPED: 'success',
  BLOCKED: 'error',
  DESTROYED: 'error',
  READY_FOR_VALIDATION: 'warning',
  RESERVED: 'warning',
  CREATED: 'info',
};

const DECISION_LABEL: Record<string, string> = {
  COMPLIANT: 'Conforme',
  COMPLIANT_WITH_RESERVATIONS: 'Conforme avec réserves',
  NON_COMPLIANT: 'Non conforme — Bloqué',
};

const DECISION_VARIANT: Record<string, TimelineEvent['variant']> = {
  COMPLIANT: 'success',
  COMPLIANT_WITH_RESERVATIONS: 'warning',
  NON_COMPLIANT: 'error',
};
