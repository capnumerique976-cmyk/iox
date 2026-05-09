# Méga-mandat Claude Code — Run autonome 6h LOCAL UNIQUEMENT

> **Usage** : à coller tel quel dans Claude Code juste avant que l'utilisateur sorte. Lot long, multi-étapes, **strictement local**.
> **Pré-requis (à vérifier en premier, stop si non remplis)** :
>
> - être sur la machine où le repo IOX est cloné ;
> - working tree clean ;
> - branche courante `fp-4-seasonality-seller-input` ;
> - `pnpm install --frozen-lockfile` doit fonctionner sans erreur réseau.

---

## Contexte canonique IOX (rappel concis — voir `docs-projet/13-contexte-canonique-marketplace.md` pour la version intégrale)

IOX = "Indian Ocean Xchange". Plateforme B2B marketplace + socle MCH. Stack : monorepo pnpm + Turbo, NestJS + Prisma 5 + PostgreSQL, Next.js (App Router), controlled state (pas de react-hook-form).

**Cinq invariants à respecter dans tout ce mandat** :

1. `MarketplaceProduct` ≠ `MarketplaceOffer` ≠ `SellerProfile`. Product = ce que c'est, Offer = comment c'est vendu maintenant, Seller = qui le vend.
2. **Projection publique filtrée**. Un nouveau champ n'apparaît pas en public sans projection explicite côté `marketplace-catalog`.
3. **Statuts marketplace** (DRAFT, IN_REVIEW, APPROVED, PUBLISHED…) ≠ **statuts MCH internes** (`market_status` : not_released, released, blocked). Toujours préciser sur quelle couche tu agis.
4. **`FP-x` ≠ `Lot X`**. FP = sous-série marketplace. Lot = chantier macro plateforme.
5. **Seller = rôle marketplace**, pas synonyme automatique de bénéficiaire MCH terrain.

## État avant ce mandat

- Branche `main` (origin/main) = Lot-8, Lot-9, FP-1, FP-2.
- Branche locale `fp-3-seller-self-edit` (depuis main) : 3 commits, **non poussée**, verte.
- Branche locale `fp-4-seasonality-seller-input` (depuis fp-3) : 4 commits, **non poussée**, verte. **Branche courante**.
- Tests : backend 450/450, frontend 117/117, lint clean, tsc clean.
- `gh` CLI installé et authentifié, mais **interdit d'usage dans ce mandat**.
- Repo distant : `git@github.com:capnumerique976-cmyk/iox.git`. **TU N'Y TOUCHES PAS.**

## Mandat global

Empiler localement **jusqu'à 3 nouveaux lots** par-dessus l'existant, en branches chaînées, sans jamais pousser, sans PR, sans merge sur origin. Au retour de l'utilisateur, il lira ton handoff et décidera lui-même quoi pousser.

Ordre strict :

```
fp-4-seasonality-seller-input  (existante)
        │
        ▼
fp-2-1-seller-certifications-edition   ← LOT 1 du mandat
        │
        ▼
fp-3-1-seller-media-uploader           ← LOT 2 du mandat (si lot 1 fini propre)
        │
        ▼
fp-6-product-fine-origin               ← LOT 3 du mandat (si lots 1+2 finis propres)
```

Tu pars **toujours depuis la branche précédente**, jamais depuis main. Ainsi chaque branche contient toutes les précédentes, ce qui te permet d'enchaîner tests et code sans rebase intermédiaire.

## ❌ Règles absolues — interdictions strictes

- **AUCUN `git push`** vers origin, jamais. Même `--dry-run` interdit (ça contacte le serveur).
- **AUCUN `gh pr create`**, **AUCUN `gh pr merge`**, **AUCUN `gh pr ...`** quoi que ce soit.
- **AUCUN `git fetch origin`** ni `git pull` : on travaille hors-ligne sur main local fixé à son état actuel.
- **AUCUN merge automatique sur main local** : main local doit rester intact à son hash actuel pendant tout le mandat.
- **AUCUN force-push** local non plus (sauf rebase strictement nécessaire dans une branche locale et abandonnée si conflit non trivial).
- **AUCUN nouveau dépôt npm/pnpm** ajouté sans justification écrite et validée par toi-même dans le commit message.
- **AUCUNE migration Prisma destructive** : drop column, drop table, rename non réversible. Migrations additives uniquement, et **uniquement si nécessaire** pour le périmètre spec.
- **AUCUNE refacto large opportuniste** : tu touches uniquement ce qui est strictement nécessaire à chaque lot.
- **AUCUN bypass de CI** : `pnpm lint && pnpm typecheck && pnpm test` doit rester vert à chaque commit.

