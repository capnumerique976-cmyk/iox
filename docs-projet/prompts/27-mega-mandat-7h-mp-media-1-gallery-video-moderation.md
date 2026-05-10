# Méga-mandat 7h LOCAL-ONLY — MP-MEDIA-1 (galerie + vidéo + modération)

> Coller dans Claude Code pour run autonome ~7h. **Aucun push, deploy, gh, ssh, envoi externe.**
>
> **Pré-requis (STOP si non remplis)** :
> - chemin `/Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox`
> - working tree clean (untracked autorisés : `docs-projet/`, `notes/`)
> - `main` à `1b490c8` (mandat 22 mergé)
> - `git stash list` vide
> - `git branch | wc -l` = 2

Si pas vert → STOP + `notes/handoff-megamandat-27-stop.md`.

---

## Garde-fous anti-hallucination

User absent ~7h. Toute invention détectée par grep / git log / pnpm test à retour.

1. Toujours vérifier sur disque (`ls`, `cat`, `git status`) avant marquer fini
2. Jamais inventer output / test passant / fichier créé. Si commande échoue, rapport erreur brute.
3. Fin chaque lot, recopier output réel des preuves dans handoff.
4. Si tu détectes invention → STOP, revert, doc, passe au suivant.

Mandats 9/11/13/14/15/17/19/20 ont prouvé que ça marche.

---

## Contexte canonique IOX (rappel)

Stack : monorepo pnpm + Turbo, NestJS + Prisma + PostgreSQL, Next.js App Router, controlled state, conventional commits, migrations Prisma additives.

5 invariants : Product ≠ Offer ≠ SellerProfile / projection publique filtrée / statuts marketplace ≠ MCH / FP ≠ Lot ≠ MP / Seller = `MARKETPLACE_SELLER`.

---

## État avant ce mandat

- main = `1b490c8` (30 lots marketplace, marketplace démontrable end-to-end)
- VPS aligné, base peuplée (4 sellers, 8 produits, 8 offres, smoke-seller + smoke-buyer).
- Storage MinIO bucket `iox-documents` opérationnel.
- `MediaAssetType` enum supporte `IMAGE / ILLUSTRATION / VIDEO`.
- `MediaAssetRole` enum : 9 rôles (`PRIMARY / GALLERY / PACKAGING / LABEL / LOT / ORIGIN / MARKETING / LOGO / BANNER`).
- Backend `/api/v1/marketplace/media-assets` câblé : list / public / :id / :id/url / upload / patch / set-primary / approve / reject / delete.
- Frontend `InlineMediaUploader` (FP-3.1, MP-EDIT-PRODUCT.3-light) — utilisé pour LOGO / BANNER seller + PRIMARY produit. **1 média par emplacement**, **images uniquement**, max 5 MB.

**Manques V1 actuels** (à combler par ce mandat) :
- Galerie produit (multi-images role=GALLERY) : DB OK, UI absente.
- Vidéo produit (role=GALLERY mediaType=VIDEO) : DB OK, UI absente, bornes vidéo absentes côté backend.
- Modération admin média : endpoints OK (approve/reject), page admin absente.
- Endpoint reorder : absent.

---

## Mandat global

3 lots branches chaînées strictement locales par-dessus main.

```
main (1b490c8, intact)
   │
   ▼
mp-media-1-gallery-product             ← LOT 1
   │
   ▼
mp-media-1-video-product               ← LOT 2 (si LOT 1 vert)
   │
   ▼
mp-media-1-moderation-admin            ← LOT 3 (si LOT 2 vert)
```

Si lot capote → garder branche en l'état, passer au suivant en partant de la branche précédente verte (ou main), documenter.

---

## Règles absolues — interdictions

