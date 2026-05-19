// StripePaymentAdapter — seul fichier qui importe le SDK Stripe.
// Traduit les params domain → SDK Stripe, et les réponses/erreurs SDK → domain.

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import Stripe = require('stripe');
import {
  PaymentProvider,
  CheckoutSessionParams,
  CheckoutSessionResult,
  ConnectedAccountParams,
  OnboardingLinkParams,
  OnboardingLinkResult,
  AccountStatusFlags,
  RefundParams,
  RefundResult,
  PaymentEvent,
} from '../payment-provider.interface';
import {
  PaymentProviderError,
  PaymentProviderNotConfiguredError,
  PaymentDeclinedError,
  PaymentConfigError,
  WebhookSignatureError,
} from '../payment-provider.errors';

@Injectable()
export class StripePaymentAdapter implements PaymentProvider {
  private readonly stripe: Stripe.Stripe | null;

  constructor(config: ConfigService) {
    const key = config.get<string>('STRIPE_SECRET_KEY');
    this.stripe =
      key && key.length > 0
        ? new Stripe(key, {
            typescript: true,
            appInfo: { name: 'iox-marketplace', version: '1.0.0' },
          })
        : null;
  }

  isConfigured(): boolean {
    return this.stripe !== null;
  }

  private sdk(): Stripe.Stripe {
    if (!this.stripe) throw new PaymentProviderNotConfiguredError();
    return this.stripe;
  }

  async createCheckoutSession(p: CheckoutSessionParams): Promise<CheckoutSessionResult> {
    try {
      const session = await this.sdk().checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: p.currency.toLowerCase(),
              product_data: { name: p.productName },
              unit_amount: p.amountCents,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: p.applicationFeeCents,
          transfer_data: { destination: p.destinationAccountId },
          metadata: p.metadata,
        },
        success_url: p.successUrl,
        cancel_url: p.cancelUrl,
        metadata: p.metadata,
      });
      return { sessionId: session.id, url: session.url ?? '' };
    } catch (err) {
      throw this.mapError(err);
    }
  }

  async createRefund(p: RefundParams): Promise<RefundResult> {
    try {
      const refund = await this.sdk().refunds.create({
        payment_intent: p.paymentIntentId,
        reason: 'requested_by_customer',
        ...(p.amountCents !== undefined ? { amount: p.amountCents } : {}),
      });
      return { refundId: refund.id };
    } catch (err) {
      throw this.mapError(err);
    }
  }

  async createConnectedAccount(p: ConnectedAccountParams): Promise<{ accountId: string }> {
    try {
      const account = await this.sdk().accounts.create({
        type: 'express',
        country: p.country,
        email: p.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'company',
        metadata: {
          seller_profile_id: p.sellerProfileId,
          company_id: p.companyId,
        },
      });
      return { accountId: account.id };
    } catch (err) {
      throw this.mapError(err);
    }
  }

  async generateOnboardingLink(p: OnboardingLinkParams): Promise<OnboardingLinkResult> {
    try {
      const link = await this.sdk().accountLinks.create({
        account: p.accountId, // NOTE: p.accountId (not p.stripeAccountId)
        type: 'account_onboarding',
        return_url: p.returnUrl,
        refresh_url: p.refreshUrl,
      });
      return { url: link.url, expiresAt: link.expires_at };
    } catch (err) {
      throw this.mapError(err);
    }
  }

  async retrieveAccountFlags(accountId: string): Promise<AccountStatusFlags> {
    try {
      const account = await this.sdk().accounts.retrieve(accountId);
      return {
        detailsSubmitted: account.details_submitted ?? false,
        chargesEnabled: account.charges_enabled ?? false,
        payoutsEnabled: account.payouts_enabled ?? false,
        capabilities: account.capabilities
          ? (account.capabilities as Record<string, unknown>)
          : null,
        requirements: account.requirements
          ? (account.requirements as { disabled_reason?: string | null })
          : null,
      };
    } catch (err) {
      throw this.mapError(err);
    }
  }

  async verifyWebhookEvent(payload: Buffer, signature: string, secret: string): Promise<PaymentEvent> {
    try {
      const event = this.sdk().webhooks.constructEvent(payload, signature, secret);
      return {
        id: event.id,
        type: event.type,
        data: { object: event.data.object },
      };
    } catch (err) {
      throw this.mapError(err);
    }
  }

  /** Visible pour les tests unitaires. */
  mapError(err: unknown): PaymentProviderError {
    if (err instanceof PaymentProviderError) return err;
    if (err instanceof Stripe.errors.StripeCardError) {
      return new PaymentDeclinedError(err.message, err);
    }
    if (err instanceof Stripe.errors.StripeInvalidRequestError) {
      return new PaymentConfigError(err.message, err);
    }
    if (err instanceof Stripe.errors.StripeSignatureVerificationError) {
      return new WebhookSignatureError(err);
    }
    return new PaymentProviderError(
      err instanceof Error ? err.message : 'Unknown PSP error',
      err,
    );
  }
}
