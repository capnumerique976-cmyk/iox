// Spec — ComplianceService (Mandat 57)
//
// Covers:
//  1. getSellerSummary — seller sans sellerProfileIds → ACTION_REQUIRED
//  2. getSellerSummary — seller avec profil APPROVED + 2 docs VERIFIED → COMPLETE
//  3. getSellerSummary — seller avec 1 doc REJECTED → ACTION_REQUIRED
//  4. getSellerSummary — seller avec profil PENDING_REVIEW → PENDING_REVIEW
//  5. getSellerSummary — seller avec profil REJECTED → BLOCKED
//  6. getAdminSummary — retourne les agrégats corrects
//  7. getAdminSellersList — retourne liste vide si aucun seller
//  8. getAdminSellersList — retourne rows avec complianceStatus calculé

import { Test } from '@nestjs/testing';
import { ComplianceService } from './compliance.service';
import { PrismaService } from '../database/prisma.service';
import { MarketplaceVerificationStatus } from '@iox/shared';
import type { RequestUser } from '@iox/shared';

const makeActor = (overrides: Partial<RequestUser> = {}): RequestUser =>
  ({
    id: 'user-1',
    email: 'seller@test.yt',
    role: 'MARKETPLACE_SELLER' as any,
    sellerProfileIds: ['sp-1'],
    ...overrides,
  } as RequestUser);

