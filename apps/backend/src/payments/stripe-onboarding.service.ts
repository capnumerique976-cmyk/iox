// PAY-1 phase 1 LOT 1 — Stripe Connect Express onboarding.
//
// Crée des comptes Stripe Express pour les sellers et génère les AccountLinks
// pour le onboarding hosted-by-Stripe (KYC + bank account collection).
//
// Pattern : 1 SellerProfile → 1 SellerStripeAccount (unique). Le sellerStripeAccount
// row est créé à la première demande d'onboarding link et persisté côté DB.
// Les status sont sync via :
//   - méthode `syncAccountStatus` appelée après le return Stripe
//   - webhook `account.updated` (LOT 3)

import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SellerOwnershipService } from '../common/services/seller-ownership.service';
import {
  RequestUser,
  SellerStripeAccountStatus,
} from '@iox/shared';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
  type AccountStatusFlags,
} from './provider/payment-provider.interface';
import { PaymentProviderError } from './provider/payment-provider.errors';

@Injectable()
export class StripeOnboardingService {
  private readonly logger = new Logger(StripeOnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: SellerOwnershipService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  /**
   * Crée un compte Stripe Express si pas existant, sinon retourne l'existant.
   * Le compte est rattaché au SellerProfile via FK 1:1.
   */
  async createOrGetStripeAccount(sellerProfileId: string, actor?: RequestUser) {
    if (actor) {
      await this.ownership.assertSellerProfileOwnership(actor, sellerProfileId);
    }

    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerProfileId },
      include: { stripeAccount: true, company: true },
    });
    if (!seller) throw new NotFoundException('Profil vendeur introuvable');

    // Idempotent : si déjà créé, retourne l'existant.
    if (seller.stripeAccount) {
      return seller.stripeAccount;
    }

    if (!this.provider.isConfigured()) {
      throw new BadRequestException(
        'Stripe non configuré côté serveur. Contacter l\'admin.',
      );
    }

    let accountId: string;
    try {
      const result = await this.provider.createConnectedAccount({
        country: seller.country ?? 'FR',
        email: seller.company?.email ?? undefined,
        sellerProfileId,
        companyId: seller.companyId,
      });
      accountId = result.accountId;
    } catch (err) {
      if (err instanceof PaymentProviderError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    this.logger.log(
      `Stripe Express account created sellerProfileId=${sellerProfileId} stripeAccountId=${accountId}`,
    );

    return this.prisma.sellerStripeAccount.create({
      data: {
        sellerProfileId,
        stripeAccountId: accountId,
        status: SellerStripeAccountStatus.PENDING_ONBOARDING,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      },
    });
  }

  /**
   * Génère un AccountLink Stripe (mode account_onboarding) pour le seller.
   * URL valide ~5 min côté Stripe. Le user est redirigé vers Stripe puis
   * Stripe redirige vers `returnUrl` (ou `refreshUrl` si link expire).
   */
  async generateOnboardingLink(
    sellerProfileId: string,
    returnUrl: string,
    refreshUrl: string,
    actor?: RequestUser,
  ): Promise<{ url: string; expiresAt: number }> {
    if (!this.provider.isConfigured()) {
      throw new BadRequestException(
        'Stripe non configuré côté serveur. Contacter l\'admin.',
      );
    }

    const account = await this.createOrGetStripeAccount(sellerProfileId, actor);

    let result: { url: string; expiresAt: number };
    try {
      result = await this.provider.generateOnboardingLink({
        accountId: account.stripeAccountId,
        returnUrl,
        refreshUrl,
      });
    } catch (err) {
      if (err instanceof PaymentProviderError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    this.logger.log(
      `Onboarding link generated sellerProfileId=${sellerProfileId} expiresAt=${result.expiresAt}`,
    );
    return result;
  }

  /**
   * Sync le status du compte depuis Stripe vers DB. Appelé :
   *  - après return Stripe sur `/seller/payments/return`
   *  - via webhook `account.updated` (LOT 3)
   */
  async syncAccountStatus(sellerProfileId: string, actor?: RequestUser) {
    if (actor) {
      await this.ownership.assertSellerProfileOwnership(actor, sellerProfileId);
    }
    if (!this.provider.isConfigured()) {
      throw new BadRequestException(
        'Stripe non configuré côté serveur. Contacter l\'admin.',
      );
    }

    const existing = await this.prisma.sellerStripeAccount.findUnique({
      where: { sellerProfileId },
    });
    if (!existing) {
      throw new NotFoundException(
        'Compte Stripe non créé. Générez d\'abord un onboarding link.',
      );
    }

    let flags: Awaited<ReturnType<PaymentProvider['retrieveAccountFlags']>>;
    try {
      flags = await this.provider.retrieveAccountFlags(existing.stripeAccountId);
    } catch (err) {
      if (err instanceof PaymentProviderError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const status = this.computeStatus(flags);

    return this.prisma.sellerStripeAccount.update({
      where: { sellerProfileId },
      data: {
        status,
        chargesEnabled: flags.chargesEnabled,
        payoutsEnabled: flags.payoutsEnabled,
        detailsSubmitted: flags.detailsSubmitted,
        capabilitiesJson: flags.capabilities ? (flags.capabilities as object) : null,
        requirementsJson: flags.requirements ? (flags.requirements as object) : null,
      },
    });
  }

  /**
   * Lecture status courant (sans appel Stripe). Utilisé par UI seller.
   */
  async getAccountStatus(sellerProfileId: string, actor?: RequestUser) {
    if (actor) {
      await this.ownership.assertSellerProfileOwnership(actor, sellerProfileId);
    }
    return this.prisma.sellerStripeAccount.findUnique({
      where: { sellerProfileId },
    });
  }

  /**
   * Mappe les flags Stripe vers notre enum `SellerStripeAccountStatus`.
   * Logique :
   *  - payouts_enabled+charges_enabled → PAYOUTS_ENABLED (top status)
   *  - charges_enabled seul → CHARGES_ENABLED
   *  - details_submitted seul → ONBOARDING_INCOMPLETE (en cours d'analyse)
   *  - requirements.disabled_reason présent → RESTRICTED
   *  - sinon → PENDING_ONBOARDING
   */
  computeStatus(flags: AccountStatusFlags): SellerStripeAccountStatus {
    if (flags.requirements?.disabled_reason) {
      return SellerStripeAccountStatus.RESTRICTED;
    }
    if (flags.payoutsEnabled && flags.chargesEnabled) {
      return SellerStripeAccountStatus.PAYOUTS_ENABLED;
    }
    if (flags.chargesEnabled) {
      return SellerStripeAccountStatus.CHARGES_ENABLED;
    }
    if (flags.detailsSubmitted) {
      return SellerStripeAccountStatus.ONBOARDING_INCOMPLETE;
    }
    return SellerStripeAccountStatus.PENDING_ONBOARDING;
  }
}
