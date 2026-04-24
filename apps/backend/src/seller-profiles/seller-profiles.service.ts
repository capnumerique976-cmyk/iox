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
  CreateSellerProfileDto,
  UpdateSellerProfileDto,
  QuerySellerProfilesDto,
  RejectSellerProfileDto,
  SuspendSellerProfileDto,
} from './dto/seller-profile.dto';
import {
  EntityType,
  SellerProfileStatus,
  MarketplaceRelatedEntityType,
  MarketplaceReviewType,
  MarketplaceReviewStatus,
  RequestUser,
} from '@iox/shared';
import { MarketplaceReviewService } from '../marketplace-review/marketplace-review.service';
import { SellerOwnershipService } from '../common/services/seller-ownership.service';
import type { Prisma } from '@prisma/client';

const SELLER_INCLUDE = {
  company: { select: { id: true, code: true, name: true, types: true, isActive: true } },
  _count: { select: { marketplaceProducts: true, marketplaceOffers: true } },
};

@Injectable()
export class SellerProfilesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private reviewQueue: MarketplaceReviewService,
    private ownership: SellerOwnershipService,
  ) {}

  async findAll(query: QuerySellerProfilesDto, actor?: RequestUser) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.SellerProfileWhereInput = {};
    // V2 — scope seller : un MARKETPLACE_SELLER ne voit que les profils de son périmètre.
    if (actor && !this.ownership.isStaff(actor)) {
      where.id = { in: actor.sellerProfileIds ?? [] };
    }
    if (query.status) where.status = query.status;
    if (query.country) where.country = query.country;
    if (query.region) where.region = query.region;
    if (query.isFeatured !== undefined) where.isFeatured = query.isFeatured;
    if (query.search) {
      where.OR = [
        { publicDisplayName: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
        { legalName: { contains: query.search, mode: 'insensitive' } },
        { company: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.sellerProfile.findMany({
        where,
        include: SELLER_INCLUDE,
        skip,
        take: limit,
        orderBy: [{ isFeatured: 'desc' }, { publicDisplayName: 'asc' }],
      }),
      this.prisma.sellerProfile.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string, actor?: RequestUser) {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { id },
      include: SELLER_INCLUDE,
    });
    if (!profile) throw new NotFoundException('Profil vendeur introuvable');
    if (actor) await this.ownership.assertSellerProfileOwnership(actor, id);
    return profile;
  }

  async findBySlug(slug: string, actor?: RequestUser) {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { slug },
      include: SELLER_INCLUDE,
    });
    if (!profile) throw new NotFoundException('Profil vendeur introuvable');
    if (actor) await this.ownership.assertSellerProfileOwnership(actor, profile.id);
    return profile;
  }

  async findByCompanyId(companyId: string) {
    return this.prisma.sellerProfile.findUnique({
      where: { companyId },
      include: SELLER_INCLUDE,
    });
  }

  async create(dto: CreateSellerProfileDto, actor?: RequestUser) {
    const actorId = actor?.id;
    // V2 — si seller, la company cible doit faire partie de son périmètre.
    if (actor && this.ownership.isSeller(actor)) {
      const companies = new Set(actor.companyIds ?? []);
      if (!companies.has(dto.companyId)) {
        throw new ForbiddenException('Entreprise hors périmètre');
      }
    }

    const company = await this.prisma.company.findFirst({
      where: { id: dto.companyId, deletedAt: null },
    });
    if (!company) throw new NotFoundException('Entreprise introuvable');

    const existingByCompany = await this.prisma.sellerProfile.findUnique({
      where: { companyId: dto.companyId },
    });
    if (existingByCompany) {
      throw new ConflictException('Un profil vendeur existe déjà pour cette entreprise');
    }

    const existingBySlug = await this.prisma.sellerProfile.findUnique({
      where: { slug: dto.slug },
    });
    if (existingBySlug) throw new ConflictException('Ce slug est déjà utilisé');

    const profile = await this.prisma.sellerProfile.create({
      data: {
        companyId: dto.companyId,
        status: SellerProfileStatus.DRAFT,
        publicDisplayName: dto.publicDisplayName,
        slug: dto.slug,
        country: dto.country,
        legalName: dto.legalName,
        region: dto.region,
        cityOrZone: dto.cityOrZone,
        descriptionShort: dto.descriptionShort,
        descriptionLong: dto.descriptionLong,
        story: dto.story,
        languages: dto.languages,
        salesEmail: dto.salesEmail,
        salesPhone: dto.salesPhone,
        website: dto.website,
        supportedIncoterms: dto.supportedIncoterms,
        destinationsServed: dto.destinationsServed,
        averageLeadTimeDays: dto.averageLeadTimeDays,
        createdById: actorId,
        updatedById: actorId,
      },
      include: SELLER_INCLUDE,
    });

    await this.auditService.log({
      action: 'SELLER_PROFILE_CREATED',
      entityType: EntityType.SELLER_PROFILE,
      entityId: profile.id,
      userId: actorId,
      newData: { companyId: profile.companyId, slug: profile.slug, status: profile.status },
    });

    return profile;
  }

  async update(id: string, dto: UpdateSellerProfileDto, actor?: RequestUser) {
    const actorId = actor?.id;
    if (actor) await this.ownership.assertSellerProfileOwnership(actor, id);
    const existing = await this.prisma.sellerProfile.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Profil vendeur introuvable');

    if (dto.slug && dto.slug !== existing.slug) {
      const clash = await this.prisma.sellerProfile.findUnique({ where: { slug: dto.slug } });
      if (clash) throw new ConflictException('Ce slug est déjà utilisé');
    }

    // Si profil approved, toute modification d'un champ vitrine doit repasser en PENDING_REVIEW.
    const vitrineFields: (keyof UpdateSellerProfileDto)[] = [
      'publicDisplayName',
      'legalName',
      'descriptionShort',
      'descriptionLong',
      'story',
      'logoMediaId',
      'bannerMediaId',
    ];
    const requiresRecheck =
      existing.status === SellerProfileStatus.APPROVED &&
      vitrineFields.some((f) => dto[f] !== undefined);

    const updated = await this.prisma.sellerProfile.update({
      where: { id },
      data: {
        ...dto,
        ...(requiresRecheck ? { status: SellerProfileStatus.PENDING_REVIEW } : {}),
        updatedById: actorId,
      },
      include: SELLER_INCLUDE,
    });

    await this.auditService.log({
      action: 'SELLER_PROFILE_UPDATED',
      entityType: EntityType.SELLER_PROFILE,
      entityId: id,
      userId: actorId,
      previousData: { status: existing.status, slug: existing.slug },
      newData: { status: updated.status, slug: updated.slug },
    });

    return updated;
  }

  async submitForReview(id: string, actor?: RequestUser) {
    const actorId = actor?.id;
    if (actor) await this.ownership.assertSellerProfileOwnership(actor, id);
    const existing = await this.prisma.sellerProfile.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Profil vendeur introuvable');

    if (
      existing.status !== SellerProfileStatus.DRAFT &&
      existing.status !== SellerProfileStatus.REJECTED
    ) {
      throw new BadRequestException(`Impossible de soumettre : statut actuel ${existing.status}`);
    }

    // Pré-requis minimal pour soumission
    if (!existing.publicDisplayName || !existing.slug || !existing.country) {
      throw new BadRequestException(
        'Champs obligatoires manquants (publicDisplayName, slug, country)',
      );
    }

    const updated = await this.prisma.sellerProfile.update({
      where: { id },
      data: {
        status: SellerProfileStatus.PENDING_REVIEW,
        rejectionReason: null,
        updatedById: actorId,
      },
      include: SELLER_INCLUDE,
    });

    await this.auditService.log({
      action: 'SELLER_PROFILE_SUBMITTED',
      entityType: EntityType.SELLER_PROFILE,
      entityId: id,
      userId: actorId,
      previousData: { status: existing.status },
      newData: { status: updated.status },
    });

    await this.reviewQueue.enqueue(
      {
        entityType: MarketplaceRelatedEntityType.SELLER_PROFILE,
        entityId: id,
        reviewType: MarketplaceReviewType.PUBLICATION,
        reason: 'Soumission profil vendeur pour revue',
      },
      actorId,
    );

    return updated;
  }

  async approve(id: string, actorId?: string) {
    const existing = await this.prisma.sellerProfile.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Profil vendeur introuvable');

    if (existing.status !== SellerProfileStatus.PENDING_REVIEW) {
      throw new BadRequestException(`Impossible d'approuver : statut actuel ${existing.status}`);
    }

    const updated = await this.prisma.sellerProfile.update({
      where: { id },
      data: {
        status: SellerProfileStatus.APPROVED,
        approvedAt: new Date(),
        suspendedAt: null,
        rejectionReason: null,
        updatedById: actorId,
      },
      include: SELLER_INCLUDE,
    });

    await this.auditService.log({
      action: 'SELLER_PROFILE_APPROVED',
      entityType: EntityType.SELLER_PROFILE,
      entityId: id,
      userId: actorId,
      previousData: { status: existing.status },
      newData: { status: updated.status, approvedAt: updated.approvedAt },
    });

    await this.reviewQueue.resolvePendingForEntity(
      MarketplaceRelatedEntityType.SELLER_PROFILE,
      id,
      MarketplaceReviewType.PUBLICATION,
      MarketplaceReviewStatus.APPROVED,
      'Profil vendeur approuvé',
      actorId,
    );

    return updated;
  }

  async reject(id: string, dto: RejectSellerProfileDto, actorId?: string) {
    const existing = await this.prisma.sellerProfile.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Profil vendeur introuvable');

    if (existing.status !== SellerProfileStatus.PENDING_REVIEW) {
      throw new BadRequestException(`Impossible de rejeter : statut actuel ${existing.status}`);
    }

    const updated = await this.prisma.sellerProfile.update({
      where: { id },
      data: {
        status: SellerProfileStatus.REJECTED,
        rejectionReason: dto.reason,
        updatedById: actorId,
      },
      include: SELLER_INCLUDE,
    });

    await this.auditService.log({
      action: 'SELLER_PROFILE_REJECTED',
      entityType: EntityType.SELLER_PROFILE,
      entityId: id,
      userId: actorId,
      previousData: { status: existing.status },
      newData: { status: updated.status, rejectionReason: dto.reason },
    });

    await this.reviewQueue.resolvePendingForEntity(
      MarketplaceRelatedEntityType.SELLER_PROFILE,
      id,
      MarketplaceReviewType.PUBLICATION,
      MarketplaceReviewStatus.REJECTED,
      dto.reason,
      actorId,
    );

    return updated;
  }

  async suspend(id: string, dto: SuspendSellerProfileDto, actorId?: string) {
    const existing = await this.prisma.sellerProfile.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Profil vendeur introuvable');

    if (existing.status !== SellerProfileStatus.APPROVED) {
      throw new BadRequestException(`Impossible de suspendre : statut actuel ${existing.status}`);
    }

    const updated = await this.prisma.sellerProfile.update({
      where: { id },
      data: {
        status: SellerProfileStatus.SUSPENDED,
        suspendedAt: new Date(),
        rejectionReason: dto.reason,
        updatedById: actorId,
      },
      include: SELLER_INCLUDE,
    });

    await this.auditService.log({
      action: 'SELLER_PROFILE_SUSPENDED',
      entityType: EntityType.SELLER_PROFILE,
      entityId: id,
      userId: actorId,
      previousData: { status: existing.status },
      newData: { status: updated.status, reason: dto.reason },
    });

    return updated;
  }

  async reinstate(id: string, actorId?: string) {
    const existing = await this.prisma.sellerProfile.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Profil vendeur introuvable');

    if (existing.status !== SellerProfileStatus.SUSPENDED) {
      throw new BadRequestException(`Impossible de réactiver : statut actuel ${existing.status}`);
    }

    const updated = await this.prisma.sellerProfile.update({
      where: { id },
      data: {
        status: SellerProfileStatus.APPROVED,
        suspendedAt: null,
        rejectionReason: null,
        updatedById: actorId,
      },
      include: SELLER_INCLUDE,
    });

    await this.auditService.log({
      action: 'SELLER_PROFILE_REINSTATED',
      entityType: EntityType.SELLER_PROFILE,
      entityId: id,
      userId: actorId,
      previousData: { status: existing.status },
      newData: { status: updated.status },
    });

    return updated;
  }

  async setFeatured(id: string, isFeatured: boolean, actorId?: string) {
    const existing = await this.prisma.sellerProfile.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Profil vendeur introuvable');

    if (isFeatured && existing.status !== SellerProfileStatus.APPROVED) {
      throw new BadRequestException('Seul un profil approuvé peut être mis en avant');
    }

    const updated = await this.prisma.sellerProfile.update({
      where: { id },
      data: { isFeatured, updatedById: actorId },
      include: SELLER_INCLUDE,
    });

    await this.auditService.log({
      action: isFeatured ? 'SELLER_PROFILE_FEATURED' : 'SELLER_PROFILE_UNFEATURED',
      entityType: EntityType.SELLER_PROFILE,
      entityId: id,
      userId: actorId,
      previousData: { isFeatured: existing.isFeatured },
      newData: { isFeatured: updated.isFeatured },
    });

    return updated;
  }
}
