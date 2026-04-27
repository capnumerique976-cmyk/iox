// MP-NOTIF-1 phase 1 — Types partagés du module emails transactionnels.
//
// `EmailTransport` est l'interface implémentée par chaque transport
// concret (mock pour tests, smtp-stream pour diagnostic local, resend
// pour production). Le transport `mock` reste le défaut et ne fait
// aucun I/O réseau ; `smtp-stream` sérialise en MIME sans socket ;
// `resend` (MP-NOTIF-2) est le seul à appeler un service tiers.

export type NotifEmailTransportName = 'mock' | 'smtp-stream' | 'resend';

/**
 * Données minimales pour envoyer un email.
 *
 * - `templateId` est résolu côté service ; si fourni, `subject/html/text`
 *   sont générés depuis `templateData` et écrasent les champs explicites.
 * - `to` accepte une string unique ou une liste (RFC 5322 simple).
 */
export interface SendEmailInput {
  to: string | string[];
  subject?: string;
  html?: string;
  text?: string;
  templateId?: string;
  templateData?: Record<string, unknown>;
  /** Override `from` (sinon `NOTIF_EMAIL_FROM`). */
  from?: string;
  /** Override `replyTo` (sinon `NOTIF_EMAIL_REPLY_TO` si défini). */
  replyTo?: string;
  /**
   * MP-NOTIF-2 — Identifiant utilisateur destinataire (traçabilité audit
   * trail). Optionnel : un email peut être envoyé à un destinataire qui
   * n'a pas encore de compte (futur prospect).
   */
  recipientUserId?: string;
  /**
   * MP-NOTIF-2 — Métadonnées libres archivées dans
   * `email_logs.metadata_json`. Convention :
   * `{ sourceEntity: 'QuoteRequest', sourceId: '<uuid>' }`.
   */
  metadata?: Record<string, unknown>;
}

export interface SendEmailResult {
  success: boolean;
  messageId: string;
  transport: NotifEmailTransportName;
  /** Présent si success=false. Message court et stable pour assertions. */
  error?: string;
}

/**
 * Forme stable d'un email rendu (post-template), passée au transport.
 * Le transport ne connaît rien des templates.
 */
export interface RenderedEmail {
  to: string[];
  from: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailTransport {
  readonly name: NotifEmailTransportName;
  send(message: RenderedEmail): Promise<{ messageId: string }>;
}

/**
 * Contrat d'un template d'email transactionnel.
 */
export interface EmailTemplate<D extends Record<string, unknown> = Record<string, unknown>> {
  readonly id: string;
  subject(data: D): string;
  html(data: D): string;
  text(data: D): string;
}

/** Erreurs typées du module — utilisées dans les tests pour discriminer. */
export class NotifEmailError extends Error {
  constructor(
    public readonly code:
      | 'NO_RECIPIENT'
      | 'TEMPLATE_NOT_FOUND'
      | 'TRANSPORT_FAILURE'
      | 'INVALID_INPUT',
    message: string,
  ) {
    super(message);
    this.name = 'NotifEmailError';
  }
}
