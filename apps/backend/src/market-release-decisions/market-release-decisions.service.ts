import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  MarketReleaseDecisionStatus as PrismaMarketReleaseDecisionStatus,
  ProductBatchStatus as PrismaProductBatchStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateMarketReleaseDecisionDto,
  QueryMarketReleaseDecisionsDto,
} from './dto/market-release-decision.dto';
import { MarketReleaseDecision } from '@iox/shared';
import { EntityType } from '@iox/shared';

/* ──────────────────────────────────────────────────────────────────────────────
 *  Checklist — Les 7 conditions de mise en marché
 * ──────────────────────────────────────────────────────────────────────────────
 *  Chaque condition retourne { pass: boolean; label: string; detail: string }
 * ──────────────────────────────────────────────────────────────────────────────*/

export interface ChecklistItem {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
}

export interface BatchChecklist {
  items: ChecklistItem[];
  allPass: boolean;
  /** True si toutes les conditions obligatoires passent */
  canRelease: boolean;
}

const DECISION_INCLUDE = {
  productBatch: {
    select: { id: true, code: true, status: true, product: { select: { id: true, name: true } } },
  },
  validatedBy: { select: { id: true, firstName: true, lastName: true } },
};

@Injectable()
export class MarketReleaseDecisionsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /* ─── Évaluation des 7 conditions ─────────────────────────────────────────*/

  async evaluateChecklist(productBatchId: string): Promise<BatchChecklist> {
    const batch = await this.prisma.productBatch.findFirst({
      where: { id: productBatchId, deletedAt: null },
      include: {
        product: { select: { id: true, status: true, name: true } },
        transformationOp: {
          select: {
            id: true,
            code: true,
            inboundBatch: { select: { id: true, status: true } },
          },
        },
        labelValidations: {
          where: { isValid: true },
          take: 1,
          select: { id: true },
        },
        _count: {
          select: { documents: true, marketReleaseDecisions: true },
        },
      },
    });

    if (!batch) throw new NotFoundException('Lot produit introuvable');

    // Compter documents actifs
    const activeDocsCount = await this.prisma.document.count({
      where: { productBatchId, status: 'ACTIVE' },
    });

    // Vérifier décision bloquante active
    const activeBlock = await this.prisma.marketReleaseDecision.findFirst({
      where: { productBatchId, isActive: true, decision: 'NON_COMPLIANT' },
      select: { id: true },
    });

    /* ── Conditions ─────────────────────────────────────────────────────── */

    const items: ChecklistItem[] = [
      // C1 — Statut du lot
      {
        id: 'batchStatus',
        label: 'Lot en statut éligible (Prêt à valider ou Disponible)',
        pass: ['READY_FOR_VALIDATION', 'AVAILABLE'].includes(batch.status),
        detail: `Statut actuel : ${batch.status}`,
      },

      // C2 — Produit conforme
      {
        id: 'productCompliant',
        label: 'Produit associé conforme (COMPLIANT)',
        pass: ['COMPLIANT', 'COMPLIANT_WITH_RESERVATIONS'].includes(batch.product.status),
        detail: `Statut produit : ${batch.product.status} — ${batch.product.name}`,
      },

      // C3 — Lot entrant accepté (si issu d'une transformation)
      {
        id: 'inboundAccepted',
        label: 'Matière première source acceptée (ACCEPTED)',
        pass: batch.transformationOp
          ? batch.transformationOp.inboundBatch.status === 'ACCEPTED'
          : true, // Pas de transformation = condition non applicable → passe
        detail: batch.transformationOp
          ? `Lot entrant : statut ${batch.transformationOp.inboundBatch.status}`
          : 'Aucune opération de transformation — condition non applicable',
      },

      // C4 — Validation étiquetage
      {
        id: 'labelValidated',
        label: "Au moins une validation d'étiquetage conforme",
        pass: batch.labelValidations.length > 0,
        detail:
          batch.labelValidations.length > 0
            ? `${batch.labelValidations.length} validation(s) conforme(s) enregistrée(s)`
            : "Aucune validation d'étiquetage positive trouvée",
      },

      // C5 — Documents présents
      {
        id: 'documentsPresent',
        label: 'Au moins un document actif joint au lot',
        pass: activeDocsCount > 0,
        detail: `${activeDocsCount} document(s) actif(s) trouvé(s)`,
      },

      // C6 — Aucune décision bloquante active
      {
        id: 'noActiveBlock',
        label: 'Aucune décision de blocage active sur ce lot',
        pass: activeBlock === null,
        detail: activeBlock
          ? "Une décision NON_COMPLIANT active existe — lever le blocage d'abord"
          : 'Aucun blocage actif',
      },

      // C7 — Intégrité des données
      {
        id: 'dataIntegrity',
        label: 'Données de production complètes (quantité > 0, date renseignée)',
        pass: Number(batch.quantity) > 0 && !!batch.productionDate,
        detail: `Quantité : ${batch.quantity} ${batch.unit} — Date production : ${
          batch.productionDate
            ? new Date(batch.productionDate).toLocaleDateString('fr-FR')
            : 'non renseignée'
        }`,
      },
    ];

    const allPass = items.every((i) => i.pass);
    const canRelease = allPass; // Toutes les conditions sont obligatoires

    return { items, allPass, canRelease };
  }

  /* ─── CRUD ────────────────────────────────────────────────────────────────*/

  async findAll(query: QueryMarketReleaseDecisionsDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.MarketReleaseDecisionWhereInput = {};
    if (query.productBatchId) where.productBatchId = query.productBatchId;
    if (query.decision) where.decision = query.decision as PrismaMarketReleaseDecisionStatus;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.marketReleaseDecision.findMany({
        where,
        include: DECISION_INCLUDE,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.marketReleaseDecision.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string) {
    const d = await this.prisma.marketReleaseDecision.findUnique({
      where: { id },
      include: DECISION_INCLUDE,
    });
    if (!d) throw new NotFoundException('Décision de mise en marché introuvable');
    return d;
  }

  async findByBatch(productBatchId: string) {
    return this.prisma.marketReleaseDecision.findMany({
      where: { productBatchId },
      include: DECISION_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateMarketReleaseDecisionDto, actorId: string) {
    // ── 1. Vérifier que le lot existe ──────────────────────────────────────
    const batch = await this.prisma.productBatch.findFirst({
      where: { id: dto.productBatchId, deletedAt: null },
    });
    if (!batch) throw new NotFoundException('Lot produit introuvable');

    // ── 2. NON_COMPLIANT → blockingReason obligatoire ──────────────────────
    if (dto.decision === MarketReleaseDecision.NON_COMPLIANT && !dto.blockingReason?.trim()) {
      throw new BadRequestException(
        'Le motif de blocage (blockingReason) est obligatoire pour une décision NON_COMPLIANT.',
      );
    }

    // ── 3. Évaluer la checklist ────────────────────────────────────────────
    const checklist = await this.evaluateChecklist(dto.productBatchId);

    // ── 4. Règle métier critique : COMPLIANT/COMPLIANT_WITH_RESERVATIONS
    //       impossibles si toutes les conditions ne sont pas réunies ─────────
    if (
      [MarketReleaseDecision.COMPLIANT, MarketReleaseDecision.COMPLIANT_WITH_RESERVATIONS].includes(
        dto.decision,
      ) &&
      !checklist.canRelease
    ) {
      const failed = checklist.items
        .filter((i) => !i.pass)
        .map((i) => `· ${i.label} (${i.detail})`)
        .join('\n');
      throw new BadRequestException(
        `Impossible de valider la mise en marché : ${checklist.items.filter((i) => !i.pass).length} condition(s) non remplie(s) :\n${failed}`,
      );
    }

    // ── 5. Désactiver l'éventuelle décision active précédente ──────────────
    await this.prisma.marketReleaseDecision.updateMany({
      where: { productBatchId: dto.productBatchId, isActive: true },
      data: { isActive: false },
    });

    // ── 6. Créer la décision ───────────────────────────────────────────────
    const decision = await this.prisma.marketReleaseDecision.create({
      data: {
        productBatchId: dto.productBatchId,
        decision: dto.decision as unknown as PrismaMarketReleaseDecisionStatus,
        isActive: true,
        decidedAt: new Date(),
        notes: dto.notes,
        blockingReason: dto.blockingReason,
        reservations: dto.reservations ?? [],
        checklist: checklist.items.reduce<Prisma.JsonObject>(
          (acc, i) => ({ ...acc, [i.id]: { pass: i.pass, detail: i.detail } }),
          {},
        ),
        validatedById: actorId,
      },
      include: DECISION_INCLUDE,
    });

    // ── 7. Mettre à jour le statut du lot selon la décision ────────────────
    let newBatchStatus: PrismaProductBatchStatus | null = null;
    if (dto.decision === MarketReleaseDecision.NON_COMPLIANT) {
      newBatchStatus = PrismaProductBatchStatus.BLOCKED;
    } else if (
      dto.decision === MarketReleaseDecision.COMPLIANT ||
      dto.decision === MarketReleaseDecision.COMPLIANT_WITH_RESERVATIONS
    ) {
      // Passe à AVAILABLE seulement depuis READY_FOR_VALIDATION
      if (batch.status === PrismaProductBatchStatus.READY_FOR_VALIDATION) {
        newBatchStatus = PrismaProductBatchStatus.AVAILABLE;
      }
    }

    if (newBatchStatus) {
      await this.prisma.productBatch.update({
        where: { id: dto.productBatchId },
        data: { status: newBatchStatus },
      });
    }

    // ── 8. Audit ───────────────────────────────────────────────────────────
    try {
      await this.auditService.log({
        action: 'MARKET_RELEASE_DECISION_CREATED',
        entityType: EntityType.PRODUCT_BATCH,
        entityId: dto.productBatchId,
        userId: actorId,
        newData: {
          decisionId: decision.id,
          decision: dto.decision,
          batchStatus: newBatchStatus ?? batch.status,
          checklistPass: String(checklist.allPass),
        },
      });
    } catch {
      /* non-bloquant */
    }

    return { decision, checklistSummary: checklist };
  }
}
