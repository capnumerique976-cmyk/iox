# ADR-0001 — PaymentProvider adapter seam

**Status** : Accepted
**Date** : 2026-04-XX (post-PAY-1 LOT 3)
**Decision-maker** : Équipe IOX

## Context

PAY-1 introduit Stripe Connect comme PSP. Le code initial couplait
directement les services backend au SDK Stripe (imports `stripe`, types
Stripe leakés dans les signatures).

Cela rendait :
- Tests unitaires impossibles sans mock du SDK
- Migration future vers Mangopay / Adyen / autre PSP très coûteuse
- Mode mock (dev sans clés Stripe) tortueux

## Decision

Introduire un **seam `PaymentProvider`** : interface abstraite consommée
par les services domaine (`PaymentsService`, `StripeOnboardingService`).

Deux adapters concrets :
- `StripePaymentProvider` — implémente l'interface via SDK Stripe
- `MockPaymentProvider` — implémente l'interface via fixtures
  déterministes (utilisé en dev local + tests)

Injection via token NestJS `PAYMENT_PROVIDER`, sélection adapter via
`STRIPE_SECRET_KEY` présent (Stripe) ou absent (Mock).

## Consequences

**Positives** :
- Tests unitaires services payments sans réseau ni SDK
- Mode dev sans Stripe (Mock retourne URLs fictives)
- Le seam est *réel* (2 adapters, pas hypothétique)
- Surface du SDK Stripe confinée à 1 fichier adapter

**Négatives** :
- 1 couche d'indirection à comprendre pour les nouveaux contributeurs
- Coût initial : refactor des appels Stripe directs en M134→M136

## Status

Seam intentionnel et préservé. **Toute nouvelle feature paiement DOIT
passer par l'interface `PaymentProvider`**, pas directement par le SDK.
