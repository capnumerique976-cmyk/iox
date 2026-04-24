import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateMarketplaceOfferDto,
  UpdateMarketplaceOfferDto,
  QueryMarketplaceOffersDto,
  AttachOfferBatchDto,
  UpdateOfferBatchDto,
  RejectMarketplaceOfferDto,
  SuspendMarketplaceOfferDto,
  SetOfferExportReadinessDto,
} from './dto/marketplace-offer.dto';
import {
  EntityType,
  ExportReadinessStatus,
  MarketplacePriceMode,
  MarketplacePublicationStatus,
  MarketplaceRelatedEntityType,
  MarketplaceReviewStatus,
  MarketplaceReviewType,
  MarketplaceVisibilityScope,
  SellerProfileStatus,
  RequestUser,
} from '@iox/shared';
import type { Prisma } from '@prisma/client';
import { MarketplaceReviewService } from '../marketplace-review/marketplace-review.service';
import { SellerOwnershipService } from '../common/services/seller-ownership.service';

const OFFER_INCLUDE = {
  marketplaceProduct: {
    select: {
      id: true,
      slug: true,
      commercialName: true,
      publicationStatus: true,
      sellerProfileId: true,
    },
  },
  sellerProfile: {
    select: { id: true, slug: true, publicDisplayName: true, status: true },
  },
  _count: { select: { offerBatches: true, quoteRequests: true } },
};

