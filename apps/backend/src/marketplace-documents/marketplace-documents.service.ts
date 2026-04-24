import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../common/services/storage.service';
import { MarketplaceReviewService } from '../marketplace-review/marketplace-review.service';
import {
  CreateMarketplaceDocumentDto,
  UpdateMarketplaceDocumentDto,
  QueryMarketplaceDocumentsDto,
  RejectMarketplaceDocumentDto,
  VerifyMarketplaceDocumentDto,
} from './dto/marketplace-document.dto';
import {
  DocumentStatus,
  EntityType,
  MarketplaceDocumentVisibility,
  MarketplaceRelatedEntityType,
  MarketplaceReviewStatus,
  MarketplaceReviewType,
  MarketplaceVerificationStatus,
  SellerProfileStatus,
  RequestUser,
} from '@iox/shared';
import type { Prisma } from '@prisma/client';
import { SellerOwnershipService } from '../common/services/seller-ownership.service';

const RELATED_MODEL: Record<
  MarketplaceRelatedEntityType,
  'sellerProfile' | 'marketplaceProduct' | 'marketplaceOffer' | 'productBatch'
> = {
  [MarketplaceRelatedEntityType.SELLER_PROFILE]: 'sellerProfile',
  [MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT]: 'marketplaceProduct',
  [MarketplaceRelatedEntityType.MARKETPLACE_OFFER]: 'marketplaceOffer',
  [MarketplaceRelatedEntityType.PRODUCT_BATCH]: 'productBatch',
};

const DOC_INCLUDE = {
  document: {
    select: {
      id: true,
      name: true,
      originalFilename: true,
      mimeType: true,
      sizeBytes: true,
      storageKey: true,
      status: true,
      expiresAt: true,
    },
  },
} as const;

/**
 * Module "vitrine" documentaire marketplace.
 *
 * S'appuie sur le socle `Document` existant (upload MinIO + métadonnées
 * traçabilité) et y attache une couche de vitrine publique : visibilité,
 * vérification, expiration, type métier. Ne duplique pas le stockage.
 *
 * Règles critiques :
 *  - seul un document PUBLIC + VERIFIED + non expiré est exposé publiquement
 *  - BUYER_ON_REQUEST est signalé au buyer mais non téléchargeable sans RFQ
 *  - PRIVATE reste strictement interne (seller + staff)
 */
