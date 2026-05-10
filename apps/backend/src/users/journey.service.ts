// Journey service — computes user progression state for guided UX.
//
// Aggregates real data from Prisma to determine:
//  - what steps the user has completed
//  - what their next recommended action is
//  - their overall completion percentage
//
// Used by GET /users/me/journey — consumed by the frontend
// GuidedDashboard and onboarding components.

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RequestUser, UserRole } from '@iox/shared';

export interface JourneyStep {
  id: string;
  label: string;
  completed: boolean;
  current: boolean;
  href: string;
}

export interface JourneyResponse {
  role: UserRole;
  completionPercentage: number;
  nextAction: { label: string; href: string } | null;
  steps: JourneyStep[];
  data: {
    hasCompany: boolean;
    hasSellerProfile: boolean;
    sellerProfileStatus: string | null;
    sellerProfileComplete: boolean;
    hasProducts: boolean;
    hasPublishedProducts: boolean;
    productCount: number;
    publishedProductCount: number;
    hasDocuments: boolean;
    hasPendingRfqs: boolean;
    rfqCount: number;
    hasInvoices: boolean;
    hasStripeAccount: boolean;
  };
}

@Injectable()
export class JourneyService {
  constructor(private readonly prisma: PrismaService) {}

  async getJourney(actor: RequestUser): Promise<JourneyResponse> {
    if (actor.role === UserRole.MARKETPLACE_SELLER) {
      return this.getSellerJourney(actor);
    }
    if (actor.role === UserRole.MARKETPLACE_BUYER) {
      return this.getBuyerJourney(actor);
    }
    // Admin/Coordinator — no guided journey, return full-access state
    return this.getStaffJourney(actor);
  }

  private async getSellerJourney(actor: RequestUser): Promise<JourneyResponse> {
    const sellerProfileId = actor.sellerProfileIds?.[0];
    const companyId = actor.companyIds?.[0];

    // Fetch all data in parallel
    const [
      sellerProfile,
      productCount,
      publishedProductCount,
      docCount,
      rfqCount,
      invoiceCount,
    ] = await Promise.all([
      sellerProfileId
        ? this.prisma.sellerProfile.findUnique({
            where: { id: sellerProfileId },
            select: {
              status: true,
              publicDisplayName: true,
              descriptionShort: true,
              descriptionLong: true,
              salesEmail: true,
              logoMediaId: true,
              country: true,
              slug: true,
            },
          })
        : null,
      sellerProfileId
        ? this.prisma.marketplaceProduct.count({
            where: { sellerProfileId },
          })
        : 0,
      sellerProfileId
        ? this.prisma.marketplaceProduct.count({
            where: { sellerProfileId, publicationStatus: 'PUBLISHED' },
          })
        : 0,
      sellerProfileId
        ? this.prisma.marketplaceDocument.count({
            where: {
              relatedType: 'SELLER_PROFILE',
              relatedId: sellerProfileId,
            },
          })
        : 0,
      sellerProfileId
        ? this.prisma.quoteRequest.count({
            where: {
              marketplaceOffer: { sellerProfileId },
            },
          })
        : 0,
      sellerProfileId
        ? this.prisma.invoice.count({
            where: { sellerProfileId },
          })
        : 0,
    ]);

    const hasCompany = !!companyId;
    const hasSellerProfile = !!sellerProfile;
    const sellerProfileStatus = sellerProfile?.status ?? null;
    const sellerProfileComplete = !!(
      sellerProfile?.descriptionShort &&
      sellerProfile?.salesEmail &&
      sellerProfile?.country &&
      sellerProfile?.slug
    );
    const hasProducts = productCount > 0;
    const hasPublishedProducts = publishedProductCount > 0;
    const hasDocuments = docCount > 0;
    const hasPendingRfqs = rfqCount > 0;
    const hasInvoices = invoiceCount > 0;

    // Build steps
    const steps: JourneyStep[] = [
      {
        id: 'profile',
        label: 'Compléter mon profil vendeur',
        completed: hasSellerProfile && sellerProfileComplete,
        current: !hasSellerProfile || !sellerProfileComplete,
        href: '/seller/profile/edit',
      },
      {
        id: 'documents',
        label: 'Ajouter mes documents',
        completed: hasDocuments,
        current: hasSellerProfile && sellerProfileComplete && !hasDocuments,
        href: '/seller/documents',
      },
      {
        id: 'products',
        label: 'Ajouter mes produits',
        completed: hasProducts,
        current: hasSellerProfile && sellerProfileComplete && !hasProducts,
        href: '/seller/marketplace-products/new',
      },
      {
        id: 'publish',
        label: 'Publier mes produits',
        completed: hasPublishedProducts,
        current: hasProducts && !hasPublishedProducts,
        href: '/seller/marketplace-products',
      },
      {
        id: 'rfq',
        label: 'Gérer mes demandes de devis',
        completed: hasPendingRfqs,
        current: hasPublishedProducts && !hasPendingRfqs,
        href: '/quote-requests',
      },
      {
        id: 'invoices',
        label: 'Consulter mes factures',
        completed: hasInvoices,
        current: hasPendingRfqs && !hasInvoices,
        href: '/seller/invoices',
      },
    ];

    // Find first incomplete step for nextAction
    const firstIncomplete = steps.find((s) => !s.completed);
    // Mark only the actual next step as current
    for (const step of steps) {
      step.current = step === firstIncomplete;
    }

    const completedCount = steps.filter((s) => s.completed).length;
    const completionPercentage = Math.round((completedCount / steps.length) * 100);

    // Check real Stripe account status
    const sellerProfileForStripe = actor.companyIds?.[0]
      ? await this.prisma.sellerProfile.findFirst({
          where: { companyId: actor.companyIds[0] },
          select: { id: true },
        })
      : null;

    const stripeAccount = sellerProfileForStripe
      ? await this.prisma.sellerStripeAccount.findFirst({
          where: { sellerProfileId: sellerProfileForStripe.id, chargesEnabled: true },
          select: { id: true },
        })
      : null;

    const hasStripeAccount = !!stripeAccount;

    return {
      role: UserRole.MARKETPLACE_SELLER,
      completionPercentage,
      nextAction: firstIncomplete
        ? { label: firstIncomplete.label, href: firstIncomplete.href }
        : null,
      steps,
      data: {
        hasCompany,
        hasSellerProfile,
        sellerProfileStatus,
        sellerProfileComplete,
        hasProducts,
        hasPublishedProducts,
        productCount,
        publishedProductCount,
        hasDocuments,
        hasPendingRfqs,
        rfqCount,
        hasInvoices,
        hasStripeAccount,
      },
    };
  }

