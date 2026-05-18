// PaymentProvider — seam entre les services payments et le SDK PSP.
// Toutes les opérations retournent des types IOX — aucun type Stripe ne fuit
// hors de l'adapter.

export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';

// ── Input types ──────────────────────────────────────────────────────────────

export interface CheckoutSessionParams {
  amountCents: number;
  /** Devise normalisée UPPERCASE (ex: 'EUR', 'USD'). */
  currency: string;
  productName: string;
  applicationFeeCents: number;
  /** stripeAccountId du seller Connect Express. */
  destinationAccountId: string;
  successUrl: string;
  cancelUrl: string;
  /** Metadata attachée au PaymentIntent ET à la session Checkout. */
  metadata: Record<string, string>;
}

export interface ConnectedAccountParams {
  /** Code pays ISO 3166-1 alpha-2 (ex: 'FR'). */
  country: string;
  email?: string;
  sellerProfileId: string;
  companyId: string;
}

export interface OnboardingLinkParams {
  stripeAccountId: string;
  returnUrl: string;
  refreshUrl: string;
}

export interface RefundParams {
  paymentIntentId: string;
  /** Si absent : remboursement total. */
  amountCents?: number;
}

// ── Output types ─────────────────────────────────────────────────────────────

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
}

export interface RefundResult {
  refundId: string;
}

export interface AccountStatusFlags {
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  capabilities?: object | null;
  requirements?: { disabled_reason?: string | null } | null;
}

export interface PaymentEvent {
  id: string;
  type: string;
  data: { object: unknown };
}

// ── Interface ─────────────────────────────────────────────────────────────────

export interface PaymentProvider {
  /** Vrai si le PSP est configuré (clé API présente). */
  isConfigured(): boolean;

  /** Crée une Checkout Session. Retourne sessionId + URL de redirection. */
  createCheckoutSession(p: CheckoutSessionParams): Promise<CheckoutSessionResult>;

  /** Crée un remboursement total ou partiel. */
  createRefund(p: RefundParams): Promise<RefundResult>;

  /** Crée un compte Connect Express (onboarding seller). */
  createConnectedAccount(p: ConnectedAccountParams): Promise<{ accountId: string }>;

  /** Génère un AccountLink d'onboarding (valide ~5 min côté PSP). */
  generateOnboardingLink(p: OnboardingLinkParams): Promise<{ url: string; expiresAt: number }>;

  /** Récupère les flags de statut d'un compte connecté depuis le PSP. */
  retrieveAccountFlags(accountId: string): Promise<AccountStatusFlags>;

  /**
   * Vérifie la signature HMAC du webhook et retourne l'event parsé.
   * Throw WebhookSignatureError si la signature est invalide.
   */
  verifyWebhookEvent(payload: Buffer, signature: string, secret: string): PaymentEvent;
}
