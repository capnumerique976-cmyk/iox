import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { MarketplaceOffersService } from './marketplace-offers.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MarketplaceReviewService } from '../marketplace-review/marketplace-review.service';
import { SellerOwnershipService } from '../common/services/seller-ownership.service';
import {
  ExportReadinessStatus,
  MarketplacePriceMode,
  MarketplacePublicationStatus,
  MarketplaceVisibilityScope,
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

describe('MarketplaceOffersService', () => {
  let service: MarketplaceOffersService;
  let prisma: {
    marketplaceOffer: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    marketplaceProduct: { findUnique: jest.Mock };
    sellerProfile: { findUnique: jest.Mock };
    productBatch: { findFirst: jest.Mock };
    marketplaceOfferBatch: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let audit: { log: jest.Mock };
  let reviewQueue: { enqueue: jest.Mock; resolvePendingForEntity: jest.Mock };

  beforeEach(async () => {
    prisma = {
      marketplaceOffer: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      marketplaceProduct: { findUnique: jest.fn() },
      sellerProfile: { findUnique: jest.fn() },
      productBatch: { findFirst: jest.fn() },
      marketplaceOfferBatch: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn((ops: Array<Promise<unknown>>) => Promise.all(ops)),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    reviewQueue = {
      enqueue: jest.fn().mockResolvedValue({ id: 'r-1' }),
      resolvePendingForEntity: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceOffersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
        { provide: MarketplaceReviewService, useValue: reviewQueue },
        { provide: SellerOwnershipService, useValue: ownershipMock },
      ],
    }).compile();

    service = module.get(MarketplaceOffersService);
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    const baseDto = {
      marketplaceProductId: 'mp1',
      sellerProfileId: 'sp1',
      title: 'Offre test',
    };

    it('404 si produit marketplace inexistant', async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue(null);
      prisma.sellerProfile.findUnique.mockResolvedValue({ id: 'sp1' });
      await expect(service.create(baseDto)).rejects.toThrow(NotFoundException);
    });

    it('404 si seller inexistant', async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue({ id: 'mp1', sellerProfileId: 'sp1' });
      prisma.sellerProfile.findUnique.mockResolvedValue(null);
      await expect(service.create(baseDto)).rejects.toThrow(NotFoundException);
    });

    it('400 si seller ≠ seller du produit marketplace', async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue({ id: 'mp1', sellerProfileId: 'spX' });
      prisma.sellerProfile.findUnique.mockResolvedValue({ id: 'sp1' });
      await expect(service.create(baseDto)).rejects.toThrow(BadRequestException);
    });

    it('400 si priceMode=FIXED sans unitPrice ni currency', async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue({ id: 'mp1', sellerProfileId: 'sp1' });
      prisma.sellerProfile.findUnique.mockResolvedValue({ id: 'sp1' });
      await expect(
        service.create({
          ...baseDto,
          priceMode: MarketplacePriceMode.FIXED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('crée en DRAFT, PENDING_QUALITY_REVIEW, visibility BUYERS_ONLY par défaut', async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue({ id: 'mp1', sellerProfileId: 'sp1' });
      prisma.sellerProfile.findUnique.mockResolvedValue({ id: 'sp1' });
      prisma.marketplaceOffer.create.mockResolvedValue({
        id: 'o1',
        marketplaceProductId: 'mp1',
        sellerProfileId: 'sp1',
        priceMode: MarketplacePriceMode.QUOTE_ONLY,
      });
      await service.create(baseDto, ADMIN);
      const data = prisma.marketplaceOffer.create.mock.calls[0][0].data;
      expect(data.publicationStatus).toBe(MarketplacePublicationStatus.DRAFT);
      expect(data.exportReadinessStatus).toBe(ExportReadinessStatus.PENDING_QUALITY_REVIEW);
      expect(data.visibilityScope).toBe(MarketplaceVisibilityScope.BUYERS_ONLY);
      expect(data.priceMode).toBe(MarketplacePriceMode.QUOTE_ONLY);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MARKETPLACE_OFFER_CREATED',
        }),
      );
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('APPROVED + champ vitrine (title) → repasse IN_REVIEW', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue({
        id: 'o1',
        publicationStatus: MarketplacePublicationStatus.APPROVED,
        priceMode: MarketplacePriceMode.QUOTE_ONLY,
        unitPrice: null,
        currency: null,
      });
      prisma.marketplaceOffer.update.mockResolvedValue({
        id: 'o1',
        publicationStatus: MarketplacePublicationStatus.IN_REVIEW,
      });
      await service.update('o1', { title: 'Nouveau titre' });
      const data = prisma.marketplaceOffer.update.mock.calls[0][0].data;
      expect(data.publicationStatus).toBe(MarketplacePublicationStatus.IN_REVIEW);
    });

    it('APPROVED + champ non-vitrine (leadTimeDays) → pas de recheck', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue({
        id: 'o1',
        publicationStatus: MarketplacePublicationStatus.APPROVED,
        priceMode: MarketplacePriceMode.QUOTE_ONLY,
        unitPrice: null,
        currency: null,
      });
      prisma.marketplaceOffer.update.mockResolvedValue({ id: 'o1' });
      await service.update('o1', { leadTimeDays: 10 });
      const data = prisma.marketplaceOffer.update.mock.calls[0][0].data;
      expect(data.publicationStatus).toBeUndefined();
    });

    it('400 si passage à FIXED sans unitPrice', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue({
        id: 'o1',
        publicationStatus: MarketplacePublicationStatus.DRAFT,
        priceMode: MarketplacePriceMode.QUOTE_ONLY,
        unitPrice: null,
        currency: null,
      });
      await expect(
        service.update('o1', {
          priceMode: MarketplacePriceMode.FIXED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('404 si offre inexistante', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue(null);
      await expect(service.update('o1', { title: 'x' })).rejects.toThrow(NotFoundException);
    });
  });

  // ── attachBatch / updateBatch / detachBatch ──────────────────────────────

  describe('attachBatch', () => {
    const dto = { productBatchId: 'b1', quantityAvailable: 100 };

    it('404 offre', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue(null);
      prisma.productBatch.findFirst.mockResolvedValue({ id: 'b1' });
      prisma.marketplaceOfferBatch.findUnique.mockResolvedValue(null);
      await expect(service.attachBatch('o1', dto)).rejects.toThrow(NotFoundException);
    });

    it('404 batch', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue({ id: 'o1' });
      prisma.productBatch.findFirst.mockResolvedValue(null);
      prisma.marketplaceOfferBatch.findUnique.mockResolvedValue(null);
      await expect(service.attachBatch('o1', dto)).rejects.toThrow(NotFoundException);
    });

    it('409 si déjà rattaché', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue({ id: 'o1' });
      prisma.productBatch.findFirst.mockResolvedValue({ id: 'b1' });
      prisma.marketplaceOfferBatch.findUnique.mockResolvedValue({ id: 'link1' });
      await expect(service.attachBatch('o1', dto)).rejects.toThrow(ConflictException);
    });

    it('crée le rattachement + audit', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue({ id: 'o1' });
      prisma.productBatch.findFirst.mockResolvedValue({ id: 'b1' });
      prisma.marketplaceOfferBatch.findUnique.mockResolvedValue(null);
      prisma.marketplaceOfferBatch.create.mockResolvedValue({
        id: 'link1',
        marketplaceOfferId: 'o1',
        productBatchId: 'b1',
        quantityAvailable: 100,
        exportEligible: true,
      });
      await service.attachBatch('o1', dto, ADMIN);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MARKETPLACE_OFFER_BATCH_ATTACHED',
        }),
      );
    });
  });

  describe('detachBatch', () => {
    it('404 si lien inexistant', async () => {
      prisma.marketplaceOfferBatch.findUnique.mockResolvedValue(null);
      await expect(service.detachBatch('link1')).rejects.toThrow(NotFoundException);
    });

    it('supprime + audit', async () => {
      prisma.marketplaceOfferBatch.findUnique.mockResolvedValue({
        id: 'link1',
        marketplaceOfferId: 'o1',
        productBatchId: 'b1',
      });
      prisma.marketplaceOfferBatch.delete.mockResolvedValue({});
      const res = await service.detachBatch('link1', ADMIN);
      expect(res.deleted).toBe(true);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MARKETPLACE_OFFER_BATCH_DETACHED',
        }),
      );
    });
  });

  // ── workflow ──────────────────────────────────────────────────────────────

  describe('submitForReview', () => {
    it('refuse si ≠ DRAFT/REJECTED', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue({
        id: 'o1',
        publicationStatus: MarketplacePublicationStatus.APPROVED,
        priceMode: MarketplacePriceMode.QUOTE_ONLY,
      });
      await expect(service.submitForReview('o1')).rejects.toThrow(BadRequestException);
    });

    it('refuse si pricing invalide (FIXED sans unitPrice)', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue({
        id: 'o1',
        publicationStatus: MarketplacePublicationStatus.DRAFT,
        priceMode: MarketplacePriceMode.FIXED,
        unitPrice: null,
        currency: null,
      });
      await expect(service.submitForReview('o1')).rejects.toThrow(BadRequestException);
    });

    it('DRAFT → IN_REVIEW avec submittedAt', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue({
        id: 'o1',
        publicationStatus: MarketplacePublicationStatus.DRAFT,
        priceMode: MarketplacePriceMode.QUOTE_ONLY,
        unitPrice: null,
        currency: null,
      });
      prisma.marketplaceOffer.update.mockResolvedValue({
        id: 'o1',
        publicationStatus: MarketplacePublicationStatus.IN_REVIEW,
      });
      await service.submitForReview('o1', ADMIN);
      const data = prisma.marketplaceOffer.update.mock.calls[0][0].data;
      expect(data.publicationStatus).toBe(MarketplacePublicationStatus.IN_REVIEW);
      expect(data.submittedAt).toBeInstanceOf(Date);
    });
  });

  describe('approve', () => {
    it('refuse si pas IN_REVIEW', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue({
        id: 'o1',
        publicationStatus: MarketplacePublicationStatus.DRAFT,
        sellerProfile: { status: SellerProfileStatus.APPROVED },
        marketplaceProduct: { publicationStatus: MarketplacePublicationStatus.APPROVED },
      });
      await expect(service.approve('o1')).rejects.toThrow(BadRequestException);
    });

    it('refuse si seller pas APPROVED', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue({
        id: 'o1',
        publicationStatus: MarketplacePublicationStatus.IN_REVIEW,
        sellerProfile: { status: SellerProfileStatus.PENDING_REVIEW },
        marketplaceProduct: { publicationStatus: MarketplacePublicationStatus.APPROVED },
      });
      await expect(service.approve('o1')).rejects.toThrow(BadRequestException);
    });

    it('refuse si produit marketplace pas APPROVED/PUBLISHED', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue({
        id: 'o1',
        publicationStatus: MarketplacePublicationStatus.IN_REVIEW,
        sellerProfile: { status: SellerProfileStatus.APPROVED },
        marketplaceProduct: { publicationStatus: MarketplacePublicationStatus.DRAFT },
      });
      await expect(service.approve('o1')).rejects.toThrow(BadRequestException);
    });

    it('IN_REVIEW + seller APPROVED + mp PUBLISHED → APPROVED', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue({
        id: 'o1',
        publicationStatus: MarketplacePublicationStatus.IN_REVIEW,
        sellerProfile: { status: SellerProfileStatus.APPROVED },
        marketplaceProduct: { publicationStatus: MarketplacePublicationStatus.PUBLISHED },
      });
      prisma.marketplaceOffer.update.mockResolvedValue({
        id: 'o1',
        publicationStatus: MarketplacePublicationStatus.APPROVED,
      });
      await service.approve('o1', 'admin');
      const data = prisma.marketplaceOffer.update.mock.calls[0][0].data;
      expect(data.publicationStatus).toBe(MarketplacePublicationStatus.APPROVED);
      expect(data.approvedAt).toBeInstanceOf(Date);
    });
  });

  describe('publish — 4 gates', () => {
    const baseOffer = {
      id: 'o1',
      publicationStatus: MarketplacePublicationStatus.APPROVED,
      exportReadinessStatus: ExportReadinessStatus.EXPORT_READY,
      sellerProfile: { status: SellerProfileStatus.APPROVED },
      marketplaceProduct: { publicationStatus: MarketplacePublicationStatus.PUBLISHED },
    };

    it('refuse si pas APPROVED', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue({
        ...baseOffer,
        publicationStatus: MarketplacePublicationStatus.DRAFT,
      });
      await expect(service.publish('o1')).rejects.toThrow(BadRequestException);
    });

    it('gate 1 — refuse si seller pas APPROVED', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue({
        ...baseOffer,
        sellerProfile: { status: SellerProfileStatus.SUSPENDED },
      });
      await expect(service.publish('o1')).rejects.toThrow(BadRequestException);
    });

    it('gate 2 — refuse si marketplaceProduct pas APPROVED/PUBLISHED', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue({
        ...baseOffer,
        marketplaceProduct: { publicationStatus: MarketplacePublicationStatus.SUSPENDED },
      });
      await expect(service.publish('o1')).rejects.toThrow(BadRequestException);
    });

    it('gate 3 — refuse si aucun lot exportEligible', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue(baseOffer);
      prisma.marketplaceOfferBatch.count.mockResolvedValue(0);
      await expect(service.publish('o1')).rejects.toThrow(BadRequestException);
      expect(prisma.marketplaceOfferBatch.count).toHaveBeenCalledWith({
        where: { marketplaceOfferId: 'o1', exportEligible: true },
      });
    });

    it('gate 4 — refuse si readiness PENDING_QUALITY_REVIEW', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue({
        ...baseOffer,
        exportReadinessStatus: ExportReadinessStatus.PENDING_QUALITY_REVIEW,
      });
      prisma.marketplaceOfferBatch.count.mockResolvedValue(1);
      await expect(service.publish('o1')).rejects.toThrow(BadRequestException);
    });

    it('publie si toutes les gates passent', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue(baseOffer);
      prisma.marketplaceOfferBatch.count.mockResolvedValue(1);
      prisma.marketplaceOffer.update.mockResolvedValue({
        id: 'o1',
        publicationStatus: MarketplacePublicationStatus.PUBLISHED,
      });
      await service.publish('o1', 'admin');
      const data = prisma.marketplaceOffer.update.mock.calls[0][0].data;
      expect(data.publicationStatus).toBe(MarketplacePublicationStatus.PUBLISHED);
      expect(data.publishedAt).toBeInstanceOf(Date);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MARKETPLACE_OFFER_PUBLISHED',
        }),
      );
    });
  });

  describe('suspend / archive / setExportReadiness', () => {
    it('suspend refuse si pas PUBLISHED', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue({
        id: 'o1',
        publicationStatus: MarketplacePublicationStatus.DRAFT,
      });
      await expect(service.suspend('o1', { reason: 'x' })).rejects.toThrow(BadRequestException);
    });

    it('suspend PUBLISHED → SUSPENDED', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue({
        id: 'o1',
        publicationStatus: MarketplacePublicationStatus.PUBLISHED,
      });
      prisma.marketplaceOffer.update.mockResolvedValue({
        id: 'o1',
        publicationStatus: MarketplacePublicationStatus.SUSPENDED,
      });
      await service.suspend('o1', { reason: 'Non-conf' });
      const data = prisma.marketplaceOffer.update.mock.calls[0][0].data;
      expect(data.publicationStatus).toBe(MarketplacePublicationStatus.SUSPENDED);
    });

    it('archive idempotent si déjà ARCHIVED', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue({
        id: 'o1',
        publicationStatus: MarketplacePublicationStatus.ARCHIVED,
      });
      const res = await service.archive('o1');
      expect(res.publicationStatus).toBe(MarketplacePublicationStatus.ARCHIVED);
      expect(prisma.marketplaceOffer.update).not.toHaveBeenCalled();
    });

    it('setExportReadiness met à jour + audit', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue({
        id: 'o1',
        exportReadinessStatus: ExportReadinessStatus.PENDING_QUALITY_REVIEW,
      });
      prisma.marketplaceOffer.update.mockResolvedValue({
        id: 'o1',
        exportReadinessStatus: ExportReadinessStatus.EXPORT_READY,
      });
      await service.setExportReadiness('o1', {
        status: ExportReadinessStatus.EXPORT_READY,
      });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MARKETPLACE_OFFER_READINESS_CHANGED',
        }),
      );
    });
  });

  // ── findPublished ─────────────────────────────────────────────────────────

  describe('findPublished', () => {
    it('force publicationStatus=PUBLISHED + visibility ≠ PRIVATE', async () => {
      prisma.marketplaceOffer.findMany.mockResolvedValue([]);
      prisma.marketplaceOffer.count.mockResolvedValue(0);
      await service.findPublished({});
      const where = prisma.marketplaceOffer.findMany.mock.calls[0][0].where;
      expect(where.publicationStatus).toBe(MarketplacePublicationStatus.PUBLISHED);
      expect(where.visibilityScope).toEqual({ not: MarketplaceVisibilityScope.PRIVATE });
    });
  });

  // ── duplicate (MP-OFFER-DUPLICATE) ─────────────────────────────────────

  describe('duplicate', () => {
    const SELLER: RequestUser = {
      id: 'u-seller',
      email: 's@s',
      role: UserRole.MARKETPLACE_SELLER,
      sellerProfileIds: ['sp1'],
      companyIds: [],
    };

    const sourceOffer = {
      id: 'src-1',
      marketplaceProductId: 'mp1',
      sellerProfileId: 'sp1',
      title: 'Vanille Bourbon Grade A — offre principale',
      shortDescription: 'Gousses 16-18 cm',
      priceMode: MarketplacePriceMode.FIXED,
      unitPrice: 420,
      currency: 'EUR',
      moq: 5,
      availableQuantity: 1000,
      leadTimeDays: 14,
      incoterm: 'FOB',
      departureLocation: 'Mamoudzou',
      destinationMarketsJson: ['FR', 'BE'],
      visibilityScope: MarketplaceVisibilityScope.BUYERS_ONLY,
      availabilityStart: new Date('2026-04-01'),
      availabilityEnd: new Date('2026-09-30'),
      publicationStatus: MarketplacePublicationStatus.PUBLISHED,
      exportReadinessStatus: ExportReadinessStatus.EXPORT_READY,
      featuredRank: 3,
      rejectionReason: null,
      submittedAt: new Date('2026-04-15'),
      approvedAt: new Date('2026-04-20'),
      publishedAt: new Date('2026-04-21'),
      suspendedAt: null,
    };

    it('happy path : PUBLISHED → DRAFT, title "(copie) ..." + dates reset', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue(sourceOffer);
      prisma.marketplaceOffer.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 'copy-1', ...data }),
      );
      const out = await service.duplicate('src-1', ADMIN);
      expect(prisma.marketplaceOffer.create).toHaveBeenCalledTimes(1);
      const created = prisma.marketplaceOffer.create.mock.calls[0][0].data;
      expect(created.title).toBe('(copie) Vanille Bourbon Grade A — offre principale');
      expect(created.publicationStatus).toBe(MarketplacePublicationStatus.DRAFT);
      expect(created.exportReadinessStatus).toBe(ExportReadinessStatus.PENDING_QUALITY_REVIEW);
      expect(created.availabilityStart).toBeNull();
      expect(created.availabilityEnd).toBeNull();
      expect(created.featuredRank).toBeNull();
      expect(created.rejectionReason).toBeNull();
      expect(created.submittedAt).toBeNull();
      expect(created.approvedAt).toBeNull();
      expect(created.publishedAt).toBeNull();
      expect(created.suspendedAt).toBeNull();
      expect(created.marketplaceProductId).toBe('mp1');
      expect(created.sellerProfileId).toBe('sp1');
      expect(created.priceMode).toBe(MarketplacePriceMode.FIXED);
      expect(created.unitPrice).toBe(420);
      expect(created.createdById).toBe(ADMIN.id);
      expect(created.updatedById).toBe(ADMIN.id);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'MARKETPLACE_OFFER_DUPLICATED' }),
      );
      expect(out.id).toBe('copy-1');
    });

    it('seller propriétaire : ownership check appelé + clone OK', async () => {
      const sellerOwnership = { ...ownershipMock };
      const assertSpy = jest.fn(async () => ({}));
      sellerOwnership.assertMarketplaceOfferOwnership = assertSpy;
      sellerOwnership.isSeller = () => true;

      const m = await Test.createTestingModule({
        providers: [
          MarketplaceOffersService,
          { provide: PrismaService, useValue: prisma },
          { provide: AuditService, useValue: audit },
          { provide: MarketplaceReviewService, useValue: reviewQueue },
          { provide: SellerOwnershipService, useValue: sellerOwnership },
        ],
      }).compile();
      const sellerService = m.get(MarketplaceOffersService);

      prisma.marketplaceOffer.findUnique.mockResolvedValue(sourceOffer);
      prisma.marketplaceOffer.create.mockResolvedValue({ id: 'copy-2' });
      await sellerService.duplicate('src-1', SELLER);
      expect(assertSpy).toHaveBeenCalledWith(SELLER, 'src-1');
    });

    it('seller non-propriétaire : ownership rejette → la promesse rejette', async () => {
      const sellerOwnership = { ...ownershipMock };
      sellerOwnership.assertMarketplaceOfferOwnership = async () => {
        throw new Error('FORBIDDEN');
      };
      sellerOwnership.isSeller = () => true;

      const m = await Test.createTestingModule({
        providers: [
          MarketplaceOffersService,
          { provide: PrismaService, useValue: prisma },
          { provide: AuditService, useValue: audit },
          { provide: MarketplaceReviewService, useValue: reviewQueue },
          { provide: SellerOwnershipService, useValue: sellerOwnership },
        ],
      }).compile();
      const sellerService = m.get(MarketplaceOffersService);
      await expect(sellerService.duplicate('src-1', SELLER)).rejects.toThrow(/FORBIDDEN/);
      expect(prisma.marketplaceOffer.create).not.toHaveBeenCalled();
    });

    it('source absente → 404', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue(null);
      await expect(service.duplicate('nope', ADMIN)).rejects.toThrow(NotFoundException);
    });

    it('title de 95 chars : tronque pour rester ≤ 100 chars', async () => {
      const longTitle = 'A'.repeat(95);
      prisma.marketplaceOffer.findUnique.mockResolvedValue({ ...sourceOffer, title: longTitle });
      prisma.marketplaceOffer.create.mockResolvedValue({ id: 'copy-3' });
      await service.duplicate('src-1', ADMIN);
      const created = prisma.marketplaceOffer.create.mock.calls[0][0].data;
      expect(created.title.length).toBeLessThanOrEqual(100);
      expect(created.title.startsWith('(copie) ')).toBe(true);
    });

    it("ne crée AUCUN MarketplaceOfferBatch (pas de duplication des liens lots)", async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue(sourceOffer);
      prisma.marketplaceOffer.create.mockResolvedValue({ id: 'copy-4' });
      await service.duplicate('src-1', ADMIN);
      expect(prisma.marketplaceOfferBatch.create).not.toHaveBeenCalled();
    });
  });
});
