# IOX — Correctifs Sécurité P0 (M76)

**Date :** 2026-05-11  
**Mandat :** M76 — Security & VPS Pilot  
**Statut :** Les 3 correctifs sont implémentés et mergés.

---

## Résumé

Trois vulnérabilités de niveau P0 ont été identifiées lors de l'audit pré-lancement et corrigées dans le mandat M76. Ces correctifs sont **non-bloquants pour la logique applicative** mais critiques pour la posture de sécurité en production.

| # | Identifiant | Composant | Gravité | Statut |
|---|---|---|---|---|
| 1 | S1 | `apps/backend/src/config/env.validation.ts` | P0 | Corrigé M76 |
| 2 | S2 | `apps/frontend/next.config.mjs` | P0 | Corrigé M76 |
| 3 | S3 | `apps/frontend/src/middleware.ts` | P0 | Corrigé M76 |

---

## S1 — Vérification des secrets Stripe au démarrage

### Problème initial

Au démarrage du backend, aucune vérification n'était effectuée sur la présence ou la validité des variables d'environnement Stripe. En production, un démarrage avec une clé de test (`sk_test_…`) ou sans clé était silencieux — découvrable uniquement lors du premier paiement réel.

### Solution implémentée

Ajout de la fonction `warnMissingOptional(env, raw)` dans `apps/backend/src/config/env.validation.ts`.

**Comportement :**

- Détecte si `STRIPE_SECRET_KEY` est absente en staging ou production → `console.warn`
- Détecte si `STRIPE_SECRET_KEY` commence par `sk_test_` alors que `NODE_ENV === 'production'` → `console.warn`
- Détecte si `STRIPE_WEBHOOK_SECRET` est absent en staging ou production → `console.warn`
- Détecte si `APP_URL` est absent en production → `console.warn`
- Toutes les alertes sont **non-bloquantes** (`console.warn`, pas `throw`) : le backend démarre quand même, permettant un diagnostic progressif sans coupure de service
- **Les secrets ne sont jamais loggés** : seule la présence/absence et le préfixe (`sk_test_`) sont vérifiés

**Règle de déclenchement :**

| Condition | Environnements concernés |
|---|---|
| `STRIPE_SECRET_KEY` absente | `staging`, `production` |
| `STRIPE_SECRET_KEY` = `sk_test_*` | `production` uniquement |
| `STRIPE_WEBHOOK_SECRET` absent | `staging`, `production` |
| `APP_URL` absent | `production` uniquement |

**Tests associés :** 13 tests ajoutés dans `apps/backend/src/config/env.validation.spec.ts` couvrant tous les cas de warn (présence, absence, mauvais préfixe, environnement development non concerné).

---

## S2 — allowedOrigins dynamique (next.config.mjs)

### Problème initial

La configuration Next.js contenait une origine CORS codée en dur :

```js
// AVANT (vulnérable)
allowedOrigins: ['localhost:3000']
```

En production, `localhost:3000` n'est pas une origine légitime. Une requête cross-origin depuis un domaine malveillant pouvait potentiellement passer si le navigateur ou un proxy ne filtrait pas correctement.

### Solution implémentée

```js
// APRÈS (corrigé)
allowedOrigins: process.env.FRONTEND_URL
  ? [new URL(process.env.FRONTEND_URL).host]
  : ['localhost:3000']
```

**Comportement :**

- Si `FRONTEND_URL` est définie (cas staging/production) → seul le host extrait de cette URL est autorisé
- Si `FRONTEND_URL` est absente (cas développement local) → fallback sur `localhost:3000`
- `localhost:3000` est **automatiquement bloqué en production** dès que `FRONTEND_URL` est renseignée
- L'extraction via `new URL(...).host` garantit le parsing correct (pas de trailing slash, pas de protocole parasite)

**Variable d'environnement requise :**

```
FRONTEND_URL=https://[domaine-frontend]
```

---

## S3 — X-Frame-Options : source de vérité unique

### Problème initial

Le header `X-Frame-Options` était défini à deux endroits avec des valeurs contradictoires :

| Emplacement | Valeur |
|---|---|
| `apps/frontend/src/middleware.ts` | `X-Frame-Options: SAMEORIGIN` |
| `apps/frontend/next.config.mjs` | `X-Frame-Options: DENY` |

Le comportement réel dépendait de l'ordre d'application des middlewares et de la couche réseau (Nginx, CDN). La valeur `SAMEORIGIN` dans le middleware pouvait écraser `DENY` et autoriser l'embedding depuis le même domaine, ce qui est moins restrictif que souhaité.

### Solution implémentée

- **Suppression** de `X-Frame-Options: SAMEORIGIN` dans `apps/frontend/src/middleware.ts`
- **Conservation** de `X-Frame-Options: DENY` dans `apps/frontend/next.config.mjs` (source de vérité unique)
- Résultat : aucun iframe possible depuis n'importe quelle origine, protection clickjacking maximale

---

## Points ouverts (post-M76)

Ces éléments ne sont **pas bloquants pour le pilote** mais doivent être planifiés avant la mise en production à grande échelle :

| # | Sujet | Priorité | Statut |
|---|---|---|---|
| O1 | Liste CORS backend explicite (pas uniquement `FRONTEND_URL`) | Moyenne | Non implémenté |
| O2 | Rate limiting global sur l'API (throttling par IP) | Haute | Non implémenté |
| O3 | CSP (Content-Security-Policy) header | Moyenne | Non implémenté |
| O4 | HSTS (Strict-Transport-Security) | Haute | À vérifier via Nginx |
| O5 | Rotation automatique des secrets JWT | Basse | Non implémenté |

### O1 — Absence de liste CORS backend explicite

Le backend NestJS hérite de la configuration CORS de NestJS par défaut. Une liste explicite des origines autorisées doit être définie dans `apps/backend/src/main.ts` pour le staging et la production, avec rejet strict de toute origine non listée.

### O2 — Rate limiting

Le package `@nestjs/throttler` est disponible dans l'écosystème NestJS. Les variables `THROTTLE_TTL` et `THROTTLE_LIMIT` sont documentées dans le `.env.example` mais le guard n'est pas encore activé globalement. À activer avant l'ouverture du registre public.

---

## Références

- Fichiers modifiés : `apps/backend/src/config/env.validation.ts`, `apps/frontend/next.config.mjs`, `apps/frontend/src/middleware.ts`
- Tests : `apps/backend/src/config/env.validation.spec.ts` (+13 tests)
- Audit source : `notes/security-prelaunch-audit-iox.md`
- Handoff : `notes/handoff-mandat-76-security-vps-pilot.md`