- AUCUN `git push`, `gh`, `git fetch origin`, `git pull`.
- AUCUN merge sur main local. Main reste à `1b490c8`.
- AUCUN deploy / ssh / VPS.
- AUCUN force-push.
- AUCUN traitement vidéo serveur-side V1 (pas de ffmpeg backend pour thumbnail). Thumbnails côté client capture frame via canvas.
- AUCUNE installation système (`brew`, `apt`).

## Exigences techniques transverses

- Migrations Prisma strict additives. Ce mandat n'en exige PAS (modèle MediaAsset déjà complet).
- Conventional commits : `feat(media)`, `feat(marketplace)`, `feat(frontend)`, `test(media)`, `chore(media)`, `docs(media)`.
- TypeScript strict : pas de `any`, casts justifiés en commentaire.
- DTOs class-validator : whitelist + forbidNonWhitelisted.
- Tests : chaque feature backend a `.spec.ts`, chaque page frontend a `.test.tsx`. Cible jest backend + vitest frontend = vert intégral pour nouveaux specs.
- Logs : `Logger` Nest, jamais `console.log`.
- i18n : textes UI FR uniquement.
- Controlled state : pas de react-hook-form. `useState`.

---

## LOT 1 — Galerie images produit (multi + reorder + delete) — 2h30

**Branche** : `mp-media-1-gallery-product` à partir de `main`.

**Objectif** : permettre au seller d'attacher plusieurs images de galerie à son produit (en plus du PRIMARY), réordonner par drag-handle, supprimer.

### 1.1 Backend — endpoint reorder

Ajouter `PATCH /api/v1/marketplace/media-assets/reorder` :
- DTO `ReorderMediaAssetsDto` : `items: { id: string; sortOrder: number }[]` (validation `@IsArray @ArrayMinSize(1) @ArrayMaxSize(50)` + valider chaque entrée UUID + sortOrder positif).
- Permissions : ADMIN, COORDINATOR, SELLER (ownership : tous les media doivent appartenir au même `relatedId` dont le seller est propriétaire).
- Service `MediaAssetsService.reorder(items, actor)` : transaction Prisma `$transaction(items.map(i => prisma.mediaAsset.update({ where: { id: i.id }, data: { sortOrder: i.sortOrder } })))`.
- Audit log : `MEDIA_ASSETS_REORDERED` avec `relatedType + relatedId + count`.
- Tests : 4 specs (happy path, ownership rejet, items < 1 → 400, items > 50 → 400).

### 1.2 Backend — bornes upload galerie

Vérifier que `POST /upload` accepte `role=GALLERY` sans restriction. Si non, ajouter dans le service. Tests : 2 specs (upload role=GALLERY OK, count GALLERY illimité par produit V1 — V2 pourra capper à 10).

### 1.3 Frontend — composant `ProductGalleryUploader`