## ✅ Règles absolues — obligations

- Conventional commits : `feat(scope): ...`, `feat(backend|frontend|marketplace): ...`, `docs(scope): ...`, `test(scope): ...`, `chore(notes): ...`.
- Commits atomiques par sous-étape logique (ex. : "feat(backend): add X endpoint", puis "feat(frontend): wire UI for X", puis "test(...): cover X").
- Préserver les workflows seller / admin / public existants.
- Penser systématiquement seller / admin / public lors de toute évolution marketplace.
- Préserver FP-1, FP-2, FP-3, FP-4 (déjà livrés) — aucune régression sur les pages `/seller/profile/edit`, `/seller/marketplace-products[/...]`, `/marketplace`, `/admin/review-queue`.
- Quand tu proposes un modèle ou un lot, expliciter dans le commit / la doc :
  - quels champs relèvent de `SellerProfile`
  - quels champs relèvent de `MarketplaceProduct`
  - quels champs relèvent de `MarketplaceOffer`
  - ce qui est public
  - ce qui reste seller/admin only
  - comment cela s'articule avec les statuts marketplace et les gates métier MCH

## Méthodologie de travail (à appliquer à chaque lot)

1. **Lire avant de coder.** Avant chaque lot, lire 5–10 minutes les fichiers du périmètre, écrire un mini-plan dans `notes/<branche>-plan.md` (max 30 lignes), commit `chore(notes): plan <branche>`.
2. **Boucle courte.** Modifier → typecheck → test ciblé → commit. Pas de gros commits fourre-tout.
3. **Santé fréquente.** Lancer la suite complète au minimum :
   - après chaque sous-étape majeure,
   - avant de changer de branche / de lot,
   - en tout dernier avant de t'arrêter.
4. **Si un test pré-existant casse à cause de toi**, corrige-le avant de continuer. Si un test pré-existant était déjà rouge avant ton intervention, ne le touche pas et note-le dans le handoff.

Commandes santé :

```bash
pnpm install --frozen-lockfile
pnpm --filter @iox/backend  exec tsc --noEmit
pnpm --filter @iox/backend  test
pnpm --filter @iox/frontend exec tsc --noEmit
pnpm --filter @iox/frontend exec next lint
pnpm --filter @iox/frontend exec vitest run
```

---

## LOT 1 — FP-2.1 — Édition certifications par seller

### Branche

```bash
git checkout fp-4-seasonality-seller-input
git checkout -b fp-2-1-seller-certifications-edition
```

### Contexte du lot

- Backend FP-2 entièrement câblé. Modèle `Certification` polymorphe (`relatedType` ∈ `SELLER_PROFILE | MARKETPLACE_PRODUCT`), service, controller `marketplace/certifications` avec CRUD seller + endpoints verify/reject staff + projection publique.
- `MARKETPLACE_SELLER` est dans `SELLER_ROLES` du controller : il a déjà le droit `POST/PATCH/DELETE` sur `/marketplace/certifications`.
- Frontend FP-2 partiel : `CertificationBadgeList.tsx` (affichage public uniquement). Helper API absent. Pas de page seller pour gérer ses certifications.

### Périmètre

#### Page 1 — Certifications du SellerProfile

Route : `/seller/profile/certifications`

- Lister les certifs du `SellerProfile` du seller connecté (résolu via `findMine`).
- Pour chaque certif : afficher type (libellé FR), `issuingBody`, `code`, `validFrom`, `validUntil`, `verificationStatus` (badge PENDING/VERIFIED/REJECTED/EXPIRED — `EXPIRED` calculé côté UI à partir de `validUntil < now()`), motif de rejet.
- Action "Ajouter une certification".
- Action "Modifier" sur chaque ligne.
- Action "Supprimer" avec confirmation destructive (réutiliser le composant Lot-9 L9-2).
- Banner d'avertissement : "Modifier ou supprimer une certification VERIFIED la repasse en PENDING (revérification staff requise)."
- Lien retour vers `/seller/profile/edit`.

#### Page 2 — Certifications d'un MarketplaceProduct

Route : `/seller/marketplace-products/[id]/certifications`

Mêmes fonctionnalités, scope `MARKETPLACE_PRODUCT` avec `relatedId = [id]`. Hints clairs sur 403/404 (miroir FP-4 seasonality).

#### Composant partagé `SellerCertificationsManager`

