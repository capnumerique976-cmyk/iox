# ADR-0003 — Enums domaine dans @iox/shared, pas @prisma/client

**Status** : Accepted
**Date** : 2026-05-25
**Decision-maker** : Caveman session — architecture deepening

## Context

Plusieurs fichiers du module `notif-email` importent des enums directement
depuis `@prisma/client` :

```typescript
import { EmailUnsubscribeType, EmailLogStatus } from '@prisma/client';
```

Fichiers concernés :
- `notif-email/notif-email.service.ts`
- `notif-email/unsubscribe.service.ts`
- `notif-email/me-preferences.controller.ts`
- `notif-email/dto/toggle-my-preference.dto.ts`
- `notif-email/dto/list-unsubscribes.dto.ts`
- Tests : `unsubscribe.controller.spec.ts`, `unsubscribe.service.spec.ts`

Conséquences :
- Couplage transitif entre la couche domaine et le client Prisma
- Le frontend ne peut pas consommer ces enums (Prisma = Node-only)
- Tests doivent importer `@prisma/client`
- L'introduction d'un nouveau transport email (ex : Sendgrid, Postmark)
  exigerait de modifier le schema Prisma avant de toucher au domaine

Le reste du codebase suit déjà le pattern : enums domaine dans
`packages/shared/src/enums/index.ts` (string-based, valeurs identiques à
Prisma) consommés via `@iox/shared`.

## Decision

**Tout enum domaine consommé hors persistence layer doit être déclaré
dans `@iox/shared`**, pas importé depuis `@prisma/client`.

Le persistence layer (Prisma queries dans services) peut continuer à
utiliser les enums Prisma — mais ceux-ci ne doivent pas fuir dans :
- Les signatures publiques de services
- Les DTOs (entrée et sortie)
- Les contrôleurs
- Les types frontend
- Les tests unitaires

Quand un enum Prisma et un enum `@iox/shared` ont les mêmes valeurs
(string), TypeScript les considère interchangeables — pas de mapping
adapter requis.

## Migration

1. Déclarer `EmailUnsubscribeType` et `EmailLogStatus` dans
   `packages/shared/src/enums/index.ts`
2. Remplacer les imports `from '@prisma/client'` par `from '@iox/shared'`
   dans les 7 fichiers `notif-email/`
3. Rebuild `@iox/shared`, lancer tests

## Consequences

**Positives** :
- Frontend peut typer ses unsubscribe forms via `EmailUnsubscribeType`
- Tests unitaires sans dépendance Prisma
- Architecture en oignon respectée (domain → persistence, pas l'inverse)
- Pattern cohérent avec les 30+ enums existants dans `@iox/shared`

**Négatives** :
- Risque de drift si on modifie Prisma sans toucher `@iox/shared`.
  Mitigé : `@iox/shared` est l'autorité, Prisma doit suivre. CI peut
  ajouter un check de cohérence (V2).

## Generalization

Cette ADR s'applique à **tout enum domaine** futur. Lorsque tu introduis
une enum Prisma :

1. La déclarer aussi dans `packages/shared/src/enums/index.ts` (mêmes
   valeurs string)
2. Importer depuis `@iox/shared` partout sauf dans la couche persistence
3. Documenter l'intention dans un commentaire JSDoc côté Prisma
