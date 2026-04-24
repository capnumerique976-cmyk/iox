import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateMarketplaceProductDto,
  UpdateMarketplaceProductDto,
  QueryMarketplaceProductsDto,
  RejectMarketplaceProductDto,
  SuspendMarketplaceProductDto,
  SetExportReadinessDto,
} from './dto/marketplace-product.dto';
import {
  EntityType,
  ExportReadinessStatus,
  MarketplacePublicationStatus,
  MarketplaceRelatedEntityType,
  MarketplaceReviewStatus,
  MarketplaceReviewType,
  MediaAssetRole,
  MediaModerationStatus,
  SellerProfileStatus,
  RequestUser,
} from '@iox/shared';
import { MarketplaceReviewService } from '../marketplace-review/marketplace-review.service';
import { SellerOwnershipService } from '../common/services/seller-ownership.service';
import type { Prisma } from '@prisma/client';

const MP_INCLUDE = {
  sellerProfile: {
    select: { id: true, slug: true, publicDisplayName: true, status: true },
  },
  product: { select: { id: true, code: true, name: true } },
  category: { select: { id: true, slug: true, nameFr: true } },
  _count: { select: { offers: true } },
};

/**
 * Champs critiques pour passer DRAFT → IN_REVIEW.
 * Le score de complétude est un proxy simple : % de champs "recommandés" remplis.
 */
const REQUIRED_FOR_REVIEW: Array<keyof Prisma.MarketplaceProductUncheckedUpdateInput> = [
  'commercialName',
  'slug',
  'originCountry',
  'descriptionShort',
  'packagingDescription',
  'storageConditions',
];

const SCORED_FIELDS: Array<keyof Prisma.MarketplaceProductUncheckedCreateInput> = [
  'commercialName',
  'regulatoryName',
  'subtitle',
  'originCountry',
  'originRegion',
  'varietySpecies',
  'productionMethod',
  'descriptionShort',
  'descriptionLong',
  'usageTips',
  'packagingDescription',
  'storageConditions',
  'shelfLifeInfo',
  'allergenInfo',
  'nutritionInfoJson',
  'defaultUnit',
  'minimumOrderQuantity',
];