Créer `apps/frontend/src/components/marketplace/ProductGalleryUploader.tsx` :
- Props : `productId`, `sellerProfileId` (pour ownership), `existingMedia: MediaAsset[]`, `onChange()`.
- Affiche grille (thumbnail + sortOrder badge).
- Bouton "Ajouter une photo" → multi-file picker (jusqu'à 5 simultanément).
- Drag-reorder via HTML5 drag-and-drop natif (pas de lib externe — controlled state).
- Bouton suppression sur chaque tuile (avec confirm dialog).
- Validation client miroir backend (MIME jpeg/png/webp + 5 MB par image).
- États : idle / uploading (X/N) / error.

### 1.4 Frontend — intégration page seller produit

Étendre `apps/frontend/src/app/(dashboard)/seller/marketplace-products/[id]/page.tsx` :
- Ajouter section "Galerie" sous la section image principale.
- Charge les MediaAsset filtrés `relatedType=MARKETPLACE_PRODUCT relatedId=productId role=GALLERY` triés par `sortOrder`.
- Passe au composant + callback refetch après upload/reorder/delete.

### 1.5 Frontend — affichage public

Étendre `apps/frontend/src/app/marketplace/products/[slug]/page.tsx` :
- Section "Galerie" sous la zone hero.
- Display grille thumbnails (modérés APPROVED uniquement).
- Click image → lightbox simple (composant léger natif, pas de lib).

### 1.6 Helper API frontend

Étendre `apps/frontend/src/lib/marketplace-media-assets.ts` :
- `reorder(items, token)` → `PATCH /reorder`.
- Helper `MEDIA_GALLERY_MAX_PER_PRODUCT = 20` (limite UI client V1 — backend illimité).

### 1.7 Tests

- Backend : `media-assets.service.spec.ts` étendu (+4 reorder specs, +2 GALLERY upload specs).
- Backend : `media-assets.controller.spec.ts` (+1 reorder happy path).
- Frontend : `ProductGalleryUploader.test.tsx` (+5 specs : rendu vide, upload 3 fichiers, reorder drag, delete + confirm, error MIME).
- Frontend : page seller produit étendue (+2 specs : section galerie présente, refetch après action).

### 1.8 Preuves anti-hallucination LOT 1

```
git log --oneline main..mp-media-1-gallery-product
git diff main..mp-media-1-gallery-product --stat
grep -n "reorder" apps/backend/src/media-assets/media-assets.controller.ts
grep -n "reorder" apps/backend/src/media-assets/media-assets.service.ts
ls apps/frontend/src/components/marketplace/ProductGalleryUploader*
grep -n "ProductGalleryUploader" apps/frontend/src/app/\(dashboard\)/seller/marketplace-products/\[id\]/page.tsx
pnpm --filter @iox/backend test src/media-assets 2>&1 | tail -10
pnpm --filter @iox/frontend test ProductGallery 2>&1 | tail -10
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -3
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
```

---

## LOT 2 — Vidéo produit — 2h30

**Branche** : `mp-media-1-video-product` à partir de `mp-media-1-gallery-product`.

**Objectif** : permettre au seller d'attacher 1 vidéo (max V1) à son produit. Mediatype VIDEO, role GALLERY (ou nouveau role VIDEO ? non, pas de migration, on réutilise GALLERY + filtre côté UI sur mediaType).

### 2.1 Backend — extension MIME + bornes vidéo

Étendre `apps/backend/src/media-assets/media-assets.service.ts` :
- `MEDIA_VIDEO_MAX_BYTES = 50 * 1024 * 1024` (50 MB).
- `MEDIA_ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime']`.
- Service `upload` : si MIME `video/*` → set `mediaType = VIDEO`, vérifier taille ≤ 50 MB, sinon throw `BadRequestException("Vidéo > 50 MB")`.
- Si MIME `image/*` → set `mediaType = IMAGE` (comportement actuel).
- Sinon (illustration / autre) → reject 400.
- Tests : 4 specs (upload mp4 OK, upload webm OK, upload trop grand → 400, upload mime non autorisé → 400).

### 2.2 Backend — DTO upload validation

Étendre DTO multipart pour inclure `mediaType` optionnel calculé serveur-side (pas client-confirmé). Vérifier qu'on n'expose pas une faille permettant à un client de marquer un fichier image en VIDEO.

### 2.3 Frontend — composant `ProductVideoUploader`

Créer `apps/frontend/src/components/marketplace/ProductVideoUploader.tsx` :
- Props : `productId`, `currentVideo: MediaAsset | null`, `onUploaded()`, `onDeleted()`.
- Single-file picker (1 vidéo max V1).
- Validation client : MIME video/mp4|webm|quicktime + ≤ 50 MB.
- Preview html5 `<video controls>` après sélection (objectURL local) avant upload.
- Upload avec barre de progression (XHR `progress` ou fetch + ReadableStream).
- Affichage vidéo actuelle si présente : player + bouton "Remplacer" + "Supprimer".
- États : idle / preview / uploading (% progress) / success / error.

### 2.4 Frontend — helper API extension

Étendre `apps/frontend/src/lib/marketplace-media-assets.ts` :
- Export `MEDIA_VIDEO_MAX_BYTES = 50 * 1024 * 1024`.
- Export `MEDIA_ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime'] as const`.
- Helper `validateVideoFile(file)` (miroir backend).

### 2.5 Frontend — intégration page seller produit

Sur `marketplace-products/[id]/page.tsx`, ajouter section "Vidéo" sous la galerie. Charge la vidéo unique du produit (filter `mediaType=VIDEO`), passe au composant. V1 = 1 vidéo max, donc remplace au lieu d'ajouter si une existe déjà (DELETE puis POST côté frontend, ou message d'avertissement).

