# Méga-mandat 42 — handoff (PAY-2 skip, I18N-6 + MP-CATEGORY-1 livrés)

## TL;DR

User a décidé de skip PAY-2 pour l'instant. Phases 3 + 4 livrées en local.

- **Phase 1 STRIPE-PREP** : ✅ commit `f8d031c` sur branche `stripe-activate-prep-scripts-and-smoke` (livré tour précédent, action user Stripe différée).
- **Phase 2 PAY-2** : 🟦 **skipped** (décision user — reprendre plus tard).
- **Phase 3 I18N-6** : ✅ commit `c431ff9` sur branche `i18n-6-public-extension`.
- **Phase 4 MP-CATEGORY-1** : ✅ commit `5dda601` sur branche `mp-category-1-admin`.
- main intact (`3423eca`).
- 0 migration Prisma (MarketplaceCategory existait déjà au schema).
- 0 push, deploy, ssh, appel Stripe.

## Branches livrées

| Phase | Branche | HEAD | Parent |
|---|---|---|---|
| 1 | `stripe-activate-prep-scripts-and-smoke` | `f8d031c` | main `3423eca` |
| 3 | `i18n-6-public-extension` | `c431ff9` | main `3423eca` |
| 4 | `mp-category-1-admin` | `5dda601` | I18N-6 `c431ff9` (chaîné) |

## Phase 3 I18N-6 — preuves brutes

```
$ git log --oneline main..i18n-6-public-extension
c431ff9 feat(i18n): I18N-6 — extension sellers index + seller detail public marketplace EN

$ git diff main..i18n-6-public-extension --stat
 7 files changed, 175 insertions(+), 27 deletions(-)

$ wc -l apps/frontend/messages/{fr,en}.json
161 apps/frontend/messages/fr.json
161 apps/frontend/messages/en.json

$ node -e "..." → 141 keys (FR=EN, +19 vs I18N-5 ph 122 keys)

$ pnpm --filter @iox/frontend test -- --run
Test Files  51 passed (51)
Tests  323 passed (323)
```

Pages converties :
- `/marketplace/sellers` : hero badge + titre split + description + totalCount plural + emptyTitle + emptyHint + unavailable.
- `/marketplace/sellers/[slug]` : breadcrumb + sections (about, story, exportCapabilities, publishedProducts) + fields + productsCount plural + certificationsAriaLabel.

Mock next-intl/server pour test page sellers (next-intl/server non utilisable en jsdom).

## Phase 4 MP-CATEGORY-1 — preuves brutes

```
$ git log --oneline i18n-6-public-extension..mp-category-1-admin
5dda601 feat(marketplace): MP-CATEGORY-1 — CRUD admin catégories marketplace + tree UI

$ git diff i18n-6-public-extension..mp-category-1-admin --stat
 10 files changed, 1452 insertions(+)

$ pnpm --filter @iox/backend test src/marketplace-categories
PASS src/marketplace-categories/marketplace-categories.service.spec.ts
Tests:       12 passed, 12 total

$ pnpm --filter @iox/frontend test -- admin/marketplace/categories --run
✓ src/app/(dashboard)/admin/marketplace/categories/page.test.tsx (6 tests) 195ms
Tests  6 passed (6)

$ pnpm --filter @iox/backend exec tsc --noEmit
(exit 0)
$ pnpm --filter @iox/frontend exec tsc --noEmit
(exit 0)
```

Livrables :
- 4 endpoints `/admin/marketplace/categories/*` (GET tree, GET :id, POST, PATCH, DELETE).
- Tree builder récursif Map → roots → children.
- Soft delete : si products OU children attachés → `isActive=false` + audit `MARKETPLACE_CATEGORY_DEACTIVATED`. Hard delete sinon.
- Helper frontend `apps/frontend/src/lib/marketplace-categories.ts`.
- Page admin `/admin/marketplace/categories/page.tsx` : tree view récursif + modal create/edit + filtre includeInactive + boutons add-child/edit/delete par row.
- 12 specs backend + 6 specs frontend.

0 migration Prisma — `MarketplaceCategory` existait déjà au schema (FP-2 ou antérieur).

## Phase 2 PAY-2 — skip (décision user)

Reprendre plus tard. Branche `pay-2-refunds-and-email-and-invoices` non créée. Quand l'user reprendra :
- Refunds workflow + endpoint `POST /payments/:id/refund`.
- Branchement webhook → email send (template `payment-confirmed-to-buyer` déjà posé en LOT 3).
- Module factures basique avec migration Prisma additive `Invoice` + enum `InvoiceStatus`.

## Notes pour push cascade

### Ordre proposé (3 PR)

1. **PR Phase 1 (STRIPE-PREP)** indépendante — peut être pushed séparément, doc + scripts uniquement.
2. **PR Phase 3 (I18N-6)** depuis main — pure frontend i18n, indépendant.
3. **PR Phase 4 (MP-CATEGORY-1)** chaînée sur I18N-6 — backend + frontend admin, 0 migration Prisma. Rebase --onto main après merge I18N-6.

### Aucune migration Prisma

Toutes les phases livrées sont sans migration. CI prisma-drift check trivialement vert.

### Smoke post-deploy I18N-6

- Page publique `/marketplace/sellers` rend FR + cookie `NEXT_LOCALE=en` rend EN.
- Page publique `/marketplace/sellers/[slug]` idem.
- i18n-parity test 8/8 vert en CI.

### Smoke post-deploy MP-CATEGORY-1

- Login admin → `/admin/marketplace/categories` accessible.
- Endpoint GET tree avec auth admin retourne 200 + tree (vide ou avec données seed).
- Endpoint POST avec slug=`test` retourne 201.
- Endpoint DELETE sur catégorie sans products/children → hard delete (200, deleted=true).

### env vars VPS inchangés
Aucune env nouvelle. Stripe-prep doc reste la seule action ops à venir (quand user prêt).

## TODO suite

- **PAY-2** quand user reprend (refunds + email branchement + factures).
- I18N-6 V2 : `CatalogFilters.tsx:335` + composants partagés (Pagination, SellerCard, SellersFilters aria-labels).
- MP-CATEGORY-1 V2 : drag-reorder UI, description i18n FR/EN séparés, page publique `/marketplace/categories`.
