import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { MarketplaceRelatedEntityType, MarketplaceVerificationStatus, RequestUser } from '@iox/shared';

export type ComplianceStatus = 'COMPLETE' | 'ACTION_REQUIRED' | 'PENDING_REVIEW' | 'BLOCKED' | 'INCOMPLETE';

export interface SellerComplianceSummary {
  status: ComplianceStatus;
  completionPercentage: number;
  sellerProfileStatus: string;
  sellerProfileRejectionReason: string | null;
  totalDocuments: number;
  verifiedDocuments: number;
  pendingDocuments: number;
  rejectedDocuments: number;
  expiredDocuments: number;
  expiringSoonDocuments: number; // validUntil < 30j
  totalCertifications: number;
  verifiedCertifications: number;
  pendingCertifications: number;
  rejectedCertifications: number;
  expiredCertifications: number;
  expiringSoonCertifications: number;
  pendingReviewItems: number; // MarketplaceReviewQueue PENDING
  nextAction: string | null;
}

export interface AdminComplianceSummary {
  sellersTotal: number;
  sellersApproved: number;
  sellersPendingReview: number;
  sellersRejected: number;
  sellersSuspended: number;
  documentsPending: number;
  documentsRejected: number;
  documentsExpired: number;
  documentsExpiringSoon: number;
  certificationsPending: number;
  certificationsRejected: number;
  certificationsExpired: number;
  certificationsExpiringSoon: number;
  reviewQueuePending: number;
}

export interface SellerComplianceRow {
  sellerProfileId: string;
  publicDisplayName: string;
  sellerProfileStatus: string;
  complianceStatus: ComplianceStatus;
  documentsTotal: number;
  documentsVerified: number;
  documentsPending: number;
  documentsRejected: number;
  certificationsTotal: number;
  certificationsVerified: number;
  certificationsPending: number;
  certificationsRejected: number;
  pendingReviewItems: number;
}

@Injectable()
export class ComplianceService {
  constructor(private readonly prisma: PrismaService) {}