  private async getBuyerJourney(actor: RequestUser): Promise<JourneyResponse> {
    const companyId = actor.companyIds?.[0];

    const [company, rfqCount, invoiceCount] = await Promise.all([
      companyId
        ? this.prisma.company.findUnique({
            where: { id: companyId },
            select: {
              name: true,
              address: true,
              email: true,
              vatNumber: true,
            },
          })
        : null,
      companyId
        ? this.prisma.quoteRequest.count({
            where: { buyerCompanyId: companyId },
          })
        : 0,
      companyId
        ? this.prisma.invoice.count({
            where: { buyerCompanyId: companyId },
          })
        : 0,
    ]);

    const hasCompany = !!company;
    const profileComplete = !!(company?.name && company?.address && company?.email);
    const hasRfqs = rfqCount > 0;
    const hasInvoices = invoiceCount > 0;

    const steps: JourneyStep[] = [
      {
        id: 'profile',
        label: 'Compléter mon profil acheteur',
        completed: hasCompany && profileComplete,
        current: !hasCompany || !profileComplete,
        href: '/buyer/profile/edit',
      },
      {
        id: 'browse',
        label: 'Parcourir le catalogue',
        completed: true, // Always accessible
        current: false,
        href: '/marketplace',
      },
      {
        id: 'rfq',
        label: 'Envoyer une demande de devis',
        completed: hasRfqs,
        current: hasCompany && profileComplete && !hasRfqs,
        href: '/marketplace',
      },
      {
        id: 'orders',
        label: 'Suivre mes commandes',
        completed: hasRfqs, // Has at least interacted
        current: hasRfqs,
        href: '/buyer/orders',
      },
      {
        id: 'invoices',
        label: 'Télécharger mes factures',
        completed: hasInvoices,
        current: hasRfqs && !hasInvoices,
        href: '/buyer/invoices',
      },
    ];

    const firstIncomplete = steps.find((s) => !s.completed);
    for (const step of steps) {
      step.current = step === firstIncomplete;
    }

    const completedCount = steps.filter((s) => s.completed).length;
    const completionPercentage = Math.round((completedCount / steps.length) * 100);

    return {
      role: UserRole.MARKETPLACE_BUYER,
      completionPercentage,
      nextAction: firstIncomplete
        ? { label: firstIncomplete.label, href: firstIncomplete.href }
        : null,
      steps,
      data: {
        hasCompany,
        hasSellerProfile: false,
        sellerProfileStatus: null,
        sellerProfileComplete: false,
        hasProducts: false,
        hasPublishedProducts: false,
        productCount: 0,
        publishedProductCount: 0,
        hasDocuments: false,
        hasPendingRfqs: hasRfqs,
        rfqCount,
        hasInvoices,
        hasStripeAccount: false,
      },
    };
  }

  private async getStaffJourney(actor: RequestUser): Promise<JourneyResponse> {
    return {
      role: actor.role as UserRole,
      completionPercentage: 100,
      nextAction: null,
      steps: [],
      data: {
        hasCompany: true,
        hasSellerProfile: true,
        sellerProfileStatus: 'APPROVED',
        sellerProfileComplete: true,
        hasProducts: true,
        hasPublishedProducts: true,
        productCount: 0,
        publishedProductCount: 0,
        hasDocuments: true,
        hasPendingRfqs: false,
        rfqCount: 0,
        hasInvoices: false,
        hasStripeAccount: false,
      },
    };
  }
}
