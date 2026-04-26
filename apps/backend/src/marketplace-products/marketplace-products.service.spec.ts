import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { MarketplaceProductsService } from './marketplace-products.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MarketplaceReviewService } from '../marketplace-review/marketplace-review.service';
import { SellerOwnershipService } from '../common/services/seller-ownership.service';
import {
  ExportReadinessStatus,
  MarketplacePublicationStatus,
  MarketplaceRelatedEntityType,
  MediaAssetRole,
  MediaModerationStatus,
  SellerProfileStatus,
  UserRole,
  RequestUser,
} from '@iox/shared';

const ADMIN: RequestUser = {
  id: 'u1',
  email: 'a@a',
  role: UserRole.ADMIN,
  sellerProfileIds: [],
  companyIds: [],
};
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

describe('MarketplaceProductsService', () => {
  let service: MarketplaceProductsService;
  let prisma: {
    marketplaceProduct: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    product: { findFirst: jest.Mock };
    sellerProfile: { findUnique: jest.Mock };
    marketplaceCategory: { findUnique: jest.Mock };
    mediaAsset: { count: jest.Mock };
    $transaction: jest.Mock;
  };
  let audit: { log: jest.Mock };
  let reviewQueue: { enqueue: jest.Mock; resolvePendingForEntity: jest.Mock };

  beforeEach(async () => {
    prisma = {
      marketplaceProduct: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      product: { findFirst: jest.fn() },
      sellerProfile: { findUnique: jest.fn() },
      marketplaceCategory: { findUnique: jest.fn() },
      mediaAsset: { count: jest.fn() },
      $transaction: jest.fn((ops: Array<Promise<unknown>>) => Promise.all(ops)),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    reviewQueue = {
      enqueue: jest.fn().mockResolvedValue({ id: 'r-1' }),
      resolvePendingForEntity: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceProductsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
        { provide: MarketplaceReviewService, useValue: reviewQueue },
        { provide: SellerOwnershipService, useValue: ownershipMock },
      ],
    }).compile();

    service = module.get(MarketplaceProductsService);
  });

  // ── CRUD ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto = {
      productId: 'p1',
      sellerProfileId: 'sp1',
      slug: 'mp',
      commercialName: 'Nom',
      originCountry: 'YT',
    };

    it('404 si Product IOX inexistant', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      prisma.sellerProfile.findUnique.mockResolvedValue({ id: 'sp1' });
      prisma.marketplaceProduct.findUnique.mockResolvedValue(null);
      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('404 si seller inexistant', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'p1' });
      prisma.sellerProfile.findUnique.mockResolvedValue(null);
      prisma.marketplaceProduct.findUnique.mockResolvedValue(null);
      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('409 si slug déjà pris', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'p1' });
      prisma.sellerProfile.findUnique.mockResolvedValue({ id: 'sp1' });
      prisma.marketplaceProduct.findUnique.mockResolvedValue({ id: 'other' });
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('crée en DRAFT, PENDING_QUALITY_REVIEW, score calculé, audit', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'p1' });
      prisma.sellerProfile.findUnique.mockResolvedValue({ id: 'sp1' });
      prisma.marketplaceProduct.findUnique.mockResolvedValue(null);
      prisma.marketplaceProduct.create.mockResolvedValue({
        id: 'mp1',
        slug: 'mp',
        sellerProfileId: 'sp1',
        publicationStatus: MarketplacePublicationStatus.DRAFT,
      });
      await service.create(dto, ADMIN);
      const data = prisma.marketplaceProduct.create.mock.calls[0][0].data;
      expect(data.publicationStatus).toBe(MarketplacePublicationStatus.DRAFT);
      expect(data.exportReadinessStatus).toBe(ExportReadinessStatus.PENDING_QUALITY_REVIEW);
      expect(typeof data.completionScore).toBe('number');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MARKETPLACE_PRODUCT_CREATED',
        }),
      );
    });
  });

  describe('update', () => {
    it('recalcule le completionScore', async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue({
        id: 'mp1',
        slug: 'mp',
        publicationStatus: MarketplacePublicationStatus.DRAFT,
        commercialName: 'Nom',
        originCountry: 'YT',
      });
      prisma.marketplaceProduct.update.mockResolvedValue({
        id: 'mp1',
        slug: 'mp',
        publicationStatus: MarketplacePublicationStatus.DRAFT,
        completionScore: 10,
      });
      await service.update('mp1', { descriptionShort: 'x' });
      const data = prisma.marketplaceProduct.update.mock.calls[0][0].data;
      expect(typeof data.completionScore).toBe('number');
      expect(data.publicationStatus).toBeUndefined();
    });

    it('APPROVED + champ vitrine → repasse IN_REVIEW', async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue({
        id: 'mp1',
        slug: 'mp',
        publicationStatus: MarketplacePublicationStatus.APPROVED,
      });
      prisma.marketplaceProduct.update.mockResolvedValue({ id: 'mp1' });
      await service.update('mp1', { descriptionShort: 'edit' });
      const data = prisma.marketplaceProduct.update.mock.calls[0][0].data;
      expect(data.publicationStatus).toBe(MarketplacePublicationStatus.IN_REVIEW);
    });

    it('APPROVED + champ non-vitrine (defaultUnit) → pas de recheck', async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue({
        id: 'mp1',
        slug: 'mp',
        publicationStatus: MarketplacePublicationStatus.APPROVED,
      });
      prisma.marketplaceProduct.update.mockResolvedValue({ id: 'mp1' });
      await service.update('mp1', { defaultUnit: 'kg' });
      const data = prisma.marketplaceProduct.update.mock.calls[0][0].data;
      expect(data.publicationStatus).toBeUndefined();
    });
  });

  // ── Workflow ──────────────────────────────────────────────────────────────

  describe('submitForReview', () => {
    it('refuse si statut ≠ DRAFT/REJECTED', async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue({
        id: 'mp1',
        publicationStatus: MarketplacePublicationStatus.APPROVED,
      });
      await expect(service.submitForReview('mp1')).rejects.toThrow(BadRequestException);
    });

    it('refuse si champ obligatoire manquant', async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue({
        id: 'mp1',
        publicationStatus: MarketplacePublicationStatus.DRAFT,
        commercialName: 'Nom',
        slug: 'mp',
        originCountry: 'YT',
        descriptionShort: null,
        packagingDescription: null,
        storageConditions: null,
      });
      await expect(service.submitForReview('mp1')).rejects.toThrow(BadRequestException);
    });

    it('DRAFT → IN_REVIEW avec submittedAt', async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue({
        id: 'mp1',
        publicationStatus: MarketplacePublicationStatus.DRAFT,
        commercialName: 'Nom',
        slug: 'mp',
        originCountry: 'YT',
        descriptionShort: 'd',
        packagingDescription: 'p',
        storageConditions: 's',
        // FP-1 — saisonnalité : produit déclaré disponible toute l'année
        isYearRound: true,
        availabilityMonths: [],
      });
      prisma.marketplaceProduct.update.mockResolvedValue({
        id: 'mp1',
        publicationStatus: MarketplacePublicationStatus.IN_REVIEW,
      });
      await service.submitForReview('mp1', ADMIN);
      const data = prisma.marketplaceProduct.update.mock.calls[0][0].data;
      expect(data.publicationStatus).toBe(MarketplacePublicationStatus.IN_REVIEW);
      expect(data.submittedAt).toBeInstanceOf(Date);
    });
  });

  describe('approve', () => {
    it('refuse si pas IN_REVIEW', async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue({
        id: 'mp1',
        publicationStatus: MarketplacePublicationStatus.DRAFT,
        sellerProfile: { status: SellerProfileStatus.APPROVED },
      });
      await expect(service.approve('mp1')).rejects.toThrow(BadRequestException);
    });

    it("refuse si seller n'est pas APPROVED", async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue({
        id: 'mp1',
        publicationStatus: MarketplacePublicationStatus.IN_REVIEW,
        sellerProfile: { status: SellerProfileStatus.PENDING_REVIEW },
      });
      await expect(service.approve('mp1')).rejects.toThrow(BadRequestException);
    });

    it('IN_REVIEW + seller APPROVED → APPROVED', async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue({
        id: 'mp1',
        publicationStatus: MarketplacePublicationStatus.IN_REVIEW,
        sellerProfile: { status: SellerProfileStatus.APPROVED },
      });
      prisma.marketplaceProduct.update.mockResolvedValue({
        id: 'mp1',
        publicationStatus: MarketplacePublicationStatus.APPROVED,
      });
      await service.approve('mp1', 'admin');
      const data = prisma.marketplaceProduct.update.mock.calls[0][0].data;
      expect(data.publicationStatus).toBe(MarketplacePublicationStatus.APPROVED);
      expect(data.approvedAt).toBeInstanceOf(Date);
    });
  });

  describe('publish — gates', () => {
    const baseMp = {
      id: 'mp1',
      publicationStatus: MarketplacePublicationStatus.APPROVED,
      exportReadinessStatus: ExportReadinessStatus.EXPORT_READY,
      sellerProfile: { status: SellerProfileStatus.APPROVED },
    };

    it('refuse si pas APPROVED', async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue({
        ...baseMp,
        publicationStatus: MarketplacePublicationStatus.DRAFT,
      });
      await expect(service.publish('mp1')).rejects.toThrow(BadRequestException);
    });

    it('refuse si seller pas APPROVED', async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue({
        ...baseMp,
        sellerProfile: { status: SellerProfileStatus.SUSPENDED },
      });
      await expect(service.publish('mp1')).rejects.toThrow(BadRequestException);
    });

    it('refuse si aucune image PRIMARY APPROVED', async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue(baseMp);
      prisma.mediaAsset.count.mockResolvedValue(0);
      await expect(service.publish('mp1')).rejects.toThrow(BadRequestException);
      expect(prisma.mediaAsset.count).toHaveBeenCalledWith({
        where: {
          relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
          relatedId: 'mp1',
          role: MediaAssetRole.PRIMARY,
          moderationStatus: MediaModerationStatus.APPROVED,
        },
      });
    });

    it('refuse si readiness incompatible (PENDING_QUALITY_REVIEW)', async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue({
        ...baseMp,
        exportReadinessStatus: ExportReadinessStatus.PENDING_QUALITY_REVIEW,
      });
      prisma.mediaAsset.count.mockResolvedValue(1);
      await expect(service.publish('mp1')).rejects.toThrow(BadRequestException);
    });

    it('refuse si readiness NOT_ELIGIBLE', async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue({
        ...baseMp,
        exportReadinessStatus: ExportReadinessStatus.NOT_ELIGIBLE,
      });
      prisma.mediaAsset.count.mockResolvedValue(1);
      await expect(service.publish('mp1')).rejects.toThrow(BadRequestException);
    });

    it('publie si toutes les gates passent', async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue(baseMp);
      prisma.mediaAsset.count.mockResolvedValue(1);
      prisma.marketplaceProduct.update.mockResolvedValue({
        id: 'mp1',
        publicationStatus: MarketplacePublicationStatus.PUBLISHED,
      });
      await service.publish('mp1', 'admin');
      const data = prisma.marketplaceProduct.update.mock.calls[0][0].data;
      expect(data.publicationStatus).toBe(MarketplacePublicationStatus.PUBLISHED);
      expect(data.publishedAt).toBeInstanceOf(Date);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MARKETPLACE_PRODUCT_PUBLISHED',
        }),
      );
    });
  });

  describe('suspend / archive / setExportReadiness', () => {
    it('suspend refuse si pas PUBLISHED', async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue({
        id: 'mp1',
        publicationStatus: MarketplacePublicationStatus.DRAFT,
      });
      await expect(service.suspend('mp1', { reason: 'x' })).rejects.toThrow(BadRequestException);
    });

    it('suspend PUBLISHED → SUSPENDED', async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue({
        id: 'mp1',
        publicationStatus: MarketplacePublicationStatus.PUBLISHED,
      });
      prisma.marketplaceProduct.update.mockResolvedValue({
        id: 'mp1',
        publicationStatus: MarketplacePublicationStatus.SUSPENDED,
      });
      await service.suspend('mp1', { reason: 'Non-conf' });
      const data = prisma.marketplaceProduct.update.mock.calls[0][0].data;
      expect(data.publicationStatus).toBe(MarketplacePublicationStatus.SUSPENDED);
    });

    it('archive : idempotent si déjà ARCHIVED', async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue({
        id: 'mp1',
        publicationStatus: MarketplacePublicationStatus.ARCHIVED,
      });
      const res = await service.archive('mp1');
      expect(res.publicationStatus).toBe(MarketplacePublicationStatus.ARCHIVED);
      expect(prisma.marketplaceProduct.update).not.toHaveBeenCalled();
    });

    it('setExportReadiness met à jour + audit', async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue({
        id: 'mp1',
        exportReadinessStatus: ExportReadinessStatus.PENDING_QUALITY_REVIEW,
        complianceStatusSnapshot: null,
      });
      prisma.marketplaceProduct.update.mockResolvedValue({
        id: 'mp1',
        exportReadinessStatus: ExportReadinessStatus.EXPORT_READY,
      });
      await service.setExportReadiness('mp1', {
        status: ExportReadinessStatus.EXPORT_READY,
        complianceStatusSnapshot: 'ok',
      });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MARKETPLACE_PRODUCT_READINESS_CHANGED',
        }),
      );
    });
  });

  // ── FP-1 : Saisonnalité ───────────────────────────────────────────────────

  describe('FP-1 saisonnalité', () => {
    const baseCreateDto = {
      productId: 'p1',
      sellerProfileId: 'sp1',
      slug: 'mp',
      commercialName: 'Nom',
      originCountry: 'YT',
    };

    beforeEach(() => {
      prisma.product.findFirst.mockResolvedValue({ id: 'p1' });
      prisma.sellerProfile.findUnique.mockResolvedValue({ id: 'sp1' });
      prisma.marketplaceProduct.findUnique.mockResolvedValue(null);
      prisma.marketplaceProduct.create.mockResolvedValue({
        id: 'mp1',
        slug: 'mp',
        sellerProfileId: 'sp1',
        publicationStatus: MarketplacePublicationStatus.DRAFT,
      });
    });

    it("create — isYearRound=true force availabilityMonths à []", async () => {
      // Si le seller envoie année + une liste, le service écrase la liste pour
      // garder une source de vérité unique côté DB.
      await service.create({
        ...baseCreateDto,
        isYearRound: true,
        availabilityMonths: ['JAN', 'FEB'] as never,
        harvestMonths: ['MAY', 'JUN'] as never,
      } as never);
      const data = prisma.marketplaceProduct.create.mock.calls[0][0].data;
      expect(data.isYearRound).toBe(true);
      expect(data.availabilityMonths).toEqual([]);
      expect(data.harvestMonths).toEqual(['MAY', 'JUN']);
    });

    it('create — mois triés selon ordre calendaire', async () => {
      await service.create({
        ...baseCreateDto,
        availabilityMonths: ['DEC', 'MAR', 'JAN'] as never,
        harvestMonths: ['NOV', 'JAN'] as never,
      } as never);
      const data = prisma.marketplaceProduct.create.mock.calls[0][0].data;
      expect(data.availabilityMonths).toEqual(['JAN', 'MAR', 'DEC']);
      expect(data.harvestMonths).toEqual(['JAN', 'NOV']);
    });

    it("create — completionScore tient compte de la saisonnalité (isYearRound seul suffit)", async () => {
      await service.create({
        ...baseCreateDto,
        isYearRound: true,
      } as never);
      const withScore = prisma.marketplaceProduct.create.mock.calls[0][0].data.completionScore;

      prisma.marketplaceProduct.create.mockClear();
      await service.create(baseCreateDto as never);
      const withoutScore = prisma.marketplaceProduct.create.mock.calls[0][0].data.completionScore;
      expect(withScore).toBeGreaterThan(withoutScore);
    });

    it('update — bascule isYearRound=true vide availabilityMonths', async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue({
        id: 'mp1',
        slug: 'mp',
        publicationStatus: MarketplacePublicationStatus.DRAFT,
        availabilityMonths: ['JAN', 'FEB'],
        harvestMonths: [],
        isYearRound: false,
      });
      prisma.marketplaceProduct.update.mockResolvedValue({ id: 'mp1' });
      await service.update('mp1', { isYearRound: true });
      const data = prisma.marketplaceProduct.update.mock.calls[0][0].data;
      expect(data.isYearRound).toBe(true);
      expect(data.availabilityMonths).toEqual([]);
    });

    it('submitForReview — refuse si !isYearRound et availabilityMonths vide', async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue({
        id: 'mp1',
        publicationStatus: MarketplacePublicationStatus.DRAFT,
        commercialName: 'Nom',
        slug: 'mp',
        originCountry: 'YT',
        descriptionShort: 'd',
        packagingDescription: 'p',
        storageConditions: 's',
        isYearRound: false,
        availabilityMonths: [],
      });
      await expect(service.submitForReview('mp1')).rejects.toThrow(/Saisonnalit/);
    });

    it('submitForReview — accepte si availabilityMonths non-vide', async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue({
        id: 'mp1',
        publicationStatus: MarketplacePublicationStatus.DRAFT,
        commercialName: 'Nom',
        slug: 'mp',
        originCountry: 'YT',
        descriptionShort: 'd',
        packagingDescription: 'p',
        storageConditions: 's',
        isYearRound: false,
        availabilityMonths: ['JUL', 'AUG'],
      });
      prisma.marketplaceProduct.update.mockResolvedValue({
        id: 'mp1',
        publicationStatus: MarketplacePublicationStatus.IN_REVIEW,
      });
      await expect(service.submitForReview('mp1')).resolves.toBeDefined();
    });
  });

  // ── findPublished ─────────────────────────────────────────────────────────

  describe('findPublished', () => {
    it('force publicationStatus = PUBLISHED', async () => {
      prisma.marketplaceProduct.findMany.mockResolvedValue([]);
      prisma.marketplaceProduct.count.mockResolvedValue(0);
      await service.findPublished({});
      const where = prisma.marketplaceProduct.findMany.mock.calls[0][0].where;
      expect(where.publicationStatus).toBe(MarketplacePublicationStatus.PUBLISHED);
    });
  });
});
