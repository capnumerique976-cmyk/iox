// PAY-1 phase 1 LOT 3 — Service de traitement des events Stripe webhook.
//
// Handlers V1 :
//  - payment_intent.succeeded → Payment status=SUCCEEDED + IDs Stripe
//  - payment_intent.payment_failed → Payment status=FAILED + errorCode/errorMessage
//  - account.updated (Connect) → SellerStripeAccount status sync
//  - autres → log + ignore (return 200)

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PaymentStatus } from '@iox/shared';
import { StripeOnboardingService } from './stripe-onboarding.service';
// Types Stripe (Event, PaymentIntent, Account) : le SDK 22.x complique
// l'extraction des types depuis le default export (cf. namespace merging
// quirks). On utilise des shapes minimales typées localement — sufficient
// pour le webhook handler V1, et précis sur les champs qu'on lit.
interface StripeEventBase {
  id: string;
  type: string;
  data: { object: unknown };
}
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly onboarding: StripeOnboardingService,
  ) {}

  async handleEvent(event: StripeEventBase): Promise<{ handled: boolean; action: string }> {
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

    await this.prisma.payment.update({
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
    return { handled: true, action: 'payment-succeeded' };
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