@Injectable()
export class MarketplaceDocumentsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private storage: StorageService,
    private reviewQueue: MarketplaceReviewService,
    private ownership: SellerOwnershipService,
  ) {}

  // ─── Lecture ─────────────────────────────────────────────────────────────

  async findAll(query: QueryMarketplaceDocumentsDto, actor?: RequestUser) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.MarketplaceDocumentWhereInput = {};
    if (query.relatedType) where.relatedType = query.relatedType;
    if (query.relatedId) where.relatedId = query.relatedId;
    if (query.documentType) where.documentType = query.documentType;
    if (query.visibility) where.visibility = query.visibility;
    if (query.verificationStatus) where.verificationStatus = query.verificationStatus;
    if (actor) {
      Object.assign(where, await this.ownership.scopeRelatedEntityFilter(actor));
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.marketplaceDocument.findMany({
        where,
        skip,
        take: limit,
        include: DOC_INCLUDE,
        orderBy: [{ verificationStatus: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.marketplaceDocument.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string, actor?: RequestUser) {
    const doc = await this.prisma.marketplaceDocument.findUnique({
      where: { id },
      include: DOC_INCLUDE,
    });
    if (!doc) throw new NotFoundException('Document marketplace introuvable');
    if (actor) {
      await this.ownership.assertRelatedEntityOwnership(
        actor,
        doc.relatedType as MarketplaceRelatedEntityType,
        doc.relatedId,
      );
    }
    return doc;
  }

  /**
   * Lecture publique catalogue : uniquement PUBLIC + VERIFIED + non expiré.
   * Les BUYER_ON_REQUEST et PRIVATE ne sortent jamais par ce chemin.
   */
  async findPublic(relatedType: MarketplaceRelatedEntityType, relatedId: string) {
    const now = new Date();
    return this.prisma.marketplaceDocument.findMany({
      where: {
        relatedType,
        relatedId,
        visibility: MarketplaceDocumentVisibility.PUBLIC,
        verificationStatus: MarketplaceVerificationStatus.VERIFIED,
        OR: [{ validUntil: null }, { validUntil: { gt: now } }],
      },
      include: DOC_INCLUDE,
      orderBy: [{ documentType: 'asc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Téléaffichage métadonnées pour un buyer : renvoie les docs PUBLIC+VERIFIED
   * + une ligne "disponible sur demande" pour BUYER_ON_REQUEST. PRIVATE masqué.
   */
  async findForBuyer(relatedType: MarketplaceRelatedEntityType, relatedId: string) {
    const now = new Date();
    const docs = await this.prisma.marketplaceDocument.findMany({
      where: {
        relatedType,
        relatedId,
        verificationStatus: MarketplaceVerificationStatus.VERIFIED,
        visibility: {
          in: [
            MarketplaceDocumentVisibility.PUBLIC,
            MarketplaceDocumentVisibility.BUYER_ON_REQUEST,
          ],
        },
        OR: [{ validUntil: null }, { validUntil: { gt: now } }],
      },
      include: DOC_INCLUDE,
      orderBy: [{ visibility: 'asc' }, { documentType: 'asc' }, { createdAt: 'desc' }],
    });
    return docs;
  }

  /**
   * URL signée de téléchargement.
   *
   * Règles d'accès :
   *  - PUBLIC + VERIFIED + non expiré  → accessible à tout user authentifié
   *  - BUYER_ON_REQUEST                → jamais servi par ce endpoint, RFQ requise (endpoint séparé à venir)
   *  - PRIVATE                         → réservé seller owner + staff (contrôlé côté controller)
   * Toute revalidation de l'état de vérification / expiration est faite ici.
   */
  async getDownloadUrl(id: string, opts: { publicOnly?: boolean } = {}) {
    const md = await this.findById(id);

    if (md.document.status !== DocumentStatus.ACTIVE) {
      throw new BadRequestException('Document source non actif');
    }

    if (opts.publicOnly) {
      if (md.visibility !== MarketplaceDocumentVisibility.PUBLIC) {
        throw new ForbiddenException("Ce document n'est pas public");
      }
      if (md.verificationStatus !== MarketplaceVerificationStatus.VERIFIED) {
        throw new ForbiddenException('Document non vérifié');
      }
      if (md.validUntil && md.validUntil.getTime() <= Date.now()) {
        throw new ForbiddenException('Document expiré');
      }
    }

    const url = await this.storage.getPresignedUrl(md.document.storageKey, 3600);
    return { id: md.id, url, expiresIn: 3600 };
  }

  // ─── Création (lie un Document existant à une entité marketplace) ────────

  async create(dto: CreateMarketplaceDocumentDto, actorId: string, actor?: RequestUser) {
    await this.assertRelatedEntityUploadable(dto.relatedType, dto.relatedId, actor);

    const source = await this.prisma.document.findUnique({ where: { id: dto.documentId } });
    if (!source) throw new NotFoundException('Document source introuvable');
    if (source.status !== DocumentStatus.ACTIVE) {
      throw new BadRequestException('Document source non actif');
    }

    const validFrom = dto.validFrom ? new Date(dto.validFrom) : undefined;
    const validUntil = dto.validUntil ? new Date(dto.validUntil) : undefined;
    if (validFrom && validUntil && validUntil <= validFrom) {
      throw new BadRequestException('validUntil doit être postérieure à validFrom');
    }
    if (validUntil && validUntil.getTime() <= Date.now()) {
      throw new BadRequestException('validUntil ne peut pas être dans le passé');
    }

    const md = await this.prisma.marketplaceDocument.create({
      data: {
        relatedType: dto.relatedType,
        relatedId: dto.relatedId,
        documentId: dto.documentId,
        documentType: dto.documentType,
        title: dto.title,
        visibility: dto.visibility ?? MarketplaceDocumentVisibility.PRIVATE,
        verificationStatus: MarketplaceVerificationStatus.PENDING,
        validFrom,
        validUntil,
        createdById: actorId,
      },
      include: DOC_INCLUDE,
    });

    await this.auditService.log({
      action: 'MARKETPLACE_DOCUMENT_CREATED',
      entityType: EntityType.MARKETPLACE_DOCUMENT,
      entityId: md.id,
      userId: actorId,
      newData: {
        relatedType: md.relatedType,
        relatedId: md.relatedId,
        documentId: md.documentId,
        documentType: md.documentType,
        visibility: md.visibility,
      },
    });

    // Inscription file de revue pour vérification documentaire
    await this.enqueueDocumentReview(
      md.relatedType as MarketplaceRelatedEntityType,
      md.id,
      actorId,
    );

    return md;
  }

  // ─── Update métadonnées ──────────────────────────────────────────────────

  async update(
    id: string,
    dto: UpdateMarketplaceDocumentDto,
    actorId: string,
    actor?: RequestUser,
  ) {
    const existing = await this.findById(id);
    if (actor) {
      await this.ownership.assertRelatedEntityOwnership(
        actor,
        existing.relatedType as MarketplaceRelatedEntityType,
        existing.relatedId,
      );
    }

    const validFrom = dto.validFrom ? new Date(dto.validFrom) : (existing.validFrom ?? undefined);
    const validUntil = dto.validUntil
      ? new Date(dto.validUntil)
      : (existing.validUntil ?? undefined);
    if (validFrom && validUntil && validUntil <= validFrom) {
      throw new BadRequestException('validUntil doit être postérieure à validFrom');
    }

    // Une modification de visibility vers PUBLIC ou de contenu clé re-déclenche
    // la vérification si le doc était déjà VERIFIED.
    const mustRequeue =
      existing.verificationStatus === MarketplaceVerificationStatus.VERIFIED &&
      ((dto.visibility && dto.visibility !== existing.visibility) ||
        (dto.documentType && dto.documentType !== existing.documentType) ||
        (dto.validUntil && new Date(dto.validUntil).getTime() !== existing.validUntil?.getTime()));

    const updated = await this.prisma.marketplaceDocument.update({
      where: { id },
      data: {
        title: dto.title ?? existing.title,
        documentType: dto.documentType ?? existing.documentType,
        visibility: dto.visibility ?? existing.visibility,
        validFrom,
        validUntil,
        ...(mustRequeue ? { verificationStatus: MarketplaceVerificationStatus.PENDING } : {}),
      },
      include: DOC_INCLUDE,
    });

    await this.auditService.log({
      action: 'MARKETPLACE_DOCUMENT_UPDATED',
      entityType: EntityType.MARKETPLACE_DOCUMENT,
      entityId: id,
      userId: actorId,
      previousData: {
        visibility: existing.visibility,
        verificationStatus: existing.verificationStatus,
        documentType: existing.documentType,
      },
      newData: {
        visibility: updated.visibility,
        verificationStatus: updated.verificationStatus,
        documentType: updated.documentType,
      },
    });

    if (mustRequeue) {
      await this.enqueueDocumentReview(
        updated.relatedType as MarketplaceRelatedEntityType,
        id,
        actorId,
      );
    }

    return updated;
  }

  // ─── Vérification (staff) ────────────────────────────────────────────────

  async verify(id: string, dto: VerifyMarketplaceDocumentDto, actorId: string) {
    const existing = await this.findById(id);
    if (existing.verificationStatus === MarketplaceVerificationStatus.VERIFIED) return existing;

    if (existing.validUntil && existing.validUntil.getTime() <= Date.now()) {
      throw new BadRequestException('Document expiré, impossible à vérifier');
    }

    const updated = await this.prisma.marketplaceDocument.update({
      where: { id },
      data: { verificationStatus: MarketplaceVerificationStatus.VERIFIED },
      include: DOC_INCLUDE,
    });

    await this.auditService.log({
      action: 'MARKETPLACE_DOCUMENT_VERIFIED',
      entityType: EntityType.MARKETPLACE_DOCUMENT,
      entityId: id,
      userId: actorId,
      previousData: { verificationStatus: existing.verificationStatus },
      newData: { verificationStatus: updated.verificationStatus, note: dto.note },
    });

    await this.reviewQueue.resolvePendingForEntity(
      existing.relatedType as MarketplaceRelatedEntityType,
      id,
      MarketplaceReviewType.DOCUMENT,
      MarketplaceReviewStatus.APPROVED,
      dto.note ?? 'Document vérifié',
      actorId,
    );

    return updated;
  }

  async reject(id: string, dto: RejectMarketplaceDocumentDto, actorId: string) {
    const existing = await this.findById(id);

    const updated = await this.prisma.marketplaceDocument.update({
      where: { id },
      data: { verificationStatus: MarketplaceVerificationStatus.REJECTED },
      include: DOC_INCLUDE,
    });

    await this.auditService.log({
      action: 'MARKETPLACE_DOCUMENT_REJECTED',
      entityType: EntityType.MARKETPLACE_DOCUMENT,
      entityId: id,
      userId: actorId,
      previousData: { verificationStatus: existing.verificationStatus },
      newData: { verificationStatus: updated.verificationStatus, reason: dto.reason },
    });

    await this.reviewQueue.resolvePendingForEntity(
      existing.relatedType as MarketplaceRelatedEntityType,
      id,
      MarketplaceReviewType.DOCUMENT,
      MarketplaceReviewStatus.REJECTED,
      dto.reason,
      actorId,
    );

    return updated;
  }

  // ─── Suppression ─────────────────────────────────────────────────────────

  async delete(id: string, actorId: string, actor?: RequestUser) {
    const existing = await this.findById(id);
    if (actor) {
      await this.ownership.assertRelatedEntityOwnership(
        actor,
        existing.relatedType as MarketplaceRelatedEntityType,
        existing.relatedId,
      );
    }

    await this.reviewQueue.resolvePendingForEntity(
      existing.relatedType as MarketplaceRelatedEntityType,
      id,
      MarketplaceReviewType.DOCUMENT,
      MarketplaceReviewStatus.REJECTED,
      'Document marketplace supprimé',
      actorId,
    );

    await this.prisma.marketplaceDocument.delete({ where: { id } });

    await this.auditService.log({
      action: 'MARKETPLACE_DOCUMENT_DELETED',
      entityType: EntityType.MARKETPLACE_DOCUMENT,
      entityId: id,
      userId: actorId,
      previousData: {
        relatedType: existing.relatedType,
        relatedId: existing.relatedId,
        documentId: existing.documentId,
        visibility: existing.visibility,
      },
    });

    return { id, deleted: true };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /**
   * Enqueue une revue DOCUMENT dans la queue centralisée.
   *
   * Granularité : 1 item = 1 MarketplaceDocument. On réutilise le `relatedType`
   * comme `entityType` et on stocke l'id du marketplaceDocument dans `entityId`
   * — les UUID garantissent l'absence de collision. `reviewType=DOCUMENT` lève
   * l'ambiguïté côté lecture.
   */
  private async enqueueDocumentReview(
    parentType: MarketplaceRelatedEntityType,
    marketplaceDocumentId: string,
    actorId?: string,
  ) {
    await this.reviewQueue.enqueue(
      {
        entityType: parentType,
        entityId: marketplaceDocumentId,
        reviewType: MarketplaceReviewType.DOCUMENT,
        reason: 'Vérification document marketplace',
      },
      actorId,
    );
  }

  private async assertRelatedEntityUploadable(
    relatedType: MarketplaceRelatedEntityType,
    relatedId: string,
    actor?: RequestUser,
  ) {
    if (actor) {
      await this.ownership.assertRelatedEntityOwnership(actor, relatedType, relatedId);
    }
    if (relatedType === MarketplaceRelatedEntityType.SELLER_PROFILE) {
      const seller = await this.prisma.sellerProfile.findUnique({ where: { id: relatedId } });
      if (!seller) throw new NotFoundException('Profil vendeur introuvable');
      if (
        seller.status === SellerProfileStatus.REJECTED ||
        seller.status === SellerProfileStatus.SUSPENDED
      ) {
        throw new ForbiddenException(`Attachement impossible : profil vendeur ${seller.status}`);
      }
      return;
    }

    const modelKey = RELATED_MODEL[relatedType];
    const model = this.prisma[modelKey] as unknown as {
      findUnique: (args: { where: { id: string } }) => Promise<unknown>;
    };
    const entity = await model.findUnique({ where: { id: relatedId } });
    if (!entity) {
      throw new NotFoundException(`${relatedType} introuvable`);
    }
  }
}