@Injectable()
export class MarketplaceProductsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private reviewQueue: MarketplaceReviewService,
    private ownership: SellerOwnershipService,
  ) {}

  // ─── Lecture ─────────────────────────────────────────────────────────────

  async findAll(query: QueryMarketplaceProductsDto, actor?: RequestUser) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.MarketplaceProductWhereInput = {};
    if (actor) Object.assign(where, this.ownership.scopeSellerProfileFilter(actor));
    if (query.sellerProfileId) where.sellerProfileId = query.sellerProfileId;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.originCountry) where.originCountry = query.originCountry;
    if (query.publicationStatus) where.publicationStatus = query.publicationStatus;
    if (query.exportReadinessStatus) where.exportReadinessStatus = query.exportReadinessStatus;
    if (query.search) {
      where.OR = [
        { commercialName: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
        { regulatoryName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.marketplaceProduct.findMany({
        where,
        include: MP_INCLUDE,
        skip,
        take: limit,
        orderBy: [{ updatedAt: 'desc' }],
      }),
      this.prisma.marketplaceProduct.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string, actor?: RequestUser) {
    const mp = await this.prisma.marketplaceProduct.findUnique({
      where: { id },
      include: MP_INCLUDE,
    });
    if (!mp) throw new NotFoundException('Produit marketplace introuvable');
    if (actor) await this.ownership.assertMarketplaceProductOwnership(actor, id);
    return mp;
  }

  async findBySlug(slug: string, actor?: RequestUser) {
    const mp = await this.prisma.marketplaceProduct.findUnique({
      where: { slug },
      include: MP_INCLUDE,
    });
    if (!mp) throw new NotFoundException('Produit marketplace introuvable');
    if (actor) await this.ownership.assertMarketplaceProductOwnership(actor, mp.id);
    return mp;
  }

  /** Catalogue public : uniquement PUBLISHED. */
  async findPublished(query: QueryMarketplaceProductsDto) {
    return this.findAll({
      ...query,
      publicationStatus: MarketplacePublicationStatus.PUBLISHED,
    });
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────

  async create(dto: CreateMarketplaceProductDto, actor?: RequestUser) {
    const actorId = actor?.id;
    if (actor && this.ownership.isSeller(actor)) {
      if (!(actor.sellerProfileIds ?? []).includes(dto.sellerProfileId)) {
        throw new ForbiddenException('Profil vendeur hors périmètre');
      }
    }
    const [product, seller, slugClash] = await Promise.all([
      this.prisma.product.findFirst({ where: { id: dto.productId, deletedAt: null } }),
      this.prisma.sellerProfile.findUnique({ where: { id: dto.sellerProfileId } }),
      this.prisma.marketplaceProduct.findUnique({ where: { slug: dto.slug } }),
    ]);

    if (!product) throw new NotFoundException('Product IOX introuvable');
    if (!seller) throw new NotFoundException('Profil vendeur introuvable');
    if (slugClash) throw new ConflictException('Ce slug marketplace est déjà utilisé');

    if (dto.categoryId) {
      const cat = await this.prisma.marketplaceCategory.findUnique({
        where: { id: dto.categoryId },
      });
      if (!cat) throw new NotFoundException('Catégorie introuvable');
    }

    const completionScore = this.computeCompletionScore(dto as unknown as Record<string, unknown>);

    const mp = await this.prisma.marketplaceProduct.create({
      data: {
        productId: dto.productId,
        sellerProfileId: dto.sellerProfileId,
        categoryId: dto.categoryId,
        commercialName: dto.commercialName,
        regulatoryName: dto.regulatoryName,
        subtitle: dto.subtitle,
        slug: dto.slug,
        originCountry: dto.originCountry,
        originRegion: dto.originRegion,
        varietySpecies: dto.varietySpecies,
        productionMethod: dto.productionMethod,
        descriptionShort: dto.descriptionShort,
        descriptionLong: dto.descriptionLong,
        usageTips: dto.usageTips,
        packagingDescription: dto.packagingDescription,
        storageConditions: dto.storageConditions,
        shelfLifeInfo: dto.shelfLifeInfo,
        allergenInfo: dto.allergenInfo,
        nutritionInfoJson: dto.nutritionInfoJson as Prisma.InputJsonValue,
        defaultUnit: dto.defaultUnit,
        minimumOrderQuantity: dto.minimumOrderQuantity,
        completionScore,
        publicationStatus: MarketplacePublicationStatus.DRAFT,
        exportReadinessStatus: ExportReadinessStatus.PENDING_QUALITY_REVIEW,
        createdById: actorId,
        updatedById: actorId,
      },
      include: MP_INCLUDE,
    });

    await this.auditService.log({
      action: 'MARKETPLACE_PRODUCT_CREATED',
      entityType: EntityType.MARKETPLACE_PRODUCT,
      entityId: mp.id,
      userId: actorId,
      newData: {
        slug: mp.slug,
        sellerProfileId: mp.sellerProfileId,
        completionScore,
      },
    });

    return mp;
  }

  async update(id: string, dto: UpdateMarketplaceProductDto, actor?: RequestUser) {
    const actorId = actor?.id;
    if (actor) await this.ownership.assertMarketplaceProductOwnership(actor, id);
    const existing = await this.prisma.marketplaceProduct.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Produit marketplace introuvable');

    if (dto.slug && dto.slug !== existing.slug) {
      const clash = await this.prisma.marketplaceProduct.findUnique({ where: { slug: dto.slug } });
      if (clash) throw new ConflictException('Ce slug est déjà utilisé');
    }

    if (dto.categoryId) {
      const cat = await this.prisma.marketplaceCategory.findUnique({
        where: { id: dto.categoryId },
      });
      if (!cat) throw new NotFoundException('Catégorie introuvable');
    }

    // Les champs qui impactent la vitrine : si produit APPROVED ou PUBLISHED,
    // toute modif de vitrine repasse en IN_REVIEW (garantit la modération).
    const vitrine: (keyof UpdateMarketplaceProductDto)[] = [
      'commercialName',
      'regulatoryName',
      'subtitle',
      'descriptionShort',
      'descriptionLong',
      'usageTips',
      'packagingDescription',
      'storageConditions',
      'shelfLifeInfo',
      'allergenInfo',
      'nutritionInfoJson',
    ];
    const touchesVitrine = vitrine.some((f) => dto[f] !== undefined);
    const requiresRecheck =
      (existing.publicationStatus === MarketplacePublicationStatus.APPROVED ||
        existing.publicationStatus === MarketplacePublicationStatus.PUBLISHED) &&
      touchesVitrine;

    // Recalcul du score de complétude avec la projection mergée
    const merged = { ...existing, ...dto };
    const completionScore = this.computeCompletionScore(merged as Record<string, unknown>);

    const updated = await this.prisma.marketplaceProduct.update({
      where: { id },
      data: {
        ...dto,
        nutritionInfoJson: dto.nutritionInfoJson as Prisma.InputJsonValue | undefined,
        completionScore,
        ...(requiresRecheck ? { publicationStatus: MarketplacePublicationStatus.IN_REVIEW } : {}),
        updatedById: actorId,
      },
      include: MP_INCLUDE,
    });

    await this.auditService.log({
      action: 'MARKETPLACE_PRODUCT_UPDATED',
      entityType: EntityType.MARKETPLACE_PRODUCT,
      entityId: id,
      userId: actorId,
      previousData: {
        publicationStatus: existing.publicationStatus,
        completionScore: existing.completionScore,
      },
      newData: {
        publicationStatus: updated.publicationStatus,
        completionScore: updated.completionScore,
      },
    });

    return updated;
  }

  // ─── Workflow ────────────────────────────────────────────────────────────

  async submitForReview(id: string, actor?: RequestUser) {
    const actorId = actor?.id;
    if (actor) await this.ownership.assertMarketplaceProductOwnership(actor, id);
    const existing = await this.prisma.marketplaceProduct.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Produit marketplace introuvable');

    if (
      existing.publicationStatus !== MarketplacePublicationStatus.DRAFT &&
      existing.publicationStatus !== MarketplacePublicationStatus.REJECTED
    ) {
      throw new BadRequestException(
        `Impossible de soumettre : statut ${existing.publicationStatus}`,
      );
    }

    for (const f of REQUIRED_FOR_REVIEW) {
      const value = (existing as Record<string, unknown>)[f as string];
      if (value === null || value === undefined || value === '') {
        throw new BadRequestException(`Champ obligatoire manquant : ${String(f)}`);
      }
    }

    const updated = await this.prisma.marketplaceProduct.update({
      where: { id },
      data: {
        publicationStatus: MarketplacePublicationStatus.IN_REVIEW,
        submittedAt: new Date(),
        rejectionReason: null,
        updatedById: actorId,
      },
      include: MP_INCLUDE,
    });

    await this.auditService.log({
      action: 'MARKETPLACE_PRODUCT_SUBMITTED',
      entityType: EntityType.MARKETPLACE_PRODUCT,
      entityId: id,
      userId: actorId,
      previousData: { publicationStatus: existing.publicationStatus },
      newData: { publicationStatus: updated.publicationStatus },
    });

    await this.reviewQueue.enqueue(
      {
        entityType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
        entityId: id,
        reviewType: MarketplaceReviewType.PUBLICATION,
        reason: 'Soumission produit marketplace pour revue',
      },
      actorId,
    );

    return updated;
  }

  async approve(id: string, actorId?: string) {
    const existing = await this.prisma.marketplaceProduct.findUnique({
      where: { id },
      include: { sellerProfile: { select: { status: true } } },
    });
    if (!existing) throw new NotFoundException('Produit marketplace introuvable');

    if (existing.publicationStatus !== MarketplacePublicationStatus.IN_REVIEW) {
      throw new BadRequestException(
        `Impossible d'approuver : statut ${existing.publicationStatus}`,
      );
    }

    if (existing.sellerProfile.status !== SellerProfileStatus.APPROVED) {
      throw new BadRequestException(
        "Impossible d'approuver : le profil vendeur n'est pas APPROVED",
      );
    }

    const updated = await this.prisma.marketplaceProduct.update({
      where: { id },
      data: {
        publicationStatus: MarketplacePublicationStatus.APPROVED,
        approvedAt: new Date(),
        rejectionReason: null,
        updatedById: actorId,
      },
      include: MP_INCLUDE,
    });

    await this.auditService.log({
      action: 'MARKETPLACE_PRODUCT_APPROVED',
      entityType: EntityType.MARKETPLACE_PRODUCT,
      entityId: id,
      userId: actorId,
      previousData: { publicationStatus: existing.publicationStatus },
      newData: { publicationStatus: updated.publicationStatus },
    });

    await this.reviewQueue.resolvePendingForEntity(
      MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
      id,
      MarketplaceReviewType.PUBLICATION,
      MarketplaceReviewStatus.APPROVED,
      'Produit marketplace approuvé',
      actorId,
    );

    return updated;
  }

  async reject(id: string, dto: RejectMarketplaceProductDto, actorId?: string) {
    const existing = await this.prisma.marketplaceProduct.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Produit marketplace introuvable');

    if (existing.publicationStatus !== MarketplacePublicationStatus.IN_REVIEW) {
      throw new BadRequestException(`Impossible de rejeter : statut ${existing.publicationStatus}`);
    }

    const updated = await this.prisma.marketplaceProduct.update({
      where: { id },
      data: {
        publicationStatus: MarketplacePublicationStatus.REJECTED,
        rejectionReason: dto.reason,
        updatedById: actorId,
      },
      include: MP_INCLUDE,
    });

    await this.auditService.log({
      action: 'MARKETPLACE_PRODUCT_REJECTED',
      entityType: EntityType.MARKETPLACE_PRODUCT,
      entityId: id,
      userId: actorId,
      previousData: { publicationStatus: existing.publicationStatus },
      newData: { publicationStatus: updated.publicationStatus, reason: dto.reason },
    });

    await this.reviewQueue.resolvePendingForEntity(
      MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
      id,
      MarketplaceReviewType.PUBLICATION,
      MarketplaceReviewStatus.REJECTED,
      dto.reason,
      actorId,
    );

    return updated;
  }

  async publish(id: string, actorId?: string) {
    const existing = await this.prisma.marketplaceProduct.findUnique({
      where: { id },
      include: { sellerProfile: { select: { status: true } } },
    });
    if (!existing) throw new NotFoundException('Produit marketplace introuvable');

    if (existing.publicationStatus !== MarketplacePublicationStatus.APPROVED) {
      throw new BadRequestException(`Impossible de publier : statut ${existing.publicationStatus}`);
    }

    // Gate 1 — seller APPROVED
    if (existing.sellerProfile.status !== SellerProfileStatus.APPROVED) {
      throw new BadRequestException("Impossible de publier : le profil vendeur n'est pas APPROVED");
    }

    // Gate 2 — image PRIMARY APPROVED
    const primaryCount = await this.prisma.mediaAsset.count({
      where: {
        relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
        relatedId: id,
        role: MediaAssetRole.PRIMARY,
        moderationStatus: MediaModerationStatus.APPROVED,
      },
    });
    if (primaryCount === 0) {
      throw new BadRequestException(
        'Impossible de publier : aucune image PRIMARY approuvée sur le produit',
      );
    }

    // Gate 3 — readiness export compatible
    if (
      existing.exportReadinessStatus === ExportReadinessStatus.NOT_ELIGIBLE ||
      existing.exportReadinessStatus === ExportReadinessStatus.PENDING_QUALITY_REVIEW ||
      existing.exportReadinessStatus === ExportReadinessStatus.PENDING_DOCUMENTS
    ) {
      throw new BadRequestException(
        `Impossible de publier : export readiness = ${existing.exportReadinessStatus}`,
      );
    }

    const updated = await this.prisma.marketplaceProduct.update({
      where: { id },
      data: {
        publicationStatus: MarketplacePublicationStatus.PUBLISHED,
        publishedAt: new Date(),
        updatedById: actorId,
      },
      include: MP_INCLUDE,
    });

    await this.auditService.log({
      action: 'MARKETPLACE_PRODUCT_PUBLISHED',
      entityType: EntityType.MARKETPLACE_PRODUCT,
      entityId: id,
      userId: actorId,
      previousData: { publicationStatus: existing.publicationStatus },
      newData: { publicationStatus: updated.publicationStatus },
    });

    return updated;
  }

  async suspend(id: string, dto: SuspendMarketplaceProductDto, actorId?: string) {
    const existing = await this.prisma.marketplaceProduct.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Produit marketplace introuvable');

    if (existing.publicationStatus !== MarketplacePublicationStatus.PUBLISHED) {
      throw new BadRequestException(
        `Impossible de suspendre : statut ${existing.publicationStatus}`,
      );
    }

    const updated = await this.prisma.marketplaceProduct.update({
      where: { id },
      data: {
        publicationStatus: MarketplacePublicationStatus.SUSPENDED,
        rejectionReason: dto.reason,
        updatedById: actorId,
      },
      include: MP_INCLUDE,
    });

    await this.auditService.log({
      action: 'MARKETPLACE_PRODUCT_SUSPENDED',
      entityType: EntityType.MARKETPLACE_PRODUCT,
      entityId: id,
      userId: actorId,
      previousData: { publicationStatus: existing.publicationStatus },
      newData: { publicationStatus: updated.publicationStatus, reason: dto.reason },
    });

    return updated;
  }

  async archive(id: string, actor?: RequestUser) {
    const actorId = actor?.id;
    if (actor) await this.ownership.assertMarketplaceProductOwnership(actor, id);
    const existing = await this.prisma.marketplaceProduct.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Produit marketplace introuvable');

    if (existing.publicationStatus === MarketplacePublicationStatus.ARCHIVED) {
      return existing;
    }

    const updated = await this.prisma.marketplaceProduct.update({
      where: { id },
      data: {
        publicationStatus: MarketplacePublicationStatus.ARCHIVED,
        updatedById: actorId,
      },
      include: MP_INCLUDE,
    });

    await this.auditService.log({
      action: 'MARKETPLACE_PRODUCT_ARCHIVED',
      entityType: EntityType.MARKETPLACE_PRODUCT,
      entityId: id,
      userId: actorId,
      previousData: { publicationStatus: existing.publicationStatus },
      newData: { publicationStatus: updated.publicationStatus },
    });

    return updated;
  }

  async setExportReadiness(id: string, dto: SetExportReadinessDto, actorId?: string) {
    const existing = await this.prisma.marketplaceProduct.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Produit marketplace introuvable');

    const updated = await this.prisma.marketplaceProduct.update({
      where: { id },
      data: {
        exportReadinessStatus: dto.status,
        complianceStatusSnapshot: dto.complianceStatusSnapshot ?? existing.complianceStatusSnapshot,
        updatedById: actorId,
      },
      include: MP_INCLUDE,
    });

    await this.auditService.log({
      action: 'MARKETPLACE_PRODUCT_READINESS_CHANGED',
      entityType: EntityType.MARKETPLACE_PRODUCT,
      entityId: id,
      userId: actorId,
      previousData: {
        exportReadinessStatus: existing.exportReadinessStatus,
        complianceStatusSnapshot: existing.complianceStatusSnapshot,
      },
      newData: {
        exportReadinessStatus: updated.exportReadinessStatus,
        complianceStatusSnapshot: updated.complianceStatusSnapshot,
      },
    });

    return updated;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /** Score 0–100 basé sur la proportion de champs "scored" non vides. */
  private computeCompletionScore(data: Record<string, unknown>): number {
    let filled = 0;
    for (const field of SCORED_FIELDS) {
      const v = data[field as string];
      if (v === null || v === undefined) continue;
      if (typeof v === 'string' && v.trim() === '') continue;
      if (typeof v === 'object' && v !== null && Object.keys(v).length === 0) continue;
      filled++;
    }
    return Math.round((filled / SCORED_FIELDS.length) * 100);
  }
}
