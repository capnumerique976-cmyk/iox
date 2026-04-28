# BUYER-DASHBOARD-1 — Espace acheteur RFQ

## Objectif

Donner aux utilisateurs `MARKETPLACE_BUYER` un espace dédié pour suivre
et interagir avec leurs demandes de devis (RFQ), distinct du tableau
`/quote-requests` qui sert de cockpit staff/seller.

## Routes ajoutées

| Route                                | Rôle                                              |
| ------------------------------------ | ------------------------------------------------- |
| `/buyer/quote-requests`              | Liste filtrable des RFQ du buyer connecté.        |
| `/buyer/quote-requests/[id]`         | Détail d'une RFQ : récap, thread, message, cancel.|

## Garde de rôle

`apps/frontend/src/app/(dashboard)/buyer/layout.tsx` — client component
qui restreint l'accès aux rôles `MARKETPLACE_BUYER`, `ADMIN`,
`COORDINATOR`. Tout autre rôle est redirigé vers `/dashboard`.

L'authentification est déjà assurée par le layout dashboard parent.

## Liste `/buyer/quote-requests`

- **Source** : `quoteRequestsApi.list(token, params)` —
  `/api/v1/marketplace/quote-requests`. Le backend autoscope par rôle :
  un buyer ne voit que ses propres RFQ.
- **Filtres** :
  - **Statut** (multi-select) → `?status=NEW,QUALIFIED,...`
  - **Vendeur** (texte) → filtre client-side sur
    `sellerProfile.publicDisplayName` + `sellerProfile.slug` (la
    pagination reste serveur ; le filtre vendeur s'applique à la page
    courante).
  - **Créée après** (date) → `?createdAtAfter=YYYY-MM-DD`.
- **Pagination** : `limit=20`, page navigée via boutons Précédent /
  Suivant (controlled state, pas dans l'URL).
- **Empty states** :
  - aucune RFQ du tout → CTA `/marketplace`.
  - filtres trop restrictifs → message générique.

## Détail `/buyer/quote-requests/[id]`

- **En-tête** : titre offre, vendeur, produit, badge statut, date
  création.
- **Section "Votre demande"** : quantité demandée, pays de livraison,
  marché cible, société acheteuse, message initial.
- **Thread** : liste de `QuoteRequestMessage` (le backend filtre déjà
  les notes internes pour les non-staff) + form `<textarea>` qui appelle
  `addMessage(id, token, text, false)`.
- **Cancel** : bouton "Annuler la demande" affiché uniquement si statut
  `NEW` ou `QUALIFIED`. Confirme via `window.confirm` puis appelle
  `updateStatus(id, CANCELLED, token)`.
- **Échanges fermés** : si statut `CANCELLED`, `WON` ou `LOST`, le form
  message est masqué et un texte explicatif est affiché.

## Décisions

- **Pas de hooks personnalisés** : controlled state simple
  (`useState`) + `useCallback` pour `load`. Conforme aux conventions du
  monorepo.
- **Pagination via state** plutôt que via URL : pas besoin de partage
  de filtre cross-tab pour ce premier itéré ; les filtres se
  réinitialisent au refresh, ce qui est acceptable pour la phase 1.
- **Mock email** : aucun couplage notif côté frontend ; les emails
  RFQ-message-created sont déclenchés côté backend (déjà MP-NOTIF-1
  phase 1 sur `main`).
- **Pas de WebSocket / polling** : le buyer doit recharger pour voir
  les nouveaux messages. Un refresh manuel suffit pour la phase 1
  (volumes RFQ très faibles).

## Tests

- `apps/frontend/src/app/(dashboard)/buyer/quote-requests/page.test.tsx`
  — 4 specs (rendu lignes, empty state, filtre status, search vendeur).
- `apps/frontend/src/app/(dashboard)/buyer/quote-requests/[id]/page.test.tsx`
  — 7 specs (en-tête, thread vide, thread avec messages, envoi message,
  cancel NEW→CANCELLED, masque cancel sur QUOTED, échanges fermés sur
  CANCELLED).

```bash
pnpm --filter @iox/frontend exec vitest run "src/app/(dashboard)/buyer"
# Test Files  2 passed (2) — Tests  11 passed (11)
```

## Hors-scope (suite)

- Édition de la quantité / message après envoi (BUYER-DASHBOARD-2 ?).
- Vue agrégée multi-buyer pour buyers multi-companies.
- Notifications in-app sur nouveaux messages (cf. MP-NOTIF-2/3).
