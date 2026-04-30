# MP-NOTIF-2 phase 2 — Audit trail + Provider Resend + Unsubscribe

Phase 2 du chantier emails transactionnels. Cumule 3 lots livrés en
cascade chaînée (mandat 19) :

| Lot | Branche | Livrables principaux |
|-----|---------|----------------------|
| 1 | `mp-notif-2-emaillog-and-resend-flag` | Table `email_logs`, persistance `NotifEmailService.send`, transport Resend feature-flag, env `RESEND_API_KEY` |
| 2 | `mp-notif-2-unsubscribe` | Table `email_unsubscribes`, service unsubscribe + JWT, endpoint public, footer dynamique templates |
| 3 | `mp-notif-2-rfq-status-transitions` | 4 templates `rfq-{qualified,quoted,won,lost}`, branchement `updateStatus` |

## LOT 1 — Audit trail + Resend

### Table `email_logs`

```prisma
enum EmailLogStatus { SENT FAILED SKIPPED }

model EmailLog {
  id                String         @id @default(uuid())
  transport         String         // "mock" | "smtp-stream" | "resend"
  templateId        String         @map("template_id")
  recipientEmail    String         @map("recipient_email")
  recipientUserId   String?        @map("recipient_user_id")
  subject           String
  status            EmailLogStatus
  errorCode         String?        @map("error_code")
  errorMessage      String?        @map("error_message")
  providerMessageId String?        @map("provider_message_id")
  metadataJson      Json?          @map("metadata_json")
  createdAt         DateTime       @default(now()) @map("created_at")

  @@index([recipientEmail, createdAt])
  @@index([templateId, status])
  @@index([createdAt])
}
```

Migration : `20260427170417_mp_notif_2_email_logs` (additive, pas de
DROP/ALTER existant).

### Persistance dans `NotifEmailService.send`

Après chaque tentative `transport.send` :
- **succès** : 1 ligne par destinataire, `status=SENT`,
  `providerMessageId` = id retourné par le transport.
- **NotifEmailError** (template inconnu, recipient vide, raw input
  invalide) : `status=FAILED`, `errorCode` = code de l'erreur typée.
- **transport throw runtime** : `status=FAILED`, `errorCode='TRANSPORT_FAILURE'`,
  `errorMessage` = message brut de l'erreur.

**Garantie** : la persistance EmailLog ne casse jamais le retour de
`send()`. Si la DB est inaccessible, on log warn + on continue.

### `SendEmailInput` étendu

```ts
recipientUserId?: string;          // traçabilité audit
metadata?: Record<string, unknown>; // ex. { sourceEntity, sourceId }
```

Convention métadonnées : `{ sourceEntity: 'QuoteRequest', sourceId: '<uuid>' }`.

### Transport Resend

Activé via `NOTIF_EMAIL_TRANSPORT=resend` + `RESEND_API_KEY=<key>`.
Le SDK officiel `resend` (npm) est wrappé dans
`apps/backend/src/notif-email/transports/resend.transport.ts`.

Garde-fous :
- Pas de clé → constructeur crée un client `null` ; `send()` throw au
  premier appel avec message explicite.
- Factory throw au `resolve()` si `transport=resend` mais clé absente
  (boot-time fail-fast).
- Tests injectent un mock SDK via `RESEND_CLIENT_FACTORY` token —
  **aucun appel réseau réel**.

### Activation production (Resend)

1. Provisionner un domaine vérifié dans Resend, récupérer la clé API.
2. Sur le VPS, ajouter `RESEND_API_KEY=rs_xxx` à `.env` backend.
3. Mettre `NOTIF_EMAIL_TRANSPORT=resend`.
4. Redémarrer le container backend (`docker compose restart backend`).
5. Smoke : créer une RFQ → vérifier `email_logs` (status=SENT,
   transport=resend, providerMessageId non null).
6. Rollback : remettre `NOTIF_EMAIL_TRANSPORT=mock` + restart.

