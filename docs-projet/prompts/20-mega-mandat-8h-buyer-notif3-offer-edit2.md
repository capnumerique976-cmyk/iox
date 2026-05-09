# Méga-mandat Claude Code — Run autonome 8h LOCAL-ONLY — BUYER-DASHBOARD-1 + MP-NOTIF-3 + MP-OFFER-EDIT-2

> **Usage** : à coller dans Claude Code pour un run de ~8h. **Aucun push, aucun merge, aucun deploy, aucun gh, aucun ssh, aucun envoi email externe.**
>
> **Pré-requis (à vérifier en premier — STOP si non remplis)** :
>
> - chemin `/Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox`
> - working tree clean côté code (untracked autorisés : `docs-projet/`, `notes/handoff-*`, `notes/archive/`)
> - `main` local à `4250db2` (mandat 18 mergé). **Le mandat 19 est NON mergé sur main** : ses 3 branches existent localement et **on ne les touche pas**.
> - Branches locales attendues : `mp-notif-2-emaillog-and-resend-flag (9a12880)`, `mp-notif-2-unsubscribe (2aa40d7)`, `mp-notif-2-rfq-status-transitions (1b8533b)`.
> - `git stash list` doit être **vide**
> - Node, pnpm, docker compose disponibles ; `pnpm install` OK

Si l'un n'est pas rempli, **STOP** et écris dans `notes/handoff-megamandat-20-stop.md`.

---

## ⚠️ Garde-fou anti-hallucination

L'utilisateur sera **absent ~8 heures**. Toute invention sera détectée à son retour par grep / git log / pnpm test / inspection schema.prisma.

1. **Toujours vérifier sur disque** (`ls`, `cat`, `git status`) avant de marquer une étape "finie".
2. **Ne jamais inventer un output**. Si tu ne peux pas exécuter, rapporte l'erreur brute.
3. **À la fin de CHAQUE lot**, recopier l'output réel des commandes de preuve.
4. **Si tu détectes que tu inventes**, stoppe le lot, reviens à un état vert, documente, passe au suivant.

---

## Contexte canonique IOX (rappel)

Stack : monorepo pnpm + Turbo, NestJS + Prisma + PostgreSQL, Next.js (App Router), controlled state, conventional commits, migrations Prisma strict additives.

**Cinq invariants** :
1. `MarketplaceProduct` ≠ `MarketplaceOffer` ≠ `SellerProfile`.
2. Projection publique filtrée.
3. Statuts marketplace ≠ statuts MCH internes.
4. `FP-x` ≠ `Lot X` ≠ `MP-x`.
5. `Seller` = rôle marketplace, `Buyer` = `MARKETPLACE_BUYER`.

## État avant ce mandat

- `main = 4250db2` (23 lots marketplace mergés). Modèles Prisma : `MarketplaceOffer.visibilityScope` (enum PRIVATE/BUYERS_ONLY/PUBLIC), `MarketplaceOfferBatch` (lien offer ↔ ProductBatch), `EmailLog` ABSENT sur main (présent dans branche mandat 19), `EmailUnsubscribe` ABSENT sur main.
- VPS prod aligné : 4 sellers, 8 produits, 8 offres, 4 docs PUBLIC, 2 RFQ, 4 messages, smoke-seller + smoke-buyer en base.
- Backend `quote-requests.controller.ts` prefix `marketplace/quote-requests` — tous endpoints `RFQ_VIEW` accessibles aux buyers déjà câblés (GET list, GET /:id, POST /, PATCH /:id/status, GET /:id/messages, POST /:id/messages).
- Backend `marketplace-offers.controller.ts` : endpoints `POST /:id/batches`, `PATCH /batches/:linkId`, `DELETE /batches/:linkId` déjà câblés. Endpoint `PATCH /:id` accepte `visibilityScope` côté DTO (à vérifier).
- Frontend : pages admin `(dashboard)/admin/{rfq,memberships,users,diagnostics,review-queue,sellers}` existent. **Aucune page buyer.** Helper `apps/frontend/src/lib/quote-requests.ts` existe.

## Mandat global

Empiler **3 lots** par-dessus `main`, en branches chaînées strictement locales. **Ne pas se brancher sur les branches mandat 19** (elles attendent leur cascade indépendante).

