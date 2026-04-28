# MP-NOTIF-3 phase 2b — Page admin EmailLog

## Objectif

Donner aux ADMIN/COORDINATOR une vue de l'audit trail des emails
transactionnels (`email_logs`) — diagnostic rapide d'un incident
d'envoi (Resend down, template inconnu, destinataire bloqué, etc.).

**Lecture seule.** Pas de retry, pas de purge : la table est
immutable côté produit (ce sera l'objet d'un MP-NOTIF-3 LOT 2c).

## Branche

`mp-notif-3-emaillog-admin` part de `mp-notif-2-emaillog-and-resend-flag`
(mandate 19 LOT 1) qui apporte le modèle Prisma `EmailLog` + la
persistance dans `NotifEmailService.send()`.

## Backend

### Endpoint

`GET /api/v1/notif-email/logs` — `@Roles(ADMIN, COORDINATOR)`.

### Query params (`ListEmailLogsQueryDto`)

| Param            | Type   | Notes                                      |
| ---------------- | ------ | ------------------------------------------ |
| `page`           | int ≥1 | défaut 1                                   |
| `limit`          | int    | [1, 100], défaut 20                        |
| `status`         | enum   | `SENT` \| `FAILED` \| `SKIPPED`            |
| `templateId`     | string | match exact                                |
| `recipientEmail` | string | `contains`, insensitive                    |
| `createdAtAfter` | ISO    | borne stricte `>= date`                    |

### Service

`NotifEmailService.listLogs(query)` :
- compose `where` Prisma à partir des filtres présents
- order by `createdAt desc`
- `Promise.all` count + findMany
- mappe les rows en `EmailLogItem` (createdAt → ISO string)
- retourne `{ data, meta: { total, page, limit, totalPages } }`

## Frontend

### Helper

`apps/frontend/src/lib/notif-email.ts` — `notifEmailApi.listLogs(params, token)`.

### Page

`/admin/notif-email/logs` (`apps/frontend/src/app/(dashboard)/admin/notif-email/logs/page.tsx`).
Filtres : status (select), templateId (texte), recipientEmail (texte),
createdAtAfter (date). Pagination 20/page. Affiche l'erreur
`errorCode` (avec `errorMessage` en tooltip) pour les FAILED.

## Tests

- Backend `apps/backend/src/notif-email/notif-email.service.spec.ts` —
  5 nouveaux specs `listLogs` (pagination défaut, cap limit 100,
  filtres composés, mapping rows, totalPages).
- Frontend `apps/frontend/src/app/(dashboard)/admin/notif-email/logs/page.test.tsx`
  — 4 specs (rendu, empty, filtre status FAILED, affichage errorCode).

```bash
pnpm --filter @iox/backend exec jest --testPathPattern notif-email
# Test Suites: 5 passed (5) — Tests 34 passed
pnpm --filter @iox/frontend exec vitest run "src/app/(dashboard)/admin/notif-email"
# Test Files 1 passed (1) — Tests 4 passed
```

## Décisions

- **Pas de masking PII** dans la liste : la table est restreinte aux
  rôles élevés ; un masking inutile gênerait le diagnostic.
- **Pas de retry/resend** : un retry imposerait une stratégie de
  dédup côté provider — hors-scope phase 2b.
- **`metadataJson` non affichée par défaut** : volume potentiel
  important. Une vue détail par log pourra exposer ce champ en LOT 2c.

## Hors-scope

- Détail unitaire `/admin/notif-email/logs/[id]` (avec `metadataJson`).
- Bouton "Renvoyer" (avec stratégie d'idempotence côté Resend).
- Export CSV.
- Page admin `unsubscribes` (suite logique).
