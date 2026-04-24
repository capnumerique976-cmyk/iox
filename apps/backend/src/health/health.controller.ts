import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorResult,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import {
  MarketplacePublicationStatus,
  MarketplaceReviewStatus,
  MarketplaceVerificationStatus,
  QuoteRequestStatus,
  SellerProfileStatus,
  UserRole,
} from '@iox/shared';
import { PrismaService } from '../database/prisma.service';
import { Public, Roles } from '../common/decorators/roles.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /** Liveness : le process répond. Utilisé par Kubernetes liveness probe. */
  @Get('live')
  @Public()
  live() {
    return { status: 'ok', uptime: process.uptime() };
  }

  /** Readiness : le service peut servir du trafic (DB + config storage). */
  @Get()
  @Public()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
      () => this.checkStorageConfig(),
    ]);
  }

  /**
   * Alias explicite pour une probe Kubernetes readiness. Exactement la même
   * logique que `GET /health` mais exposée sous un path standard.
   */
  @Get('ready')
  @Public()
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
      () => this.checkStorageConfig(),
    ]);
  }

  /**
   * Check "léger" MinIO : on ne ping pas le bucket (évite la latence réseau),
   * on vérifie juste que la config nécessaire est présente. Signale une
   * mauvaise configuration sans introduire de dépendance critique.
   */
  /**
   * Probe opérationnelle agrégée — snapshot léger pour monitoring / NOC.
   * Restreinte au staff (ADMIN / COORDINATOR / QUALITY_MANAGER).
   *
   * Ne remplace pas `/health` (readiness Kubernetes) : cette route est
   * faite pour alimenter un dashboard d'exploitation interne avec les
   * volumes courants et les items en attente.
   *
   * Toutes les métriques sont des compteurs O(1) côté Postgres (count
   * indexé sur le champ de statut). Acceptable pour un appel toutes les
   * 30–60 s.
   */
  @Get('ops')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.QUALITY_MANAGER)
  @ApiOperation({
    summary: 'Snapshot opérationnel marketplace (staff only)',
    description:
      'Compteurs agrégés pour monitoring : sellers, publications, revues, documents, RFQ.',
  })
  async ops() {
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
      this.prisma.sellerProfile.count({ where: { status: SellerProfileStatus.PENDING_REVIEW } }),
      this.prisma.sellerProfile.count({ where: { status: SellerProfileStatus.APPROVED } }),
      this.prisma.sellerProfile.count({ where: { status: SellerProfileStatus.SUSPENDED } }),
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
      this.prisma.quoteRequest.count({ where: { status: QuoteRequestStatus.NEGOTIATING } }),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      sellers: {
        total: sellerTotal,
        pendingReview: sellerPending,
        approved: sellerApproved,
        suspended: sellerSuspended,
      },
      publications: {
        products: { published: productsPublished, inReview: productsInReview },
        offers: { published: offersPublished, inReview: offersInReview },
      },
      review: {
        pending: reviewPending,
      },
      documents: {
        pending: docsPending,
        rejected: docsRejected,
      },
      rfq: {
        newCount: rfqNew,
        negotiating: rfqNegotiating,
      },
    };
  }

  private async checkStorageConfig(): Promise<HealthIndicatorResult> {
    const endpoint = this.config.get<string>('MINIO_ENDPOINT');
    const bucket = this.config.get<string>('MINIO_BUCKET');
    const configured = Boolean(endpoint && bucket);
    return {
      storage: {
        status: configured ? 'up' : 'down',
        endpoint: endpoint ?? null,
        bucket: bucket ?? null,
      },
    };
  }
}
