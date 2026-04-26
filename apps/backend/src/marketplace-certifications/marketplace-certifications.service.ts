// FP-2 — Service certifications structurées.
//
// Périmètre MVP :
//   - relatedType ∈ {SELLER_PROFILE, MARKETPLACE_PRODUCT}
//   - le seller (ou staff) crée des certifications, le staff qualité vérifie/refuse
//   - audit trail systématique sur toutes les mutations
//   - ownership délégué à SellerOwnershipService
//
// Volontairement plus simple que MarketplaceDocumentsService :
//   - pas de dépendance au stockage (le PDF de preuve est porté par MediaAsset)
//   - pas d'enqueue dans la review queue (la verification est synchrone, gérée
//     directement par staff via /verify ou /reject — l'historique est l'audit log)

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SellerOwnershipService } from '../common/services/seller-ownership.service';
import {
  CERTIFICATION_ALLOWED_SCOPES,
  CertificationType,
  EntityType,
  MarketplaceRelatedEntityType,
  MarketplaceVerificationStatus,
  RequestUser,
} from '@iox/shared';
import {
  CreateMarketplaceCertificationDto,
  QueryMarketplaceCertificationsDto,
  RejectMarketplaceCertificationDto,
  UpdateMarketplaceCertificationDto,
  VerifyMarketplaceCertificationDto,
} from './dto/marketplace-certification.dto';

const ALLOWED = new Set<MarketplaceRelatedEntityType>(CERTIFICATION_ALLOWED_SCOPES);

