# MP-NOTIF-3 phase 5 — Stats agrégées EmailLog

Page admin lisible (count par status + top 10 templates + 30 derniers
jours en bar chart). Lecture seule, restreinte ADMIN/COORDINATOR.

## Backend

### Endpoint

`GET /api/v1/notif-email/logs-stats` — déclaré AVANT `logs/:id` pour
éviter shadow par le ParseUUIDPipe.

### Service

`NotifEmailService.getLogsStats()` :
- 3 requêtes en parallèle :
  - `groupBy(status)` count par status global.
  - `groupBy(templateId)` orderBy desc, take 10.
  - `$queryRaw` pour pivot par jour (PostgreSQL `date_trunc`).
- Retour : `{ byStatus, byTemplate, byDay }` avec byDay normalisé en
  ISO date string + counts par status par jour.

### Tests

3 nouveaux specs `getLogsStats` (compose, top 10 + orderBy, vide).
Total `notif-email.service.spec` : **25 specs**.

## Frontend

### Helper

`apps/frontend/src/lib/notif-email.ts` ajoute :
- `EmailLogsStats` type
- `notifEmailStatsApi.getStats(token)`

### Page

`/admin/notif-email/stats` (3 sections) :
1. **Cards par status** (SENT vert / FAILED rouge / SKIPPED gris) avec
   compteur grand format.
2. **Top 10 templates** : barres de progression triées par count desc.
3. **30 derniers jours** : bar chart vertical empilé (sent + failed +
   skipped) + légende couleurs.

Lien "📊 Statistiques" ajouté en action du header de
`/admin/notif-email/logs`.

### Tests

5 specs vitest :
- 3 cards status + compteurs
- top 10 templates + barres
- bar chart 30 jours
- empty state si byTemplate/byDay vides
- erreur fetch

Total `/admin/notif-email/*` : **18 specs passants** (4 list + 5 detail
+ 4 unsubscribes + 5 stats).

```bash
pnpm --filter @iox/backend exec jest --testPathPattern notif-email.service.spec
# Tests: 25 passed

pnpm --filter @iox/frontend exec vitest run "src/app/(dashboard)/admin/notif-email"
# Test Files 4 passed — Tests 18 passed
```

## Décisions

- **`$queryRaw`** pour `byDay` : `groupBy` Prisma ne supporte pas
  facilement `date_trunc`. SQL brut + escape paramétré (`Prisma.sql`).
- **30 jours hardcodé** : suffisant V1, paramétrable en query si besoin.
- **Bar chart minimal** : pas de lib externe (chart.js / recharts) ;
  bars HTML+CSS suffit pour V1 et reste léger.

## Hors scope

- Période configurable (7/30/90 jours).
- Export CSV des stats.
- Filtres par template ou par destinataire dans les stats.
- Comparaison période vs période (tendance).
- Lib chart pour graph plus riches.
