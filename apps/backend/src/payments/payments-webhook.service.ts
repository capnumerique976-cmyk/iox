// PAY-1 phase 1 LOT 3 — Service de traitement des events Stripe webhook.
// PAY-2 — Email notification on payment_intent.succeeded.
//
// Handlers V1 :
//  - payment_intent.succeeded → Payment status=SUCCEEDED + IDs Stripe + email buyer
//  - payment_intent.payment_failed → Payment status=FAILED + errorCode/errorMessage
//  - account.updated (Connect) → SellerStripeAccount status sync
//  - autres → log + ignore (return 200)

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { PaymentStatus } from '@iox/shared';
import { StripeOnboardingService } from './stripe-onboarding.service';
import { NotifEmailService } from '../notif-email/notif-email.service';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
  type PaymentEvent,
} from './provider/payment-provider.interface';
interface StripePaymentIntentLike {
  id: string;
  amount?: number;
  metadata?: Record<string, string>;
  latest_charge?: string | { id: string } | null;
  last_payment_error?: { code?: string | null; message?: string | null } | null;
}
interface StripeAccountLike {
  id: string;
  details_submitted?: boolean;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  capabilities?: object;
  requirements?: { disabled_reason?: string | null } | null;
  metadata?: Record<string, string>;
}

@Injectable()
export class PaymentsWebhookService {
  private readonly logger = new Logger(PaymentsWebhookService.name);
  private readonly webhookSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly onboarding: StripeOnboardingService,
    private readonly notifEmail: NotifEmailService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    config: ConfigService,
  ) {
    this.webhookSecret = config.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';
  }

  /**
   * Webhook entry point. Verifies signature via provider, then dispatches event.
   * Throws WebhookSignatureError if invalid — controller maps it to BadRequestException.
   */
  async receiveRaw(
    payload: Buffer,
    signature: string,
  ): Promise<{ handled: boolean; action: string; eventType: string }> {
    const event = await this.provider.verifyWebhookEvent(payload, signature, this.webhookSecret);
    this.logger.log(`Webhook received type=${event.type} id=${event.id}`);
    const result = await this.handleEvent(event);
    return { ...result, eventType: event.type };
  }

  async handleEvent(event: PaymentEvent): Promise<{ handled: boolean; action: string }> {
    switch (event.type) {
      case 'payment_intent.succeeded':
        return this.handlePaymentIntentSucceeded(event.data.object as StripePaymentIntentLike);

      case 'payment_intent.payment_failed':
        return this.handlePaymentIntentFailed(event.data.object as StripePaymentIntentLike);

      case 'account.updated':
        return this.handleAccountUpdated(event.data.object as StripeAccountLike);

      default:
        this.logger.debug(`Webhook event ignored type=${event.type}`);
        return { handled: false, action: 'ignored' };
    }
  }

  private async handlePaymentIntentSucceeded(
    pi: StripePaymentIntentLike,
  ): Promise<{ handled: boolean; action: string }> {
    const paymentId = pi.metadata?.payment_id;
    if (!paymentId) {
      this.logger.warn(`payment_intent.succeeded sans payment_id metadata pi=${pi.id}`);
      return { handled: false, action: 'no-payment-id' };
    }

    const chargeId =
      typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id;

    const payment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.SUCCEEDED,
        stripePaymentIntentId: pi.id,
        stripeChargeId: chargeId ?? null,
      },
    });

    this.logger.log(
      `Payment SUCCEEDED paymentId=${paymentId} pi=${pi.id} amount=${pi.amount}`,
    );

    // PAY-2 — safeNotify buyer by email.
    await this.safeNotifyBuyer(payment);

    return { handled: true, action: 'payment-succeeded' };
  }

  /**
   * PAY-2 — Envoie l'email "Paiement confirmé" au buyer.
   * Pattern safeNotify : try/catch, pas de throw sur échec email.
   */
  private async safeNotifyBuyer(payment: {
    id: string;
    buyerUserId: string;
    amountCents: number;
    currency: string;
    marketplaceOfferId: string | null;
  }): Promise<void> {
    try {
      const buyer = await this.prisma.user.findUnique({
        where: { id: payment.buyerUserId },
        select: {
          email: true,
          firstName: true,
          lastName: true,
          preferredLocale: true,
        },
      });
      if (!buyer?.email) {
        this.logger.warn(`safeNotifyBuyer skipped — no buyer email paymentId=${payment.id}`);
        return;
      }

      // Resolve offer title for template data.
      let offerTitle = 'Commande IOX Marketplace';
      if (payment.marketplaceOfferId) {
        const offer = await this.prisma.marketplaceOffer.findUnique({
          where: { id: payment.marketplaceOfferId },
          select: { title: true },
        });
        if (offer?.title) offerTitle = offer.title;
      }

      const amountFormatted = `${(payment.amountCents / 100).toFixed(2)} ${payment.currency}`;
      const recipientDisplayName =
        [buyer.firstName, buyer.lastName].filter(Boolean).join(' ') || buyer.email;

      await this.notifEmail.send({
        to: buyer.email,
        templateId: 'payment-confirmed-to-buyer',
        locale: buyer.preferredLocale ?? 'fr',
        recipientUserId: payment.buyerUserId,
        templateData: {
          buyerDisplayName: recipientDisplayName,
          sellerDisplayName: '', // V1 — seller name non résolu ici
          offerTitle,
          amountFormatted,
          paymentId: payment.id,
          ctaUrl: '', // V1 — URL commande non encore disponible
        },
      });
      this.logger.log(`safeNotifyBuyer email sent paymentId=${payment.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      this.logger.warn(`safeNotifyBuyer failed (non-blocking) paymentId=${payment.id} error=${msg}`);
    }
  }

  private async handlePaymentIntentFailed(
    pi: StripePaymentIntentLike,
  ): Promise<{ handled: boolean; action: string }> {
    const paymentId = pi.metadata?.payment_id;
    if (!paymentId) {
      this.logger.warn(`payment_intent.payment_failed sans payment_id metadata pi=${pi.id}`);
      return { handled: false, action: 'no-payment-id' };
    }
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.FAILED,
        stripePaymentIntentId: pi.id,
        errorCode: pi.last_payment_error?.code ?? null,
        errorMessage: pi.last_payment_error?.message ?? null,
      },
    });
    this.logger.warn(
      `Payment FAILED paymentId=${paymentId} pi=${pi.id} code=${pi.last_payment_error?.code}`,
    );
    return { handled: true, action: 'payment-failed' };
  }

  private async handleAccountUpdated(
    account: StripeAccountLike,
  ): Promise<{ handled: boolean; action: string }> {
    const sellerProfileId = account.metadata?.seller_profile_id;
    if (!sellerProfileId) {
      this.logger.warn(`account.updated sans seller_profile_id metadata acct=${account.id}`);
      return { handled: false, action: 'no-seller-profile-id' };
    }

    const status = this.onboarding.computeStatus({
      detailsSubmitted: account.details_submitted ?? false,
      chargesEnabled: account.charges_enabled ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
      requirements: account.requirements,
    });

    await this.prisma.sellerStripeAccount.update({
      where: { sellerProfileId },
      data: {
        status,
        chargesEnabled: account.charges_enabled ?? false,
        payoutsEnabled: account.payouts_enabled ?? false,
        detailsSubmitted: account.details_submitted ?? false,
        capabilitiesJson: account.capabilities ? (account.capabilities as object) : null,
        requirementsJson: account.requirements ? (account.requirements as object) : null,
      },
    });

    this.logger.log(
      `SellerStripeAccount synced sellerProfileId=${sellerProfileId} status=${status}`,
    );
    return { handled: true, action: 'account-updated' };
  }
}