## Tests

| Fichier | Specs |
|---------|-------|
| `notif-email.service.spec.ts` | 12 (7 phase 1 + 5 MP-NOTIF-2) |
| `transports/resend.transport.spec.ts` | 3 |
| `transport.factory.spec.ts` | 5 |
| `templates/rfq-created-to-seller.template.spec.ts` | 5 |
| `templates/rfq-message-created.template.spec.ts` | 4 |

Total notif-email : 29 specs.

---

## LOT 2 — Unsubscribe

### Table `email_unsubscribes`

```prisma
enum EmailUnsubscribeType { ALL RFQ_NOTIFICATIONS TRANSACTIONAL }

model EmailUnsubscribe {
  id              String               @id @default(uuid())
  email           String
  unsubscribeType EmailUnsubscribeType @map("unsubscribe_type")
  userId          String?              @map("user_id")
  reason          String?
  createdAt       DateTime             @default(now()) @map("created_at")

  @@unique([email, unsubscribeType])
  @@index([email])
}
```

Migration : `20260427171203_mp_notif_2_email_unsubscribes`.

### Service `UnsubscribeService`

- `generateToken(email, type, expiresIn='90d')` — JWT HS256 signé avec
  secret dédié (`UNSUBSCRIBE_JWT_SECRET`, fallback `${JWT_SECRET}-unsub`).
- `validateToken(token)` — vérifie signature + expiration.
  Erreurs typées (`UnsubscribeTokenError` avec `code` ∈
  `INVALID_TOKEN | TOKEN_EXPIRED`).
- `register(email, type, userId?, reason?)` — upsert idempotent sur
  unique `[email, unsubscribeType]`. L'email est normalisé
  (lowercase + trim).
- `isUnsubscribed(email, type)` — true si entrée matching exact OU
  entrée `ALL` pour cet email.

### Endpoint public

`GET /api/v1/notif-email/unsubscribe?token=<jwt>`
- Public (`@Public()`), aucun bearer token requis.
- Sans token / token vide → `400 INVALID_TOKEN`.
- Token invalide ou expiré → `400` avec `code` discriminé.
- Token valide → `200` JSON `{ email, type, unsubscribedAt }`.
- Aucune page HTML conviviale dans cette phase (futur lot MP-NOTIF-3).

### Intégration `NotifEmailService.send`

1. Avant chaque envoi, le service appelle `unsubscribeService.isUnsubscribed`
   pour chaque destinataire.
2. Destinataires opt-out : un `EmailLog` `SKIPPED` est persisté avec
   `errorCode='UNSUBSCRIBED'`. Aucun appel transport.
3. Tous opt-out → return `success=true, messageId=''` (no-op silencieux).
4. Mix opt-in / opt-out → seul opt-in est passé au transport.

### Footer dynamique

Helper `templates/footer.ts` (`renderFooterHtml` / `renderFooterText`)
injecté dans les 2 templates phase 1 (`rfq-created-to-seller`,
`rfq-message-created`). Le service alimente automatiquement
`templateData.unsubscribeUrl` avec un token signé (90j) — les templates
affichent un lien « Se désabonner de ces notifications ».

Si le secret JWT ou `FRONTEND_URL` est absent (env minimal), l'URL est
vide et le footer affiche le placeholder sans lien.

## LOT 3 — Notifications transitions status RFQ

### 4 nouveaux templates

Tous partagent un helper commun `templates/rfq-transition.helper.ts`
(structure : titre + intro + note seller optionnelle + CTA + footer
unsubscribe).

| templateId | Statut cible | Sujet FR | Couleur accent |
|------------|--------------|----------|----------------|
| `rfq-qualified` | QUALIFIED | "Votre demande de devis a été qualifiée — {offer}" | bleu cyan |
| `rfq-quoted` | QUOTED | "Devis disponible pour votre demande — {offer}" | bleu cyan |
| `rfq-won` | WON | "Bonne nouvelle, votre demande est confirmée — {offer}" | vert |
| `rfq-lost` | LOST | "Mise à jour sur votre demande — {offer}" (ton neutre) | gris |

