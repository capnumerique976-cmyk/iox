// Tests pour StripePaymentAdapter.
// On teste uniquement la logique pure de l'adapter :
//  - isConfigured() selon la présence de STRIPE_SECRET_KEY
//  - mapError() — mapping Stripe errors → domain errors
// Les appels Stripe réels (createCheckoutSession, etc.) sont des concerns
// d'intégration non testés unitairement ici.

import { ConfigService } from '@nestjs/config';
import { StripePaymentAdapter } from './stripe-payment.adapter';
import Stripe from 'stripe';
import {
  PaymentDeclinedError,
  PaymentConfigError,
  PaymentProviderError,
  PaymentProviderNotConfiguredError,
  WebhookSignatureError,
} from '../payment-provider.errors';

function makeAdapter(key?: string): StripePaymentAdapter {
  const config = { get: jest.fn().mockReturnValue(key) } as unknown as ConfigService;
  return new StripePaymentAdapter(config);
}

/** Crée un faux objet qui passe le `instanceof` check sans appeler le constructeur Stripe. */
function fakeStripeError<T>(Ctor: new (...args: unknown[]) => T, message: string): T {
  const err = Object.create(Ctor.prototype) as T & { message: string };
  err.message = message;
  return err;
}

describe('StripePaymentAdapter', () => {
  describe('isConfigured()', () => {
    it('returns false when STRIPE_SECRET_KEY is absent', () => {
      expect(makeAdapter(undefined).isConfigured()).toBe(false);
    });

    it('returns false when STRIPE_SECRET_KEY is empty string', () => {
      expect(makeAdapter('').isConfigured()).toBe(false);
    });

    it('returns true when STRIPE_SECRET_KEY is present', () => {
      // sk_test_xxx instancie le SDK localement sans appel réseau
      expect(makeAdapter('sk_test_abc123').isConfigured()).toBe(true);
    });
  });

  describe('mapError()', () => {
    let adapter: StripePaymentAdapter;
    beforeEach(() => {
      adapter = makeAdapter(undefined);
    });

    it('StripeCardError → PaymentDeclinedError', () => {
      const err = fakeStripeError(Stripe.errors.StripeCardError, 'Your card was declined.');
      const mapped = adapter.mapError(err);
      expect(mapped).toBeInstanceOf(PaymentDeclinedError);
      expect(mapped.message).toBe('Your card was declined.');
    });

    it('StripeInvalidRequestError → PaymentConfigError', () => {
      const err = fakeStripeError(Stripe.errors.StripeInvalidRequestError, 'Invalid amount.');
      const mapped = adapter.mapError(err);
      expect(mapped).toBeInstanceOf(PaymentConfigError);
      expect(mapped.message).toBe('Invalid amount.');
    });

    it('StripeSignatureVerificationError → WebhookSignatureError', () => {
      const err = fakeStripeError(Stripe.errors.StripeSignatureVerificationError, 'No signatures found.');
      const mapped = adapter.mapError(err);
      expect(mapped).toBeInstanceOf(WebhookSignatureError);
    });

    it('PaymentProviderError passes through unchanged', () => {
      const err = new PaymentProviderNotConfiguredError();
      expect(adapter.mapError(err)).toBe(err);
    });

    it('generic Error → PaymentProviderError with same message', () => {
      const err = new Error('network timeout');
      const mapped = adapter.mapError(err);
      expect(mapped).toBeInstanceOf(PaymentProviderError);
      expect(mapped.message).toBe('network timeout');
    });

    it('non-Error value → PaymentProviderError with generic message', () => {
      const mapped = adapter.mapError('some string error');
      expect(mapped).toBeInstanceOf(PaymentProviderError);
      expect(mapped.message).toBe('Unknown PSP error');
    });
  });
});
