# MP-NOTIF-2 phase 2 — Plan (mandate 19)

3 lots chaînés depuis `main = 4250db2`.

## LOT 1 — EmailLog + Resend flag

Branche `mp-notif-2-emaillog-and-resend-flag`.

- Migration Prisma additive `20260427170417_mp_notif_2_email_logs`
  (`EmailLogStatus` enum + `email_logs` table + 3 index).
- Étendre `NotifEmailService.send` : injecte `PrismaService`, persiste
  un `EmailLog` après chaque tentative (SENT/FAILED). Erreur de
  persistance non bloquante (log warn).
- Type `SendEmailInput` : ajouter `recipientUserId?: string` +
  `metadata?: Record<string, unknown>`.
- Transport `resend.transport.ts` (nouveau) — wrappe `resend` SDK.
  Throw au constructeur si `apiKey` falsy.
- Étendre la factory : whitelist `'resend'`. Throw au boot si
  `NOTIF_EMAIL_TRANSPORT=resend` mais pas de `RESEND_API_KEY`.
- Étendre `env.validation.ts` : `RESEND_API_KEY` optionnel +
  whitelist `NOTIF_EMAIL_TRANSPORT` étendue.
- Tests : extension service spec + nouveau resend spec + factory spec.

## LOT 2 — Unsubscribe

Branche `mp-notif-2-unsubscribe`.

- Migration additive `email_unsubscribes` (`EmailUnsubscribeType` enum +
  table + unique `[email, unsubscribeType]`).
- Service `unsubscribe.service.ts` : `generateToken/validateToken` (JWT
  HS256), `register`, `isUnsubscribed` (incluant matching `ALL`).
- Endpoint public `GET /api/v1/notif-email/unsubscribe?token=<jwt>`.
- `NotifEmailService.send` : check unsubscribe avant transport ; si
  matché → EmailLog SKIPPED, return success silencieux.
- Templates existants (`rfq-created-to-seller`, `rfq-message-created`) :
  footer dynamique avec lien unsubscribe (le service injecte
  l'`unsubscribeUrl` dans `templateData` automatiquement).
- Env : `UNSUBSCRIBE_JWT_SECRET` (default fallback `${JWT_SECRET}-unsub`).

## LOT 3 — Transitions RFQ

Branche `mp-notif-2-rfq-status-transitions`.

- 4 nouveaux templates : `rfq-qualified`, `rfq-quoted`, `rfq-won`,
  `rfq-lost` (FR, footer commun via `renderFooter(unsubscribeUrl)`).
- Branchement `QuoteRequestsService.updateStatus` : safeNotify selon
  status cible (NEGOTIATING/CANCELLED skip).
- Tests : 4 specs templates + extension service spec (5+ cases).

## Hors scope (phase 3+)

- Retry queue Bull / cron.
- Page frontend conviviale `/unsubscribe`.
- Notif sur transitions NEGOTIATING / CANCELLED / ASSIGNED.
- Préférences user fines (par `templateId`).
