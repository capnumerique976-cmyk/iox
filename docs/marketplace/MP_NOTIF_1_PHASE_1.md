# MP-NOTIF-1 phase 1 — Emails transactionnels marketplace

Phase initiale du chantier notifications email. Pose l'infrastructure
backend et **2 templates RFQ critiques**, sans dépendance externe ni envoi
réseau réel.

## Architecture

```
notif-email/
  notif-email.module.ts         # @Module : exporte NotifEmailService + MockEmailTransport
  notif-email.service.ts        # send() : orchestration + render + délégation transport
  notif-email.types.ts          # SendEmailInput / Result, EmailTransport, EmailTemplate
  transport.factory.ts          # resolve() : sélectionne transport selon NOTIF_EMAIL_TRANSPORT
  transports/
    mock.transport.ts           # in-memory (tests + démo) — getSent(), clear()
    smtp-stream.transport.ts    # nodemailer streamTransport (sérialisation MIME, pas de socket)
  templates/
    index.ts                    # registry templateId → EmailTemplate
    rfq-created-to-seller.template.ts
    rfq-message-created.template.ts
```

`NotifEmailService` est consommé par `QuoteRequestsService` via DI
(import `NotifEmailModule` dans `QuoteRequestsModule`).

## Configuration env

| Variable | Default | Valeurs autorisées |
|----------|---------|--------------------|
| `NOTIF_EMAIL_TRANSPORT` | `mock` | `mock`, `smtp-stream` |
| `NOTIF_EMAIL_FROM` | `noreply@iox.mch` | string |
| `NOTIF_EMAIL_REPLY_TO` | (vide) | string optionnelle |

**Aucun transport réseau réel** (Resend, Mailgun, SES) n'est cablé en
phase 1. Les valeurs `mock` et `smtp-stream` n'ouvrent pas de socket.

## Events couverts (2)

### `rfq-created-to-seller`

Déclenché par : `QuoteRequestsService.create()` après succès Prisma.

Destinataire : `SellerProfile.salesEmail` du seller propriétaire de
l'offre. Si vide, l'email est skip silencieux (warn log).

`templateData` :
```ts
{
  sellerDisplayName: string;       // SellerProfile.publicDisplayName
  buyerCompanyName: string;        // Company.name côté acheteur
  offerTitle: string;              // MarketplaceOffer.title
  requestedQuantity: number | null;
  requestedUnit: string | null;
  deliveryCountry: string | null;
  message: string | null;
  ctaUrl: string;                  // FRONTEND_URL + /seller/quote-requests/{id}
}
```

### `rfq-message-created`

Déclenché par : `QuoteRequestsService.addMessage()` quand le message
n'est PAS interne (`isInternalNote=false`).

Destinataire :
- Si auteur seller → buyer (`QuoteRequest.buyerUser.email`).
- Sinon → seller (`SellerProfile.salesEmail`).

Le staff (admin/coordinator/quality) ne reçoit pas de notif sur
addMessage en phase 1.

`templateData` :
```ts
{
  recipientDisplayName: string;
  senderDisplayName: string;
  offerTitle: string;
  messageBody: string;
  ctaUrl: string;
}
```

## Garanties non-bloquantes

Toute défaillance email (template inconnu, transport en erreur,
destinataire vide) est **logguée en warn/error** mais ne casse jamais le
workflow métier (`safeNotify` wrappe la promesse en try/catch).

Le retour `SendEmailResult { success, messageId, transport, error? }` est
stable et discriminable côté tests :
- `error` ∈ `{ NO_RECIPIENT, TEMPLATE_NOT_FOUND, INVALID_INPUT, TRANSPORT_FAILURE }`.

## Procédure pour ajouter un nouveau template

1. Créer `apps/backend/src/notif-email/templates/<id>.template.ts`
   exportant `<IdData>` interface + une const
   `<idCamel>Template: EmailTemplate<...>`.
2. Ajouter une entrée dans `templates/index.ts` (registry strict typé).
3. Créer `templates/<id>.template.spec.ts` (subject + html + text + au
   moins 1 cas d'échappement HTML).
4. Côté service appelant : import `NotifEmailService`, appeler
   `send({ templateId, templateData, to })`. Wrapper en try/catch
   (pattern `safeNotify` côté `QuoteRequestsService`).
5. Mettre à jour cette doc avec la shape `templateData`.

## Tests

| Fichier | Specs |
|---------|-------|
| `notif-email.service.spec.ts` | 7 |
| `templates/rfq-created-to-seller.template.spec.ts` | 5 |
| `templates/rfq-message-created.template.spec.ts` | 4 |
| `quote-requests.service.spec.ts` (specs MP-NOTIF-1) | 5 |

Total nouveaux specs : 21. Backend jest baseline + 21.

## TODO phase 2 (MP-NOTIF-2)

- Table `EmailLog` (event, recipient, templateId, status, error,
  attemptedAt, deliveredAt). Migration additive.
- Retry exponentiel sur `TRANSPORT_FAILURE` (Bull queue ou cron simple).
- Préférences utilisateur : `User.notificationPreferences` (granularité
  par templateId).
- Lien désinscription par token signé (1-clic).
- Provider réel : Resend (recommandé pour la simplicité MVP) ou SES /
  Mailgun selon contrainte AWS / souveraineté.
- Tests d'intégration via MailHog (déjà up sur le compose dev `:8025`)
  pour valider les rendus MIME bout-en-bout.