@Injectable()
export class MarketplaceOffersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private reviewQueue: MarketplaceReviewService,
    private ownership: SellerOwnershipService,
  ) {}

  // ─── Lecture ─────────────────────────────────────────────────────────────

  async findAll(query: QueryMarketplaceOffersDto, actor?: RequestUser) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.MarketplaceOfferWhereInput = {};
    if (actor) Object.assign(where, this.ownership.scopeSellerProfileFilter(actor));
    if (query.marketplaceProductId) where.marketplaceProductId = query.marketplaceProductId;
    if (query.sellerProfileId) where.sellerProfileId = query.sellerProfileId;
    if (query.publicationStatus) where.publicationStatus = query.publicationStatus;
    if (query.exportReadinessStatus) where.exportReadinessStatus = query.exportReadinessStatus;
    if (query.visibilityScope) where.visibilityScope = query.visibilityScope;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { shortDescription: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.marketplaceOffer.findMany({
        where,
        include: OFFER_INCLUDE,
        skip,
        take: limit,
        orderBy: [{ featuredRank: 'asc' }, { updatedAt: 'desc' }],
      }),
      this.prisma.marketplaceOffer.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string, actor?: RequestUser) {
    const offer = await this.prisma.marketplaceOffer.findUnique({
      where: { id },
      include: OFFER_INCLUDE,
    });
    if (!offer) throw new NotFoundException('Offre marketplace introuvable');
    if (actor) await this.ownership.assertMarketplaceOfferOwnership(actor, id);
    return offer;
  }

  /** Catalogue public : PUBLISHED + visibility ≠ PRIVATE. */
  async findPublished(query: QueryMarketplaceOffersDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.MarketplaceOfferWhereInput = {
      publicationStatus: MarketplacePublicationStatus.PUBLISHED,
      visibilityScope: { not: MarketplaceVisibilityScope.PRIVATE },
    };
    if (query.marketplaceProductId) where.marketplaceProductId = query.marketplaceProductId;
    if (query.sellerProfileId) where.sellerProfileId = query.sellerProfileId;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.marketplaceOffer.findMany({
        where,
        include: OFFER_INCLUDE,
        skip,
        take: limit,
        orderBy: [{ featuredRank: 'asc' }, { publishedAt: 'desc' }],
      }),
      this.prisma.marketplaceOffer.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────

  async create(dto: CreateMarketplaceOfferDto, actor?: RequestUser) {
    const actorId = actor?.id;
    if (actor && this.ownership.isSeller(actor)) {
      if (!(actor.sellerProfileIds ?? []).includes(dto.sellerProfileId)) {
        throw new ForbiddenException('Profil vendeur hors périmètre');
      }
      await this.ownership.assertMarketplaceProductOwnership(actor, dto.marketplaceProductId);
    }
    const [mp, seller] = await Promise.all([
      this.prisma.marketplaceProduct.findUnique({
        where: { id: dto.marketplaceProductId },
      }),
      this.prisma.sellerProfile.findUnique({ where: { id: dto.sellerProfileId } }),
    ]);
    if (!mp) throw new NotFoundException('Produit marketplace introuvable');
    if (!seller) throw new NotFoundException('Profil vendeur introuvable');

    // Cohérence : l'offre DOIT appartenir au même seller que son produit marketplace
    if (mp.sellerProfileId !== dto.sellerProfileId) {
      throw new BadRequestException(
        'Le sellerProfileId doit correspondre à celui du produit marketplace',
      );
    }

    this.validatePricing(dto.priceMode, dto.unitPrice, dto.currency);

    const offer = await this.prisma.marketplaceOffer.create({
      data: {
        marketplaceProductId: dto.marketplaceProductId,
        sellerProfileId: dto.sellerProfileId,
        title: dto.title,
        shortDescription: dto.shortDescription,
        priceMode: dto.priceMode ?? MarketplacePriceMode.QUOTE_ONLY,
        unitPrice: dto.unitPrice,
        currency: dto.currency,
        moq: dto.moq,
        availableQuantity: dto.availableQuantity,
        availabilityStart: dto.availabilityStart ? new Date(dto.availabilityStart) : undefined,
        availabilityEnd: dto.availabilityEnd ? new Date(dto.availabilityEnd) : undefined,
        leadTimeDays: dto.leadTimeDays,
        incoterm: dto.incoterm,
        departureLocation: dto.departureLocation,
        destinationMarketsJson: dto.destinationMarketsJson as Prisma.InputJsonValue,
        visibilityScope: dto.visibilityScope ?? MarketplaceVisibilityScope.BUYERS_ONLY,
        exportReadinessStatus: ExportReadinessStatus.PENDING_QUALITY_REVIEW,
        publicationStatus: MarketplacePublicationStatus.DRAFT,
        createdById: actorId,
        updatedById: actorId,
      },
      include: OFFER_INCLUDE,
    });

    await this.auditService.log({
      action: 'MARKETPLACE_OFFER_CREATED',
      entityType: EntityType.MARKETPLACE_OFFER,
      entityId: offer.id,
      userId: actorId,
      newData: {
        marketplaceProductId: offer.marketplaceProductId,
        sellerProfileId: offer.sellerProfileId,
        priceMode: offer.priceMode,
      },
    });

    return offer;
  }

  async update(id: string, dto: UpdateMarketplaceOfferDto, actor?: RequestUser) {
    const actorId = actor?.id;
    if (actor) await this.ownership.assertMarketplaceOfferOwnership(actor, id);
    const existing = await this.prisma.marketplaceOffer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Offre marketplace introuvable');

    // Validation pricing avec valeurs mergées
    const priceMode = (dto.priceMode ?? existing.priceMode) as MarketplacePriceMode;
    const unitPrice = dto.unitPrice ?? (existing.unitPrice as unknown as number | null);
    const currency = dto.currency ?? existing.currency;
    this.validatePricing(priceMode, unitPrice, currency);

    // Fields métiers impactant vitrine : remettre IN_REVIEW si APPROVED/PUBLISHED
    const vitrine: (keyof UpdateMarketplaceOfferDto)[] = [
      'title',
      'shortDescription',
      'priceMode',
      'unitPrice',
      'currency',
      'moq',
      'incoterm',
      'departureLocation',
      'destinationMarketsJson',
      'visibilityScope',
    ];
    const touchesVitrine = vitrine.some((f) => dto[f] !== undefined);
    const requiresRecheck =
      (existing.publicationStatus === MarketplacePublicationStatus.APPROVED ||
        existing.publicationStatus === MarketplacePublicationStatus.PUBLISHED) &&
      touchesVitrine;

    const updated = await this.prisma.marketplaceOffer.update({
      where: { id },
      data: {
        ...dto,
        availabilityStart: dto.availabilityStart ? new Date(dto.availabilityStart) : undefined,
        availabilityEnd: dto.availabilityEnd ? new Date(dto.availabilityEnd) : undefined,
        destinationMarketsJson: dto.destinationMarketsJson as Prisma.InputJsonValue | undefined,
        ...(requiresRecheck ? { publicationStatus: MarketplacePublicationStatus.IN_REVIEW } : {}),
        updatedById: actorId,
      },
      include: OFFER_INCLUDE,
    });

    await this.auditService.log({
      action: 'MARKETPLACE_OFFER_UPDATED',
      entityType: EntityType.MARKETPLACE_OFFER,
      entityId: id,
      userId: actorId,
      previousData: { publicationStatus: existing.publicationStatus },
      newData: { publicationStatus: updated.publicationStatus },
    });

    return updated;
  }

  // ─── Lots rattachés (MarketplaceOfferBatch) ──────────────────────────────

  async attachBatch(offerId: string, dto: AttachOfferBatchDto, actor?: RequestUser) {
    const actorId = actor?.id;
    if (actor) await this.ownership.assertMarketplaceOfferOwnership(actor, offerId);
    const [offer, batch, clash] = await Promise.all([
      this.prisma.marketplaceOffer.findUnique({ where: { id: offerId } }),
      this.prisma.productBatch.findFirst({
        where: { id: dto.productBatchId, deletedAt: null },
      }),
      this.prisma.marketplaceOfferBatch.findUnique({
        where: {
          marketplaceOfferId_productBatchId: {
            marketplaceOfferId: offerId,
            productBatchId: dto.productBatchId,
          },
        },
      }),
    ]);

    if (!offer) throw new NotFoundException('Offre introuvable');
    if (!batch) throw new NotFoundException('Lot produit introuvable');
    if (clash) throw new ConflictException('Ce lot est déjà rattaché à cette offre');

    const link = await this.prisma.marketplaceOfferBatch.create({
      data: {
        marketplaceOfferId: offerId,
        productBatchId: dto.productBatchId,
        quantityAvailable: dto.quantityAvailable,
        exportEligible: dto.exportEligible ?? true,
        qualityStatus: dto.qualityStatus,
        traceabilityStatus: dto.traceabilityStatus,
        notes: dto.notes,
      },
    });

    await this.auditService.log({
      action: 'MARKETPLACE_OFFER_BATCH_ATTACHED',
      entityType: EntityType.MARKETPLACE_OFFER,
      entityId: offerId,
      userId: actorId,
      newData: {
        productBatchId: dto.productBatchId,
        quantityAvailable: dto.quantityAvailable,
        exportEligible: link.exportEligible,
      },
    });

    return link;
  }

  async updateBatch(linkId: string, dto: UpdateOfferBatchDto, actor?: RequestUser) {
    const actorId = actor?.id;
    if (actor) await this.ownership.assertOfferBatchOwnership(actor, linkId);
    const existing = await this.prisma.marketplaceOfferBatch.findUnique({ where: { id: linkId } });
    if (!existing) throw new NotFoundException('Lien offre/lot introuvable');

    const updated = await this.prisma.marketplaceOfferBatch.update({
      where: { id: linkId },
      data: {
        quantityAvailable: dto.quantityAvailable,
        quantityReserved: dto.quantityReserved,
        exportEligible: dto.exportEligible,
        qualityStatus: dto.qualityStatus,
        traceabilityStatus: dto.traceabilityStatus,
        notes: dto.notes,
      },
    });

    await this.auditService.log({
      action: 'MARKETPLACE_OFFER_BATCH_UPDATED',
      entityType: EntityType.MARKETPLACE_OFFER,
      entityId: existing.marketplaceOfferId,
      userId: actorId,
      previousData: {
        quantityAvailable: existing.quantityAvailable,
        exportEligible: existing.exportEligible,
      },
      newData: {
        quantityAvailable: updated.quantityAvailable,
        exportEligible: updated.exportEligible,
      },
    });

    return updated;
  }

  async detachBatch(linkId: string, actor?: RequestUser) {
    const actorId = actor?.id;
    if (actor) await this.ownership.assertOfferBatchOwnership(actor, linkId);
    const existing = await this.prisma.marketplaceOfferBatch.findUnique({ where: { id: linkId } });
    if (!existing) throw new NotFoundException('Lien offre/lot introuvable');

    await this.prisma.marketplaceOfferBatch.delete({ where: { id: linkId } });

    await this.auditService.log({
      action: 'MARKETPLACE_OFFER_BATCH_DETACHED',
      entityType: EntityType.MARKETPLACE_OFFER,
      entityId: existing.marketplaceOfferId,
      userId: actorId,
      previousData: {
        productBatchId: existing.productBatchId,
      },
    });

    return { id: linkId, deleted: true };
  }

  // ─── Workflow ────────────────────────────────────────────────────────────

  async submitForReview(id: string, actor?: RequestUser) {
    const actorId = actor?.id;
    if (actor) await this.ownership.assertMarketplaceOfferOwnership(actor, id);
    const existing = await this.prisma.marketplaceOffer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Offre marketplace introuvable');

    if (
      existing.publicationStatus !== MarketplacePublicationStatus.DRAFT &&
      existing.publicationStatus !== MarketplacePublicationStatus.REJECTED
    ) {
      throw new BadRequestException(
        `Impossible de soumettre : statut ${existing.publicationStatus}`,
      );
    }

    this.validatePricing(
      existing.priceMode as MarketplacePriceMode,
      existing.unitPrice as unknown as number | null,
      existing.currency,
    );

    const updated = await this.prisma.marketplaceOffer.update({
      where: { id },
      data: {
        publicationStatus: MarketplacePublicationStatus.IN_REVIEW,
        submittedAt: new Date(),
        rejectionReason: null,
        updatedById: actorId,
      },
      include: OFFER_INCLUDE,
    });

    await this.auditService.log({
      action: 'MARKETPLACE_OFFER_SUBMITTED',
      entityType: EntityType.MARKETPLACE_OFFER,
      entityId: id,
      userId: actorId,
      previousData: { publicationStatus: existing.publicationStatus },
      newData: { publicationStatus: updated.publicationStatus },
    });

    await this.reviewQueue.enqueue(
      {
        entityType: MarketplaceRelatedEntityType.MARKETPLACE_OFFER,
        entityId: id,
        reviewType: MarketplaceReviewType.PUBLICATION,
        reason: 'Soumission offre marketplace pour revue',
      },
      actorId,
    );

    return updated;
  }

  async approve(id: string, actorId?: string) {
    const existing = await this.prisma.marketplaceOffer.findUnique({
      where: { id },
      include: {
        sellerProfile: { select: { status: true } },
        marketplaceProduct: { select: { publicationStatus: true } },
      },
    });
    if (!existing) throw new NotFoundException('Offre marketplace introuvable');

    if (existing.publicationStatus !== MarketplacePublicationStatus.IN_REVIEW) {
      throw new BadRequestException(
        `Impossible d'approuver : statut ${existing.publicationStatus}`,
      );
    }
    if (existing.sellerProfile.status !== SellerProfileStatus.APPROVED) {
      throw new BadRequestException('Profil vendeur non approuvé');
    }

    const mpStatus = existing.marketplaceProduct.publicationStatus;
    if (
      mpStatus !== MarketplacePublicationStatus.APPROVED &&
      mpStatus !== MarketplacePublicationStatus.PUBLISHED
    ) {
      throw new BadRequestException('Le produit marketplace doit être APPROVED ou PUBLISHED');
    }

    const updated = await this.prisma.marketplaceOffer.update({
      where: { id },
      data: {
        publicationStatus: MarketplacePublicationStatus.APPROVED,
        approvedAt: new Date(),
        rejectionReason: null,
        updatedById: actorId,
      },
      include: OFFER_INCLUDE,
    });

    await this.auditService.log({
      action: 'MARKETPLACE_OFFER_APPROVED',
      entityType: EntityType.MARKETPLACE_OFFER,
      entityId: id,
      userId: actorId,
      previousData: { publicationStatus: existing.publicationStatus },
      newData: { publicationStatus: updated.publicationStatus },
    });

    await this.reviewQueue.resolvePendingForEntity(
      MarketplaceRelatedEntityType.MARKETPLACE_OFFER,
      id,
      MarketplaceReviewType.PUBLICATION,
      MarketplaceReviewStatus.APPROVED,
      'Offre approuvée',
      actorId,
    );

    return updated;
  }

  async reject(id: string, dto: RejectMarketplaceOfferDto, actorId?: string) {
    const existing = await this.prisma.marketplaceOffer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Offre marketplace introuvable');

    if (existing.publicationStatus !== MarketplacePublicationStatus.IN_REVIEW) {
      throw new BadRequestException(`Impossible de rejeter : statut ${existing.publicationStatus}`);
    }

    const updated = await this.prisma.marketplaceOffer.update({
      where: { id },
      data: {
        publicationStatus: MarketplacePublicationStatus.REJECTED,
        rejectionReason: dto.reason,
        updatedById: actorId,
      },
      include: OFFER_INCLUDE,
    });

    await this.auditService.log({
      action: 'MARKETPLACE_OFFER_REJECTED',
      entityType: EntityType.MARKETPLACE_OFFER,
      entityId: id,
      userId: actorId,
      previousData: { publicationStatus: existing.publicationStatus },
      newData: { publicationStatus: updated.publicationStatus, reason: dto.reason },
    });

    await this.reviewQueue.resolvePendingForEntity(
      MarketplaceRelatedEntityType.MARKETPLACE_OFFER,
      id,
      MarketplaceReviewType.PUBLICATION,
      MarketplaceReviewStatus.REJECTED,
      dto.reason,
      actorId,
    );

    return updated;
  }

  async publish(id: string, actorId?: string) {
    const existing = await this.prisma.marketplaceOffer.findUnique({
      where: { id },
      include: {
        sellerProfile: { select: { status: true } },
        marketplaceProduct: { select: { publicationStatus: true } },
      },
    });
    if (!existing) throw new NotFoundException('Offre marketplace introuvable');

    if (existing.publicationStatus !== MarketplacePublicationStatus.APPROVED) {
      throw new BadRequestException(`Impossible de publier : statut ${existing.publicationStatus}`);
    }

    // Gate 1 — seller APPROVED
    if (existing.sellerProfile.status !== SellerProfileStatus.APPROVED) {
      throw new BadRequestException('Profil vendeur non approuvé');
    }

    // Gate 2 — produit marketplace APPROVED ou PUBLISHED
    const mpStatus = existing.marketplaceProduct.publicationStatus;
    if (
      mpStatus !== MarketplacePublicationStatus.APPROVED &&
      mpStatus !== MarketplacePublicationStatus.PUBLISHED
    ) {
      throw new BadRequestException("Le produit marketplace associé n'est pas APPROVED/PUBLISHED");
    }

    // Gate 3 — au moins un lot rattaché exportEligible
    const eligibleBatches = await this.prisma.marketplaceOfferBatch.count({
      where: { marketplaceOfferId: id, exportEligible: true },
    });
    if (eligibleBatches === 0) {
      throw new BadRequestException(
        'Impossible de publier : aucun lot rattaché marqué exportEligible',
      );
    }

    // Gate 4 — readiness compatible
    if (
      existing.exportReadinessStatus === ExportReadinessStatus.NOT_ELIGIBLE ||
      existing.exportReadinessStatus === ExportReadinessStatus.PENDING_QUALITY_REVIEW ||
      existing.exportReadinessStatus === ExportReadinessStatus.PENDING_DOCUMENTS
    ) {
      throw new BadRequestException(
        `Impossible de publier : export readiness = ${existing.exportReadinessStatus}`,
      );
    }

    const updated = await this.prisma.marketplaceOffer.update({
      where: { id },
      data: {
        publicationStatus: MarketplacePublicationStatus.PUBLISHED,
        publishedAt: new Date(),
        suspendedAt: null,
        updatedById: actorId,
      },
      include: OFFER_INCLUDE,
    });

    await this.auditService.log({
      action: 'MARKETPLACE_OFFER_PUBLISHED',
      entityType: EntityType.MARKETPLACE_OFFER,
      entityId: id,
      userId: actorId,
      previousData: { publicationStatus: existing.publicationStatus },
      newData: { publicationStatus: updated.publicationStatus },
    });

    return updated;
  }

  async suspend(id: string, dto: SuspendMarketplaceOfferDto, actorId?: string) {
    const existing = await this.prisma.marketplaceOffer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Offre marketplace introuvable');

    if (existing.publicationStatus !== MarketplacePublicationStatus.PUBLISHED) {
      throw new BadRequestException(
        `Impossible de suspendre : statut ${existing.publicationStatus}`,
      );
    }

    const updated = await this.prisma.marketplaceOffer.update({
      where: { id },
      data: {
        publicationStatus: MarketplacePublicationStatus.SUSPENDED,
        suspendedAt: new Date(),
        rejectionReason: dto.reason,
        updatedById: actorId,
      },
      include: OFFER_INCLUDE,
    });

    await this.auditService.log({
      action: 'MARKETPLACE_OFFER_SUSPENDED',
      entityType: EntityType.MARKETPLACE_OFFER,
      entityId: id,
      userId: actorId,
      previousData: { publicationStatus: existing.publicationStatus },
      newData: { publicationStatus: updated.publicationStatus, reason: dto.reason },
    });

    return updated;
  }

  async archive(id: string, actor?: RequestUser) {
    const actorId = actor?.id;
    if (actor) await this.ownership.assertMarketplaceOfferOwnership(actor, id);
    const existing = await this.prisma.marketplaceOffer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Offre marketplace introuvable');

    if (existing.publicationStatus === MarketplacePublicationStatus.ARCHIVED) {
      return existing;
    }

    const updated = await this.prisma.marketplaceOffer.update({
      where: { id },
      data: {
        publicationStatus: MarketplacePublicationStatus.ARCHIVED,
        updatedById: actorId,
      },
      include: OFFER_INCLUDE,
    });

    await this.auditService.log({
      action: 'MARKETPLACE_OFFER_ARCHIVED',
      entityType: EntityType.MARKETPLACE_OFFER,
      entityId: id,
      userId: actorId,
      previousData: { publicationStatus: existing.publicationStatus },
      newData: { publicationStatus: updated.publicationStatus },
    });

    return updated;
  }

  async setExportReadiness(id: string, dto: SetOfferExportReadinessDto, actorId?: string) {
    const existing = await this.prisma.marketplaceOffer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Offre marketplace introuvable');

    const updated = await this.prisma.marketplaceOffer.update({
      where: { id },
      data: {
        exportReadinessStatus: dto.status,
        updatedById: actorId,
      },
      include: OFFER_INCLUDE,
    });

    await this.auditService.log({
      action: 'MARKETPLACE_OFFER_READINESS_CHANGED',
      entityType: EntityType.MARKETPLACE_OFFER,
      entityId: id,
      userId: actorId,
      previousData: { exportReadinessStatus: existing.exportReadinessStatus },
      newData: { exportReadinessStatus: updated.exportReadinessStatus },
    });

    return updated;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private validatePricing(
    priceMode: MarketplacePriceMode,
    unitPrice: number | null | undefined | Prisma.Decimal,
    currency: string | null | undefined,
  ) {
    if (priceMode === MarketplacePriceMode.FIXED || priceMode === MarketplacePriceMode.FROM_PRICE) {
      const hasPrice = unitPrice !== null && unitPrice !== undefined && Number(unitPrice) > 0;
      if (!hasPrice) {
        throw new BadRequestException(`priceMode=${priceMode} exige un unitPrice > 0`);
      }
      if (!currency) {
        throw new BadRequestException(`priceMode=${priceMode} exige une currency`);
      }
    }
  }
}
