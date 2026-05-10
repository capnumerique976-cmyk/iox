# Handoff — Mandat 59 : Multi-devise EUR/USD sécurisé

**Date :** 2026-05-10  
**Branche :** feature/mandat-59-multi-devise (ou intégré au trunk selon workflow)  
**Statut :** ✅ Complet — 74 backend tests pass, 512 frontend tests pass, TSC clean

---

## Objectif

Ajouter le support EUR/USD multi-devise de bout en bout, sans toucher aux montants existants ni créer de migrations risquées.

---

## Fichiers créés

### Backend

| Fichier | Description |
|---|---|
| `apps/backend/src/common/money.ts` | Helpers centralisés : `SUPPORTED_CURRENCIES`, `normalizeCurrency` (throw si non supportée), `formatCents`, `toStripeCurrency` |
| `apps/backend/src/common/money.spec.ts` | ~10 tests couvrant toutes les fonctions |

### Frontend

| Fichier | Description |
|---|---|
| `apps/frontend/src/lib/money.ts` | Helpers centralisés : `SUPPORTED_CURRENCIES`, `normalizeCurrency` (fallback silencieux EUR), `formatCents`, `formatAmount` |
| `apps/frontend/src/lib/money.test.ts` | ~23 tests couvrant toutes les fonctions |

---

## Fichiers modifiés

### Backend

| Fichier | Changement |
|---|---|
| `apps/backend/src/payments/payments.service.ts` | Remplacé gate EUR-only par `normalizeCurrency()` — USD accepté, GBP rejeté. `toStripeCurrency()` pour lowercase Stripe. |
| `apps/backend/src/payments/payments.service.spec.ts` | Remplacé test "currency non-EUR" par 3 tests M59 (USD accepté, usd normalisé, GBP rejeté) |

### Frontend

| Fichier | Changement |
|---|---|
| `apps/frontend/src/app/(dashboard)/seller/invoices/page.tsx` | Import `formatCents`, suppression `formatAmount` local (EUR hardcodé), call sites → `formatCents(inv.amountCents, inv.currency)` |
| `apps/frontend/src/app/(dashboard)/buyer/invoices/page.tsx` | Idem + suppression du `<span>{inv.currency}</span>` redondant en vue mobile |
| `apps/frontend/src/app/(dashboard)/seller/invoices/page.test.tsx` | Ajout test M59 : vérifie `€` dans row EUR |
| `apps/frontend/src/app/(dashboard)/buyer/invoices/page.test.tsx` | Corrigé assertions `'420.00 €'` (format EN) → `toContain('€')` (fr-FR). Ajout test M59 USD. |

---

## Décisions techniques

### Pas de migration Prisma nécessaire

Audit initial confirmé : `Payment.currency`, `Invoice.currency` (String, default 'EUR'), `MarketplaceOffer.currency` (String nullable) existaient déjà. Aucun changement de schéma.

### Comportement normalizeCurrency : frontend vs backend divergents (intentionnel)

- **Backend** (`common/money.ts`) : `normalizeCurrency` **throw** `Error('devise non supportée')` pour toute devise hors EUR/USD. Le service convertit en `BadRequestException`. Strict car les montants d'argent doivent être validés.
- **Frontend** (`lib/money.ts`) : `normalizeCurrency` **fallback silencieux** sur EUR pour affichage. UX non bloquant — si une devise inconnue arrive depuis l'API, on affiche en EUR plutôt que planter.

### Stripe : lowercase obligatoire

`toStripeCurrency('EUR')` → `'eur'`. Stripe exige lowercase. Appelé dans `createCheckoutSession` au moment de créer la session Stripe.

### Colonnes "Devise" conservées dans les tables

Les colonnes `{inv.currency}` (affiche "EUR" / "USD" en texte) sont conservées dans les tables factures. `formatCents` inclut déjà le symbole (€/$) mais la colonne texte apporte clarté pour l'opérateur.

---

## Périmètre non touché (hors scope M59)

- **MarketplaceOffer.currency** : champ existe (`nullable String`) mais pas encore exposé dans les formulaires de création/édition d'offre. À faire dans un Mandat dédié.
- **RFQ → Offer currency propagation** : la RFQ hérite actuellement de la devise au moment du checkout (input du buyer). Pas de propagation automatique depuis l'offre. Acceptable V1.
- **Conversion EUR↔USD** : pas de conversion. Montant affiché dans sa devise d'origine. IOX V1 ne convertit pas.
- **Factures existantes** : toutes `currency='EUR'` (default). Pas impactées.

---

## Vérifications finales

```
# Backend
cd apps/backend
npx jest --testPathPattern="payments|money" --no-coverage
# → 74 tests, 0 failures

# Frontend
cd apps/frontend
npx vitest run
# → 512 tests, 0 failures

# TypeScript
npx tsc --noEmit
# → 0 errors
```
