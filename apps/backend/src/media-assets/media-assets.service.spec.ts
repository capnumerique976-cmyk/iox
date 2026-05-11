import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import {
  MediaAssetsService,
  MEDIA_MAX_BYTES,
  MEDIA_VIDEO_MAX_BYTES,
} from './media-assets.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../common/services/storage.service';
import { MarketplaceReviewService } from '../marketplace-review/marketplace-review.service';
import { SellerOwnershipService } from '../common/services/seller-ownership.service';
import {
  MarketplaceRelatedEntityType,
  MediaAssetRole,
  MediaModerationStatus,
  SellerProfileStatus,
} from '@iox/shared';

const ownershipMock = {
  isStaff: () => true,
  isSeller: () => false,
  scopeSellerProfileFilter: () => ({}),
  scopeRelatedEntityFilter: async () => ({}),
  assertSellerProfileOwnership: async () => {},
  assertMarketplaceProductOwnership: async () => ({}),
  assertMarketplaceOfferOwnership: async () => ({}),
  assertOfferBatchOwnership: async () => ({}),
  assertRelatedEntityOwnership: async () => {},
  canReadSellerProfile: () => true,
};

type TxClient = {
  mediaAsset: {
    create: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
};

const mockFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
  fieldname: 'file',
  originalname: 'photo.jpg',
  encoding: '7bit',
  mimetype: 'image/jpeg',
  size: 1024,
  buffer: Buffer.from('stub'),
  destination: '',
  filename: '',
  path: '',
  stream: undefined as unknown as Express.Multer.File['stream'],
  ...overrides,
});

