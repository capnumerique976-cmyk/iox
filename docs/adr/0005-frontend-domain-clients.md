# ADR-0005 — Frontend domain clients deep

**Status** : Accepted
**Date** : 2026-05-26
**Decision-maker** : Caveman session — architecture deepening #6

## Context

Les modules `apps/frontend/src/lib/*.ts` sont des wrappers de transport :
- `api.ts` — transport profond (auto-idempotency, toast 429, x-request-id,
  ApiError unifié)
- `payments.ts` — **réimplémente son propre `request()`** (133 lignes)
  qui contourne tout ce que `api.ts` fait bien
- `invoices.ts` — utilise `api.ts` (bon pattern) + `downloadPdf()`
  custom (cas légitime : Blob binary)

Conséquences du `request()` custom dans `payments.ts` :
- Pas d'auto-idempotency sur POST `/payments/checkout-session` (risque
  double-charge buyer si replay HTTP/2 ou retry navigateur)
- Pas de toast 429 cohérent avec le reste
- Pas de propagation `x-request-id` pour debug support
- ApiError divergent (signatures, codes)
- Tests harder car double layer de mocking

Aucune validation côté client :
- `createCheckoutSession` POST `amountCents` sans vérifier que la
  RFQ est WON (côté serveur déjà locked M133, mais front pourrait
  pré-rejeter UX-friendly)
- Aucun mirroring des règles `PricingPolicy` (devises supportées
  EUR/USD) côté client → utilisateur découvre l'erreur après round-trip

Diagnostic skill `improve-codebase-architecture` (candidat #6) :
**shallow transport wrappers, frontend coupling risk, no domain
validation**.

## Decision

**Étape 1 — Unifier transport** : tout helper API frontend consomme
`api.ts` (`api.get/post/patch/put/delete`). Aucun `request()` custom.

Exception légitime : binary download (Blob) — voir `invoices.ts
downloadPdf()` qui fait son propre `fetch` car `api.ts` parse JSON
automatiquement. Pattern admis.

**Étape 2 — Domain validation côté client** : module
`payments-client.ts` (deep) qui :
- Ré-expose les méthodes de `paymentsApi` (transport)
- Ajoute pré-validation : devise supportée (mirror `PricingPolicy`),
  amount > 0 si fourni
- Types domaine retournés (`PaymentCheckout`, pas raw shape)
- Erreurs typed : `PaymentValidationError` (avant POST),
  `PaymentApiError` (après)

**Étape 3 — Tests** : 1 spec par règle de validation (no backend mock).
Le transport reste mocké via `vi.mock('@/lib/api')`.

## Migration plan (strict, reviewable)

**Cette PR (phase 1)** :
- Refactor `paymentsApi.*` pour utiliser `api.ts` directement
- Supprimer le `request()` custom dans `payments.ts`
- Aucun changement signatures publiques `paymentsApi.*`
- Tests existants doivent passer

**Hors scope (phases futures)** :
- `payments-client.ts` domain wrapper (étape 2 ci-dessus) → PR séparée
- Hooks React (`useCreateCheckoutSession` avec retry) → PR séparée
- Refactor similaire `marketplace-*.ts`, `companies.ts` si réimpl
  transport (audit séparé)

## Consequences

**Positives** :
- Idempotency automatique sur tous les POST payments (sécurité)
- ApiError unifié → handling cohérent UI
- Toast 429 marche partout
- x-request-id propagé pour debug
- Locality : transport vit dans 1 fichier

**Négatives** :
- 1 PR de refactor avec risque régression UX → mitigé par specs frontend

## Hors scope (V2+)

- Client-side caching layer (SWR / React Query)
- Optimistic updates pour mutations
- Offline mode / queue-and-replay
