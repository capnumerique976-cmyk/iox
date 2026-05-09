# Handoff — Méga-mandat autonome 48 — 2026-05-02

## Résumé

6 phases complétées, 4 PRs créées et mergées (#68–#71), 4 déploiements VPS OK.

## Phase 0 — Migration Prisma urgente ✅

Migration manuelle `postalCode` + `description` sur model Company (additive, nullable).
- Fichier : `prisma/migrations/20260502091440_add_company_postal_code_description/migration.sql`
- DB locale indisponible → migration SQL créée manuellement, appliquée en prod au deploy

## Phase 1 — Stripe Connect verification ✅

Test API Stripe Connect Express account creation.
- ✅ Compte Express créé avec `country: 'FR'`
- ⚠️ `country: 'YT'` (Mayotte) non supporté par Stripe — documenté comme limitation connue
- Workaround : utiliser `FR` comme country code pour les vendeurs mahorais

## Phase 2 — PAY-2 (PR #68) ✅

**Scope** : refunds + webhook→email + Invoice model + frontend pages

**Backend :**
- `POST /payments/:id/refund` — admin refund SUCCEEDED→REFUNDED via Stripe
- `PaymentsWebhookService` — `safeNotifyBuyer` email sur payment_intent.succeeded
- `InvoicesService` — generateInvoiceNumber (IOX-YYYY-NNNNNN), CRUD, PDF stub (501)
- `InvoicesController` — GET /invoices, GET /:id, POST, GET /:id/pdf

**Prisma :**
- Invoice model (paymentId unique, invoiceNumber unique, amountCents, status, pdfStorageKey)
- InvoiceStatus enum (DRAFT, ISSUED, PAID, CANCELED)
- PAYMENT + INVOICE ajoutés à EntityType enum
- Migration : `prisma/migrations/20260502100000_pay_2_invoices/migration.sql`

**Frontend :**
- `/buyer/invoices` — liste factures acheteur avec badges status, pagination
- `/seller/invoices` — liste factures vendeur
- `apps/frontend/src/lib/invoices.ts` — types + API helpers

**Email :**
- Template `payment-confirmed-to-buyer` FR + EN

**Fichiers clés :**
- `apps/backend/src/payments/payments.service.ts` (refund method)
- `apps/backend/src/payments/payments.controller.ts` (POST :id/refund)
- `apps/backend/src/payments/payments-webhook.service.ts` (safeNotifyBuyer)
- `apps/backend/src/payments/invoices.service.ts` (nouveau)
- `apps/backend/src/payments/invoices.controller.ts` (nouveau)
- `apps/backend/src/payments/dto/payments.dto.ts` (RefundPaymentDto, CreateInvoiceDto)
- `packages/shared/src/enums/index.ts` (PAYMENT, INVOICE, InvoiceStatus)

## Phase 3 — MP-CATEGORY-3 (PR #69) ✅

**Scope** : dropdown filtre catégories sur catalogue public

- Remplacement input texte → select dropdown alimenté par API `/marketplace/catalog/categories`
- Helper `flattenCategories` pour aplatir l'arbre en options
- Clés i18n `filters.categoryAll` FR + EN
- Tests CatalogFilters mis à jour

**Fichiers :**
- `apps/frontend/src/components/marketplace/CatalogFilters.tsx`
- `apps/frontend/src/components/marketplace/CatalogFilters.test.tsx`
- `apps/frontend/messages/fr.json` + `en.json`

## Phase 4 — MP-NOTIF-3 ph8 (PR #70) ✅

**Scope** : export CSV logs + dashboard alertes taux erreur

**Backend :**
- `NotifEmailAlertsService` — cron `@Cron(EVERY_HOUR)`, détecte taux erreur >20%, crée audit log `NOTIF_EMAIL_ERROR_RATE_HIGH`
- Tests alertes service (70 lignes)

**Frontend :**
- Section "Alertes récentes" sur `/admin/notif-email/stats` — fetch audit logs type NOTIF_EMAIL
- Bouton export CSV sur page logs
- Tests stats page étendus

**Fichiers :**
- `apps/backend/src/notif-email/notif-email-alerts.service.ts` (nouveau)
- `apps/backend/src/notif-email/notif-email-alerts.service.spec.ts` (nouveau)
- `apps/frontend/src/app/(dashboard)/admin/notif-email/stats/page.tsx`

## Phase 5 — BÊTA-PRIVÉE prep (PR #71) ✅

**Scope** : seed étendu + templates welcome + scripts terrain + docs ops

- 5 nouveaux vendeurs MCH dans seed demo (vanille, ylang, mangues, café, miel)
- 5 produits + 5 offres associées
- Template email `seller-welcome` FR + EN (enregistré dans REGISTRY)
- Script `generate-seller-invite.sh` — génère messages WhatsApp/SMS FR + Shimaoré
- Doc `BETA_PRIVEE_ONBOARDING_AGENT_MCH.md` — checklist 10 points
- Doc `BETA_LAUNCH_CHECKLIST.md` — pré-conditions, targets, communication, smoke

**Fichiers :**
- `apps/backend/src/seed-demo/dataset.ts`
- `apps/backend/src/notif-email/templates/seller-welcome.template.ts` (nouveau)
- `apps/backend/src/notif-email/templates/seller-welcome.en.template.ts` (nouveau)
- `apps/backend/src/notif-email/templates/index.ts`
- `deploy/scripts/generate-seller-invite.sh` (nouveau)
- `docs/ops/BETA_PRIVEE_ONBOARDING_AGENT_MCH.md` (nouveau)
- `docs/ops/BETA_LAUNCH_CHECKLIST.md` (nouveau)

## Phase 6 — Cascade merge + deploy ✅

| PR   | Titre                                                        | SHA merge | Deploy |
|------|--------------------------------------------------------------|-----------|--------|
| #68  | PAY-2 — refunds + webhook→email + factures basiques          | `fd9aa30` | ✅ 06:54 |
| #69  | MP-CATEGORY-3 — dropdown filtre catégories publiques         | `8970d6f` | ✅ 06:59 |
| #70  | MP-NOTIF-3 ph8 — export CSV logs + alertes taux erreur       | `3b9c188` | ✅ 07:02 |
| #71  | BÊTA-PRIVÉE-PREP — seed étendu + templates welcome + docs    | `e778cd6` | ✅ 07:05 |

SHA main final : `e778cd6`

## Smoke combiné final

| Endpoint                              | Code | Attendu |
|---------------------------------------|------|---------|
| HTTPS /                               | 307  | 307 ✅  |
| HTTPS /login                          | 200  | 200 ✅  |
| API /api/v1/health                    | 200  | 200 ✅  |
| API /api/v1/health/live               | 200  | 200 ✅  |
| API /api/v1/marketplace/catalog       | 200  | 200 ✅  |
| API /api/v1/marketplace/catalog/categories | 200 | 200 ✅ |
| API /api/v1/marketplace/catalog/sellers | 200 | 200 ✅ |
| API /api/v1/invoices                  | 401  | 401 ✅  |
| API /api/v1/notif-email/logs          | 401  | 401 ✅  |

## Guardrails respectés

- 0 force-push main
- 0 Stripe real calls (test seulement, clé test)
- 0 PAY module modification (PAY-2 = new development, pas modification PAY-1)
- 0 env var changes
- 0 external emails
- Prisma additive only (2 nullable Company columns + Invoice model + InvoiceStatus enum + 2 EntityType values)
- tsc clean backend + frontend (vérifié chaque PR)
- Cascade merge propre : rebase --onto pour chaque branche, squash merge

## Migrations Prisma en attente (prod)

2 migrations à appliquer sur DB prod :
1. `20260502091440_add_company_postal_code_description` — 2 colonnes nullable Company
2. `20260502100000_pay_2_invoices` — table invoices + enum InvoiceStatus + EntityType extensions

```bash
pnpm --filter @iox/backend exec prisma migrate deploy
```

## Blocages rencontrés

1. **DB locale indisponible** → migrations SQL créées manuellement
2. **Stripe YT non supporté** → documenté, workaround FR country code
3. **Branche pay-2-refunds-and-email-and-invoices supprimée après merge** → rebase avec parent commit SHA au lieu du nom de branche

## Notes

- Invoice PDF generation returns 501 stub — implémentation réelle dépend du choix de lib (puppeteer/pdfkit)
- Email template `payment-confirmed-to-buyer` prêt mais nécessite Resend configuré pour envoi réel
- Les 5 vendeurs MCH seed sont des fixtures demo — ne pas confondre avec les vrais vendeurs bêta
- Script `generate-seller-invite.sh` génère du texte WhatsApp/SMS — pas d'envoi automatique