`templateData` commun (`RfqTransitionTemplateData`) :
```ts
{
  recipientDisplayName: string;
  senderDisplayName: string;       // SellerProfile.publicDisplayName
  offerTitle: string;
  note: string | null;             // dto.note du PATCH /status
  ctaUrl: string;                  // /quote-requests/{id} (buyer-side)
  unsubscribeUrl?: string;         // injecté auto par le service
}
```

### Branchement `QuoteRequestsService.updateStatus`

Helper privé `notifyOnStatusTransition(updated, targetStatus, note)` :
- mappe le statut cible vers le templateId via `TEMPLATE_BY_STATUS`.
- skip pour `NEGOTIATING` et `CANCELLED` (no-op silencieux).
- charge `marketplaceOffer.title` + `sellerProfile.publicDisplayName` +
  `buyerUser.email` depuis l'objet retourné par `prisma.update` (le
  service étend `findUnique` pour inclure ces champs avant la
  transition).
- appelle `safeNotify` (helper existant) — try/catch silencieux + log
  warn. Une défaillance d'envoi ne casse pas la persistance status
  (audit déjà loggé avant la notif).

### Events couverts (tableau récap final)

| Event | Service | TemplateId | Destinataire | unsubscribeType |
|-------|---------|------------|--------------|-----------------|
| RFQ créée | `create` | `rfq-created-to-seller` | seller (`salesEmail`) | RFQ_NOTIFICATIONS |
| Message public ajouté | `addMessage` | `rfq-message-created` | autre partie | RFQ_NOTIFICATIONS |
| Status → QUALIFIED | `updateStatus` | `rfq-qualified` | buyer | RFQ_NOTIFICATIONS |
| Status → QUOTED | `updateStatus` | `rfq-quoted` | buyer | RFQ_NOTIFICATIONS |
| Status → WON | `updateStatus` | `rfq-won` | buyer | RFQ_NOTIFICATIONS |
| Status → LOST | `updateStatus` | `rfq-lost` | buyer | RFQ_NOTIFICATIONS |

### Tests

- `templates/rfq-transitions.template.spec.ts` — 4 templates × 5 cas =
  20 specs (subject, html, text, XSS guard, note null).
- `quote-requests.service.spec.ts` — 7 specs MP-NOTIF-2 (4 transitions
  notifient, 2 transitions skip, 1 cas safeNotify catch).

## TODO phase 3+ (MP-NOTIF-3)

- Page frontend conviviale `/unsubscribe?token=...` (HTML, copy FR,
  retour utilisateur friendly).
- Notif transitions `NEGOTIATING`, `CANCELLED`, `ASSIGNED`.
- Préférences utilisateur fines (par templateId, pas seulement par
  catégorie).
- Retry queue pour les échecs Resend (backoff exponentiel + Bull/cron).
- Tests d'intégration MailHog (déjà up sur compose dev `:8025`) pour
  validation MIME bout-en-bout.
- Token unsubscribe **opaque** (pas JWT) côté URL pour éviter de
  dévoiler la structure du payload.



---

## Activation production Resend

Voir doc dédiée : [`docs/ops/RESEND_PROD_ACTIVATION.md`](../ops/RESEND_PROD_ACTIVATION.md).

Scripts ops :
- `deploy/scripts/activate-resend.sh` — bascule `NOTIF_EMAIL_TRANSPORT=mock` → `resend` sur VPS (avec backup .env auto + restart container).
- `deploy/scripts/smoke-resend.sh` — smoke post-bascule (login smoke-buyer + RFQ test + check EmailLog).

Rollback : re-bascule `NOTIF_EMAIL_TRANSPORT=mock` → comportement V0 immédiat. EmailLog persistent dans les 2 modes.

