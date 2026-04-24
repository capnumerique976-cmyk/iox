import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  MarketplacePublicationStatus,
  MarketplaceReviewStatus,
  MarketplaceVerificationStatus,
  QuoteRequestStatus,
  SellerProfileStatus,
} from '@iox/shared';
import { PrismaService } from '../database/prisma.service';
import { MetricsService } from '../metrics/metrics.service';

/**
 * OpsMetricsService — alimente les gauges `iox_marketplace_*` depuis Prisma.
 *
 * Rôle : rendre scrapables par Prometheus les compteurs déjà exposés en JSON
 * par `/health/ops` (staff) sans forcer le scraper à faire un call authentifié.
 * Les gauges vivent dans le registre interne `MetricsService` → rendues par
 * l'endpoint existant `/api/v1/metrics` (aucun contrat applicatif modifié).
 *
 * Cadence : tick toutes les 60 s via `setInterval`. Chaque tick est une
 * rafale de 13 `count()` Prisma en parallèle (O(1) sur index de statut).
 * Un tick manqué (exception Prisma) est loggué en warn et laisse la dernière
 * valeur en cache — aucune mise à jour partielle.
 *
 * Pas de dépendance `@nestjs/schedule` : le besoin est trop simple pour
 * justifier 2 Mo de deps supplémentaires.
 */
@Injectable()
export class OpsMetricsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OpsMetricsService.name);
  private timer: NodeJS.Timeout | null = null;
  /** Intervalle configurable par env (défaut 60 s, min 10 s). */
  private readonly intervalMs = Math.max(
    10_000,
    Number(process.env.IOX_OPS_METRICS_INTERVAL_MS ?? 60_000),
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: MetricsService,
  ) {}

  onModuleInit() {
    // Pas de tick pendant les tests (jest set NODE_ENV=test) — évite les
    // handles ouverts qui font échouer `--detectOpenHandles`.
    if (process.env.NODE_ENV === 'test') return;

    // Premier tick immédiat (sans bloquer le bootstrap si la DB est lente).
    void this.tick();
    this.timer = setInterval(() => {
      void this.tick();
    }, this.intervalMs);
    // Pas de keep-alive du process sur ce timer.
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Exécutée périodiquement. Publique pour faciliter les tests. */
  async tick(): Promise<void> {
    try {
      const [
        sellerTotal,
        sellerPending,
        sellerApproved,
        sellerSuspended,
        productsPublished,
        productsInReview,
        offersPublished,
        offersInReview,
        reviewPending,
        docsPending,
        docsRejected,
        rfqNew,
        rfqNegotiating,
      ] = await Promise.all([
        this.prisma.sellerProfile.count(),
        this.prisma.sellerProfile.count({
          where: { status: SellerProfileStatus.PENDING_REVIEW },
        }),
        this.prisma.sellerProfile.count({
          where: { status: SellerProfileStatus.APPROVED },
        }),
        this.prisma.sellerProfile.count({
          where: { status: SellerProfileStatus.SUSPENDED },
        }),
        this.prisma.marketplaceProduct.count({
          where: { publicationStatus: MarketplacePublicationStatus.PUBLISHED },
        }),
        this.prisma.marketplaceProduct.count({
          where: { publicationStatus: MarketplacePublicationStatus.IN_REVIEW },
        }),
        this.prisma.marketplaceOffer.count({
          where: { publicationStatus: MarketplacePublicationStatus.PUBLISHED },
        }),
        this.prisma.marketplaceOffer.count({
          where: { publicationStatus: MarketplacePublicationStatus.IN_REVIEW },
        }),
        this.prisma.marketplaceReviewQueue.count({
          where: { status: MarketplaceReviewStatus.PENDING },
        }),
        this.prisma.marketplaceDocument.count({
          where: { verificationStatus: MarketplaceVerificationStatus.PENDING },
        }),
        this.prisma.marketplaceDocument.count({
          where: { verificationStatus: MarketplaceVerificationStatus.REJECTED },
        }),
        this.prisma.quoteRequest.count({ where: { status: QuoteRequestStatus.NEW } }),
        this.prisma.quoteRequest.count({
          where: { status: QuoteRequestStatus.NEGOTIATING },
        }),
      ]);

      this.metrics.setGauge(
        'iox_marketplace_sellers_total',
        sellerTotal,
        {},
        'Nombre total de sellers (tous statuts).',
      );
      this.metrics.setGauge(
        'iox_marketplace_sellers_by_status',
        sellerPending,
        { status: 'pending_review' },
        'Nombre de sellers par statut.',
      );
      this.metrics.setGauge(
        'iox_marketplace_sellers_by_status',
        sellerApproved,
        { status: 'approved' },
      );
      this.metrics.setGauge(
        'iox_marketplace_sellers_by_status',
        sellerSuspended,
        { status: 'suspended' },
      );
      this.metrics.setGauge(
        'iox_marketplace_publications',
        productsPublished,
        { entity: 'product', status: 'published' },
        'Nombre de publications (products, offers) par statut.',
      );
      this.metrics.setGauge(
        'iox_marketplace_publications',
        productsInReview,
        { entity: 'product', status: 'in_review' },
      );
      this.metrics.setGauge(
        'iox_marketplace_publications',
        offersPublished,
        { entity: 'offer', status: 'published' },
      );
      this.metrics.setGauge(
        'iox_marketplace_publications',
        offersInReview,
        { entity: 'offer', status: 'in_review' },
      );
      this.metrics.setGauge(
        'iox_marketplace_review_pending',
        reviewPending,
        {},
        'Items en attente de revue qualité (PENDING).',
      );
      this.metrics.setGauge(
        'iox_marketplace_documents',
        docsPending,
        { verification_status: 'pending' },
        'Documents seller par statut de vérification.',
      );
      this.metrics.setGauge(
        'iox_marketplace_documents',
        docsRejected,
        { verification_status: 'rejected' },
      );
      this.metrics.setGauge(
        'iox_marketplace_rfq',
        rfqNew,
        { status: 'new' },
        'Quote requests par statut.',
      );
      this.metrics.setGauge('iox_marketplace_rfq', rfqNegotiating, {
        status: 'negotiating',
      });

      this.metrics.setGauge(
        'iox_marketplace_metrics_last_refresh_seconds',
        Math.floor(Date.now() / 1000),
        {},
        'Timestamp unix du dernier refresh des gauges marketplace.',
      );
    } catch (err) {
      this.logger.warn(
        `Ops metrics tick failed (keeping previous values): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
