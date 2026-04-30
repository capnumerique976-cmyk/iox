# MP-NOTIF-3 phase 3 — Détail unitaire EmailLog admin

Compose avec MP-NOTIF-3 phase 2b (cascade #22). Ajoute la page de détail
unitaire pour un EmailLog : récap complet, section erreur isolée si
applicable, dump `metadataJson` brut.

## Backend

### Endpoint

`GET /api/v1/notif-email/logs/:id` — `@Roles(ADMIN, COORDINATOR)`.
Renvoie `EmailLogItem` ou 404.

### Service

`NotifEmailService.getLogById(id)` :
- `findUnique` Prisma sur `email_logs`.
- Throw `NotFoundException` si introuvable.
- Mapping rows → `EmailLogItem` identique à `listLogs`.

### Tests backend

2 nouveaux specs :
- `getLogById` retourne EmailLogItem normalisé (`createdAt` ISO).
- `getLogById` throws `NotFoundException` si introuvable.

Total `notif-email.service.spec` : **22 specs passants** (20 + 2 nouveaux).

## Frontend

### Helper

`apps/frontend/src/lib/notif-email.ts` — `notifEmailApi.getLogById(id, token)`.

### Page

`/admin/notif-email/logs/[id]` (`apps/frontend/src/app/(dashboard)/admin/notif-email/logs/[id]/page.tsx`).

Sections :
- **Résumé** : status badge, template, transport, créé, destinataire,
  recipient user id, provider message id, sujet.
- **Erreur** (rouge) : visible uniquement si `errorCode` ou
  `errorMessage` présents (typiquement status FAILED).
- **Metadata JSON** : dump complet en `<pre>` ou message vide si null.

Lien retour `← Retour au journal` vers `/admin/notif-email/logs`.

### Liste mise à jour

Page liste `/admin/notif-email/logs` : nouvelle colonne `Détail →` par
ligne, lien vers la page détail.

### Tests frontend

5 nouveaux specs sur la page détail :
- résumé (status + template + recipient + sujet + provider message id)
- section erreur visible si FAILED
- metadataJson `<pre>` avec contenu JSON
- message "Pas de metadata" si null
- erreur 404 affichée

Total `/admin/notif-email/logs` : **9 specs passants** (4 list + 5 detail).

```bash
pnpm --filter @iox/backend exec jest --testPathPattern notif-email.service.spec
# Tests: 22 passed

pnpm --filter @iox/frontend exec vitest run "src/app/(dashboard)/admin/notif-email"
# Test Files 2 passed — Tests 9 passed
```

## Décisions

- **Pas de redaction** sur `metadataJson` : la table est restreinte aux
  rôles ADMIN/COORDINATOR — masking inutile et gênant pour le diagnostic.
- **Pas de lien direct vers RFQ source** : `metadataJson.sourceEntity` +
  `sourceId` permettent au lecteur d'aller voir manuellement, mais le
  click-through n'est pas câblé V1 (nécessiterait switch côté frontend
  selon entityType — RFQ, Order…).
- **Aucune action de modification** : les EmailLog sont immutables
  (audit trail). Pas de retry/resend/edit.

## Hors scope (suite)

- Bouton "Renvoyer" (avec idempotence Resend).
- Lien click-through vers entité source (RFQ, Order, …).
- Export CSV des logs filtrés.
- Statistiques agrégées par template/jour.
- Page admin `/admin/notif-email/unsubscribes` (suite logique).
