# Méga-mandat 13h LOCAL-ONLY — PAY-2 + I18N-6 + MP-CATEGORY-1 (standalone, indépendant Stripe activation)

> Coller dans Claude Code pour run autonome ~13h. **Aucun push, deploy, gh, ssh, envoi externe, paiement réel.**
>
> Indépendant de l'activation Stripe Connect. Tests mockent SDK Stripe via factory DI.

## Contexte

- Mandat 42 phase 1 STRIPE-ACTIVATE-PREP livré (branche `stripe-activate-prep-scripts-and-smoke` `f8d031c`).
- Phase 2-3-4 reportée car STOP volontaire post phase 1.
- **Ce mandat 43 = phases 2-3-4 standalone** (ignore activation Stripe — pas requis pour tests mocked).
- main = `3423eca` (58 lots cumulés).

## Pré-requis

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git rev-parse main                           # → 3423eca
git stash list                               # → vide
git branch | grep stripe-activate-prep        # → existe (mandat 42 phase 1, pas mergé)
```

Si pas vert → STOP + `notes/handoff-mandat-43-stop.md`.

---

## Garde-fous

User absent ~13h. Anti-hallucination strict :
1. Vérif disque avant marquer fini.
2. Pas inventer output.
3. Recopier preuves brutes.
4. Si invention détectée → STOP, revert, doc.

---

## Règles absolues

- AUCUN `git push`, `gh`, `git fetch origin`, `git pull`.
- AUCUN merge sur main local. Main reste `3423eca`.
- AUCUN deploy / ssh / VPS.
- AUCUN appel Stripe réel (factory DI mock).
- Migrations Prisma additives uniquement (LOT 1 invoices + potentiellement LOT 3 categories).

---

## Mandat global — 3 LOTs chaînés sur main

```
main (3423eca, intact)
   │
   ▼
pay-2-refunds-and-email-and-invoices       ← LOT 1 (~5h)
   │
   ▼
i18n-6-public-extension                    ← LOT 2 (~3.5h)
   │
   ▼
mp-category-1-admin                        ← LOT 3 (~4.5h)
```

Si LOT capote → garder branche, passer suivant.

---

## LOT 1 — PAY-2 (refunds + email branchement + factures basiques) — ~5h

**Branche** : `pay-2-refunds-and-email-and-invoices` à partir de `main`.

### 1.1 Backend — Refunds workflow

Endpoint `POST /api/v1/payments/:id/refund` :
- Roles : ADMIN, COORDINATOR, SELLER (ownership).
- Body DTO `RefundPaymentDto` : `{ amountCents?: number, reason?: string }` (full refund par défaut, partial si amount).
- Service `PaymentsService.refund(id, dto, actor)` :
  - Validate Payment status=SUCCEEDED sinon BadRequestException.
  - Appelle Stripe `refunds.create({ payment_intent: payment.stripePaymentIntentId, amount?, reason? })` via factory.
  - Update Payment status=REFUNDED + metadata.refundId.
  - Audit log `PAYMENT_REFUNDED`.
- 5 specs (full refund, partial, ownership rejet, payment pas SUCCEEDED → 400, Stripe error propagée).

### 1.2 Backend — branchement webhook → email send

Étendre `payments-webhook.service.ts` :
- Sur `payment_intent.succeeded` : appeler `NotifEmailService.send` avec template `payment-confirmed-to-buyer`.
- Pattern `safeNotify` (try/catch + log warn, ne casse pas webhook).
- Templates payment-confirmed-to-buyer FR + EN existent déjà (PR #60).
- 3 specs (succeeded → email envoyé, send échoue → webhook 200, locale buyer respectée).

### 1.3 Backend — module factures basique

Migration Prisma additive :
```prisma
enum InvoiceStatus {
  DRAFT
  ISSUED
  PAID
  CANCELED
}