  async getSellerSummary(actor: RequestUser): Promise<SellerComplianceSummary> {
    const sellerProfileId = actor.sellerProfileIds?.[0];
    if (!sellerProfileId) {
      return this.emptySellerSummary('ACTION_REQUIRED', 'Créez votre profil vendeur pour commencer.');
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [sellerProfile, docs, certs, reviewItems] = await Promise.all([
      this.prisma.sellerProfile.findUnique({
        where: { id: sellerProfileId },
        select: { status: true, rejectionReason: true },
      }),
      this.prisma.marketplaceDocument.groupBy({
        by: ['verificationStatus'],
        where: {
          relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
          relatedId: sellerProfileId,
        },
        _count: { id: true },
      }),
      this.prisma.certification.groupBy({
        by: ['verificationStatus'],
        where: {
          relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
          relatedId: sellerProfileId,
        },
        _count: { id: true },
      }),
      this.prisma.marketplaceReviewQueue.count({
        where: { entityId: sellerProfileId, status: 'PENDING' },
      }),
    ]);

    const [expiringSoonDocs, expiringSoonCerts] = await Promise.all([
      this.prisma.marketplaceDocument.count({
        where: {
          relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
          relatedId: sellerProfileId,
          verificationStatus: MarketplaceVerificationStatus.VERIFIED,
          validUntil: { gt: now, lt: thirtyDaysFromNow },
        },
      }),
      this.prisma.certification.count({
        where: {
          relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
          relatedId: sellerProfileId,
          verificationStatus: MarketplaceVerificationStatus.VERIFIED,
          validUntil: { gt: now, lt: thirtyDaysFromNow },
        },
      }),
    ]);

    const docCounts = this.groupCounts(docs);
    const certCounts = this.groupCounts(certs);

    const totalDocuments = Object.values(docCounts).reduce((a, b) => a + b, 0);
    const totalCertifications = Object.values(certCounts).reduce((a, b) => a + b, 0);

    const profileStatus = sellerProfile?.status ?? 'DRAFT';
    const { status, nextAction } = this.computeStatus({
      profileStatus,
      rejectedDocs: docCounts[MarketplaceVerificationStatus.REJECTED] ?? 0,
      rejectedCerts: certCounts[MarketplaceVerificationStatus.REJECTED] ?? 0,
      pendingDocs: docCounts[MarketplaceVerificationStatus.PENDING] ?? 0,
      pendingCerts: certCounts[MarketplaceVerificationStatus.PENDING] ?? 0,
      verifiedDocs: docCounts[MarketplaceVerificationStatus.VERIFIED] ?? 0,
      verifiedCerts: certCounts[MarketplaceVerificationStatus.VERIFIED] ?? 0,
      pendingReviewItems: reviewItems,
    });

    const completionNumerator =
      (docCounts[MarketplaceVerificationStatus.VERIFIED] ?? 0) +
      (certCounts[MarketplaceVerificationStatus.VERIFIED] ?? 0);
    const completionDenominator = Math.max(1, totalDocuments + totalCertifications);
    const completionPercentage = Math.round((completionNumerator / completionDenominator) * 100);

    return {
      status,
      completionPercentage,
      sellerProfileStatus: profileStatus,
      sellerProfileRejectionReason: sellerProfile?.rejectionReason ?? null,
      totalDocuments,
      verifiedDocuments: docCounts[MarketplaceVerificationStatus.VERIFIED] ?? 0,
      pendingDocuments: docCounts[MarketplaceVerificationStatus.PENDING] ?? 0,
      rejectedDocuments: docCounts[MarketplaceVerificationStatus.REJECTED] ?? 0,
      expiredDocuments: docCounts[MarketplaceVerificationStatus.EXPIRED] ?? 0,
      expiringSoonDocuments: expiringSoonDocs,
      totalCertifications,
      verifiedCertifications: certCounts[MarketplaceVerificationStatus.VERIFIED] ?? 0,
      pendingCertifications: certCounts[MarketplaceVerificationStatus.PENDING] ?? 0,
      rejectedCertifications: certCounts[MarketplaceVerificationStatus.REJECTED] ?? 0,
      expiredCertifications: certCounts[MarketplaceVerificationStatus.EXPIRED] ?? 0,
      expiringSoonCertifications: expiringSoonCerts,
      pendingReviewItems: reviewItems,
      nextAction,
    };
  }

  async getAdminSummary(): Promise<AdminComplianceSummary> {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      sellersByStatus,
      docsByStatus,
      expiringSoonDocs,
      certsByStatus,
      expiringSoonCerts,
      reviewQueuePending,
    ] = await Promise.all([
      this.prisma.sellerProfile.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.marketplaceDocument.groupBy({
        by: ['verificationStatus'],
        where: { relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE },
        _count: { id: true },
      }),
      this.prisma.marketplaceDocument.count({
        where: {
          relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
          verificationStatus: MarketplaceVerificationStatus.VERIFIED,
          validUntil: { gt: now, lt: thirtyDaysFromNow },
        },
      }),
      this.prisma.certification.groupBy({
        by: ['verificationStatus'],
        where: { relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE },
        _count: { id: true },
      }),
      this.prisma.certification.count({
        where: {
          relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
          verificationStatus: MarketplaceVerificationStatus.VERIFIED,
          validUntil: { gt: now, lt: thirtyDaysFromNow },
        },
      }),
      this.prisma.marketplaceReviewQueue.count({ where: { status: 'PENDING' } }),
    ]);

    const sc = this.indexBy(sellersByStatus, 'status');
    const dc = this.groupCounts(docsByStatus);
    const cc = this.groupCounts(certsByStatus);

    return {
      sellersTotal: sellersByStatus.reduce((a, b) => a + b._count.id, 0),
      sellersApproved: sc['APPROVED'] ?? 0,
      sellersPendingReview: sc['PENDING_REVIEW'] ?? 0,
      sellersRejected: sc['REJECTED'] ?? 0,
      sellersSuspended: sc['SUSPENDED'] ?? 0,
      documentsPending: dc[MarketplaceVerificationStatus.PENDING] ?? 0,
      documentsRejected: dc[MarketplaceVerificationStatus.REJECTED] ?? 0,
      documentsExpired: dc[MarketplaceVerificationStatus.EXPIRED] ?? 0,
      documentsExpiringSoon: expiringSoonDocs,
      certificationsPending: cc[MarketplaceVerificationStatus.PENDING] ?? 0,
      certificationsRejected: cc[MarketplaceVerificationStatus.REJECTED] ?? 0,
      certificationsExpired: cc[MarketplaceVerificationStatus.EXPIRED] ?? 0,
      certificationsExpiringSoon: expiringSoonCerts,
      reviewQueuePending,
    };
  }

