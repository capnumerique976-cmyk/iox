import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    /* Toutes les requêtes en parallèle pour minimiser la latence */
    const [
      // Bénéficiaires
      totalBeneficiaries,
      activeBeneficiaries,

      // Lots entrants par statut
      inboundByStatus,

      // Lots finis par statut
      batchByStatus,

      // Décisions de mise en marché
      decisionsTotal,
      decisionsCompliant,
      decisionsWithReservations,
      decisionsBlocked,

      // Validations étiquetage
      labelsTotal,
      labelsValid,

      // Documents
      docsTotal,

      // Incidents ouverts (non clôturés)
      incidentsOpen,
      incidentsCritical,

      // Produits par statut
      productsByStatus,

      // Distributions
      distributionsByStatus,
      distributionsCompletedLast30,
    ] = await Promise.all([
      this.prisma.beneficiary.count({ where: { deletedAt: null } }),
      this.prisma.beneficiary.count({ where: { deletedAt: null, status: 'IN_PROGRESS' } }),

      this.prisma.inboundBatch.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { id: true },
      }),

      this.prisma.productBatch.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { id: true },
      }),

      this.prisma.marketReleaseDecision.count({ where: { isActive: true } }),
      this.prisma.marketReleaseDecision.count({ where: { isActive: true, decision: 'COMPLIANT' } }),
      this.prisma.marketReleaseDecision.count({
        where: { isActive: true, decision: 'COMPLIANT_WITH_RESERVATIONS' },
      }),
      this.prisma.marketReleaseDecision.count({
        where: { isActive: true, decision: 'NON_COMPLIANT' },
      }),

      this.prisma.labelValidation.count(),
      this.prisma.labelValidation.count({ where: { isValid: true } }),

      this.prisma.document.count({ where: { status: 'ACTIVE' } }),

      this.prisma.incident.count({ where: { deletedAt: null, status: { not: 'CLOSED' } } }),
      this.prisma.incident.count({
        where: { deletedAt: null, status: { not: 'CLOSED' }, severity: 'CRITICAL' },
      }),

      this.prisma.product.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { id: true },
      }),

      this.prisma.distribution.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.distribution.count({
        where: {
          status: 'COMPLETED',
          updatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    // Formatter les groupBy en maps lisibles
    const inbound = Object.fromEntries(inboundByStatus.map((r: any) => [r.status, r._count.id]));
    const batches = Object.fromEntries(batchByStatus.map((r: any) => [r.status, r._count.id]));
    const products = Object.fromEntries(productsByStatus.map((r: any) => [r.status, r._count.id]));
    const distrib = Object.fromEntries(
      distributionsByStatus.map((r: any) => [r.status, r._count.id]),
    );

    const totalBatches = batchByStatus.reduce((s: number, r: any) => s + r._count.id, 0);
    const availableBatches = (batches['AVAILABLE'] ?? 0) + (batches['RESERVED'] ?? 0);

    return {
      beneficiaries: {
        total: totalBeneficiaries,
        active: activeBeneficiaries,
      },
      inboundBatches: {
        total: Object.values(inbound).reduce((s: number, v) => s + (v as number), 0),
        received: inbound['RECEIVED'] ?? 0,
        inControl: inbound['IN_CONTROL'] ?? 0,
        accepted: inbound['ACCEPTED'] ?? 0,
        rejected: inbound['REJECTED'] ?? 0,
      },
      productBatches: {
        total: totalBatches,
        created: batches['CREATED'] ?? 0,
        readyForValidation: batches['READY_FOR_VALIDATION'] ?? 0,
        available: batches['AVAILABLE'] ?? 0,
        reserved: batches['RESERVED'] ?? 0,
        shipped: batches['SHIPPED'] ?? 0,
        blocked: batches['BLOCKED'] ?? 0,
        destroyed: batches['DESTROYED'] ?? 0,
        availableOrReserved: availableBatches,
      },
      marketDecisions: {
        total: decisionsTotal,
        compliant: decisionsCompliant,
        withReservations: decisionsWithReservations,
        blocked: decisionsBlocked,
        complianceRate:
          decisionsTotal > 0
            ? Math.round(((decisionsCompliant + decisionsWithReservations) / decisionsTotal) * 100)
            : 0,
      },
      labelValidations: {
        total: labelsTotal,
        valid: labelsValid,
        invalid: labelsTotal - labelsValid,
        passRate: labelsTotal > 0 ? Math.round((labelsValid / labelsTotal) * 100) : 0,
      },
      documents: {
        totalActive: docsTotal,
      },
      incidents: {
        open: incidentsOpen,
        critical: incidentsCritical,
      },
      products: {
        total: Object.values(products).reduce((s: number, v) => s + (v as number), 0),
        compliant: (products['COMPLIANT'] ?? 0) + (products['COMPLIANT_WITH_RESERVATIONS'] ?? 0),
        blocked: products['BLOCKED'] ?? 0,
        draft: (products['DRAFT'] ?? 0) + (products['IN_PREPARATION'] ?? 0),
      },
      distributions: {
        total: Object.values(distrib).reduce((s: number, v: number) => s + v, 0),
        planned: distrib['PLANNED'] ?? 0,
        inProgress: distrib['IN_PROGRESS'] ?? 0,
        completed: distrib['COMPLETED'] ?? 0,
        cancelled: distrib['CANCELLED'] ?? 0,
        completedLast30Days: distributionsCompletedLast30,
      },
    };
  }

  async getRecentActivity(limit = 10) {
    const [recentBatches, recentDecisions, recentAuditLogs] = await Promise.all([
      // Derniers lots finis créés
      this.prisma.productBatch.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          code: true,
          status: true,
          createdAt: true,
          product: { select: { name: true } },
        },
      }),

      // Dernières décisions de mise en marché
      this.prisma.marketReleaseDecision.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          decision: true,
          decidedAt: true,
          productBatch: { select: { id: true, code: true } },
          validatedBy: { select: { firstName: true, lastName: true } },
        },
      }),

      // Derniers logs d'audit importants
      this.prisma.auditLog.findMany({
        where: {
          action: {
            in: [
              'PRODUCT_BATCH_CREATED',
              'PRODUCT_BATCH_STATUS_CHANGED',
              'MARKET_RELEASE_DECISION_CREATED',
              'LABEL_VALIDATION_CREATED',
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          action: true,
          entityId: true,
          createdAt: true,
          newData: true,
          user: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    return {
      recentBatches,
      recentDecisions,
      recentAuditLogs,
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Alertes action — compteurs d'éléments nécessitant attention        */
  /* ------------------------------------------------------------------ */

  async getAlerts() {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      blockedBatches,
      pendingValidation,
      openIncidents,
      criticalIncidents,
      expiredDocuments,
      expiringSoonDocuments,
      plannedDistributions,
    ] = await Promise.all([
      /* Lots finis bloqués */
      this.prisma.productBatch.count({
        where: { status: 'BLOCKED', deletedAt: null },
      }),
      /* Lots finis en attente de validation */
      this.prisma.productBatch.count({
        where: { status: 'READY_FOR_VALIDATION', deletedAt: null },
      }),
      /* Incidents ouverts */
      this.prisma.incident.count({
        where: { status: 'OPEN' },
      }),
      /* Incidents ouverts critiques ou majeurs */
      this.prisma.incident.count({
        where: { status: 'OPEN', severity: { in: ['CRITICAL', 'MAJOR'] } },
      }),
      /* Documents actifs expirés */
      this.prisma.document.count({
        where: { status: 'ACTIVE', expiresAt: { lt: now } },
      }),
      /* Documents actifs expirant dans 30 jours */
      this.prisma.document.count({
        where: {
          status: 'ACTIVE',
          expiresAt: { gte: now, lte: in30Days },
        },
      }),
      /* Distributions planifiées dont la date est dépassée */
      this.prisma.distribution.count({
        where: {
          status: 'PLANNED',
          distributionDate: { lt: now },
        },
      }),
    ]);

    const total =
      blockedBatches + pendingValidation + openIncidents + expiredDocuments + plannedDistributions;

    return {
      total,
      blockedBatches,
      pendingValidation,
      openIncidents,
      criticalIncidents,
      expiredDocuments,
      expiringSoonDocuments,
      plannedDistributions,
    };
  }
}