### 2.6 Frontend — affichage public fiche produit

Sur `apps/frontend/src/app/marketplace/products/[slug]/page.tsx`, ajouter player vidéo si présent (sous galerie images). HTML5 `<video controls preload="metadata">` (pas d'autoplay V1, économie data).

### 2.7 Tests

- Backend : `media-assets.service.spec.ts` (+4 specs vidéo).
- Frontend : `ProductVideoUploader.test.tsx` (+5 specs : rendu vide, preview, upload OK + progress, error MIME, error taille).
- Frontend : page seller produit (+2 specs : section vidéo présente, replace existing).
- Frontend : page publique produit (+1 spec : player rendu si vidéo présente).

### 2.8 Preuves anti-hallucination LOT 2

```
git log --oneline mp-media-1-gallery-product..mp-media-1-video-product
git diff mp-media-1-gallery-product..mp-media-1-video-product --stat
grep -n "MEDIA_VIDEO_MAX_BYTES\|MEDIA_ALLOWED_VIDEO_MIMES\|video/mp4" apps/backend/src/media-assets/
grep -n "MEDIA_VIDEO_MAX_BYTES\|video/mp4" apps/frontend/src/lib/marketplace-media-assets.ts
ls apps/frontend/src/components/marketplace/ProductVideoUploader*
pnpm --filter @iox/backend test src/media-assets 2>&1 | tail -10
pnpm --filter @iox/frontend test ProductVideo 2>&1 | tail -10
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -3
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
```

---

## LOT 3 — Modération admin média — 2h

**Branche** : `mp-media-1-moderation-admin` à partir de `mp-media-1-video-product`.

**Objectif** : exposer côté admin une vue de modération des MediaAsset PENDING avec actions approve / reject (raison).

### 3.1 Backend — extension list endpoint

Étendre `GET /marketplace/media-assets` avec filtres :
- `?moderationStatus=PENDING|APPROVED|REJECTED` (multi via CSV).
- `?relatedType=MARKETPLACE_PRODUCT|SELLER_PROFILE|...`.
- `?mediaType=IMAGE|VIDEO`.
- Pagination existante conservée.
- Permissions : ADMIN, COORDINATOR pour voir tous PENDING. SELLER ne voit que ses propres médias (déjà câblé).

Endpoints `/approve` et `/reject` existent déjà, vérifier qu'ils acceptent un `reason: string` optionnel pour `/reject`.

Tests : 4 specs (filter PENDING, filter relatedType + mediaType combinés, pagination, permissions seller scopé).

### 3.2 Frontend — page admin modération

Créer `apps/frontend/src/app/(dashboard)/admin/media-moderation/page.tsx` :
- Liste tableau : thumbnail, type (image/vidéo icon), rôle, relatedType, sellerSlug ou productSlug (à enrichir backend avec join), date upload, status badge.
- Filtres : status (default PENDING), relatedType, mediaType.
- Colonnes actions : "Voir" (modal preview), "Approuver" (1 click + confirm), "Rejeter" (modal avec textarea reason obligatoire).
- Pagination.

### 3.3 Frontend — composant modal preview

Composant `MediaPreviewModal` : affiche image full / vidéo player + métadonnées + boutons approve/reject.

### 3.4 Helper API frontend

Étendre `apps/frontend/src/lib/marketplace-media-assets.ts` :
- `approve(id, token)` → `POST /:id/approve`.
- `reject(id, dto: { reason: string }, token)` → `POST /:id/reject`.
- `listForModeration(filters, token)` → `GET /` avec filtres.

### 3.5 Tests

- Backend : `media-assets.controller.spec.ts` (+4 specs filtres).
- Frontend : `admin/media-moderation/page.test.tsx` (+5 specs : rendu liste, filter status, approve action, reject avec reason, modal preview).

### 3.6 Documentation

Créer `docs/marketplace/MP_MEDIA_1.md` : 3 sous-sections (galerie / vidéo / modération), endpoints, bornes (5 MB image / 50 MB vidéo / MIME allowed), workflow modération, TODO V2 (génération thumbnails serveur-side via ffmpeg, capping galerie à 10 par produit, enregistrement durée vidéo en metadata, watermarking optionnel).

### 3.7 Preuves anti-hallucination LOT 3

```
git log --oneline mp-media-1-video-product..mp-media-1-moderation-admin
git diff mp-media-1-video-product..mp-media-1-moderation-admin --stat
grep -n "moderationStatus\|relatedType\|mediaType" apps/backend/src/media-assets/dto/
ls apps/frontend/src/app/\(dashboard\)/admin/media-moderation/
grep -n "approve\|reject\|listForModeration" apps/frontend/src/lib/marketplace-media-assets.ts
pnpm --filter @iox/backend test src/media-assets 2>&1 | tail -10
pnpm --filter @iox/frontend test media-moderation 2>&1 | tail -10
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -3
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
ls docs/marketplace/MP_MEDIA_1.md
```

---

## Pre-flight checks (avant LOT 1)

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git status --short
git log --oneline -1 main                                        # → 1b490c8
git stash list                                                   # → vide
git branch | wc -l                                               # → 2
pnpm install --frozen-lockfile 2>&1 | tail -3
pnpm --filter @iox/backend exec prisma generate 2>&1 | tail -3
docker compose ps 2>&1 | head -5
```

Tout vert → démarrer LOT 1. Sinon STOP + handoff.

---

## Format rapport final attendu (`notes/handoff-megamandat-27.md`)

```
# Méga-mandat 27 — handoff MP-MEDIA-1

## TL;DR
- LOT 1 GALLERY : ✅ / 🟡 / ❌ — N commits, M specs
- LOT 2 VIDEO : ✅ / 🟡 / ❌
- LOT 3 MODERATION : ✅ / 🟡 / ❌
- Total commits : X
- main intact : oui (1b490c8)
- 0 migration Prisma (modèle MediaAsset déjà complet)

## Branches livrées
- mp-media-1-gallery-product (HEAD: ...)
- mp-media-1-video-product (HEAD: ...)
- mp-media-1-moderation-admin (HEAD: ...)

## LOT 1 — preuves brutes
[recopier sortie 9 commandes]

## LOT 2 — preuves brutes
[recopier sortie 9 commandes]

## LOT 3 — preuves brutes
[recopier sortie 9 commandes]

## Blocages rencontrés
[liste exhaustive]

## Notes pour push cascade
- ordre : push gallery → video → moderation (rebase --onto main entre)
- aucune migration Prisma → cascade safe
- env vars VPS inchangés
- smoke post-deploy : upload image multi (gallery), upload vidéo mp4, modération admin approve/reject
- dépendance frontend public products page : verifier que getbyslug renvoie galerie + vidéo APPROVED
```

---

## TL;DR pour Claude Code

3 lots, ~7h, branches chaînées locales, 0 migration Prisma, ~30 nouveaux specs jest+vitest, aucun envoi externe. Si doute, STOP + doc. À retour je vérifie via grep / git log / pnpm test.