@Injectable()
export class MarketplaceCertificationsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private ownership: SellerOwnershipService,
  ) {}

  // ─── Lecture ─────────────────────────────────────────────────────────────

  async findAll(query: QueryMarketplaceCertificationsDto, actor?: RequestUser) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.CertificationWhereInput = {};
    if (query.relatedType) where.relatedType = query.relatedType;
    if (query.relatedId) where.relatedId = query.relatedId;
    if (query.type) where.type = query.type;
    if (query.verificationStatus) where.verificationStatus = query.verificationStatus;
    if (actor) {
      Object.assign(where, await this.ownership.scopeRelatedEntityFilter(actor));
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.certification.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ verificationStatus: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.certification.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string, actor?: RequestUser) {
    const cert = await this.prisma.certification.findUnique({ where: { id } });
    if (!cert) throw new NotFoundException('Certification introuvable');
    if (actor) {
      await this.ownership.assertRelatedEntityOwnership(
        actor,
        cert.relatedType as MarketplaceRelatedEntityType,
        cert.relatedId,
      );
    }
    return cert;
  }

  /**
   * Lecture publique : ne renvoie que les certifications VERIFIED + non
   * expirées. La projection EXPIRED est dérivée à la volée (validUntil <= now).
   */
  async findPublic(relatedType: MarketplaceRelatedEntityType, relatedId: string) {
    if (!ALLOWED.has(relatedType)) return [];
    const now = new Date();
    return this.prisma.certification.findMany({
      where: {
        relatedType,
        relatedId,
        verificationStatus: MarketplaceVerificationStatus.VERIFIED,
        OR: [{ validUntil: null }, { validUntil: { gt: now } }],
      },
      orderBy: [{ type: 'asc' }, { issuedAt: 'desc' }],
    });
  }

  // ─── Mutations seller ────────────────────────────────────────────────────

  async create(dto: CreateMarketplaceCertificationDto, actor: RequestUser) {
    this.assertScopeAllowed(dto.relatedType);
    await this.assertRelatedEntityExistsAndOwned(dto.relatedType, dto.relatedId, actor);

    if (dto.type === CertificationType.OTHER && !dto.code && !dto.issuingBody) {
      throw new BadRequestException(
        "Type 'OTHER' : précisez au moins un code ou un organisme émetteur",
      );
    }

    const issuedAt = dto.issuedAt ? new Date(dto.issuedAt) : null;
    const validFrom = dto.validFrom ? new Date(dto.validFrom) : null;
    const validUntil = dto.validUntil ? new Date(dto.validUntil) : null;
    if (validFrom && validUntil && validUntil <= validFrom) {
      throw new BadRequestException('validUntil doit être postérieure à validFrom');
    }
    if (validUntil && validUntil.getTime() <= Date.now()) {
      throw new BadRequestException('validUntil ne peut pas être dans le passé');
    }

    if (dto.documentMediaId) {
      const media = await this.prisma.mediaAsset.findUnique({
        where: { id: dto.documentMediaId },
        select: { id: true, relatedType: true, relatedId: true },
      });
      if (!media) throw new NotFoundException('Media de preuve introuvable');
      // Le media doit être attaché à la même entité (cohérence ownership).
      if (media.relatedType !== dto.relatedType || media.relatedId !== dto.relatedId) {
        throw new BadRequestException(
          "Le media de preuve doit être attaché à la même entité que la certification",
        );
      }
    }

    try {
      const cert = await this.prisma.certification.create({
        data: {
          relatedType: dto.relatedType,
          relatedId: dto.relatedId,
          type: dto.type,
          code: dto.code,
          issuingBody: dto.issuingBody,
          issuedAt,
          validFrom,
          validUntil,
          documentMediaId: dto.documentMediaId,
          verificationStatus: MarketplaceVerificationStatus.PENDING,
          createdByUserId: actor.id,
          updatedByUserId: actor.id,
        },
      });

      await this.audit.log({
        action: 'MARKETPLACE_CERTIFICATION_CREATED',
        entityType: EntityType.MARKETPLACE_CERTIFICATION,
        entityId: cert.id,
        userId: actor.id,
        newData: {
          relatedType: cert.relatedType,
          relatedId: cert.relatedId,
          type: cert.type,
          code: cert.code,
          issuingBody: cert.issuingBody,
        },
      });

      return cert;
    } catch (e) {
      if (this.isUniqueViolation(e)) {
        throw new BadRequestException(
          'Une certification de ce type avec ce code existe déjà sur cette entité',
        );
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateMarketplaceCertificationDto, actor: RequestUser) {
    const existing = await this.findById(id, actor);

    const issuedAt = dto.issuedAt ? new Date(dto.issuedAt) : existing.issuedAt;
    const validFrom = dto.validFrom ? new Date(dto.validFrom) : existing.validFrom;
    const validUntil = dto.validUntil ? new Date(dto.validUntil) : existing.validUntil;
    if (validFrom && validUntil && validUntil <= validFrom) {
      throw new BadRequestException('validUntil doit être postérieure à validFrom');
    }

    if (dto.documentMediaId) {
      const media = await this.prisma.mediaAsset.findUnique({
        where: { id: dto.documentMediaId },
        select: { relatedType: true, relatedId: true },
      });
      if (!media) throw new NotFoundException('Media de preuve introuvable');
      if (media.relatedType !== existing.relatedType || media.relatedId !== existing.relatedId) {
        throw new BadRequestException(
          'Le media de preuve doit être attaché à la même entité que la certification',
        );
      }
    }

    // Toute modification de contenu factuel d'une certif déjà VERIFIED la
    // remet en PENDING (revue à reconfirmer par le staff).
    const factualChange =
      dto.code !== undefined ||
      dto.issuingBody !== undefined ||
      dto.issuedAt !== undefined ||
      dto.validFrom !== undefined ||
      dto.validUntil !== undefined ||
      dto.documentMediaId !== undefined;
    const requeue =
      existing.verificationStatus === MarketplaceVerificationStatus.VERIFIED && factualChange;

    try {
      const updated = await this.prisma.certification.update({
        where: { id },
        data: {
          ...(dto.code !== undefined ? { code: dto.code } : {}),
          ...(dto.issuingBody !== undefined ? { issuingBody: dto.issuingBody } : {}),
          ...(dto.documentMediaId !== undefined
            ? { documentMediaId: dto.documentMediaId }
            : {}),
          issuedAt,
          validFrom,
          validUntil,
          ...(requeue
            ? {
                verificationStatus: MarketplaceVerificationStatus.PENDING,
                rejectionReason: null,
                verifiedByUserId: null,
                verifiedAt: null,
              }
            : {}),
          updatedByUserId: actor.id,
        },
      });

      await this.audit.log({
        action: 'MARKETPLACE_CERTIFICATION_UPDATED',
        entityType: EntityType.MARKETPLACE_CERTIFICATION,
        entityId: id,
        userId: actor.id,
        previousData: {
          code: existing.code,
          issuingBody: existing.issuingBody,
          validUntil: existing.validUntil,
          verificationStatus: existing.verificationStatus,
        },
        newData: {
          code: updated.code,
          issuingBody: updated.issuingBody,
          validUntil: updated.validUntil,
          verificationStatus: updated.verificationStatus,
        },
      });

      return updated;
    } catch (e) {
      if (this.isUniqueViolation(e)) {
        throw new BadRequestException(
          'Conflit : une certification de ce type avec ce code existe déjà',
        );
      }
      throw e;
    }
  }

  async delete(id: string, actor: RequestUser) {
    const existing = await this.findById(id, actor);
    await this.prisma.certification.delete({ where: { id } });
    await this.audit.log({
      action: 'MARKETPLACE_CERTIFICATION_DELETED',
      entityType: EntityType.MARKETPLACE_CERTIFICATION,
      entityId: id,
      userId: actor.id,
      previousData: {
        relatedType: existing.relatedType,
        relatedId: existing.relatedId,
        type: existing.type,
        code: existing.code,
      },
    });
    return { id, deleted: true };
  }

  // ─── Mutations staff (verify/reject) ─────────────────────────────────────

  async verify(id: string, dto: VerifyMarketplaceCertificationDto, actorId: string) {
    const existing = await this.prisma.certification.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Certification introuvable');
    if (existing.verificationStatus === MarketplaceVerificationStatus.VERIFIED) return existing;

    if (existing.validUntil && existing.validUntil.getTime() <= Date.now()) {
      throw new BadRequestException('Certification expirée, impossible à vérifier');
    }

    const updated = await this.prisma.certification.update({
      where: { id },
      data: {
        verificationStatus: MarketplaceVerificationStatus.VERIFIED,
        rejectionReason: null,
        verifiedByUserId: actorId,
        verifiedAt: new Date(),
      },
    });

    await this.audit.log({
      action: 'MARKETPLACE_CERTIFICATION_VERIFIED',
      entityType: EntityType.MARKETPLACE_CERTIFICATION,
      entityId: id,
      userId: actorId,
      previousData: { verificationStatus: existing.verificationStatus },
      newData: { verificationStatus: updated.verificationStatus, note: dto.note },
    });

    return updated;
  }

  async reject(id: string, dto: RejectMarketplaceCertificationDto, actorId: string) {
    const existing = await this.prisma.certification.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Certification introuvable');

    const updated = await this.prisma.certification.update({
      where: { id },
      data: {
        verificationStatus: MarketplaceVerificationStatus.REJECTED,
        rejectionReason: dto.reason,
        verifiedByUserId: actorId,
        verifiedAt: new Date(),
      },
    });

    await this.audit.log({
      action: 'MARKETPLACE_CERTIFICATION_REJECTED',
      entityType: EntityType.MARKETPLACE_CERTIFICATION,
      entityId: id,
      userId: actorId,
      previousData: { verificationStatus: existing.verificationStatus },
      newData: { verificationStatus: updated.verificationStatus, reason: dto.reason },
    });

    return updated;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private assertScopeAllowed(relatedType: MarketplaceRelatedEntityType) {
    if (!ALLOWED.has(relatedType)) {
      throw new BadRequestException(
        `Scope non supporté pour les certifications : ${relatedType} (autorisés : ${[...ALLOWED].join(', ')})`,
      );
    }
  }

  private async assertRelatedEntityExistsAndOwned(
    relatedType: MarketplaceRelatedEntityType,
    relatedId: string,
    actor: RequestUser,
  ) {
    if (relatedType === MarketplaceRelatedEntityType.SELLER_PROFILE) {
      const seller = await this.prisma.sellerProfile.findUnique({
        where: { id: relatedId },
        select: { id: true },
      });
      if (!seller) throw new NotFoundException('Profil vendeur introuvable');
    } else if (relatedType === MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT) {
      const mp = await this.prisma.marketplaceProduct.findUnique({
        where: { id: relatedId },
        select: { id: true },
      });
      if (!mp) throw new NotFoundException('Produit marketplace introuvable');
    } else {
      // Défense en profondeur : ne devrait jamais arriver puisque
      // assertScopeAllowed est appelé avant.
      throw new ForbiddenException('Scope non autorisé');
    }
    await this.ownership.assertRelatedEntityOwnership(actor, relatedType, relatedId);
  }

  private isUniqueViolation(e: unknown): boolean {
    return (
      typeof e === 'object' &&
      e !== null &&
      'code' in e &&
      (e as { code?: string }).code === 'P2002'
    );
  }
}