describe('MediaAssetsService', () => {
  let service: MediaAssetsService;
  let prisma: {
    mediaAsset: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
      aggregate: jest.Mock;
    };
    sellerProfile: { findUnique: jest.Mock };
    marketplaceProduct: { findUnique: jest.Mock; updateMany: jest.Mock };
    marketplaceOffer: { findUnique: jest.Mock };
    productBatch: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let storage: { upload: jest.Mock; delete: jest.Mock; getPresignedUrl: jest.Mock };
  let audit: { log: jest.Mock };
  let reviewQueue: { enqueue: jest.Mock; resolvePendingForEntity: jest.Mock };

  beforeEach(async () => {
    const txUpdateMany = jest.fn().mockResolvedValue({ count: 0 });
    const txCreate = jest.fn();
    const txUpdate = jest.fn();

    prisma = {
      mediaAsset: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn().mockResolvedValue({}),
        count: jest.fn(),
        // Quota 30 GB : retourne 0 par défaut → aucun test existant ne dépasse le quota.
        aggregate: jest.fn().mockResolvedValue({ _sum: { sizeBytes: 0 } }),
      },
      sellerProfile: { findUnique: jest.fn() },
      marketplaceProduct: {
        findUnique: jest.fn(),
        // Cascade clear mainMediaId après delete.
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      marketplaceOffer: { findUnique: jest.fn() },
      productBatch: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    };

    // $transaction(array) → Promise.all ; $transaction(cb) → cb(tx)
    prisma.$transaction.mockImplementation(async (arg: unknown) => {
      if (typeof arg === 'function') {
        const tx: TxClient = {
          mediaAsset: {
            create: txCreate,
            update: txUpdate,
            updateMany: txUpdateMany,
          },
        };
        return (arg as (tx: TxClient) => Promise<unknown>)(tx);
      }
      return Promise.all(arg as Array<Promise<unknown>>);
    });

    storage = {
      upload: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      getPresignedUrl: jest.fn().mockResolvedValue('https://signed/url'),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    reviewQueue = {
      enqueue: jest.fn().mockResolvedValue({ id: 'r-1' }),
      resolvePendingForEntity: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaAssetsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
        { provide: StorageService, useValue: storage },
        { provide: MarketplaceReviewService, useValue: reviewQueue },
        { provide: SellerOwnershipService, useValue: ownershipMock },
      ],
    }).compile();

    service = module.get(MediaAssetsService);

    // Exposer les mocks de transaction pour les assertions
    (
      service as unknown as { _tx: { create: jest.Mock; update: jest.Mock; updateMany: jest.Mock } }
    )._tx = { create: txCreate, update: txUpdate, updateMany: txUpdateMany };
  });

  const getTxMocks = () =>
    (
      service as unknown as {
        _tx: { create: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
      }
    )._tx;

  // ── findAll / findPublic ──────────────────────────────────────────────────

  describe('findAll', () => {
    it('applique pagination + filtres', async () => {
      prisma.mediaAsset.findMany.mockResolvedValue([]);
      prisma.mediaAsset.count.mockResolvedValue(0);
      await service.findAll({
        page: 3,
        limit: 5,
        relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
        relatedId: '11111111-1111-1111-1111-111111111111',
        role: MediaAssetRole.GALLERY,
        moderationStatus: MediaModerationStatus.APPROVED,
      });
      const call = prisma.mediaAsset.findMany.mock.calls[0][0];
      expect(call.skip).toBe(10);
      expect(call.take).toBe(5);
      expect(call.where).toMatchObject({
        relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
        role: MediaAssetRole.GALLERY,
        moderationStatus: MediaModerationStatus.APPROVED,
      });
    });

    it('LOT 3 — filtre mediaType=VIDEO appliqué au where', async () => {
      prisma.mediaAsset.findMany.mockResolvedValue([]);
      prisma.mediaAsset.count.mockResolvedValue(0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await service.findAll({ mediaType: 'VIDEO' as any });
      const call = prisma.mediaAsset.findMany.mock.calls[0][0];
      expect(call.where).toMatchObject({ mediaType: 'VIDEO' });
    });

    it('LOT 3 — moderationStatus array → where.in', async () => {
      prisma.mediaAsset.findMany.mockResolvedValue([]);
      prisma.mediaAsset.count.mockResolvedValue(0);
      await service.findAll({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        moderationStatus: ['PENDING', 'REJECTED'] as any,
      });
      const call = prisma.mediaAsset.findMany.mock.calls[0][0];
      expect(call.where.moderationStatus).toEqual({ in: ['PENDING', 'REJECTED'] });
    });

    it('clamp limit à 100', async () => {
      prisma.mediaAsset.findMany.mockResolvedValue([]);
      prisma.mediaAsset.count.mockResolvedValue(0);
      await service.findAll({ limit: 9999 });
      expect(prisma.mediaAsset.findMany.mock.calls[0][0].take).toBe(100);
    });
  });

  describe('findPublic', () => {
    it('ne renvoie que les médias APPROVED', async () => {
      prisma.mediaAsset.findMany.mockResolvedValue([]);
      await service.findPublic(MarketplaceRelatedEntityType.SELLER_PROFILE, 'id');
      const call = prisma.mediaAsset.findMany.mock.calls[0][0];
      expect(call.where.moderationStatus).toBe(MediaModerationStatus.APPROVED);
    });
  });

  // ── upload validations ────────────────────────────────────────────────────

  describe('upload', () => {
    const baseDto = {
      relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
      relatedId: 'sp1',
    };

    it('refuse si fichier absent', async () => {
      await expect(service.upload(baseDto, undefined, 'u1')).rejects.toThrow(BadRequestException);
    });

    it('refuse un MIME non-image', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'sp1',
        status: SellerProfileStatus.DRAFT,
      });
      await expect(
        service.upload(baseDto, mockFile({ mimetype: 'application/pdf' }), 'u1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('refuse un fichier > 5 MB', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'sp1',
        status: SellerProfileStatus.DRAFT,
      });
      await expect(
        service.upload(baseDto, mockFile({ size: MEDIA_MAX_BYTES + 1 }), 'u1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('refuse si seller profile REJECTED', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'sp1',
        status: SellerProfileStatus.REJECTED,
      });
      await expect(service.upload(baseDto, mockFile(), 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('refuse si seller profile SUSPENDED', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'sp1',
        status: SellerProfileStatus.SUSPENDED,
      });
      await expect(service.upload(baseDto, mockFile(), 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('refuse si entité cible inexistante', async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue(null);
      await expect(
        service.upload(
          {
            relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
            relatedId: 'mp1',
          },
          mockFile(),
          'u1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('upload: stocke, crée en PENDING, log audit', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'sp1',
        status: SellerProfileStatus.APPROVED,
      });
      const { create, updateMany } = getTxMocks();
      create.mockResolvedValue({
        id: 'media1',
        relatedType: baseDto.relatedType,
        relatedId: baseDto.relatedId,
        role: MediaAssetRole.GALLERY,
        storageKey: 'key',
        sizeBytes: 1024,
      });

      const res = await service.upload(baseDto, mockFile(), 'user-1');

      expect(storage.upload).toHaveBeenCalledTimes(1);
      const [storageKey, buffer, mime] = storage.upload.mock.calls[0];
      expect(storageKey).toMatch(/^marketplace\/media\/seller_profile\/sp1\/\d+-photo\.jpg$/);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(mime).toBe('image/jpeg');

      expect(updateMany).not.toHaveBeenCalled();
      expect(create).toHaveBeenCalled();
      const data = create.mock.calls[0][0].data;
      expect(data.moderationStatus).toBe(MediaModerationStatus.PENDING);
      expect(data.uploadedByUserId).toBe('user-1');
      expect(data.role).toBe(MediaAssetRole.GALLERY);

      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MEDIA_ASSET_UPLOADED',
        }),
      );
      expect(res.id).toBe('media1');
    });

    it('upload PRIMARY : rétrograde les autres PRIMARY en GALLERY', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'sp1',
        status: SellerProfileStatus.APPROVED,
      });
      const { create, updateMany } = getTxMocks();
      create.mockResolvedValue({ id: 'media2', role: MediaAssetRole.PRIMARY });

      await service.upload({ ...baseDto, role: MediaAssetRole.PRIMARY }, mockFile(), 'u1');

      expect(updateMany).toHaveBeenCalledTimes(1);
      const call = updateMany.mock.calls[0][0];
      expect(call.where).toMatchObject({
        relatedType: baseDto.relatedType,
        relatedId: baseDto.relatedId,
        role: MediaAssetRole.PRIMARY,
      });
      expect(call.data.role).toBe(MediaAssetRole.GALLERY);
    });
  });

  // ── update / setPrimary ───────────────────────────────────────────────────

  describe('update', () => {
    it('update metadata sans changer modération', async () => {
      prisma.mediaAsset.findUnique.mockResolvedValue({
        id: 'm1',
        role: MediaAssetRole.GALLERY,
        moderationStatus: MediaModerationStatus.APPROVED,
        relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
        relatedId: 'sp1',
      });
      const { update, updateMany } = getTxMocks();
      update.mockResolvedValue({ id: 'm1', role: MediaAssetRole.GALLERY });

      await service.update('m1', { altTextFr: 'alt', sortOrder: 3 }, 'u1');

      expect(updateMany).not.toHaveBeenCalled();
      const data = update.mock.calls[0][0].data;
      expect(data.altTextFr).toBe('alt');
      expect(data.moderationStatus).toBeUndefined();
    });

    it('update role → PRIMARY depuis APPROVED : bascule PENDING + rétrograde autres', async () => {
      prisma.mediaAsset.findUnique.mockResolvedValue({
        id: 'm1',
        role: MediaAssetRole.GALLERY,
        moderationStatus: MediaModerationStatus.APPROVED,
        relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
        relatedId: 'sp1',
      });
      const { update, updateMany } = getTxMocks();
      update.mockResolvedValue({
        id: 'm1',
        role: MediaAssetRole.PRIMARY,
        moderationStatus: MediaModerationStatus.PENDING,
      });

      await service.update('m1', { role: MediaAssetRole.PRIMARY }, 'u1');

      expect(updateMany).toHaveBeenCalledTimes(1);
      const data = update.mock.calls[0][0].data;
      expect(data.role).toBe(MediaAssetRole.PRIMARY);
      expect(data.moderationStatus).toBe(MediaModerationStatus.PENDING);
    });
  });

  describe('setPrimary', () => {
    it('no-op si déjà PRIMARY', async () => {
      prisma.mediaAsset.findUnique.mockResolvedValue({
        id: 'm1',
        role: MediaAssetRole.PRIMARY,
      });
      const res = await service.setPrimary('m1', 'u1');
      expect(res.role).toBe(MediaAssetRole.PRIMARY);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rétrograde les autres et force PENDING si approved', async () => {
      prisma.mediaAsset.findUnique.mockResolvedValue({
        id: 'm1',
        role: MediaAssetRole.GALLERY,
        moderationStatus: MediaModerationStatus.APPROVED,
        relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
        relatedId: 'sp1',
      });
      const { update, updateMany } = getTxMocks();
      update.mockResolvedValue({
        id: 'm1',
        role: MediaAssetRole.PRIMARY,
        moderationStatus: MediaModerationStatus.PENDING,
      });

      await service.setPrimary('m1', 'u1');

      expect(updateMany).toHaveBeenCalledTimes(1);
      expect(updateMany.mock.calls[0][0].where).toMatchObject({
        relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
        relatedId: 'sp1',
        role: MediaAssetRole.PRIMARY,
        id: { not: 'm1' },
      });
      const data = update.mock.calls[0][0].data;
      expect(data.role).toBe(MediaAssetRole.PRIMARY);
      expect(data.moderationStatus).toBe(MediaModerationStatus.PENDING);
    });
  });

  // ── modération ────────────────────────────────────────────────────────────

  describe('approve / reject', () => {
    it('approve : passe APPROVED et clear reason, logue', async () => {
      prisma.mediaAsset.findUnique.mockResolvedValue({
        id: 'm1',
        moderationStatus: MediaModerationStatus.PENDING,
      });
      prisma.mediaAsset.update.mockResolvedValue({
        id: 'm1',
        moderationStatus: MediaModerationStatus.APPROVED,
      });
      await service.approve('m1', 'admin');
      const data = prisma.mediaAsset.update.mock.calls[0][0].data;
      expect(data.moderationStatus).toBe(MediaModerationStatus.APPROVED);
      expect(data.moderationReason).toBeNull();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MEDIA_ASSET_APPROVED',
        }),
      );
    });

    it('approve : no-op si déjà APPROVED', async () => {
      prisma.mediaAsset.findUnique.mockResolvedValue({
        id: 'm1',
        moderationStatus: MediaModerationStatus.APPROVED,
      });
      await service.approve('m1', 'admin');
      expect(prisma.mediaAsset.update).not.toHaveBeenCalled();
    });

    it('reject : exige un motif ≥ 3 caractères', async () => {
      prisma.mediaAsset.findUnique.mockResolvedValue({
        id: 'm1',
        moderationStatus: MediaModerationStatus.PENDING,
      });
      await expect(service.reject('m1', { reason: 'x' }, 'admin')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('reject : passe REJECTED avec raison', async () => {
      prisma.mediaAsset.findUnique.mockResolvedValue({
        id: 'm1',
        moderationStatus: MediaModerationStatus.PENDING,
      });
      prisma.mediaAsset.update.mockResolvedValue({
        id: 'm1',
        moderationStatus: MediaModerationStatus.REJECTED,
      });
      await service.reject('m1', { reason: 'Image floue' }, 'admin');
      const data = prisma.mediaAsset.update.mock.calls[0][0].data;
      expect(data.moderationStatus).toBe(MediaModerationStatus.REJECTED);
      expect(data.moderationReason).toBe('Image floue');
    });
  });

  // ── suppression ───────────────────────────────────────────────────────────

  describe('delete', () => {
    it('supprime DB + stockage et logue', async () => {
      prisma.mediaAsset.findUnique.mockResolvedValue({
        id: 'm1',
        storageKey: 'marketplace/media/seller_profile/sp1/xxx',
        relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
        relatedId: 'sp1',
        role: MediaAssetRole.GALLERY,
      });
      const res = await service.delete('m1', 'u1');
      expect(prisma.mediaAsset.delete).toHaveBeenCalledWith({ where: { id: 'm1' } });
      expect(storage.delete).toHaveBeenCalledWith('marketplace/media/seller_profile/sp1/xxx');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MEDIA_ASSET_DELETED',
        }),
      );
      expect(res).toEqual({ id: 'm1', deleted: true });
    });
  });

  // ── URL signée ────────────────────────────────────────────────────────────

  describe('getUrl', () => {
    it('délègue à StorageService.getPresignedUrl', async () => {
      prisma.mediaAsset.findUnique.mockResolvedValue({
        id: 'm1',
        storageKey: 'key',
      });
      const res = await service.getUrl('m1');
      expect(storage.getPresignedUrl).toHaveBeenCalledWith('key', 3600);
      expect(res).toEqual({ id: 'm1', url: 'https://signed/url', expiresIn: 3600 });
    });
  });

  // ── Review queue integration ──────────────────────────────────────────────

  describe('review queue integration', () => {
    const sellerActive = { id: 'sp1', status: SellerProfileStatus.APPROVED };

    it('upload → enqueue MEDIA review avec entityId=mediaId et entityType=parent', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue(sellerActive);
      const created = {
        id: 'm-new',
        relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
        relatedId: 'sp1',
        moderationStatus: MediaModerationStatus.PENDING,
      };
      const tx = (service as unknown as { _tx: { create: jest.Mock } })._tx;
      tx.create.mockResolvedValue(created);

      await service.upload(
        {
          relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
          relatedId: 'sp1',
        },
        mockFile(),
        'u1',
      );

      expect(reviewQueue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: MarketplaceRelatedEntityType.SELLER_PROFILE,
          entityId: 'm-new',
          reviewType: 'MEDIA',
        }),
        'u1',
      );
    });

    it('approve → resolvePendingForEntity APPROVED', async () => {
      prisma.mediaAsset.findUnique.mockResolvedValue({
        id: 'm1',
        relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
        moderationStatus: MediaModerationStatus.PENDING,
      });
      prisma.mediaAsset.update.mockResolvedValue({
        id: 'm1',
        moderationStatus: MediaModerationStatus.APPROVED,
      });

      await service.approve('m1', 'admin');

      expect(reviewQueue.resolvePendingForEntity).toHaveBeenCalledWith(
        MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
        'm1',
        'MEDIA',
        'APPROVED',
        expect.any(String),
        'admin',
      );
    });

    it("approve idempotent sur déjà APPROVED → n'appelle PAS resolvePending", async () => {
      prisma.mediaAsset.findUnique.mockResolvedValue({
        id: 'm1',
        relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
        moderationStatus: MediaModerationStatus.APPROVED,
      });

      await service.approve('m1', 'admin');

      expect(reviewQueue.resolvePendingForEntity).not.toHaveBeenCalled();
      expect(prisma.mediaAsset.update).not.toHaveBeenCalled();
    });

    it('reject → resolvePendingForEntity REJECTED avec motif', async () => {
      prisma.mediaAsset.findUnique.mockResolvedValue({
        id: 'm1',
        relatedType: MarketplaceRelatedEntityType.MARKETPLACE_OFFER,
        moderationStatus: MediaModerationStatus.PENDING,
      });
      prisma.mediaAsset.update.mockResolvedValue({
        id: 'm1',
        moderationStatus: MediaModerationStatus.REJECTED,
      });

      await service.reject('m1', { reason: 'Qualité insuffisante' }, 'admin');

      expect(reviewQueue.resolvePendingForEntity).toHaveBeenCalledWith(
        MarketplaceRelatedEntityType.MARKETPLACE_OFFER,
        'm1',
        'MEDIA',
        'REJECTED',
        'Qualité insuffisante',
        'admin',
      );
    });

    it('delete → resolve pending avec motif "Média supprimé" puis supprime', async () => {
      prisma.mediaAsset.findUnique.mockResolvedValue({
        id: 'm1',
        relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
        relatedId: 'sp1',
        storageKey: 'key',
      });

      await service.delete('m1', 'admin');

      expect(reviewQueue.resolvePendingForEntity).toHaveBeenCalledWith(
        MarketplaceRelatedEntityType.SELLER_PROFILE,
        'm1',
        'MEDIA',
        'REJECTED',
        'Média supprimé',
        'admin',
      );
      expect(prisma.mediaAsset.delete).toHaveBeenCalledWith({ where: { id: 'm1' } });
    });

    it('setPrimary bascule APPROVED→PENDING → nouvel enqueue', async () => {
      prisma.mediaAsset.findUnique.mockResolvedValue({
        id: 'm1',
        relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
        relatedId: 'sp1',
        role: MediaAssetRole.GALLERY,
        moderationStatus: MediaModerationStatus.APPROVED,
      });
      const tx = (service as unknown as { _tx: { update: jest.Mock; updateMany: jest.Mock } })._tx;
      tx.updateMany.mockResolvedValue({ count: 0 });
      tx.update.mockResolvedValue({
        id: 'm1',
        relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
        role: MediaAssetRole.PRIMARY,
        moderationStatus: MediaModerationStatus.PENDING,
      });

      await service.setPrimary('m1', 'u1');

      expect(reviewQueue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          entityId: 'm1',
          reviewType: 'MEDIA',
        }),
        'u1',
      );
    });

    it('setPrimary sur déjà PENDING ne re-enqueue pas', async () => {
      prisma.mediaAsset.findUnique.mockResolvedValue({
        id: 'm1',
        relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
        relatedId: 'sp1',
        role: MediaAssetRole.GALLERY,
        moderationStatus: MediaModerationStatus.PENDING,
      });
      const tx = (service as unknown as { _tx: { update: jest.Mock; updateMany: jest.Mock } })._tx;
      tx.updateMany.mockResolvedValue({ count: 0 });
      tx.update.mockResolvedValue({
        id: 'm1',
        relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
        role: MediaAssetRole.PRIMARY,
        moderationStatus: MediaModerationStatus.PENDING,
      });

      await service.setPrimary('m1', 'u1');

      expect(reviewQueue.enqueue).not.toHaveBeenCalled();
    });
  });

  // ── MP-MEDIA-1 LOT 1 — reorder ────────────────────────────────────────────

  describe('reorder', () => {
    const productId = '22222222-2222-2222-2222-222222222222';
    const otherProductId = '33333333-3333-3333-3333-333333333333';

    it('happy path : 3 items même produit → transaction OK + audit', async () => {
      prisma.mediaAsset.findMany.mockResolvedValue([
        { id: 'm1', relatedType: 'MARKETPLACE_PRODUCT', relatedId: productId },
        { id: 'm2', relatedType: 'MARKETPLACE_PRODUCT', relatedId: productId },
        { id: 'm3', relatedType: 'MARKETPLACE_PRODUCT', relatedId: productId },
      ]);
      prisma.mediaAsset.update.mockResolvedValue({});

      const res = await service.reorder(
        {
          items: [
            { id: 'm1', sortOrder: 0 },
            { id: 'm2', sortOrder: 1 },
            { id: 'm3', sortOrder: 2 },
          ],
        },
        'actor-1',
      );

      expect(res).toEqual({ count: 3 });
      // 3 update calls (one per item)
      expect(prisma.mediaAsset.update).toHaveBeenCalledTimes(3);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MEDIA_ASSETS_REORDERED',
          entityId: productId,
        }),
      );
    });

    it('mix items différents produits → ForbiddenException', async () => {
      prisma.mediaAsset.findMany.mockResolvedValue([
        { id: 'm1', relatedType: 'MARKETPLACE_PRODUCT', relatedId: productId },
        { id: 'm2', relatedType: 'MARKETPLACE_PRODUCT', relatedId: otherProductId },
      ]);

      await expect(
        service.reorder(
          {
            items: [
              { id: 'm1', sortOrder: 0 },
              { id: 'm2', sortOrder: 1 },
            ],
          },
          'actor-1',
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.mediaAsset.update).not.toHaveBeenCalled();
    });

    it('certains ids introuvables → NotFoundException', async () => {
      prisma.mediaAsset.findMany.mockResolvedValue([
        { id: 'm1', relatedType: 'MARKETPLACE_PRODUCT', relatedId: productId },
      ]);

      await expect(
        service.reorder(
          {
            items: [
              { id: 'm1', sortOrder: 0 },
              { id: 'm2', sortOrder: 1 },
            ],
          },
          'actor-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('non-propriétaire → ForbiddenException via assertRelatedEntityOwnership', async () => {
      prisma.mediaAsset.findMany.mockResolvedValue([
        { id: 'm1', relatedType: 'MARKETPLACE_PRODUCT', relatedId: productId },
      ]);
      const failingOwnership = {
        ...ownershipMock,
        assertRelatedEntityOwnership: jest.fn().mockRejectedValue(new ForbiddenException('nope')),
      };
      const module2: TestingModule = await Test.createTestingModule({
        providers: [
          MediaAssetsService,
          { provide: PrismaService, useValue: prisma },
          { provide: AuditService, useValue: audit },
          { provide: StorageService, useValue: storage },
          { provide: MarketplaceReviewService, useValue: reviewQueue },
          { provide: SellerOwnershipService, useValue: failingOwnership },
        ],
      }).compile();
      const localService = module2.get(MediaAssetsService);

      await expect(
        localService.reorder(
          { items: [{ id: 'm1', sortOrder: 0 }] },
          'actor-1',
          {
            id: 'actor-1',
            email: 'a@a',
            role: 'MARKETPLACE_SELLER' as never,
            sellerProfileIds: [],
            companyIds: [],
          },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('1 seul item OK (cap min = 1)', async () => {
      prisma.mediaAsset.findMany.mockResolvedValue([
        { id: 'm1', relatedType: 'MARKETPLACE_PRODUCT', relatedId: productId },
      ]);
      prisma.mediaAsset.update.mockResolvedValue({});
      const res = await service.reorder(
        { items: [{ id: 'm1', sortOrder: 5 }] },
        'actor-1',
      );
      expect(res.count).toBe(1);
    });
  });

  // ── MP-MEDIA-1 LOT 1 — GALLERY upload ─────────────────────────────────────

  describe('upload — GALLERY role', () => {
    const productId = '44444444-4444-4444-4444-444444444444';

    it('upload role=GALLERY produit → OK (pas d\'erreur, role conservé)', async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue({ id: productId });
      const txCreate = getTxMocks().create;
      txCreate.mockResolvedValue({
        id: 'media-gal',
        relatedType: 'MARKETPLACE_PRODUCT',
        relatedId: productId,
        role: 'GALLERY',
        storageKey: 'k',
        sizeBytes: 1024,
      });

      const res = await service.upload(
        {
          relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
          relatedId: productId,
          role: MediaAssetRole.GALLERY,
        },
        mockFile(),
        'actor-1',
      );

      expect(res.role).toBe('GALLERY');
      expect(txCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: MediaAssetRole.GALLERY }),
        }),
      );
    });

    it('upload mp4 vidéo : mediaType=VIDEO résolu côté serveur', async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue({ id: productId });
      const tx = getTxMocks();
      tx.create.mockResolvedValue({
        id: 'media-vid',
        relatedType: 'MARKETPLACE_PRODUCT',
        relatedId: productId,
        role: 'GALLERY',
        mediaType: 'VIDEO',
      });
      await service.upload(
        {
          relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
          relatedId: productId,
        },
        mockFile({ mimetype: 'video/mp4', size: 1024 * 1024, originalname: 'demo.mp4' }),
        'actor-1',
      );
      const data = tx.create.mock.calls[0][0].data;
      expect(data.mediaType).toBe('VIDEO');
      expect(data.mimeType).toBe('video/mp4');
    });

    it('upload webm vidéo : accepté', async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue({ id: productId });
      const tx = getTxMocks();
      tx.create.mockResolvedValue({ id: 'mv2', mediaType: 'VIDEO' });
      await service.upload(
        {
          relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
          relatedId: productId,
        },
        mockFile({ mimetype: 'video/webm', size: 2 * 1024 * 1024, originalname: 'd.webm' }),
        'actor-1',
      );
      expect(tx.create).toHaveBeenCalled();
    });

    it('upload vidéo > 50 MB → BadRequestException', async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue({ id: productId });
      await expect(
        service.upload(
          {
            relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
            relatedId: productId,
          },
          mockFile({
            mimetype: 'video/mp4',
            size: MEDIA_VIDEO_MAX_BYTES + 1,
            originalname: 'huge.mp4',
          }),
          'actor-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('upload MIME vidéo non whitelisté (avi) → BadRequestException', async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue({ id: productId });
      await expect(
        service.upload(
          {
            relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
            relatedId: productId,
          },
          mockFile({ mimetype: 'video/x-msvideo', size: 1024, originalname: 'd.avi' }),
          'actor-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('upload role=GALLERY ne dégrade PAS un PRIMARY existant', async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue({ id: productId });
      const tx = getTxMocks();
      tx.create.mockResolvedValue({
        id: 'media-gal-2',
        role: 'GALLERY',
        relatedType: 'MARKETPLACE_PRODUCT',
        relatedId: productId,
      });
      await service.upload(
        {
          relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
          relatedId: productId,
          role: MediaAssetRole.GALLERY,
        },
        mockFile(),
        'actor-1',
      );
      // Branche updateMany (rétrogradage PRIMARY) ne doit PAS être appelée pour GALLERY
      expect(tx.updateMany).not.toHaveBeenCalled();
    });
  });

  // ── Quota 30 GB ───────────────────────────────────────────────────────────

  describe('upload — quota 30 GB', () => {
    const GB = 1024 * 1024 * 1024;
    const QUOTA = 30 * GB;

    it('upload accepté si usedBytes + file.size ≤ quota', async () => {
      // usedBytes = 29 GB, file = 512 KB → total < 30 GB
      prisma.mediaAsset.aggregate.mockResolvedValue({ _sum: { sizeBytes: 29 * GB } });
      prisma.marketplaceProduct.findUnique.mockResolvedValue({ id: 'p-quota' });
      const tx = getTxMocks();
      tx.create.mockResolvedValue({
        id: 'media-q-ok',
        relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
        relatedId: 'p-quota',
      });
      await expect(
        service.upload(
          {
            relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
            relatedId: 'p-quota',
          },
          mockFile({ size: 512 * 1024 }), // 512 KB
          'actor-q',
        ),
      ).resolves.not.toThrow();
    });

    it('upload rejeté si usedBytes + file.size > quota (BadRequestException)', async () => {
      // usedBytes = quota exact, file = 1 byte → dépasse
      prisma.mediaAsset.aggregate.mockResolvedValue({ _sum: { sizeBytes: QUOTA } });
      prisma.marketplaceProduct.findUnique.mockResolvedValue({ id: 'p-over' });
      await expect(
        service.upload(
          {
            relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
            relatedId: 'p-over',
          },
          mockFile({ size: 1 }),
          'actor-q',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('aggregate appelé avec where.relatedType = MARKETPLACE_PRODUCT', async () => {
      prisma.mediaAsset.aggregate.mockResolvedValue({ _sum: { sizeBytes: 0 } });
      prisma.marketplaceProduct.findUnique.mockResolvedValue({ id: 'p-agg' });
      const tx = getTxMocks();
      tx.create.mockResolvedValue({
        id: 'm-agg',
        relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
        relatedId: 'p-agg',
      });
      await service.upload(
        {
          relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
          relatedId: 'p-agg',
        },
        mockFile(),
        'actor-agg',
      );
      expect(prisma.mediaAsset.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
          }),
        }),
      );
    });
  });

  // ── Delete cascade mainMediaId ────────────────────────────────────────────

  describe('delete — cascade clear mainMediaId', () => {
    it('efface mainMediaId sur MarketplaceProduct si ce média était référencé', async () => {
      const mediaId = 'media-primary-1';
      prisma.mediaAsset.findUnique.mockResolvedValue({
        id: mediaId,
        storageKey: 'marketplace/media/marketplace_product/p1/xxx',
        relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
        relatedId: 'p1',
        role: MediaAssetRole.PRIMARY,
      });
      await service.delete(mediaId, 'u1');
      expect(prisma.marketplaceProduct.updateMany).toHaveBeenCalledWith({
        where: { id: 'p1', mainMediaId: mediaId },
        data: { mainMediaId: null },
      });
    });

    it('ne tente PAS de clear mainMediaId si relatedType = SELLER_PROFILE', async () => {
      prisma.mediaAsset.findUnique.mockResolvedValue({
        id: 'media-sp',
        storageKey: 'marketplace/media/seller_profile/sp1/yyy',
        relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
        relatedId: 'sp1',
        role: MediaAssetRole.GALLERY,
      });
      await service.delete('media-sp', 'u1');
      expect(prisma.marketplaceProduct.updateMany).not.toHaveBeenCalled();
    });
  });
});
