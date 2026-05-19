// Tests pour StripePaymentAdapter.
// On teste uniquement la logique pure de l'adapter :
//  - isConfigured() selon la présence de STRIPE_SECRET_KEY
//  - mapError() — mapping Stripe errors → domain errors
// Les appels Stripe réels (createCheckoutSession, etc.) sont des concerns
// d'intégration non testés unitairement ici.

import { ConfigService } from '@nestjs/config';
import { StripePaymentAdapter } from './stripe-payment.adapter';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import Stripe = require('stripe');
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

  // M136 — createCheckoutSession & createRefund param verification (SDK fully mocked).

  describe('createCheckoutSession — SDK param forwarding', () => {
    it('transmet amountCents, currency lowercase, applicationFeeCents, destinationAccountId à Stripe', async () => {
      const adapter = makeAdapter('sk_test_abc123');

      // Stub the internal Stripe SDK instance's checkout.sessions.create.
      const fakeSession = { id: 'cs_test_mock', url: 'https://checkout.stripe.com/c/pay/cs_test_mock' };
      const createSpy = jest.fn().mockResolvedValue(fakeSession);
      // Access the private `stripe` property via casting.
      (adapter as unknown as { stripe: { checkout: { sessions: { create: jest.Mock } } } }).stripe = {
        checkout: { sessions: { create: createSpy } },
      } as never;

      const result = await adapter.createCheckoutSession({
        amountCents: 10000,
        currency: 'EUR',
        productName: 'Vanille premium',
        applicationFeeCents: 500,
        destinationAccountId: 'acct_seller',
        successUrl: 'https://iox/r',
        cancelUrl: 'https://iox/c',
        metadata: { payment_id: 'pay-1', quote_request_id: 'rfq-1', marketplace_offer_id: 'off-1' },
      });

      expect(result.sessionId).toBe('cs_test_mock');
      expect(result.url).toBe('https://checkout.stripe.com/c/pay/cs_test_mock');

      const callArg = createSpy.mock.calls[0][0];
      expect(callArg.mode).toBe('payment');
      // currency must be lowercase per Stripe requirements.
      expect(callArg.line_items[0].price_data.currency).toBe('eur');
      expect(callArg.line_items[0].price_data.unit_amount).toBe(10000);
      expect(callArg.payment_intent_data.application_fee_amount).toBe(500);
      expect(callArg.payment_intent_data.transfer_data.destination).toBe('acct_seller');
      expect(callArg.payment_intent_data.metadata.payment_id).toBe('pay-1');
    });

    it('Stripe error → mapped to PaymentProviderError', async () => {
      const adapter = makeAdapter('sk_test_abc123');
      const genericErr = new Error('network error');
      (adapter as unknown as { stripe: { checkout: { sessions: { create: jest.Mock } } } }).stripe = {
        checkout: { sessions: { create: jest.fn().mockRejectedValue(genericErr) } },
      } as never;

      await expect(
        adapter.createCheckoutSession({
          amountCents: 100,
          currency: 'EUR',
          productName: 'test',
          applicationFeeCents: 5,
          destinationAccountId: 'acct_x',
          successUrl: 'r',
          cancelUrl: 'c',
          metadata: {},
        }),
      ).rejects.toBeInstanceOf(PaymentProviderError);
    });
  });

  describe('createRefund — SDK param forwarding', () => {
    it('transmet paymentIntentId et amountCents (partial refund) à Stripe', async () => {
      const adapter = makeAdapter('sk_test_abc123');
      const fakeRefund = { id: 're_test_mock' };
      const createSpy = jest.fn().mockResolvedValue(fakeRefund);
      (adapter as unknown as { stripe: { refunds: { create: jest.Mock } } }).stripe = {
        refunds: { create: createSpy },
      } as never;

      const result = await adapter.createRefund({
        paymentIntentId: 'pi_test_123',
        amountCents: 5000,
      });

      expect(result.refundId).toBe('re_test_mock');
      const callArg = createSpy.mock.calls[0][0];
      expect(callArg.payment_intent).toBe('pi_test_123');
      expect(callArg.amount).toBe(5000);
      expect(callArg.reason).toBe('requested_by_customer');
    });

    it('total refund (no amountCents) → amount omitted from Stripe call', async () => {
      const adapter = makeAdapter('sk_test_abc123');
      const createSpy = jest.fn().mockResolvedValue({ id: 're_total' });
      (adapter as unknown as { stripe: { refunds: { create: jest.Mock } } }).stripe = {
        refunds: { create: createSpy },
      } as never;

      await adapter.createRefund({ paymentIntentId: 'pi_full' });

      const callArg = createSpy.mock.calls[0][0];
      expect(callArg.payment_intent).toBe('pi_full');
      expect(callArg.amount).toBeUndefined();
    });
  });
});
