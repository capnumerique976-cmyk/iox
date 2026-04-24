import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { MarketplaceDocumentsService } from './marketplace-documents.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../common/services/storage.service';
import { MarketplaceReviewService } from '../marketplace-review/marketplace-review.service';
import { SellerOwnershipService } from '../common/services/seller-ownership.service';
import {
  DocumentStatus,
  MarketplaceDocumentVisibility,
  MarketplaceRelatedEntityType,
  MarketplaceReviewStatus,
  MarketplaceReviewType,
  MarketplaceVerificationStatus,
  SellerProfileStatus,
} from '@iox/shared';

describe('MarketplaceDocumentsService', () => {
  let service: MarketplaceDocumentsService;
  let prisma: {
    marketplaceDocument: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
    document: { findUnique: jest.Mock };
    sellerProfile: { findUnique: jest.Mock };
    marketplaceProduct: { findUnique: jest.Mock };
    marketplaceOffer: { findUnique: jest.Mock };
    productBatch: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let storage: { upload: jest.Mock; delete: jest.Mock; getPresignedUrl: jest.Mock };
  let audit: { log: jest.Mock };
  let reviewQueue: { enqueue: jest.Mock; resolvePendingForEntity: jest.Mock };

  const PRODUCT_ID = '11111111-1111-1111-1111-111111111111';
  const DOC_SOURCE_ID = '22222222-2222-2222-2222-222222222222';
  const MD_ID = '33333333-3333-3333-3333-333333333333';

  beforeEach(async () => {
    prisma = {
      marketplaceDocument: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn().mockResolvedValue({}),
        count: jest.fn(),
      },
      document: { findUnique: jest.fn() },
      sellerProfile: { findUnique: jest.fn() },
      marketplaceProduct: { findUnique: jest.fn() },
      marketplaceOffer: { findUnique: jest.fn() },
      productBatch: { findUnique: jest.fn() },
      $transaction: jest.fn(async (arg: unknown) =>
        Array.isArray(arg) ? Promise.all(arg as Array<Promise<unknown>>) : arg,
      ),
    };
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
        MarketplaceDocumentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
        { provide: StorageService, useValue: storage },
        { provide: MarketplaceReviewService, useValue: reviewQueue },
        {
          provide: SellerOwnershipService,
          useValue: {
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
          },
        },
      ],
    }).compile();

    service = module.get(MarketplaceDocumentsService);
  });

  // ─── create ─────────────────────────────────────────────────────────────

  describe('create', () => {
    beforeEach(() => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue({ id: PRODUCT_ID });
      prisma.document.findUnique.mockResolvedValue({
        id: DOC_SOURCE_ID,
        status: DocumentStatus.ACTIVE,
      });
      prisma.marketplaceDocument.create.mockImplementation(({ data }) => ({
        id: MD_ID,
        ...data,
        document: { id: DOC_SOURCE_ID, storageKey: 's/k' },
      }));
    });

    it('crée un doc PRIVATE par défaut et enqueue DOCUMENT review', async () => {
      const out = await service.create(
        {
          relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
          relatedId: PRODUCT_ID,
          documentId: DOC_SOURCE_ID,
          documentType: 'CERT_BIO',
          title: 'Ecocert',
        },
        'user-1',
      );

      expect(out.id).toBe(MD_ID);
      expect(prisma.marketplaceDocument.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            visibility: MarketplaceDocumentVisibility.PRIVATE,
            verificationStatus: MarketplaceVerificationStatus.PENDING,
          }),
        }),
      );
      expect(reviewQueue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
          entityId: MD_ID,
          reviewType: MarketplaceReviewType.DOCUMENT,
        }),
        'user-1',
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'MARKETPLACE_DOCUMENT_CREATED' }),
      );
    });

    it("rejette si l'entité liée n'existe pas", async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue(null);
      await expect(
        service.create(
          {
            relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
            relatedId: PRODUCT_ID,
            documentId: DOC_SOURCE_ID,
            documentType: 'CERT',
            title: 't',
          },
          'u',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejette si le vendeur est SUSPENDED', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'seller',
        status: SellerProfileStatus.SUSPENDED,
      });
      await expect(
        service.create(
          {
            relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
            relatedId: 'seller',
            documentId: DOC_SOURCE_ID,
            documentType: 'CERT',
            title: 't',
          },
          'u',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejette si le Document source est inactif', async () => {
      prisma.document.findUnique.mockResolvedValue({
        id: DOC_SOURCE_ID,
        status: DocumentStatus.ARCHIVED,
      });
      await expect(
        service.create(
          {
            relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
            relatedId: PRODUCT_ID,
            documentId: DOC_SOURCE_ID,
            documentType: 'CERT',
            title: 't',
          },
          'u',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejette si validUntil est dans le passé', async () => {
      await expect(
        service.create(
          {
            relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
            relatedId: PRODUCT_ID,
            documentId: DOC_SOURCE_ID,
            documentType: 'CERT',
            title: 't',
            validUntil: '2000-01-01',
          },
          'u',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejette si validUntil <= validFrom', async () => {
      await expect(
        service.create(
          {
            relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
            relatedId: PRODUCT_ID,
            documentId: DOC_SOURCE_ID,
            documentType: 'CERT',
            title: 't',
            validFrom: '2099-06-01',
            validUntil: '2099-01-01',
          },
          'u',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // ─── findPublic ─────────────────────────────────────────────────────────

  describe('findPublic', () => {
    it('filtre strictement PUBLIC + VERIFIED + non expiré', async () => {
      prisma.marketplaceDocument.findMany.mockResolvedValue([]);
      await service.findPublic(MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT, PRODUCT_ID);
      expect(prisma.marketplaceDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            visibility: MarketplaceDocumentVisibility.PUBLIC,
            verificationStatus: MarketplaceVerificationStatus.VERIFIED,
            OR: [{ validUntil: null }, { validUntil: { gt: expect.any(Date) } }],
          }),
        }),
      );
    });
  });

  // ─── findForBuyer ───────────────────────────────────────────────────────

  describe('findForBuyer', () => {
    it('inclut PUBLIC et BUYER_ON_REQUEST vérifiés, jamais PRIVATE', async () => {
      prisma.marketplaceDocument.findMany.mockResolvedValue([]);
      await service.findForBuyer(MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT, PRODUCT_ID);
      const call = prisma.marketplaceDocument.findMany.mock.calls[0][0];
      expect(call.where.visibility.in).toEqual([
        MarketplaceDocumentVisibility.PUBLIC,
        MarketplaceDocumentVisibility.BUYER_ON_REQUEST,
      ]);
      expect(call.where.verificationStatus).toBe(MarketplaceVerificationStatus.VERIFIED);
    });
  });

  // ─── getDownloadUrl ─────────────────────────────────────────────────────

  describe('getDownloadUrl publicOnly', () => {
    const mkDoc = (overrides: Record<string, unknown> = {}) => ({
      id: MD_ID,
      visibility: MarketplaceDocumentVisibility.PUBLIC,
      verificationStatus: MarketplaceVerificationStatus.VERIFIED,
      validUntil: null,
      document: { storageKey: 'key/1', status: DocumentStatus.ACTIVE },
      ...overrides,
    });

    it('refuse un doc PRIVATE', async () => {
      prisma.marketplaceDocument.findUnique.mockResolvedValue(
        mkDoc({ visibility: MarketplaceDocumentVisibility.PRIVATE }),
      );
      await expect(service.getDownloadUrl(MD_ID, { publicOnly: true })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('refuse un doc BUYER_ON_REQUEST', async () => {
      prisma.marketplaceDocument.findUnique.mockResolvedValue(
        mkDoc({ visibility: MarketplaceDocumentVisibility.BUYER_ON_REQUEST }),
      );
      await expect(service.getDownloadUrl(MD_ID, { publicOnly: true })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('refuse un doc non VERIFIED', async () => {
      prisma.marketplaceDocument.findUnique.mockResolvedValue(
        mkDoc({ verificationStatus: MarketplaceVerificationStatus.PENDING }),
      );
      await expect(service.getDownloadUrl(MD_ID, { publicOnly: true })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('refuse un doc expiré', async () => {
      prisma.marketplaceDocument.findUnique.mockResolvedValue(
        mkDoc({ validUntil: new Date('2000-01-01') }),
      );
      await expect(service.getDownloadUrl(MD_ID, { publicOnly: true })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('accepte un doc PUBLIC + VERIFIED + non expiré et renvoie une URL signée', async () => {
      prisma.marketplaceDocument.findUnique.mockResolvedValue(mkDoc());
      const out = await service.getDownloadUrl(MD_ID, { publicOnly: true });
      expect(out.url).toBe('https://signed/url');
      expect(storage.getPresignedUrl).toHaveBeenCalledWith('key/1', 3600);
    });

    it('refuse si le Document source est ARCHIVED', async () => {
      prisma.marketplaceDocument.findUnique.mockResolvedValue(
        mkDoc({ document: { storageKey: 'k', status: DocumentStatus.ARCHIVED } }),
      );
      await expect(service.getDownloadUrl(MD_ID)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // ─── verify ─────────────────────────────────────────────────────────────

  describe('verify', () => {
    it('passe PENDING → VERIFIED et converge la queue en APPROVED', async () => {
      const existing = {
        id: MD_ID,
        relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
        verificationStatus: MarketplaceVerificationStatus.PENDING,
        validUntil: null,
        document: { storageKey: 'k', status: DocumentStatus.ACTIVE },
      };
      prisma.marketplaceDocument.findUnique.mockResolvedValue(existing);
      prisma.marketplaceDocument.update.mockResolvedValue({
        ...existing,
        verificationStatus: MarketplaceVerificationStatus.VERIFIED,
      });

      const out = await service.verify(MD_ID, {}, 'qm-1');

      expect(out.verificationStatus).toBe(MarketplaceVerificationStatus.VERIFIED);
      expect(reviewQueue.resolvePendingForEntity).toHaveBeenCalledWith(
        MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
        MD_ID,
        MarketplaceReviewType.DOCUMENT,
        MarketplaceReviewStatus.APPROVED,
        expect.any(String),
        'qm-1',
      );
    });

    it('refuse un doc déjà expiré', async () => {
      prisma.marketplaceDocument.findUnique.mockResolvedValue({
        id: MD_ID,
        relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
        verificationStatus: MarketplaceVerificationStatus.PENDING,
        validUntil: new Date('2000-01-01'),
        document: { storageKey: 'k', status: DocumentStatus.ACTIVE },
      });
      await expect(service.verify(MD_ID, {}, 'qm-1')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // ─── reject ─────────────────────────────────────────────────────────────

  describe('reject', () => {
    it('passe le statut à REJECTED et converge la queue', async () => {
      const existing = {
        id: MD_ID,
        relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
        verificationStatus: MarketplaceVerificationStatus.PENDING,
        document: { storageKey: 'k', status: DocumentStatus.ACTIVE },
      };
      prisma.marketplaceDocument.findUnique.mockResolvedValue(existing);
      prisma.marketplaceDocument.update.mockResolvedValue({
        ...existing,
        verificationStatus: MarketplaceVerificationStatus.REJECTED,
      });

      const out = await service.reject(MD_ID, { reason: 'Document illisible' }, 'qm-1');
      expect(out.verificationStatus).toBe(MarketplaceVerificationStatus.REJECTED);
      expect(reviewQueue.resolvePendingForEntity).toHaveBeenCalledWith(
        MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
        MD_ID,
        MarketplaceReviewType.DOCUMENT,
        MarketplaceReviewStatus.REJECTED,
        'Document illisible',
        'qm-1',
      );
    });
  });

  // ─── update ─────────────────────────────────────────────────────────────

  describe('update', () => {
    it('repasse en PENDING et ré-enqueue si visibility passe de PRIVATE à PUBLIC sur un VERIFIED', async () => {
      const existing = {
        id: MD_ID,
        relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
        visibility: MarketplaceDocumentVisibility.PRIVATE,
        verificationStatus: MarketplaceVerificationStatus.VERIFIED,
        title: 't',
        documentType: 'CERT',
        validFrom: null,
        validUntil: null,
        document: { storageKey: 'k', status: DocumentStatus.ACTIVE },
      };
      prisma.marketplaceDocument.findUnique.mockResolvedValue(existing);
      prisma.marketplaceDocument.update.mockImplementation(({ data }) => ({
        ...existing,
        ...data,
      }));

      const out = await service.update(
        MD_ID,
        { visibility: MarketplaceDocumentVisibility.PUBLIC },
        'u-1',
      );

      expect(out.verificationStatus).toBe(MarketplaceVerificationStatus.PENDING);
      expect(reviewQueue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          entityId: MD_ID,
          reviewType: MarketplaceReviewType.DOCUMENT,
        }),
        'u-1',
      );
    });

    it('ne re-déclenche PAS la review si la modif est neutre (titre seul)', async () => {
      const existing = {
        id: MD_ID,
        relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
        visibility: MarketplaceDocumentVisibility.PUBLIC,
        verificationStatus: MarketplaceVerificationStatus.VERIFIED,
        title: 'Ancien',
        documentType: 'CERT',
        validFrom: null,
        validUntil: null,
        document: { storageKey: 'k', status: DocumentStatus.ACTIVE },
      };
      prisma.marketplaceDocument.findUnique.mockResolvedValue(existing);
      prisma.marketplaceDocument.update.mockImplementation(({ data }) => ({
        ...existing,
        ...data,
      }));

      await service.update(MD_ID, { title: 'Nouveau' }, 'u-1');

      expect(reviewQueue.enqueue).not.toHaveBeenCalled();
    });
  });

  // ─── delete ─────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('converge la queue AVANT suppression', async () => {
      prisma.marketplaceDocument.findUnique.mockResolvedValue({
        id: MD_ID,
        relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
        relatedId: PRODUCT_ID,
        documentId: DOC_SOURCE_ID,
        visibility: MarketplaceDocumentVisibility.PRIVATE,
        document: { storageKey: 'k', status: DocumentStatus.ACTIVE },
      });

      await service.delete(MD_ID, 'u-1');

      // resolvePending appelé AVANT delete
      const resolveOrder = reviewQueue.resolvePendingForEntity.mock.invocationCallOrder[0];
      const deleteOrder = prisma.marketplaceDocument.delete.mock.invocationCallOrder[0];
      expect(resolveOrder).toBeLessThan(deleteOrder);
      expect(prisma.marketplaceDocument.delete).toHaveBeenCalledWith({ where: { id: MD_ID } });
      // On ne supprime PAS le fichier : le Document source peut rester rattaché à la traçabilité
      expect(storage.delete).not.toHaveBeenCalled();
    });
  });
});