```
main (4250db2, intact)
   │
   ▼
buyer-dashboard-1-quote-requests             ← LOT 1
   │
   ▼
mp-notif-3-unsubscribe-page-emaillog-admin   ← LOT 2 (si LOT 1 vert)
   │
   ▼
mp-offer-edit-2-visibility-and-batches       ← LOT 3 (si LOT 2 vert)
```

Si un lot capote, garder la branche, passer au suivant en partant de la branche précédente verte (ou main).

⚠️ **Note importante sur LOT 2 + mandat 19** : le LOT 2 ajoute la page admin EmailLog qui dépend du modèle Prisma `EmailLog` introduit par le mandat 19 (LOT 1) NON mergé sur main. **Solution** : démarrer LOT 2 en partant de `buyer-dashboard-1-quote-requests` (sans EmailLog), et **pour le code admin EmailLog**, démarrer une branche fille `mp-notif-3-emaillog-admin` qui partira de `mp-notif-2-emaillog-and-resend-flag` (mandat 19 LOT 1) pour avoir le modèle Prisma. À la cascade, on rebasera après merge mandat 19.

**Décision pratique pour simplifier** : on **scinde LOT 2 en 2 sous-branches** :
- 2a) `mp-notif-3-unsubscribe-page` (depuis `buyer-dashboard-1`) — page conviviale unsubscribe (frontend pur, pas de dépendance Prisma EmailLog).
- 2b) `mp-notif-3-emaillog-admin` (depuis `mp-notif-2-emaillog-and-resend-flag`) — endpoint + page admin EmailLog. Le rapport documentera la dépendance et indiquera qu'à la cascade, 2b doit être mergé après mandat 19 LOT 1 + rebasé sur main.

```
main
 ├─ buyer-dashboard-1-quote-requests
 │    └─ mp-notif-3-unsubscribe-page                   ← 2a (frontend pur)
 │         └─ mp-offer-edit-2-visibility-and-batches    ← LOT 3 (depuis 2a)
 │
 └─ mp-notif-2-emaillog-and-resend-flag (mandat 19 — non touché)
      └─ mp-notif-3-emaillog-admin                      ← 2b (dépend mandat 19)
```

---

## ❌ Règles absolues