Composant unique paramétré par `relatedType` + `relatedId`. Liste + état chargement / vide / erreur, formulaire création / édition (champs : `type` select sur `CertificationType` enum, `issuingBody`, `code`, `issuedAt`, `validFrom`, `validUntil`), validation client miroir backend (au minimum `type` requis ; `validUntil >= validFrom` si les deux fournis), gestion erreurs serveur par champ.

**Pas de `documentMediaId` dans ce lot.** Différé à FP-3.1 ou plus tard. Documenter ce choix.

#### Helper API frontend

Créer ou compléter selon le pattern existant (cf. `apps/frontend/src/lib/seller-profiles.ts` pour pattern de référence) :

- `list({ relatedType, relatedId })` → GET `/marketplace/certifications?relatedType=...&relatedId=...`
- `create(payload)` → POST `/marketplace/certifications`
- `update(id, payload)` → PATCH `/marketplace/certifications/:id`
- `remove(id)` → DELETE `/marketplace/certifications/:id`

Types alignés sur le DTO backend : lire `apps/backend/src/marketplace-certifications/dto/marketplace-certification.dto.ts` avant d'écrire.

#### Liens d'accès

- Sur `/seller/profile/edit`, lien "Gérer mes certifications" → `/seller/profile/certifications`.
- Sur `/seller/marketplace-products` (page index FP-4), colonne ou lien "Certifications" par ligne, à côté de "Saisonnalité".
- Optionnel : QuickLink dans Raccourcis du dashboard seller.

### Périmètre exclu (FP-2.1)

- Pas d'upload PDF justificatif (déféré à FP-3.1).
- Pas d'UI staff verify/reject (déjà fait).
- Pas de modification du composant public `CertificationBadgeList.tsx`.
- Pas de support `MARKETPLACE_OFFER` (hors MVP, cf. contexte canonique).

### Tests attendus FP-2.1

Frontend (vitest) :

- `SellerCertificationsManager` : rendu liste vide, rendu liste pleine, ouverture formulaire création, validation client (`type` requis, `validUntil >= validFrom`), submit OK, submit erreur 4xx avec mapping, suppression avec confirmation.
- Page `/seller/profile/certifications` : hints 404/409 sur `findMine`, banner d'avertissement présent.
- Page `/seller/marketplace-products/[id]/certifications` : hints 403/404, banner d'avertissement présent.

Pas de nouveau test backend (service déjà couvert).

Cible : **+10 à +15 tests vitest** (passer de 117 à ~130).

### Doc FP-2.1

