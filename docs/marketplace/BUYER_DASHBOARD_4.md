# BUYER-DASHBOARD-4 — Préférences notifications self-service

Page `/buyer/preferences` où le user connecté gère ses opt-out granulaires
sans token signé. Distinct de `/unsubscribe?token=...` (one-click public).

## Backend

### Endpoints

`GET /api/v1/notif-email/me/preferences` — liste opt-outs actifs pour
`user.email` (JWT-derived).

`POST /api/v1/notif-email/me/preferences` (body `{ type }`) — désinscrit
le user pour ce type.

`DELETE /api/v1/notif-email/me/preferences/:type` — réinscrit (idempotent).

### Service

Méthodes ajoutées dans `UnsubscribeService` :
- `listForEmail(email)` : findMany filtered by email normalisé, mappe createdAt ISO.
- `deleteForEmail(email, type, actorId?)` : deleteMany idempotent + log.

L'email vient toujours du JWT (`user.email`), jamais d'un body/query —
empêche un user de modifier les préférences d'un autre.

### Controller

Nouveau `NotifEmailMePreferencesController` (séparé du
`UnsubscribeController` public + `NotifEmailController` admin).
Préfix `/notif-email/me/preferences`. Auth requise (JwtAuthGuard +
RolesGuard, pas de `@Roles` strict — n'importe quel user authentifié
peut gérer ses préférences).

### DTO

`ToggleMyPreferenceDto` : `{ type: 'ALL' | 'RFQ_NOTIFICATIONS' | 'TRANSACTIONAL' }`.

## Frontend

### Helper

`apps/frontend/src/lib/notif-email.ts` ajoute :
- `MyPreferenceItem` type
- `myNotifPreferencesApi.{list, add, remove}`

### Page

`/buyer/preferences` — 3 cards par type, toggle "Me désinscrire" /
"Me réinscrire" + badge Inscrit/Désinscrit. Optimistic update.

3 types :
- **RFQ_NOTIFICATIONS** : new message, qualification, devis, won, lost.
- **TRANSACTIONAL** : confirmations commande, factures, livraisons.
- **ALL** : override total, désactive TOUT.

Lien "Préférences notifications" ajouté dans les raccourcis du cockpit
`/buyer` (3ème card).

## Tests

### Backend

4 nouveaux specs (UnsubscribeService) :
- `listForEmail` : normalise email + mappe ISO
- `listForEmail` vide → []
- `deleteForEmail` : email normalisé + type
- `deleteForEmail` idempotent (count=0 ne throw pas)

Total `unsubscribe.service.spec` : **16 specs passants** (12 + 4).

### Frontend

5 vitest specs :
- 3 types affichés tous Inscrits par défaut
- Désinscrit si type dans listForEmail
- toggle add() + update UI
- toggle remove()
- erreur 401 affichée

Total `/buyer/*` : **33 specs passants** (4+7+5+6+6+5).

```bash
pnpm --filter @iox/backend exec jest --testPathPattern unsubscribe.service.spec
# Tests: 16 passed

pnpm --filter @iox/frontend exec vitest run "src/app/(dashboard)/buyer"
# Test Files 6 passed — Tests 33 passed
```

## Décisions

- **`user.email` toujours JWT-derived** : sécurité — un user ne peut pas
  modifier les préférences d'un autre via API.
- **Optimistic update côté frontend** : meilleure UX, rollback
  potentiellement possible en V2 si erreur réseau.
- **Pas d'undo per-type d'historique** : la table EmailUnsubscribe est
  effacée au DELETE, pas d'audit trail des re-souscriptions V1.
- **3 types fixes** : V1 simple. V2 pourra ajouter plus de granularité
  (par template ou par event).
- **`/buyer/preferences` plutôt que `/profile/preferences`** : plus
  visible dans le cockpit, lien direct.

## Hors scope (V2+)

- Audit trail re-souscriptions (qui a re-souscrit quand).
- Préférences par template (rfq-qualified vs rfq-quoted séparés).
- Préférences par fréquence (daily digest vs immédiat).
- Gestion préférences pour seller (différents types d'events).
- Endpoint admin DELETE `/admin/notif-email/unsubscribes/:id` (re-souscrire
  pour un autre user en cas de support).
