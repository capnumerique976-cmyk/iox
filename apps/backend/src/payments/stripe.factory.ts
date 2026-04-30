// PAY-1 phase 1 LOT 1 — Factory Stripe SDK injecté via DI.
//
// Pattern : token `STRIPE_CLIENT` injecte une instance `Stripe` (real ou mock).
// En production : la factory lit `STRIPE_SECRET_KEY` et instancie le SDK.
// En tests : on override le provider avec un mock object.
//
// Si `STRIPE_SECRET_KEY` absent au moment où un service appelle un endpoint
// Stripe, on throw clair (pas au boot — graceful degradation V1).

import type { Provider } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export const STRIPE_CLIENT = 'STRIPE_CLIENT';

/**
 * Wrapper léger : si `STRIPE_SECRET_KEY` absent, instance non opérationnelle
 * mais l'objet existe (Nest DI exige un provider non-null). Les services
 * vérifient `isConfigured()` avant chaque call et throw clair si non.
 */
export interface StripeClientWrapper {
  /** Vrai si STRIPE_SECRET_KEY est configurée. */
  isConfigured(): boolean;
  /** Instance Stripe SDK (throw si non configurée). */
  client(): Stripe.Stripe;
}

class StripeClientWrapperImpl implements StripeClientWrapper {
  private readonly logger = new Logger('StripeClient');
  private readonly stripe: Stripe.Stripe | null;

  constructor(private readonly secretKey: string | undefined) {
    if (secretKey && secretKey.length > 0) {
      this.stripe = new Stripe(secretKey, {
        // apiVersion non pinnée V1 — utilise la version par défaut du
        // compte Stripe (gérée côté dashboard). À pinner à
        // `'2026-04-22.dahlia' as Stripe.LatestApiVersion` quand stable.
        typescript: true,
        appInfo: { name: 'iox-marketplace', version: '1.0.0' },
      });
      this.logger.log('Stripe client configured (test mode)');
    } else {
      this.stripe = null;
      this.logger.warn(
        'STRIPE_SECRET_KEY not set — Stripe-related endpoints will throw at call time',
      );
    }
  }

  isConfigured(): boolean {
    return this.stripe !== null;
  }

  client(): Stripe.Stripe {
    if (!this.stripe) {
      throw new Error(
        'Stripe SDK not configured. Set STRIPE_SECRET_KEY env var to enable payments.',
      );
    }
    return this.stripe;
  }
}

export const stripeClientProvider: Provider = {
  provide: STRIPE_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService): StripeClientWrapper => {
    const secret = config.get<string>('STRIPE_SECRET_KEY');
    return new StripeClientWrapperImpl(secret);
  },
};