model Invoice {
  id              String        @id @default(uuid())
  paymentId       String        @unique @map("payment_id")
  sellerProfileId String        @map("seller_profile_id")
  buyerCompanyId  String        @map("buyer_company_id")
  invoiceNumber   String        @unique @map("invoice_number")
  amountCents     Int           @map("amount_cents")
  currency        String        @default("EUR")
  status          InvoiceStatus @default(DRAFT)
  pdfStorageKey   String?       @map("pdf_storage_key")
  issuedAt        DateTime?     @map("issued_at")
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  @@index([sellerProfileId, createdAt])
  @@index([buyerCompanyId, createdAt])
  @@map("invoices")
}
```

Service `InvoicesService` :
- `generateForPayment(paymentId)` — appelé sur `payment_intent.succeeded` après email send.
- `getByPaymentId(paymentId, actor)` (ownership).
- `listMine(filters, actor)` — paginated.
- Format invoiceNumber : `IOX-YYYY-NNNNNN` (séquence par année, query existing latest).
- PDF V1 = stub (row DB seulement, pas vrai PDF).

Endpoints :
- `GET /api/v1/invoices` (listMine).
- `GET /api/v1/invoices/:id`.
- `POST /api/v1/invoices/:id/issue` (DRAFT → ISSUED, set issuedAt).
- `GET /api/v1/invoices/:id/pdf` → V1 retourne 501 Not Implemented.

6 specs (generate sur succeeded, getById ownership, listMine pagination, issue transition, pdf 501, invoice number unique).

### 1.4 Frontend — pages invoices buyer + seller

- `/buyer/invoices` (list) + `/buyer/invoices/[id]` (detail).
- `/seller/invoices` (list) + `/seller/invoices/[id]` (detail).
- Bouton "Télécharger PDF" → "Pas encore disponible (V2)" V1.
- Helper API `apps/frontend/src/lib/invoices.ts`.
- 4 specs vitest.

### 1.5 Doc

`docs/marketplace/PAY_2_REFUNDS_INVOICES_EMAIL_BRANCHEMENT.md` : refunds, email branchement, factures V1 (PDF stub).

### 1.6 Preuves LOT 1

```
git log --oneline main..pay-2-refunds-and-email-and-invoices
git diff main..pay-2-refunds-and-email-and-invoices --stat
ls prisma/migrations/ | tail -3
grep -nE "model Invoice|enum InvoiceStatus" prisma/schema.prisma
grep -nE "@Post.*refund|safeNotify" apps/backend/src/payments/ -r 2>&1 | head -5
ls apps/frontend/src/app/\(dashboard\)/{buyer,seller}/invoices/
pnpm --filter @iox/backend test src/payments src/notif-email 2>&1 | tail -10
pnpm --filter @iox/frontend test invoices 2>&1 | tail -10
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -3
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
```

---

## LOT 2 — I18N-6 (autres pages publiques EN) — ~3.5h

**Branche** : `i18n-6-public-extension` à partir de `pay-2-refunds-and-email-and-invoices`.

### 2.1 Externalisation strings restantes

Pages cibles :
- `/marketplace` (catalog public + filtres + facets)
- `/marketplace/sellers` (annuaire)
- `/marketplace/sellers/[slug]` (fiche seller)
- Composant `CatalogFilters.tsx` (incl. "Documents publics requis" ligne 335)
- Header public + footer public + landing si présents

Convention : `marketplace.catalog.*`, `marketplace.sellers.*`, `marketplace.seller.*`, `common.*`.

Cible : +60 nouvelles clés EN (cumul ~230, total fr.json/en.json à ~230 lignes chacun).

### 2.2 Tests + parity

- Helper `validateLocaleParity` (existant) doit rester vert (parity 6/6).
- 1-2 specs vitest sur pages cibles : rendu FR + EN.
- E2E inchangé (testids stables si déjà présents, sinon ajouter pour `CatalogFilters`).

### 2.3 Doc

Étend `docs/marketplace/I18N_5_PUBLIC_MARKETPLACE_EN.md` avec section "I18N-6 extension".

### 2.4 Preuves LOT 2

```
git log --oneline pay-2-refunds-and-email-and-invoices..i18n-6-public-extension
wc -l apps/frontend/messages/fr.json apps/frontend/messages/en.json
grep -rn "useTranslations\|getTranslations" apps/frontend/src/app/marketplace/ --include="*.tsx" | wc -l
pnpm --filter @iox/frontend test i18n-parity 2>&1 | tail -5
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
```

---

## LOT 3 — MP-CATEGORY-1 (gestion catégories admin) — ~4.5h

**Branche** : `mp-category-1-admin` à partir de `i18n-6-public-extension`.

### 3.1 Vérifier model existant

Probable que `MarketplaceCategory` existe déjà. Sinon créer migration additive :

```prisma
model MarketplaceCategory {
  id              String                @id @default(uuid())
  slug            String                @unique
  nameFr          String                @map("name_fr")
  nameEn          String                @map("name_en")
  descriptionFr   String?               @map("description_fr")
  descriptionEn   String?               @map("description_en")
  parentId        String?               @map("parent_id")
  parent          MarketplaceCategory?  @relation("CategoryTree", fields: [parentId], references: [id], onDelete: Restrict)
  children        MarketplaceCategory[] @relation("CategoryTree")
  iconKey         String?               @map("icon_key")
  sortOrder       Int                   @default(0) @map("sort_order")
  isActive        Boolean               @default(true) @map("is_active")
  createdAt       DateTime              @default(now()) @map("created_at")
  updatedAt       DateTime              @updatedAt @map("updated_at")

  products        MarketplaceProduct[]

  @@index([parentId, sortOrder])
  @@map("marketplace_categories")
}
```

Si déjà présent, étendre admin endpoints uniquement.

### 3.2 Backend CRUD admin

Module `marketplace-categories` (vérifier existant).

Endpoints :
- `GET /api/v1/admin/marketplace/categories` (admin only, tree-structured).
- `POST /api/v1/admin/marketplace/categories` (create avec parent_id optionnel).
- `PATCH /:id` (update name/desc/parent/sortOrder/isActive).
- `DELETE /:id` (404 si products attached, sinon soft delete via isActive=false).

8 specs (CRUD + tree + delete protection + reorder).

### 3.3 Frontend admin

Page `/admin/marketplace/categories` :
- Tree view (parent → children) avec drag-reorder HTML5 native.
- Boutons "Ajouter catégorie" + "Modifier" + "Désactiver" par row.
- Modal create/edit avec champs FR + EN.

6 specs vitest.

### 3.4 Doc

`docs/marketplace/MP_CATEGORY_1_ADMIN.md` : modèle, endpoints, UI tree, workflow soft delete.

### 3.5 Preuves LOT 3

```
git log --oneline i18n-6-public-extension..mp-category-1-admin
ls prisma/migrations/ | tail -3
grep -nE "model MarketplaceCategory|@Controller.*admin/marketplace/categories" prisma/schema.prisma apps/backend/src/marketplace-categories/ -r 2>&1 | head -5
ls apps/frontend/src/app/\(dashboard\)/admin/marketplace/categories/
pnpm --filter @iox/backend test src/marketplace-categories 2>&1 | tail -10
pnpm --filter @iox/frontend test categories 2>&1 | tail -10
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -3
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
```

---

## Format rapport final attendu (`notes/handoff-mandat-43.md`)

```
# Méga-mandat 43 — handoff PAY-2 + I18N-6 + MP-CATEGORY-1 standalone

## TL;DR
- LOT 1 PAY-2 : ✅ / 🟡 / ❌
- LOT 2 I18N-6 : ✅ / 🟡 / ❌
- LOT 3 MP-CATEGORY-1 : ✅ / 🟡 / ❌
- main intact (3423eca)
- 1-2 migrations Prisma additives (Invoice + potentiellement MarketplaceCategory)
- 0 push, deploy, ssh, appel Stripe réel

## Branches livrées
- pay-2-refunds-and-email-and-invoices (HEAD: ...)
- i18n-6-public-extension (HEAD: ...)
- mp-category-1-admin (HEAD: ...)

## LOT 1 / 2 / 3 — preuves brutes
[recopier sortie commandes anti-hallucination]

## Notes pour push cascade
- 3 branches chaînées + branche stripe-activate-prep-scripts-and-smoke (mandat 42 phase 1) déjà locale
- Cascade ultérieure : push 4 branches (#61 stripe-prep + #62 PAY-2 + #63 I18N-6 + #64 MP-CATEGORY)
- Migrations Prisma additives → cascade safe avec prisma-drift CI
- env vars VPS post-merge : STRIPE_* déjà set (mandat 42)
```

Caveman resume off pour ce livrable car prompt opérationnel.