Créer `docs/marketplace/MARKETPLACE_CERTIFICATIONS.md` (vue d'ensemble FP-2 + FP-2.1) ou compléter `docs/marketplace/SELLER_PROFILE.md` si plus cohérent. **Documenter explicitement** l'omission de `documentMediaId` du formulaire seller.

---

## LOT 2 — FP-3.1 — Inline media uploader logo / bannière (sur `/seller/profile/edit`)

### Pré-conditions pour démarrer

- LOT 1 (FP-2.1) doit être terminé, vert, commité sur `fp-2-1-seller-certifications-edition`.
- Si LOT 1 a été abandonné ou n'a pas été terminé proprement, **ne pas démarrer LOT 2**, passer directement à la phase d'arrêt et handoff.

### Branche

```bash
git checkout fp-2-1-seller-certifications-edition
git checkout -b fp-3-1-seller-media-uploader
```

### Contexte du lot

- `SellerProfile.logoMediaId` et `SellerProfile.bannerMediaId` existent déjà dans le schéma Prisma (cf. lignes 912-913 de `prisma/schema.prisma`).
- Backend `media-assets` existe (`apps/backend/src/media-assets/`). Il faut vérifier s'il expose déjà un endpoint d'upload utilisable depuis le seller (probablement oui — lire `media-assets.controller.ts` avant de coder).
- Côté frontend, `/seller/profile/edit` (livré en FP-3) traite `logoMediaId` et `bannerMediaId` en **read-only** — il faut câbler un uploader inline qui uploade le fichier puis attribue l'ID au profil via le PATCH `/me`.

### Périmètre

#### Backend

- **Pas de nouveau endpoint** si `media-assets` couvre déjà l'upload pour un `MARKETPLACE_SELLER`. Si non couvert, ajouter un endpoint minimal `POST /media-assets` accessible au seller, avec contrôle MIME (image only : png, jpg, webp), taille max (cap 5 MB), et association optionnelle à un `relatedType + relatedId` (sinon `SELLER_PROFILE` + `relatedId = sellerProfileId` par défaut).
- Enregistrement immédiat avec `moderationStatus = PENDING` (cf. enum `MediaModerationStatus`).

#### Frontend

- Composant `InlineMediaUploader` réutilisable (input file + preview + bouton "Téléverser").
- Intégration dans `/seller/profile/edit` pour `logoMediaId` (role LOGO) et `bannerMediaId` (role BANNER).
- Flux : sélection fichier → POST `/media-assets` → récupération de l'`id` → PATCH `/marketplace/seller-profiles/me` avec `logoMediaId` ou `bannerMediaId`.
- Preview de l'image courante via une URL dérivée du media (pattern existant à respecter — lire comment `CertificationBadgeList` ou autres composants accèdent aux médias).
- Gestion d'erreur claire (fichier trop gros, MIME refusé, network).

### Périmètre exclu (FP-3.1)

- Pas de gestion de galerie (juste logo + bannière).
- Pas de crop / redimensionnement côté client.
- Pas d'upload pour les certifs (resté différé).
- Pas de modification de la modération admin (les uploads passent en PENDING comme prévu).

### Tests attendus FP-3.1

Frontend :

- `InlineMediaUploader` : rendu, sélection fichier, preview, validation MIME/taille côté client, submit OK, submit erreur.
- Page `/seller/profile/edit` : présence des deux uploaders (logo, bannière), upload simulé met à jour `logoMediaId` après PATCH.

Backend (uniquement si nouveau endpoint) :

- POST OK avec image valide.
- Refus MIME non image.
- Refus taille > 5 MB.
- 403 si role insuffisant.

Cible : **+8 à +12 tests** au total (mix back+front selon ce qui est ajouté).

### Doc FP-3.1

Compléter `docs/marketplace/SELLER_PROFILE.md` avec section FP-3.1 (uploader inline, contrats, limites).

---

## LOT 3 — FP-6 — Origine fine produit

### Pré-conditions pour démarrer

- LOTS 1 et 2 doivent être terminés, verts, commités sur leurs branches respectives.
- Si l'un des deux a été abandonné, **ne pas démarrer LOT 3**, passer à la phase d'arrêt et handoff.

### Branche

```bash
git checkout fp-3-1-seller-media-uploader
git checkout -b fp-6-product-fine-origin
```

### Contexte du lot

La fiche produit v2 (cf. `docs-projet/11-fiche-produit-seller-v2.md`) demande :

- `originLocality` (terroir / commune précise)
- `altitude` (mètres)
- `gpsCoordinates` (point géographique)

Aucun de ces 3 champs n'existe actuellement sur `MarketplaceProduct`.

### Périmètre

#### Migration Prisma

Ajouter sur `MarketplaceProduct` (modèle déjà existant) **3 colonnes nullables** (additif, non destructif) :

- `origin_locality` : `String?`
- `altitude_meters` : `Int?` (entier, max raisonnable)
- `gps_lat` : `Decimal?` (precision ~10, scale 7)
- `gps_lng` : `Decimal?` (precision ~10, scale 7)

Préférer `gps_lat` + `gps_lng` séparés à un JSON ou Point PostGIS (KISS pour le MVP, indexable simplement, sérialisation native côté Prisma).

Migration :

```bash
pnpm db:migrate -- --name add_marketplace_product_fine_origin
```

Vérifier que la migration générée est bien additive (que des `ALTER TABLE ... ADD COLUMN`, pas de DROP).

#### Backend

- Étendre `UpdateMarketplaceProductDto` avec ces 4 champs nullables.
- Validation : `altitudeMeters >= -500 && <= 9000`, `gpsLat ∈ [-90, 90]`, `gpsLng ∈ [-180, 180]`.
- Étendre la projection publique côté `marketplace-catalog` pour exposer ces champs (origin fine = info commerciale légitime côté public).
- Étendre les tests unitaires service.

#### Frontend

- Étendre la fiche produit publique `/marketplace/products/[slug]` pour afficher l'origine fine si présente (sans casser le rendu actuel si absente).
- Pas d'écran seller dédié pour ce lot — l'édition se fera via la fiche produit complète (qui sera traitée dans un futur lot FP-x). Ce qui est attendu ici : que les champs **soient disponibles backend + projetés public** pour préparer le terrain.

### Périmètre exclu (FP-6)

- Pas de carte interactive côté public (juste affichage textuel coord + altitude).
- Pas d'écran d'édition seller dédié à l'origine (futur lot).
- Pas de validation géographique avancée (pas de check que les coord tombent dans le pays déclaré, par exemple).

### Tests attendus FP-6

Backend :

- DTO accepte/refuse les bornes attendues.
- Service propage correctement les nouveaux champs.
- Projection publique inclut les champs si présents, vides sinon.

Frontend :

- Fiche produit publique affiche les nouveaux champs si fournis, n'affiche rien si absents (test sur les deux variantes).

Cible : **+6 à +10 tests** au total.

### Doc FP-6

Créer `docs/marketplace/MARKETPLACE_PRODUCT_ORIGIN.md` avec : motivation, schéma, validation, exposition publique.

---

## Critères d'arrêt (s'arrêter dès que l'une de ces conditions est remplie)

- Les 3 lots du mandat sont terminés et verts.
- Tu détectes un blocage majeur qui demande arbitrage humain (cf. ci-dessous).
- Tu as fait **deux blocages majeurs consécutifs** sur deux lots différents.
- Le temps total écoulé approche **6 heures**.
- Tu as commencé un lot et constaté qu'il déborde son périmètre annoncé : **réduis le scope**, livre un sous-lot propre, passe au suivant ou stoppe.

## Gestion des blocages

- **Blocage mineur** (libellé ambigu, comportement UX secondaire, nom de champ) : décision la plus conservatrice + documentation dans commit/handoff + continuer.
- **Blocage majeur** (modèle incompatible, dépendance manquante non triviale, conflit d'architecture, sécurité non claire) : arrêter le sous-lot en cours, revenir à un état vert (revert si nécessaire), documenter dans handoff, passer au sous-lot suivant ou aux lots suivants si pertinent.
- **Ne jamais rester bloqué silencieusement** plus de **30 minutes de travail effectif** sans résultat sur la même piste.
- **Si la migration FP-6 ne s'applique pas localement** (Prisma error, DB pas dispo) : skipper FP-6 entièrement, le marquer comme "non démarré, raison" dans le handoff. Ne pas inventer de migration manuelle.

## État de sortie attendu (avant de rendre la main)

1. Être sur **une branche nommée explicitement**, à un commit vert (`pnpm lint && pnpm typecheck && pnpm test` tous OK sur les deux apps).
2. **Aucun push, aucun merge, aucune action sur origin** (vérifier avec `git remote -v` que rien n'a été tenté ; le `git log @{u}..HEAD` doit montrer N commits non poussés sur la branche courante, et les branches précédentes doivent être intactes).
3. **`main` local** doit être strictement au même hash qu'au début du mandat. Vérifier : `git log -1 main` doit montrer `38f5f6b docs(marketplace): FP-4 saisonnalité seller + handoff session 2026-04-26` — ou le hash courant tel qu'il était avant ton mandat.
4. Avoir produit `notes/handoff-<YYYY-MM-DD>-mega-mandat.md` à la racine du repo (sous `notes/`) contenant :
   - **Branches créées** et leur état (vert / partiel / abandonné), avec la chaîne de dépendance.
   - **Lots terminés**, lots partiels, lots abandonnés, avec raison.
   - **Décisions prises seul** et leur justification.
   - **Blocages rencontrés** et pistes d'arbitrage pour l'utilisateur.
   - **Liste des commits par branche** (titre + hash court).
   - **Commandes exactes à lancer pour reprendre** (`git checkout ...`, `pnpm install`, `pnpm dev`, etc.).
   - **Check-list de ce que l'utilisateur doit re-vérifier en priorité** à son retour (sécurité, permissions, UX critique, smoke tests).
   - **Plan de push/PR/merge proposé** à l'utilisateur (séquence des branches à pousser, dans quel ordre, quelles PR créer, sans le faire toi-même).
5. Working tree **clean** sur la dernière branche active.

## Commande de vérification finale (à lancer juste avant de t'arrêter)

```bash
# Confirmer qu'aucun push n'a eu lieu
git remote -v                                  # listing only, ne pas fetch
git log -1 main                                # main local intact

# Confirmer la santé de la dernière branche
pnpm install --frozen-lockfile
pnpm --filter @iox/backend  exec tsc --noEmit
pnpm --filter @iox/backend  test
pnpm --filter @iox/frontend exec tsc --noEmit
pnpm --filter @iox/frontend exec next lint
pnpm --filter @iox/frontend exec vitest run

# Confirmer working tree clean
git status
```

Si tout est vert et clean : commit final `docs(notes): handoff méga-mandat 6h` et arrêt.

## Rappel final

- **Prudence > vitesse.**
- **Petits lots verts > gros lot rouge.**
- **En cas de doute, livre moins mais propre.**
- **Aucune communication avec origin, jamais.**
- **`main` local ne bouge pas.**