  async getAdminSellersList(): Promise<SellerComplianceRow[]> {
    // Fetch all seller profiles + their doc/cert counts in parallel.
    const sellers = await this.prisma.sellerProfile.findMany({
      select: { id: true, publicDisplayName: true, status: true },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    if (sellers.length === 0) return [];

    const sellerIds = sellers.map((s) => s.id);

    const [allDocs, allCerts, allReview] = await Promise.all([
      this.prisma.marketplaceDocument.groupBy({
        by: ['relatedId', 'verificationStatus'],
        where: {
          relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
          relatedId: { in: sellerIds },
        },
        _count: { id: true },
      }),
      this.prisma.certification.groupBy({
        by: ['relatedId', 'verificationStatus'],
        where: {
          relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
          relatedId: { in: sellerIds },
        },
        _count: { id: true },
      }),
      this.prisma.marketplaceReviewQueue.groupBy({
        by: ['entityId'],
        where: { entityId: { in: sellerIds }, status: 'PENDING' },
        _count: { id: true },
      }),
    ]);

    // Index by sellerId
    const docsBySeller = this.groupByRelatedId(allDocs);
    const certsBySeller = this.groupByRelatedId(allCerts);
    const reviewBySeller = Object.fromEntries(
      allReview.map((r) => [r.entityId, r._count.id]),
    );

    return sellers.map((seller) => {
      const docs = docsBySeller[seller.id] ?? {};
      const certs = certsBySeller[seller.id] ?? {};
      const pendingReview = reviewBySeller[seller.id] ?? 0;

      const { status: complianceStatus } = this.computeStatus({
        profileStatus: seller.status,
        rejectedDocs: docs[MarketplaceVerificationStatus.REJECTED] ?? 0,
        rejectedCerts: certs[MarketplaceVerificationStatus.REJECTED] ?? 0,
        pendingDocs: docs[MarketplaceVerificationStatus.PENDING] ?? 0,
        pendingCerts: certs[MarketplaceVerificationStatus.PENDING] ?? 0,
        verifiedDocs: docs[MarketplaceVerificationStatus.VERIFIED] ?? 0,
        verifiedCerts: certs[MarketplaceVerificationStatus.VERIFIED] ?? 0,
        pendingReviewItems: pendingReview,
      });

      const docTotal = Object.values(docs).reduce((a, b) => a + b, 0);
      const certTotal = Object.values(certs).reduce((a, b) => a + b, 0);

      return {
        sellerProfileId: seller.id,
        publicDisplayName: seller.publicDisplayName,
        sellerProfileStatus: seller.status,
        complianceStatus,
        documentsTotal: docTotal,
        documentsVerified: docs[MarketplaceVerificationStatus.VERIFIED] ?? 0,
        documentsPending: docs[MarketplaceVerificationStatus.PENDING] ?? 0,
        documentsRejected: docs[MarketplaceVerificationStatus.REJECTED] ?? 0,
        certificationsTotal: certTotal,
        certificationsVerified: certs[MarketplaceVerificationStatus.VERIFIED] ?? 0,
        certificationsPending: certs[MarketplaceVerificationStatus.PENDING] ?? 0,
        certificationsRejected: certs[MarketplaceVerificationStatus.REJECTED] ?? 0,
        pendingReviewItems: pendingReview,
      };
    });
  }

  // ─── Helpers privés ────────────────────────────────────────────────────────

  private computeStatus(p: {
    profileStatus: string;
    rejectedDocs: number;
    rejectedCerts: number;
    pendingDocs: number;
    pendingCerts: number;
    verifiedDocs: number;
    verifiedCerts: number;
    pendingReviewItems: number;
  }): { status: ComplianceStatus; nextAction: string | null } {
    if (p.profileStatus === 'REJECTED') {
      return { status: 'BLOCKED', nextAction: 'Votre profil a été rejeté. Contactez le support IOX.' };
    }
    if (p.profileStatus === 'SUSPENDED') {
      return { status: 'BLOCKED', nextAction: 'Votre compte est suspendu. Contactez le support IOX.' };
    }
    if (p.rejectedDocs > 0 || p.rejectedCerts > 0) {
      return { status: 'ACTION_REQUIRED', nextAction: 'Corrigez les documents ou certifications refusés.' };
    }
    if (p.profileStatus === 'DRAFT') {
      return { status: 'INCOMPLETE', nextAction: 'Complétez et soumettez votre profil vendeur.' };
    }
    if (p.profileStatus === 'PENDING_REVIEW' || p.pendingReviewItems > 0) {
      return { status: 'PENDING_REVIEW', nextAction: 'Votre dossier est en cours de vérification par IOX.' };
    }
    if (p.pendingDocs > 0 || p.pendingCerts > 0) {
      return { status: 'PENDING_REVIEW', nextAction: 'Des documents sont en attente de vérification.' };
    }
    if (p.profileStatus === 'APPROVED' && p.verifiedDocs + p.verifiedCerts >= 0) {
      return { status: 'COMPLETE', nextAction: null };
    }
    return { status: 'INCOMPLETE', nextAction: 'Ajoutez vos documents et certifications.' };
  }

  private groupCounts(
    groups: { verificationStatus: string; _count: { id: number } }[],
  ): Record<string, number> {
    return Object.fromEntries(groups.map((g) => [g.verificationStatus, g._count.id]));
  }

  private indexBy(
    groups: { status: string; _count: { id: number } }[],
    _key: string,
  ): Record<string, number> {
    return Object.fromEntries(groups.map((g) => [g.status, g._count.id]));
  }

  private groupByRelatedId(
    groups: { relatedId: string; verificationStatus: string; _count: { id: number } }[],
  ): Record<string, Record<string, number>> {
    const result: Record<string, Record<string, number>> = {};
    for (const g of groups) {
      if (!result[g.relatedId]) result[g.relatedId] = {};
      result[g.relatedId][g.verificationStatus] = g._count.id;
    }
    return result;
  }

  private emptySellerSummary(status: ComplianceStatus, nextAction: string): SellerComplianceSummary {
    return {
      status,
      completionPercentage: 0,
      sellerProfileStatus: 'DRAFT',
      sellerProfileRejectionReason: null,
      totalDocuments: 0, verifiedDocuments: 0, pendingDocuments: 0,
      rejectedDocuments: 0, expiredDocuments: 0, expiringSoonDocuments: 0,
      totalCertifications: 0, verifiedCertifications: 0, pendingCertifications: 0,
      rejectedCertifications: 0, expiredCertifications: 0, expiringSoonCertifications: 0,
      pendingReviewItems: 0,
      nextAction,
    };
  }
}
