# BUYER-DASHBOARD-1 — Plan d'exécution

Branche : `buyer-dashboard-1-quote-requests` (depuis main = 4250db2).

## Périmètre

Pages buyer dédiées pour consulter / interagir avec leurs RFQ, sous le
namespace `/buyer/...`. Différencié du `/quote-requests` admin existant.

## Commits prévus

1. `chore(notes): plan BUYER-DASHBOARD-1` — ce fichier.
2. `feat(frontend): BUYER-DASHBOARD-1 — layout + role guard MARKETPLACE_BUYER`
   - `apps/frontend/src/app/(dashboard)/buyer/layout.tsx`
3. `feat(frontend): BUYER-DASHBOARD-1 — page liste /buyer/quote-requests`
   - `apps/frontend/src/app/(dashboard)/buyer/quote-requests/page.tsx`
   - filtres status (multi), seller (texte), createdAtAfter, pagination 20.
4. `feat(frontend): BUYER-DASHBOARD-1 — page détail /buyer/quote-requests/[id]`
   - `apps/frontend/src/app/(dashboard)/buyer/quote-requests/[id]/page.tsx`
   - thread messages, form, bouton annuler si NEW/QUALIFIED.
5. `test(frontend): BUYER-DASHBOARD-1 — couverture liste + détail`
   - `*.test.tsx` (≥ 10 specs).
6. `docs(marketplace): BUYER_DASHBOARD_1`
   - `docs/marketplace/BUYER_DASHBOARD_1.md`.

## Décisions

- L'API helper `quoteRequestsApi` existe déjà (`list/get/messages/addMessage/updateStatus`),
  pas d'extension nécessaire (le backend autoscope par rôle MARKETPLACE_BUYER).
- Layout buyer = client component, redirige vers `/dashboard` si role !== `MARKETPLACE_BUYER`
  (tolère ADMIN/COORDINATOR pour QA staff).
- Pagination : controlled state (page, limit=20), naviguée via state, pas via URL.
- Cancel RFQ : confirm `window.confirm` simple FR, transition `CANCELLED`.
