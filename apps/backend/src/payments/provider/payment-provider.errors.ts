// Hiérarchie d'erreurs domain payments.
// Les adapters (ex: StripePaymentAdapter) catch les erreurs PSP spécifiques
// et les rethrow via ces classes — les services ne voient jamais d'erreurs Stripe.

/** Erreur de base — toutes les erreurs PSP en héritent. */
export class PaymentProviderError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'PaymentProviderError';
  }
}

/** PSP non configuré (clé API absente). */
export class PaymentProviderNotConfiguredError extends PaymentProviderError {
  constructor() {
    super('Payment provider not configured. Set STRIPE_SECRET_KEY.');
    this.name = 'PaymentProviderNotConfiguredError';
  }
}

/** Paiement refusé par la banque ou la carte. */
export class PaymentDeclinedError extends PaymentProviderError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'PaymentDeclinedError';
  }
}

/** Mauvaise configuration PSP (paramètres invalides envoyés au PSP). */
export class PaymentConfigError extends PaymentProviderError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'PaymentConfigError';
  }
}

/** Signature webhook invalide ou absente. */
export class WebhookSignatureError extends PaymentProviderError {
  constructor(cause?: unknown) {
    super('Invalid webhook signature.', cause);
    this.name = 'WebhookSignatureError';
  }
}