- **AUCUN `git push`**, **AUCUN `gh`**, **AUCUN `git fetch origin`** ni `pull`.
- **AUCUN merge sur main local**. Main reste à `4250db2`.
- **AUCUN deploy / ssh / VPS**.
- **AUCUNE modification des branches mandat 19** (sauf `2b` qui en part en lecture seule via `git checkout -b ...`).
- **AUCUN force-push**.
- **AUCUNE migration Prisma** sauf si strict additive et indispensable. (LOT 2b n'en exige pas — `EmailLog` existe déjà via mandat 19.)

## ✅ Exigences techniques transverses

- **Migrations Prisma strict additives** (LOT 2b et LOT 3 n'en demandent pas).
- **Conventional commits**.
- **TypeScript strict** : pas de `any`, casts justifiés.
- **DTOs class-validator** : whitelist + forbidNonWhitelisted.
- **Tests** : chaque feature backend a `.spec.ts`, chaque page frontend a `.test.tsx`. Cible vitest frontend = vert intégral, jest backend = vert intégral pour les nouveaux specs.
- **Logs** : `Logger` Nest, jamais `console.log`.
- **i18n** : textes UI FR uniquement.
- **Controlled state** : pas de react-hook-form. `useState` + helpers.

---

## LOT 1 — BUYER-DASHBOARD-1 — Pages buyer RFQ (~3h)

**Branche** : `buyer-dashboard-1-quote-requests` à partir de `main`.

**Objectif** : donner une UI au compte `MARKETPLACE_BUYER` pour consulter et interagir avec ses RFQ. Tous les endpoints backend sont déjà câblés.

### 1.1 Helper API frontend — étendre `quote-requests.ts`

Vérifier l'état actuel de `apps/frontend/src/lib/quote-requests.ts` et compléter si manquant :

- `listMine(token, params?)` → `GET /api/v1/marketplace/quote-requests?...` (liste auto-scopée par rôle).
- `getById(id, token)` → `GET /api/v1/marketplace/quote-requests/:id`.
- `listMessages(id, token)` → `GET /api/v1/marketplace/quote-requests/:id/messages`.
- `sendMessage(id, body, token)` → `POST /api/v1/marketplace/quote-requests/:id/messages` body `{ message, isInternalNote: false }`.
- `updateStatus(id, dto, token)` → `PATCH /api/v1/marketplace/quote-requests/:id/status` body `{ status, note? }`.

Définir les types TS : `BuyerQuoteRequestSummary`, `BuyerQuoteRequestDetail`, `BuyerQuoteRequestMessage`.

### 1.2 Pages frontend

Structure :

```
apps/frontend/src/app/(dashboard)/buyer/
├── layout.tsx                              # garde MARKETPLACE_BUYER role
├── quote-requests/
│   ├── page.tsx                            # liste filtrable
│   ├── page.test.tsx
│   └── [id]/
│       ├── page.tsx                        # détail + thread + form message
│       └── page.test.tsx
```

**Page `/buyer/quote-requests` (list)** :
- Tableau colonnes : `Offre` (titre + image mini), `Seller`, `Quantité`, `Status` (badge), `Mise à jour`, action "Voir".
- Filtres : status (multi-select via `?status=NEW,QUALIFIED`), seller (search texte sur sellerSlug), période (`createdAtAfter`).
- Pagination (`limit=20`, navigation page).
- Empty state si `total=0` : message + lien vers le marketplace.
- Loading state, error state.

**Page `/buyer/quote-requests/[id]` (detail)** :
- En-tête : titre offre + seller + status badge + date création.
- Section "Demande" : quantité, unité, marché cible, message initial.
- Thread messages (chronologique, distinguer buyer vs seller via `authorUser.id`). Note interne masquée (filtre `!isInternalNote` côté frontend).
- Form en bas : zone de texte (max 2000 chars) + bouton "Envoyer". Submit → API → refetch thread.
- Bouton "Annuler la demande" si status `NEW` ou `QUALIFIED` → confirm dialog → `updateStatus(CANCELLED)`.
- Pas de bouton accept/reject côté buyer (c'est seller qui qualifie/quote — buyer reçoit les notifs MP-NOTIF-2 mais agit indirectement).

### 1.3 Layout + garde role

`apps/frontend/src/app/(dashboard)/buyer/layout.tsx` :
- Server component qui vérifie session + role `MARKETPLACE_BUYER` (pattern existant côté seller layout).
- Si non-buyer : redirect vers `/login` ou page unauthorized.
- Sidebar minimal : "Mes demandes de devis" → `/buyer/quote-requests`.

### 1.4 Tests

- `page.test.tsx` (list) : 4 specs — rendu liste, filtre status, pagination, empty state.
- `[id]/page.test.tsx` (detail) : 6 specs — rendu thread, send message OK, send message error, cancel OK, cancel refusé, note interne masquée.

### 1.5 Documentation

`docs/marketplace/BUYER_DASHBOARD_1.md` : screenshots ASCII des pages, scope, TODO BUYER-DASHBOARD-2 (orders, profile company, settings).

### 1.6 Preuves anti-hallucination LOT 1

```
git log --oneline main..buyer-dashboard-1-quote-requests
git diff main..buyer-dashboard-1-quote-requests --stat
ls apps/frontend/src/app/\(dashboard\)/buyer/
ls apps/frontend/src/app/\(dashboard\)/buyer/quote-requests/
ls apps/frontend/src/app/\(dashboard\)/buyer/quote-requests/\[id\]/
grep -n "listMine\|getById\|sendMessage" apps/frontend/src/lib/quote-requests.ts | head -10
pnpm --filter @iox/frontend test buyer 2>&1 | tail -20
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -5
```

---

## LOT 2a — MP-NOTIF-3 page conviviale unsubscribe (~1h)

**Branche** : `mp-notif-3-unsubscribe-page` à partir de `buyer-dashboard-1-quote-requests`.

**Objectif** : remplacer (côté UX) le JSON brut renvoyé par `GET /api/v1/notif-email/unsubscribe?token=...` par une page Next.js conviviale.

⚠️ **Le modèle EmailUnsubscribe et l'endpoint backend existent SEULEMENT dans la branche mandat 19 LOT 2 (`mp-notif-2-unsubscribe`)** — non mergée sur main. **Donc** : la page Next.js est créée mais ne pourra être testée end-to-end qu'après merge mandat 19. Le lot reste frontend pur, l'endpoint backend appelé est documenté.

### 2a.1 Page Next.js

`apps/frontend/src/app/unsubscribe/page.tsx` (route publique, hors `(dashboard)` group) :
- Server component qui lit `searchParams.token`.
- Si pas de token : afficher message d'erreur + lien retour homepage.
- Si token : appeler `GET /api/v1/notif-email/unsubscribe?token=...` côté serveur (server fetch).
- Si succès : afficher page de confirmation FR (titre "Désinscription confirmée", email/type, message rassurant, lien retour).
- Si erreur : afficher message FR (titre "Lien invalide ou expiré", explication, contact support).

Style : minimal, centré, max-width 600px, palette IOX existante.

### 2a.2 Tests

`apps/frontend/src/app/unsubscribe/page.test.tsx` :
- Rendu sans token → message erreur.
- Rendu token valide (mock fetch) → confirmation.
- Rendu token invalide (mock fetch 400) → message erreur.

### 2a.3 Preuves anti-hallucination LOT 2a

```
git log --oneline buyer-dashboard-1-quote-requests..mp-notif-3-unsubscribe-page
git diff buyer-dashboard-1-quote-requests..mp-notif-3-unsubscribe-page --stat
ls apps/frontend/src/app/unsubscribe/
pnpm --filter @iox/frontend test unsubscribe 2>&1 | tail -10
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -5
```

---

## LOT 2b — MP-NOTIF-3 endpoint + page admin EmailLog (~1h30)

**Branche** : `mp-notif-3-emaillog-admin` à partir de `mp-notif-2-emaillog-and-resend-flag` (mandat 19 LOT 1, branche existante non mergée).

**Objectif** : exposer une visualisation admin du registre `EmailLog` introduit par le mandat 19 LOT 1.

### 2b.1 Endpoint backend admin

Créer ou étendre `apps/backend/src/notif-email/notif-email.controller.ts` :
- `GET /api/v1/notif-email/logs?status=&templateId=&recipientEmail=&dateFrom=&dateTo=&page=&limit=` — réservé `ADMIN`, `COORDINATOR`.
- DTO `ListEmailLogsQueryDto` : status (enum optional), templateId (string optional), recipientEmail (string optional, contains insensitive), dateFrom/dateTo (ISO date optional), page/limit.
- Service `NotifEmailService.listLogs(filters)` : query Prisma avec pagination + count.
- Réponse : `{ data: EmailLog[], meta: { total, page, limit, totalPages } }`.

DTO de réponse : sérialiser `EmailLog` en exposant tous les champs sauf `metadataJson` (interne) — sauf si `?includeMetadata=true` et role ADMIN.

### 2b.2 Tests backend

- `notif-email.controller.spec.ts` (nouveau ou étendu) : 4 specs — list happy, filtres status, filtres date range, pagination.
- `notif-email.service.spec.ts` (extension) : 3 specs — listLogs sans filtre, avec filtres combinés, pagination.

### 2b.3 Page admin frontend

`apps/frontend/src/app/(dashboard)/admin/notif-email/logs/page.tsx` :
- Tableau : `createdAt`, `transport`, `templateId`, `recipientEmail`, `subject`, `status` (badge).
- Filtres : status (multi), templateId (text), recipientEmail (text), dateFrom/dateTo (date pickers natifs).
- Pagination.
- Bouton "Détails" sur chaque ligne → modal montrant `errorCode`, `errorMessage`, `providerMessageId`, `metadataJson` (formatted JSON).
- Helper API `apps/frontend/src/lib/notif-email.ts` (nouveau) : `listLogs(token, params)`.

### 2b.4 Tests frontend

`apps/frontend/src/app/(dashboard)/admin/notif-email/logs/page.test.tsx` :
- 4 specs — rendu liste, filtre status, modal détails, empty state.

### 2b.5 Documentation

Mettre à jour `docs/marketplace/MP_NOTIF_2_PHASE_2.md` : section "Admin EmailLog viewer" avec route + filtres + permissions.

### 2b.6 Preuves anti-hallucination LOT 2b

```
git log --oneline mp-notif-2-emaillog-and-resend-flag..mp-notif-3-emaillog-admin
git diff mp-notif-2-emaillog-and-resend-flag..mp-notif-3-emaillog-admin --stat
grep -n "listLogs\|@Get('logs')" apps/backend/src/notif-email/notif-email.controller.ts
ls apps/frontend/src/app/\(dashboard\)/admin/notif-email/logs/
grep -n "listLogs" apps/frontend/src/lib/notif-email.ts
pnpm --filter @iox/backend test src/notif-email 2>&1 | tail -20
pnpm --filter @iox/frontend test admin/notif-email 2>&1 | tail -20
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -5
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -5
```

---

## LOT 3 — MP-OFFER-EDIT-2 — visibilityScope édition + UI batches (~2h30)

**Branche** : `mp-offer-edit-2-visibility-and-batches` à partir de `mp-notif-3-unsubscribe-page` (LOT 2a, pour rester sur la chaîne main → buyer → unsubscribe-page → offer-edit-2 sans dépendance mandat 19).

**Objectif** : permettre au seller d'éditer la `visibilityScope` de ses offres et de gérer les rattachements `MarketplaceOfferBatch` (lots produits exportables) via UI.

### 3.1 Backend — vérifier que `visibilityScope` est éditable via PATCH

- Lire `apps/backend/src/marketplace-offers/dto/update-marketplace-offer.input.ts` (ou équivalent) : si `visibilityScope` n'y est pas déjà autorisé, l'ajouter avec `@IsEnum(MarketplaceVisibilityScope)` et `@IsOptional`.
- Vérifier que la transition est interdite vers `PRIVATE` quand `publicationStatus=PUBLISHED` (sinon faux retrait du marché). Si ce contrôle n'existe pas, l'ajouter dans `MarketplaceOffersService.update` avec un test dédié.
- Tests `marketplace-offers.service.spec.ts` (extension) : 3 specs — update visibilityScope DRAFT autorisé, update visibilityScope PUBLISHED → BUYERS_ONLY autorisé, update visibilityScope PUBLISHED → PRIVATE rejeté avec 422.

### 3.2 Frontend — édition visibilityScope sur la page seller offer detail

Étendre `apps/frontend/src/app/(dashboard)/seller/marketplace-offers/[id]/page.tsx` :
- Section "Visibilité" avec un select (3 options FR : "Privé", "Visibles aux acheteurs connectés", "Public").
- Soumis via `PATCH /:id` (reuse helper `marketplaceOffersApi.update`).
- Helper `apps/frontend/src/lib/marketplace-offers.ts` : type `UpdateMarketplaceOfferInput` étendu avec `visibilityScope?: 'PRIVATE'|'BUYERS_ONLY'|'PUBLIC'`.
- Tests : 3 specs — rendu select, submit OK, transition interdite affiche toast erreur.

### 3.3 Frontend — section batches

Sur la même page detail offer, ajouter une section "Lots produits attachés" :
- Liste les `MarketplaceOfferBatch` existants (via `offer.batches` ou un fetch dédié — vérifier le shape côté `getById`).
- Bouton "Rattacher un lot" → modal listant les `ProductBatch` du seller (endpoint à vérifier — sinon créer un GET minimal `/api/v1/seller/product-batches?productId=...`).
- Pour chaque batch attaché : bouton "Modifier" (édite `quantityAvailable`, `quantityReserved`, `exportEligible`, `qualityStatus`, `traceabilityStatus`) + bouton "Détacher" (DELETE `/batches/:linkId`).
- Helpers API : `attachBatch(offerId, productBatchId, payload, token)`, `updateBatchLink(linkId, payload, token)`, `detachBatch(linkId, token)` — endpoints existants.

Si la liste des `ProductBatch` du seller n'a pas d'endpoint REST utilisable côté frontend : **STOP**, ne pas inventer d'endpoint, documenter dans le handoff comme blocage technique et passer à la suite (édition seulement, pas de création de nouveaux liens — l'utilisateur pourra créer les liens via API directement, le UI complète viendra en MP-OFFER-EDIT-3).

### 3.4 Tests

- `[id]/page.test.tsx` (extension) : 5 specs — section visibilité présente, select submit OK, section batches list, ouvrir modal attach (skip si endpoint manquant), détacher batch.
- Service backend tests inclus en 3.1.

### 3.5 Documentation

`docs/marketplace/MP_OFFER_EDIT_2.md` : matrice de transitions visibilityScope autorisées par publicationStatus, screenshot ASCII, scope batches, TODO MP-OFFER-EDIT-3 (UI création de batch from scratch).

### 3.6 Preuves anti-hallucination LOT 3

```
git log --oneline mp-notif-3-unsubscribe-page..mp-offer-edit-2-visibility-and-batches
git diff mp-notif-3-unsubscribe-page..mp-offer-edit-2-visibility-and-batches --stat
grep -n "visibilityScope" apps/backend/src/marketplace-offers/dto/
grep -n "visibilityScope" apps/frontend/src/app/\(dashboard\)/seller/marketplace-offers/\[id\]/page.tsx
grep -n "attachBatch\|detachBatch" apps/frontend/src/lib/marketplace-offers.ts
pnpm --filter @iox/backend test src/marketplace-offers 2>&1 | tail -20
pnpm --filter @iox/frontend test marketplace-offers 2>&1 | tail -20
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -5
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -5
```

---

## Pre-flight checks (avant LOT 1)

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git status --short
git log --oneline -1 main                                               # → 4250db2
git rev-parse --short mp-notif-2-emaillog-and-resend-flag                # → 9a12880
git rev-parse --short mp-notif-2-unsubscribe                             # → 2aa40d7
git rev-parse --short mp-notif-2-rfq-status-transitions                  # → 1b8533b
git stash list                                                           # → vide
pnpm install --frozen-lockfile 2>&1 | tail -3
pnpm --filter @iox/backend exec prisma generate 2>&1 | tail -3
docker compose ps 2>&1 | head -5
```

Tout vert → démarrer LOT 1. Sinon STOP + handoff.

---

## Format du rapport final attendu (`notes/handoff-megamandat-20.md`)

```
# Méga-mandat 20 — handoff

## TL;DR
- LOT 1 BUYER-DASHBOARD-1 : ✅ / 🟡 / ❌ — N commits, M specs (backend X, frontend Y)
- LOT 2a MP-NOTIF-3 unsubscribe page : ✅ / 🟡 / ❌ — ...
- LOT 2b MP-NOTIF-3 EmailLog admin : ✅ / 🟡 / ❌ — ...
- LOT 3 MP-OFFER-EDIT-2 : ✅ / 🟡 / ❌ — ...
- main intact : oui (4250db2)
- Branches mandat 19 intactes : oui (SHAs identiques au pré-flight)

## Branches livrées
- buyer-dashboard-1-quote-requests (HEAD: ...)
- mp-notif-3-unsubscribe-page (HEAD: ...)
- mp-notif-3-emaillog-admin (HEAD: ...) [parent: mp-notif-2-emaillog-and-resend-flag]
- mp-offer-edit-2-visibility-and-batches (HEAD: ...)

## Topologie finale (à dessiner)
[ASCII tree avec les bonnes parents]

## LOT 1 — preuves brutes
[recopier sortie des 8 commandes]

## LOT 2a — preuves brutes
[recopier sortie des 5 commandes]

## LOT 2b — preuves brutes
[recopier sortie des 9 commandes]

## LOT 3 — preuves brutes
[recopier sortie des 9 commandes]

## Blocages rencontrés
[liste exhaustive — notamment si endpoint ProductBatch list pour LOT 3 n'existait pas]

## Notes pour push cascade
- ordre suggéré (la cascade mandat 19 doit précéder LOT 2b !)
  1. cascade #20 mandat 19 (PR #24 #25 #26)
  2. cascade #21 mandat 20 (PR #27 buyer + PR #28 unsubscribe-page + PR #29 emaillog-admin + PR #30 offer-edit-2)
- ordre rebase : LOT 2b doit être rebasé --onto main APRÈS merge mandat 19 LOT 1.
- env vars VPS si Resend activé : RESEND_API_KEY (LOT 1 mandat 19), UNSUBSCRIBE_JWT_SECRET (LOT 2 mandat 19).
- smoke tests post-deploy : /buyer/quote-requests render, /unsubscribe?token=... pretty page, /admin/notif-email/logs admin only, /seller/marketplace-offers/:id visibility select fonctionne.
```

---

## TL;DR pour Claude Code

4 sous-branches (1 + 2a + 2b + 3) en 8h, structure non-linéaire à respecter (2b part de mandat 19, les autres chaînées sur main). Aucune migration Prisma. Aucun envoi externe. Si tu doutes, tu STOPpes et tu documentes. À mon retour je vérifie tout via grep / git log / inspection topologie git.
