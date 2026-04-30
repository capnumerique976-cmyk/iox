# MP-NOTIF-3 phase 6 — Export CSV EmailLog

Bouton "⬇ Export CSV" sur la page `/admin/notif-email/logs` qui télécharge
les logs filtrés (mêmes filtres que `listLogs`) au format CSV.

## Backend

### Endpoint

`GET /api/v1/notif-email/logs-export.csv?status=&templateId=&recipientEmail=&createdAtAfter=`

- `@Roles(ADMIN, COORDINATOR)`.
- `Content-Type: text/csv; charset=utf-8`.
- `Content-Disposition: attachment; filename="email-logs.csv"`.
- Cap dur **10000 lignes** (anti OOM/timeout).

### Service

`NotifEmailService.exportLogsCsv(query)` :
- where Prisma identique à `listLogs`.
- `findMany` orderBy `createdAt desc`, take 10000.
- Génère CSV : header (10 colonnes) + lignes échappées (`,`, `"`, `\n`).
- Échappement : double-quote autour si présence d'un caractère spécial,
  `"` interne doublé.

### Colonnes CSV

```
id, createdAt, transport, templateId, status, recipientEmail, subject, errorCode, errorMessage, providerMessageId
```

`createdAt` au format ISO 8601.

## Frontend

Bouton "⬇ Export CSV" ajouté dans le header de `/admin/notif-email/logs`,
à côté de "📊 Statistiques".

Implémentation : `fetch` avec `Authorization: Bearer <token>` (l'endpoint
exige JWT, pas cookie). Réponse → `blob` → URL.createObjectURL → `<a>`
download click → revokeObjectURL.

Le filename inclut la date du jour : `email-logs-YYYY-MM-DD.csv`.

## Tests

### Backend

4 nouveaux specs `exportLogsCsv` :
- header + 0 ligne quand findMany vide
- échappement cellules avec virgule/double-quote/newline
- cap 10000
- filtres composés appliqués

Total `notif-email.service.spec` : **29 specs passants** (25 + 4).

### Frontend

1 nouveau spec `Export CSV` dans `AdminNotifEmailLogsPage` :
- clic sur btn-export-csv déclenche fetch avec Authorization Bearer
- URL.createObjectURL appelé (download trick)

Total `/admin/notif-email/*` : **19 specs passants** (logs 4+1, detail 5,
unsubscribes 4, stats 5).

```bash
pnpm --filter @iox/backend exec jest --testPathPattern notif-email.service.spec
# Tests: 29 passed

pnpm --filter @iox/frontend exec vitest run "src/app/(dashboard)/admin/notif-email/logs"
# Test Files 2 passed — Tests 10 passed
```

## Décisions

- **`fetch + blob` côté frontend** plutôt que `window.location.href` :
  `Authorization: Bearer` requis par l'endpoint (pas de cookie auth).
- **Cap 10000** : suffisant V1 ; V2 ajoutera un export streamé via
  pipeline si nécessaire.
- **Pas de pagination CSV** : un seul download = un seul file. Pour
  > 10000 logs, l'admin doit appliquer un filtre date.
- **Pas de BOM UTF-8** : compatibilité Excel acceptée comme tradeoff
  (UTF-8 sans BOM marche sur LibreOffice / Numbers / Excel récent).

## Hors scope

- Export JSON (V2 si besoin).
- Streamed export (>> 10000 lignes).
- BOM UTF-8 pour Excel ancien.
- Sélection colonnes (toutes incluses pour V1).
- Export EmailUnsubscribe en CSV (suivre même pattern si besoin).
