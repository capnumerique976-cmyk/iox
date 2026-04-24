import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../common/services/storage.service';
import {
  UploadMediaAssetDto,
  UpdateMediaAssetDto,
  QueryMediaAssetsDto,
  RejectMediaAssetDto,
} from './dto/media-asset.dto';
import {
  EntityType,
  MarketplaceRelatedEntityType,
  MarketplaceReviewStatus,
  MarketplaceReviewType,
  MediaAssetRole,
  MediaAssetType,
  MediaModerationStatus,
  SellerProfileStatus,
  RequestUser,
} from '@iox/shared';
import type { Prisma } from '@prisma/client';
import { MarketplaceReviewService } from '../marketplace-review/marketplace-review.service';
import { SellerOwnershipService } from '../common/services/seller-ownership.service';

export const MEDIA_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const MEDIA_ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

const RELATED_MODEL: Record<
  MarketplaceRelatedEntityType,
  'sellerProfile' | 'marketplaceProduct' | 'marketplaceOffer' | 'productBatch'
> = {
  [MarketplaceRelatedEntityType.SELLER_PROFILE]: 'sellerProfile',
  [MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT]: 'marketplaceProduct',
  [MarketplaceRelatedEntityType.MARKETPLACE_OFFER]: 'marketplaceOffer',
  [MarketplaceRelatedEntityType.PRODUCT_BATCH]: 'productBatch',
};