describe('ComplianceService', () => {
  let service: ComplianceService;
  let prisma: {
    sellerProfile: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      groupBy: jest.Mock;
    };
    marketplaceDocument: {
      groupBy: jest.Mock;
      count: jest.Mock;
    };
    certification: {
      groupBy: jest.Mock;
      count: jest.Mock;
    };
    marketplaceReviewQueue: {
      count: jest.Mock;
      groupBy: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      sellerProfile: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        groupBy: jest.fn(),
      },
      marketplaceDocument: {
        groupBy: jest.fn(),
        count: jest.fn(),
      },
      certification: {
        groupBy: jest.fn(),
        count: jest.fn(),
      },
      marketplaceReviewQueue: {
        count: jest.fn(),
        groupBy: jest.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        ComplianceService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ComplianceService);
  });

  // ─── getSellerSummary ────────────────────────────────────────────────────

  describe('getSellerSummary', () => {
    it("1. retourne ACTION_REQUIRED quand le seller n'a pas de sellerProfileId", async () => {
      const actor = makeActor({ sellerProfileIds: [] });

      const result = await service.getSellerSummary(actor);

      expect(result.status).toBe('ACTION_REQUIRED');
      expect(result.nextAction).toBeTruthy();
      expect(result.completionPercentage).toBe(0);
      // Aucune requête Prisma ne doit être émise
      expect(prisma.sellerProfile.findUnique).not.toHaveBeenCalled();
    });

    it('2. retourne COMPLETE avec completionPercentage > 0 pour un profil APPROVED avec 2 docs VERIFIED', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({ status: 'APPROVED', rejectionReason: null });
      prisma.marketplaceDocument.groupBy.mockResolvedValue([
        { verificationStatus: MarketplaceVerificationStatus.VERIFIED, _count: { id: 2 } },
      ]);
      prisma.certification.groupBy.mockResolvedValue([]);
      prisma.marketplaceReviewQueue.count.mockResolvedValue(0);
      prisma.marketplaceDocument.count.mockResolvedValue(0);
      prisma.certification.count.mockResolvedValue(0);

      const result = await service.getSellerSummary(makeActor());

      expect(result.status).toBe('COMPLETE');
      expect(result.completionPercentage).toBe(100);
      expect(result.verifiedDocuments).toBe(2);
      expect(result.totalDocuments).toBe(2);
      expect(result.nextAction).toBeNull();
    });

    it('3. retourne ACTION_REQUIRED quand il y a un doc REJECTED', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({ status: 'APPROVED', rejectionReason: null });
      prisma.marketplaceDocument.groupBy.mockResolvedValue([
        { verificationStatus: MarketplaceVerificationStatus.REJECTED, _count: { id: 1 } },
      ]);
      prisma.certification.groupBy.mockResolvedValue([]);
      prisma.marketplaceReviewQueue.count.mockResolvedValue(0);
      prisma.marketplaceDocument.count.mockResolvedValue(0);
      prisma.certification.count.mockResolvedValue(0);

      const result = await service.getSellerSummary(makeActor());

      expect(result.status).toBe('ACTION_REQUIRED');
      expect(result.rejectedDocuments).toBe(1);
      expect(result.nextAction).toContain('refusés');
    });

    it('4. retourne PENDING_REVIEW pour un profil PENDING_REVIEW', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({ status: 'PENDING_REVIEW', rejectionReason: null });
      prisma.marketplaceDocument.groupBy.mockResolvedValue([]);
      prisma.certification.groupBy.mockResolvedValue([]);
      prisma.marketplaceReviewQueue.count.mockResolvedValue(0);
      prisma.marketplaceDocument.count.mockResolvedValue(0);
      prisma.certification.count.mockResolvedValue(0);

      const result = await service.getSellerSummary(makeActor());

      expect(result.status).toBe('PENDING_REVIEW');
      expect(result.sellerProfileStatus).toBe('PENDING_REVIEW');
    });

    it('5. retourne BLOCKED pour un profil REJECTED', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        status: 'REJECTED',
        rejectionReason: 'Documents invalides',
      });
      prisma.marketplaceDocument.groupBy.mockResolvedValue([]);
      prisma.certification.groupBy.mockResolvedValue([]);
      prisma.marketplaceReviewQueue.count.mockResolvedValue(0);
      prisma.marketplaceDocument.count.mockResolvedValue(0);
      prisma.certification.count.mockResolvedValue(0);

      const result = await service.getSellerSummary(makeActor());

      expect(result.status).toBe('BLOCKED');
      expect(result.sellerProfileRejectionReason).toBe('Documents invalides');
      expect(result.nextAction).toContain('rejeté');
    });
  });

  // ─── getAdminSummary ─────────────────────────────────────────────────────

  describe('getAdminSummary', () => {
    it('6. retourne les agrégats corrects depuis les mocks groupBy/count', async () => {
      prisma.sellerProfile.groupBy.mockResolvedValue([
        { status: 'APPROVED', _count: { id: 5 } },
        { status: 'PENDING_REVIEW', _count: { id: 2 } },
        { status: 'REJECTED', _count: { id: 1 } },
        { status: 'SUSPENDED', _count: { id: 1 } },
      ]);
      prisma.marketplaceDocument.groupBy.mockResolvedValue([
        { verificationStatus: MarketplaceVerificationStatus.PENDING, _count: { id: 3 } },
        { verificationStatus: MarketplaceVerificationStatus.REJECTED, _count: { id: 2 } },
        { verificationStatus: MarketplaceVerificationStatus.EXPIRED, _count: { id: 1 } },
      ]);
      prisma.marketplaceDocument.count.mockResolvedValue(4); // expiringSoon
      prisma.certification.groupBy.mockResolvedValue([
        { verificationStatus: MarketplaceVerificationStatus.PENDING, _count: { id: 7 } },
        { verificationStatus: MarketplaceVerificationStatus.REJECTED, _count: { id: 1 } },
        { verificationStatus: MarketplaceVerificationStatus.EXPIRED, _count: { id: 2 } },
      ]);
      prisma.certification.count.mockResolvedValue(3); // expiringSoon
      prisma.marketplaceReviewQueue.count.mockResolvedValue(10);

      const result = await service.getAdminSummary();

      expect(result.sellersTotal).toBe(9);
      expect(result.sellersApproved).toBe(5);
      expect(result.sellersPendingReview).toBe(2);
      expect(result.sellersRejected).toBe(1);
      expect(result.sellersSuspended).toBe(1);
      expect(result.documentsPending).toBe(3);
      expect(result.documentsRejected).toBe(2);
      expect(result.documentsExpired).toBe(1);
      expect(result.documentsExpiringSoon).toBe(4);
      expect(result.certificationsPending).toBe(7);
      expect(result.certificationsRejected).toBe(1);
      expect(result.certificationsExpired).toBe(2);
      expect(result.certificationsExpiringSoon).toBe(3);
      expect(result.reviewQueuePending).toBe(10);
    });
  });

  // ─── getAdminSellersList ──────────────────────────────────────────────────

  describe('getAdminSellersList', () => {
    it("7. retourne une liste vide quand il n'y a aucun seller", async () => {
      prisma.sellerProfile.findMany.mockResolvedValue([]);

      const result = await service.getAdminSellersList();

      expect(result).toEqual([]);
      // groupBy ne doit pas être appelé si sellers est vide
      expect(prisma.marketplaceDocument.groupBy).not.toHaveBeenCalled();
    });

    it('8. retourne les rows avec complianceStatus calculé correctement', async () => {
      prisma.sellerProfile.findMany.mockResolvedValue([
        { id: 'sp-1', publicDisplayName: 'Vendeur A', status: 'APPROVED' },
        { id: 'sp-2', publicDisplayName: 'Vendeur B', status: 'PENDING_REVIEW' },
      ]);

      // sp-1 a 1 doc VERIFIED, sp-2 a 1 doc PENDING
      prisma.marketplaceDocument.groupBy.mockResolvedValue([
        { relatedId: 'sp-1', verificationStatus: MarketplaceVerificationStatus.VERIFIED, _count: { id: 1 } },
        { relatedId: 'sp-2', verificationStatus: MarketplaceVerificationStatus.PENDING, _count: { id: 1 } },
      ]);
      prisma.certification.groupBy.mockResolvedValue([]);
      prisma.marketplaceReviewQueue.groupBy.mockResolvedValue([]);

      const result = await service.getAdminSellersList();

      expect(result).toHaveLength(2);

      const vendeurA = result.find((r) => r.sellerProfileId === 'sp-1')!;
      expect(vendeurA.publicDisplayName).toBe('Vendeur A');
      expect(vendeurA.sellerProfileStatus).toBe('APPROVED');
      expect(vendeurA.complianceStatus).toBe('COMPLETE');
      expect(vendeurA.documentsVerified).toBe(1);
      expect(vendeurA.documentsTotal).toBe(1);

      const vendeurB = result.find((r) => r.sellerProfileId === 'sp-2')!;
      expect(vendeurB.publicDisplayName).toBe('Vendeur B');
      expect(vendeurB.complianceStatus).toBe('PENDING_REVIEW');
      expect(vendeurB.documentsPending).toBe(1);
    });
  });
});
