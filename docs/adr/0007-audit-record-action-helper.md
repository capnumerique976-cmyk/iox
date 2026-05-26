# ADR-0007 — AuditService.recordAction typed helper

**Status** : Accepted
**Date** : 2026-05-26
**Decision-maker** : Caveman session — architecture deepening #5

## Context

`AuditService.log(params)` est solide (try/catch, ne fait pas échouer
l'op métier) mais shallow :
- `userId` est optionnel → de nombreux call-sites passent l'actor mais
  pourraient l'oublier (pas de check compile-time)
- 119 actions distinctes dans le codebase, toutes des string literals
- Boilerplate répété : 5 lignes `await audit.log({ action, entityType,
  entityId, userId: actor.id, newData: {...} })`

Diagnostic skill `improve-codebase-architecture` (candidat #5) :
**shallow abstraction, audit non déterministe (certains endpoints
oublient actor.id), pas de corrélation idempotency**.

## Decision

Ajouter une méthode **typée** `AuditService.recordAction(actor, params)` :
- `actor: RequestUser` positionnel + **requis** (impossible de l'oublier)
- `params: AuditActionParams` (action, entityType, entityId, previousData,
  newData, notes)
- `userId` extrait automatiquement de `actor.id`
- Délègue à `log()` pour la persistence (compat existant)

Garde `log()` public pour les rares cas système (webhooks Stripe sans
actor, cron jobs, seed) qui ont déjà du `userId` explicite ou null.

**N'ajoute pas** d'enum d'actions (119 trop large) — gardé string
literal. Centralisation peut venir en V2.

## Migration plan (strict)

**Cette PR (phase 1)** :
- Ajouter `recordAction(actor, params)` dans `AuditService`
- Tests purs sur typing + délégation
- Migrer ~3 call-sites critiques (payments + invoices) comme démonstration
- Documenter le pattern dans `CONTEXT.md`

**Hors scope (phases futures)** :
- Migration des 100+ autres call-sites (progressive, low-priority)
- `AuditAction` enum centralisé (V2+, demande inventaire structuré)
- Corrélation idempotency-key → suppression replays audit (V2+)

## Consequences

**Positives** :
- Actor positionnel + requis → impossible d'oublier `userId`
- Boilerplate réduit (~5 lignes → 1 ligne)
- Type compile-time check : code refusant de compiler si actor manquant
- Migration progressive sans casser l'existant (`log()` reste exposé)

**Négatives** :
- 2 méthodes (`log` + `recordAction`) sur même service — accept temporary
  duplication pendant migration

## Hors scope (V2+)

- Enum `AuditAction` centralisé
- Decorator `@Auditable` runtime (complexité Prisma transaction hooks)
- Corrélation x-request-id → audit
- Replay detection via idempotency