@Injectable()
export class MediaAssetsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private storage: StorageService,
    private reviewQueue: MarketplaceReviewService,
    private ownership: SellerOwnershipService,
  ) {}

  // ─── Lecture ─────────────────────────────────────────────────────────────

  async findAll(query: QueryMediaAssetsDto, actor?: RequestUser) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.MediaAssetWhereInput = {};
    if (query.relatedType) where.relatedType = query.relatedType;
    if (query.relatedId) where.relatedId = query.relatedId;
    if (query.role) where.role = query.role;
    if (query.moderationStatus) where.moderationStatus = query.moderationStatus;
    if (actor) {
      Object.assign(where, await this.ownership.scopeRelatedEntityFilter(actor));
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.mediaAsset.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.mediaAsset.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string, actor?: RequestUser) {
    const media = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!media) throw new NotFoundException('Media introuvable');
    if (actor) {
      await this.ownership.assertRelatedEntityOwnership(
        actor,
        media.relatedType as MarketplaceRelatedEntityType,
        media.relatedId,
      );
    }
    return media;
  }

  /** Lecture publique : seuls les médias approved sont servis. */
  async findPublic(relatedType: MarketplaceRelatedEntityType, relatedId: string) {
    return this.prisma.mediaAsset.findMany({
      where: {
        relatedType,
        relatedId,
        moderationStatus: MediaModerationStatus.APPROVED,
      },
      orderBy: [
        { role: 'asc' }, // PRIMARY arrive avant GALLERY alphabétiquement côté Prisma enum
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async getUrl(id: string, expirySeconds = 3600) {
    const media = await this.findById(id);
    const url = await this.storage.getPresignedUrl(media.storageKey, expirySeconds);
    return { id: media.id, url, expiresIn: expirySeconds };
  }

  // ─── Upload ──────────────────────────────────────────────────────────────

  async upload(
    dto: UploadMediaAssetDto,
    file: Express.Multer.File | undefined,
    actorId: string,
    actor?: RequestUser,
  ) {
    if (!file) throw new BadRequestException('Fichier manquant');

    const mediaType = dto.mediaType ?? MediaAssetType.IMAGE;

    // Validation MIME/taille — pour l'instant on n'accepte que des images
    if (mediaType !== MediaAssetType.IMAGE && mediaType !== MediaAssetType.ILLUSTRATION) {
      throw new BadRequestException(`mediaType ${mediaType} non supporté pour l'instant`);
    }
    if (!MEDIA_ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Type MIME non autorisé : ${file.mimetype}. Autorisés : ${MEDIA_ALLOWED_IMAGE_MIMES.join(', ')}`,
      );
    }
    if (file.size > MEDIA_MAX_BYTES) {
      throw new BadRequestException(
        `Fichier trop volumineux (${file.size} octets, max ${MEDIA_MAX_BYTES})`,
      );
    }

    await this.assertRelatedEntityUploadable(dto.relatedType, dto.relatedId, actor);

    const role = dto.role ?? MediaAssetRole.GALLERY;

    // Clé de stockage dédiée marketplace (ne pollue pas le préfixe documents/)
    const storageKey = this.buildMediaKey(dto.relatedType, dto.relatedId, file.originalname);
    await this.storage.upload(storageKey, file.buffer, file.mimetype);

    // Primary unique : si nouveau média PRIMARY → on rétrograde les autres en GALLERY
    const media = await this.prisma.$transaction(async (tx) => {
      if (role === MediaAssetRole.PRIMARY) {
        await tx.mediaAsset.updateMany({
          where: {
            relatedType: dto.relatedType,
            relatedId: dto.relatedId,
            role: MediaAssetRole.PRIMARY,
          },
          data: { role: MediaAssetRole.GALLERY },
        });
      }
      return tx.mediaAsset.create({
        data: {
          relatedType: dto.relatedType,
          relatedId: dto.relatedId,
          mediaType,
          role,
          storageKey,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          altTextFr: dto.altTextFr,
          altTextEn: dto.altTextEn,
          sortOrder: dto.sortOrder ?? 0,
          moderationStatus: MediaModerationStatus.PENDING,
          uploadedByUserId: actorId,
        },
      });
    });

    await this.auditService.log({
      action: 'MEDIA_ASSET_UPLOADED',
      entityType: EntityType.MEDIA_ASSET,
      entityId: media.id,
      userId: actorId,
      newData: {
        relatedType: media.relatedType,
        relatedId: media.relatedId,
        role: media.role,
        storageKey: media.storageKey,
        sizeBytes: media.sizeBytes,
      },
    });

    await this.enqueueMediaReview(
      media.relatedType as MarketplaceRelatedEntityType,
      media.id,
      actorId,
    );

    return media;
  }

  // ─── Update metadata (pas le fichier) ────────────────────────────────────

  async update(id: string, dto: UpdateMediaAssetDto, actorId: string, actor?: RequestUser) {
    const existing = await this.findById(id);
    if (actor) {
      await this.ownership.assertRelatedEntityOwnership(
        actor,
        existing.relatedType as MarketplaceRelatedEntityType,
        existing.relatedId,
      );
    }

    // Si on remet APPROVED → PENDING ? Non : une simple édition d'altText ou de
    // sortOrder ne doit pas re-déclencher modération. On le fait uniquement via
    // un passage explicite en role=PRIMARY, qui lui l'exige (image principale vitrine).
    const nextModerationStatus =
      existing.moderationStatus === MediaModerationStatus.APPROVED &&
      dto.role === MediaAssetRole.PRIMARY &&
      existing.role !== MediaAssetRole.PRIMARY
        ? MediaModerationStatus.PENDING
        : undefined;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.role === MediaAssetRole.PRIMARY && existing.role !== MediaAssetRole.PRIMARY) {
        await tx.mediaAsset.updateMany({
          where: {
            relatedType: existing.relatedType,
            relatedId: existing.relatedId,
            role: MediaAssetRole.PRIMARY,
            id: { not: id },
          },
          data: { role: MediaAssetRole.GALLERY },
        });
      }
      return tx.mediaAsset.update({
        where: { id },
        data: {
          role: dto.role,
          altTextFr: dto.altTextFr,
          altTextEn: dto.altTextEn,
          sortOrder: dto.sortOrder,
          ...(nextModerationStatus ? { moderationStatus: nextModerationStatus } : {}),
        },
      });
    });

    await this.auditService.log({
      action: 'MEDIA_ASSET_UPDATED',
      entityType: EntityType.MEDIA_ASSET,
      entityId: id,
      userId: actorId,
      previousData: { role: existing.role, moderationStatus: existing.moderationStatus },
      newData: { role: updated.role, moderationStatus: updated.moderationStatus },
    });

    // Re-modération nécessaire si promu PRIMARY et donc repassé en PENDING
    if (
      existing.moderationStatus === MediaModerationStatus.APPROVED &&
      updated.moderationStatus === MediaModerationStatus.PENDING
    ) {
      await this.enqueueMediaReview(
        updated.relatedType as MarketplaceRelatedEntityType,
        id,
        actorId,
      );
    }

    return updated;
  }

  // ─── Image principale dédiée ─────────────────────────────────────────────

  async setPrimary(id: string, actorId: string, actor?: RequestUser) {
    const existing = await this.findById(id);
    if (actor) {
      await this.ownership.assertRelatedEntityOwnership(
        actor,
        existing.relatedType as MarketplaceRelatedEntityType,
        existing.relatedId,
      );
    }
    if (existing.role === MediaAssetRole.PRIMARY) return existing;

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.mediaAsset.updateMany({
        where: {
          relatedType: existing.relatedType,
          relatedId: existing.relatedId,
          role: MediaAssetRole.PRIMARY,
          id: { not: id },
        },
        data: { role: MediaAssetRole.GALLERY },
      });
      return tx.mediaAsset.update({
        where: { id },
        data: {
          role: MediaAssetRole.PRIMARY,
          // Bascule en PENDING si pas déjà approved : admin doit revalider l'image principale
          ...(existing.moderationStatus === MediaModerationStatus.APPROVED
            ? { moderationStatus: MediaModerationStatus.PENDING }
            : {}),
        },
      });
    });

    await this.auditService.log({
      action: 'MEDIA_ASSET_SET_PRIMARY',
      entityType: EntityType.MEDIA_ASSET,
      entityId: id,
      userId: actorId,
      previousData: { role: existing.role },
      newData: { role: updated.role, moderationStatus: updated.moderationStatus },
    });

    // Si le passage en PRIMARY a forcé un retour en PENDING → nouvelle revue
    if (
      existing.moderationStatus === MediaModerationStatus.APPROVED &&
      updated.moderationStatus === MediaModerationStatus.PENDING
    ) {
      await this.enqueueMediaReview(
        updated.relatedType as MarketplaceRelatedEntityType,
        id,
        actorId,
      );
    }

    return updated;
  }

  // ─── Modération ──────────────────────────────────────────────────────────

  async approve(id: string, actorId: string) {
    const existing = await this.findById(id);
    if (existing.moderationStatus === MediaModerationStatus.APPROVED) return existing;

    const updated = await this.prisma.mediaAsset.update({
      where: { id },
      data: {
        moderationStatus: MediaModerationStatus.APPROVED,
        moderationReason: null,
      },
    });

    await this.auditService.log({
      action: 'MEDIA_ASSET_APPROVED',
      entityType: EntityType.MEDIA_ASSET,
      entityId: id,
      userId: actorId,
      previousData: { moderationStatus: existing.moderationStatus },
      newData: { moderationStatus: updated.moderationStatus },
    });

    await this.reviewQueue.resolvePendingForEntity(
      existing.relatedType as MarketplaceRelatedEntityType,
      id,
      MarketplaceReviewType.MEDIA,
      MarketplaceReviewStatus.APPROVED,
      'Média approuvé',
      actorId,
    );

    return updated;
  }

  async reject(id: string, dto: RejectMediaAssetDto, actorId: string) {
    const existing = await this.findById(id);
    if (!dto.reason || dto.reason.trim().length < 3) {
      throw new BadRequestException('Motif de rejet trop court');
    }

    const updated = await this.prisma.mediaAsset.update({
      where: { id },
      data: {
        moderationStatus: MediaModerationStatus.REJECTED,
        moderationReason: dto.reason,
      },
    });

    await this.auditService.log({
      action: 'MEDIA_ASSET_REJECTED',
      entityType: EntityType.MEDIA_ASSET,
      entityId: id,
      userId: actorId,
      previousData: { moderationStatus: existing.moderationStatus },
      newData: { moderationStatus: updated.moderationStatus, reason: dto.reason },
    });

    await this.reviewQueue.resolvePendingForEntity(
      existing.relatedType as MarketplaceRelatedEntityType,
      id,
      MarketplaceReviewType.MEDIA,
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

    // Clôture la queue AVANT delete (FK-free, mais évite un item orphelin actif)
    await this.reviewQueue.resolvePendingForEntity(
      existing.relatedType as MarketplaceRelatedEntityType,
      id,
      MarketplaceReviewType.MEDIA,
      MarketplaceReviewStatus.REJECTED,
      'Média supprimé',
      actorId,
    );

    await this.prisma.mediaAsset.delete({ where: { id } });
    await this.storage.delete(existing.storageKey);

    await this.auditService.log({
      action: 'MEDIA_ASSET_DELETED',
      entityType: EntityType.MEDIA_ASSET,
      entityId: id,
      userId: actorId,
      previousData: {
        relatedType: existing.relatedType,
        relatedId: existing.relatedId,
        role: existing.role,
        storageKey: existing.storageKey,
      },
    });

    return { id, deleted: true };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /**
   * Enqueue une revue MEDIA dans la queue centralisée.
   *
   * Granularité : 1 item = 1 MediaAsset. Pour éviter de surcharger l'enum
   * `MarketplaceRelatedEntityType` (qui désigne les parents auxquels un média
   * peut être attaché), on réutilise le `relatedType` du média comme `entityType`
   * et on stocke l'id du média dans `entityId`. Les UUID garantissent qu'il n'y
   * a pas de collision avec un item ciblant l'entité parente. Le `reviewType=MEDIA`
   * lève l'ambiguïté côté lecture et le couple (reviewType, entityId) est en pratique
   * unique.
   */
  private async enqueueMediaReview(
    parentType: MarketplaceRelatedEntityType,
    mediaId: string,
    actorId?: string,
  ) {
    await this.reviewQueue.enqueue(
      {
        entityType: parentType,
        entityId: mediaId,
        reviewType: MarketplaceReviewType.MEDIA,
        reason: 'Modération média',
      },
      actorId,
    );
  }

  private buildMediaKey(
    relatedType: MarketplaceRelatedEntityType,
    relatedId: string,
    filename: string,
  ): string {
    const timestamp = Date.now();
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `marketplace/media/${relatedType.toLowerCase()}/${relatedId}/${timestamp}-${safe}`;
  }

  /**
   * Vérifie que l'entité cible existe et peut accepter un média.
   * Règles :
   *  - l'entité doit exister
   *  - pour SELLER_PROFILE : refus si REJECTED ou SUSPENDED
   *  - pour les autres types (products/offers/batches), on valide juste l'existence
   *    — les contrôles d'ownership fins arrivent avec P4 (marketplace-products).
   */
  private async assertRelatedEntityUploadable(
    relatedType: MarketplaceRelatedEntityType,
    relatedId: string,
    actor?: RequestUser,
  ) {
    // V2 — enforcement ownership côté seller.
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
        throw new ForbiddenException(`Upload impossible : profil vendeur ${seller.status}`);
      }
      return;
    }

    // Pour les autres entités on fait une vérification d'existence générique.
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
