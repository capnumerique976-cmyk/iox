# Méga-mandat 5h LOCAL-ONLY — MP-MEDIA-1 LOT 2 + LOT 3 (clôture chantier)

> Coller dans Claude Code pour run autonome ~4-5h. **Aucun push, deploy, gh, ssh, envoi externe.**
>
> Termine entièrement le chantier MP-MEDIA-1 démarré au mandat 28 (LOT 1 galerie déjà en prod via PR #49).

## Pré-requis (STOP si non remplis)

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git rev-parse main                                              # → 7975d0deb328fda61cbbe9da51e5c086c385bddf
git stash list                                                   # → vide
git branch | wc -l                                               # → 2 (main + asterisk)
pnpm install --frozen-lockfile 2>&1 | tail -3
pnpm --filter @iox/backend exec prisma generate 2>&1 | tail -3
docker compose ps 2>&1 | head -5
```

Si pas vert → STOP + `notes/handoff-megamandat-34-stop.md`.

---

## Garde-fous anti-hallucination

User absent ~5h. Toute invention détectée par grep / git log / pnpm test à retour.

1. Toujours vérifier disque (`ls`, `cat`, `git status`) avant marquer fini.
2. Jamais inventer output / test / fichier. Si commande échoue → erreur brute.
3. Fin chaque lot, recopier output réel des preuves dans handoff.
4. Si tu détectes invention → STOP, revert, doc, passe au suivant.

---

## Contexte canonique IOX

Stack : monorepo pnpm + Turbo, NestJS + Prisma + PostgreSQL, Next.js App Router, controlled state, conventional commits, migrations Prisma additives.

5 invariants : Product ≠ Offer ≠ SellerProfile / projection publique filtrée / statuts marketplace ≠ MCH / FP ≠ Lot ≠ MP / Seller = `MARKETPLACE_SELLER`.

---

## État avant ce mandat

- main = `7975d0d` (49 lots cumulés, MP-MEDIA-1 LOT 1 galerie + I18N-4 phase 3 mergés).
- VPS aligné. MinIO bucket `iox-documents`.
- `MediaAssetType` enum supporte IMAGE / ILLUSTRATION / VIDEO.
- 9 rôles `MediaAssetRole` dont GALLERY (utilisé pour images depuis LOT 1).
- Backend `/api/v1/marketplace/media-assets` câblé : list / public / :id / :id/url / upload / patch / set-primary / approve / reject / delete / **reorder** (LOT 1).
- Composants frontend existants : `InlineMediaUploader`, `ProductGalleryUploader`, `PublicGalleryLightbox`.
- Endpoints `/approve` et `/reject` existent (POST), mais **pas de UI admin**.

**Manques V1 (à combler)** :
- LOT 2 vidéo : DB OK (mediaType=VIDEO existe), bornes vidéo absentes côté backend, UI absente.
- LOT 3 admin moderation : endpoints OK, page admin absente.

---

## Mandat global

2 lots chaînés sur main. Indépendants techniquement.

```
main (7975d0d, intact)
   │
   ▼
mp-media-1-video-product             ← LOT 2 (~2h30)
   │
   ▼
mp-media-1-moderation-admin          ← LOT 3 (~2h, si LOT 2 vert)
```

Si LOT 2 capote → LOT 3 part de main directement (indépendant). Documenter.

---

## Règles absolues

- AUCUN `git push`, `gh`, `git fetch origin`, `git pull`.
- AUCUN merge sur main local. Main reste à `7975d0d`.
- AUCUN deploy / ssh / VPS.
- AUCUN force-push.
- AUCUN traitement vidéo serveur-side V1 (pas de ffmpeg backend pour thumbnail). Si thumbnail nécessaire, capture frame côté client via canvas (V2 si besoin).
- AUCUNE migration Prisma (modèles complets).

## Exigences techniques transverses

- Conventional commits.
- TypeScript strict : pas de `any`, casts justifiés.
- DTOs class-validator : whitelist + forbidNonWhitelisted.
- Tests : `.spec.ts` jest backend + `.test.tsx` vitest frontend. Cible verts intégral pour nouveaux specs.
- Logs : `Logger` Nest, jamais `console.log`.
- i18n : textes UI FR (sauf si pattern next-intl déjà câblé sur la page → suivre).
- Controlled state : pas de react-hook-form. `useState`.

---

## LOT 2 — Vidéo produit — ~2h30

**Branche** : `mp-media-1-video-product` à partir de `main`.

**Objectif** : permettre au seller d'attacher 1 vidéo (max V1) à son produit. Mediatype VIDEO, role GALLERY (réutilise GALLERY + filtre côté UI sur mediaType pour distinguer image/vidéo).

### 2.1 Backend — bornes vidéo + extension MIME

Étendre `apps/backend/src/media-assets/media-assets.service.ts` :
- Constantes :
  ```typescript
  export const MEDIA_VIDEO_MAX_BYTES = 50 * 1024 * 1024; // 50 MB
  export const MEDIA_ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime'] as const;
  ```
- Service `upload(file, dto, actorId)` :
  - Si MIME `video/*` :
    - Vérifier MIME dans whitelist sinon `BadRequestException("Format vidéo non autorisé")`.
    - Vérifier `file.size <= MEDIA_VIDEO_MAX_BYTES` sinon `BadRequestException("Vidéo > 50 MB")`.
    - Set `mediaType = VIDEO` (override DTO).
  - Si MIME `image/*` : flow actuel (mediaType=IMAGE).
  - Sinon : `BadRequestException("MIME non autorisé")`.
- Tests `media-assets.service.spec.ts` (extension) : 4 specs (upload mp4 OK, upload webm OK, upload trop grand → 400, upload mime non autorisé → 400).

### 2.2 Backend — DTO upload sécurité

Vérifier que le client ne peut PAS forcer `mediaType=VIDEO` sur un fichier image (ou inverse). Le `mediaType` doit être calculé serveur-side à partir du MIME réel détecté.

### 2.3 Frontend — helper API extension

Étendre `apps/frontend/src/lib/marketplace-media-assets.ts` :
- Export `MEDIA_VIDEO_MAX_BYTES = 50 * 1024 * 1024`.
- Export `MEDIA_ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime'] as const`.
- Helper `validateVideoFile(file)` (miroir backend, retourne `{ ok: true } | { ok: false, error: string }`).

### 2.4 Frontend — composant `ProductVideoUploader`

Créer `apps/frontend/src/components/marketplace/ProductVideoUploader.tsx` :

Props :
```typescript
interface Props {
  productId: string;
  sellerProfileId: string;
  currentVideo: MediaAsset | null;  // 1 max V1
  onUploaded: () => Promise<void>;
  onDeleted: () => Promise<void>;
  disabled?: boolean;
  testId?: string;
}
```

Comportement :
- Single-file picker (input `accept="video/*"`).
- Validation client : MIME + 50 MB max.
- Preview html5 `<video controls>` après sélection (objectURL local) avant upload.
- Upload avec barre de progression (XHR `upload.onprogress` ou fetch + ReadableStream).
- Si vidéo actuelle existe :
  - Player html5 controls + bouton "Remplacer" (DELETE old → POST new séquentiel) + bouton "Supprimer" (avec confirm).
- États : `idle / preview / uploading { progress: 0..100 } / success / error { message }`.

### 2.5 Frontend — intégration page seller produit

Étendre `apps/frontend/src/app/(dashboard)/seller/marketplace-products/[id]/page.tsx` :
- Ajouter section "Vidéo" sous la section "Galerie" (LOT 1).
- Charge la vidéo unique du produit (filter `mediaType=VIDEO` parmi les MediaAsset).
- Passe au composant `ProductVideoUploader` + callbacks refetch.

### 2.6 Frontend — affichage public fiche produit

Étendre `apps/frontend/src/app/marketplace/products/[slug]/page.tsx` :
- Ajouter section "Vidéo" sous la galerie images (si `moderationStatus=APPROVED` + `mediaType=VIDEO` présent).
- HTML5 `<video controls preload="metadata">` (pas d'autoplay V1, économie data).
- Pas de poster pour V1 (V2 pourra ajouter thumbnail capturé client-side).

### 2.7 Tests

- Backend `media-assets.service.spec.ts` : +4 specs vidéo.
- Frontend `ProductVideoUploader.test.tsx` : +5 specs (rendu vide, preview, upload OK + progress, error MIME, error taille).
- Frontend page seller produit : +2 specs (section vidéo présente, replace existing video).
- Frontend page publique produit : +1 spec (player rendu si vidéo présente APPROVED).

### 2.8 Preuves anti-hallucination LOT 2

```
git log --oneline main..mp-media-1-video-product
git diff main..mp-media-1-video-product --stat
grep -nE "MEDIA_VIDEO_MAX_BYTES|MEDIA_ALLOWED_VIDEO_MIMES|video/mp4" apps/backend/src/media-assets/
grep -nE "MEDIA_VIDEO_MAX_BYTES|video/mp4" apps/frontend/src/lib/marketplace-media-assets.ts
ls apps/frontend/src/components/marketplace/ProductVideoUploader*
grep -nE "ProductVideoUploader" apps/frontend/src/app/\(dashboard\)/seller/marketplace-products/\[id\]/page.tsx
grep -nE "video|Video" apps/frontend/src/app/marketplace/products/\[slug\]/page.tsx | head -5
pnpm --filter @iox/backend test src/media-assets 2>&1 | tail -10
pnpm --filter @iox/frontend test ProductVideo 2>&1 | tail -10
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -3
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
```

---

## LOT 3 — Admin moderation média — ~2h

**Branche** : `mp-media-1-moderation-admin` à partir de `mp-media-1-video-product` (si vert) ou de `main` (si LOT 2 capoté).

**Objectif** : exposer côté admin une vue de modération des MediaAsset PENDING avec actions approve / reject (raison).

### 3.1 Backend — extension list endpoint

Étendre `GET /api/v1/marketplace/media-assets` avec filtres :
- `?moderationStatus=PENDING|APPROVED|REJECTED` (multi via CSV).
- `?relatedType=MARKETPLACE_PRODUCT|SELLER_PROFILE|...`.
- `?mediaType=IMAGE|VIDEO`.
- Pagination existante conservée.
- Permissions : ADMIN, COORDINATOR pour voir tous PENDING. SELLER ne voit que ses propres médias (déjà câblé).

DTO `ListMediaAssetsQueryDto` étendu :
- `@IsOptional @IsEnum(MediaModerationStatus, { each: true })` pour status (CSV split).
- `@IsOptional @IsEnum(MarketplaceRelatedEntityType)` pour relatedType.
- `@IsOptional @IsEnum(MediaAssetType)` pour mediaType.

Endpoints `/approve` et `/reject` existent déjà. Vérifier que `/reject` accepte `reason: string` optionnel dans le body. Si absent → ajouter au DTO `RejectMediaAssetDto`.

Tests `media-assets.controller.spec.ts` (extension) : 4 specs (filter PENDING, filter relatedType + mediaType combinés, pagination, permissions seller scopé).

### 3.2 Frontend — helper API

Étendre `apps/frontend/src/lib/marketplace-media-assets.ts` :
- `listForModeration(filters, token)` → `GET /` avec filtres.
- `approve(id, token)` → `POST /:id/approve`.
- `reject(id, dto: { reason: string }, token)` → `POST /:id/reject`.

### 3.3 Frontend — page admin

Créer `apps/frontend/src/app/(dashboard)/admin/media-moderation/page.tsx` :

Layout :
- Header : titre "Modération média" + filtres (status default PENDING, relatedType, mediaType).
- Tableau colonnes : thumbnail (URL signée), type icon (image/vidéo), rôle, relatedType, sellerSlug ou productSlug, date upload, status badge.
- Colonnes actions : "Voir" (ouvre modal), "Approuver" (1 click + confirm), "Rejeter" (modal avec textarea reason obligatoire).
- Pagination.

### 3.4 Frontend — composant modal preview

Créer `apps/frontend/src/components/admin/MediaPreviewModal.tsx` :
- Affiche image full ou vidéo player + métadonnées (mimeType, sizeBytes, dimensions, uploadedBy, createdAt).
- Boutons approve / reject directement dans modal.
- Reject déclenche sub-modal avec textarea reason.

### 3.5 Tests

- Backend `media-assets.controller.spec.ts` : +4 specs filtres + +2 specs reject reason.
- Frontend `admin/media-moderation/page.test.tsx` : +5 specs (rendu liste, filter status, approve action, reject avec reason, modal preview).

### 3.6 Documentation

Créer `docs/marketplace/MP_MEDIA_1_LOT_2_LOT_3.md` :
- LOT 2 : bornes vidéo (50 MB, mp4/webm/quicktime), endpoint extension, composant uploader, player public.
- LOT 3 : filtres list, page admin, workflow approve/reject reason.
- Récap MP-MEDIA-1 complet (LOT 1 + 2 + 3 mergés cumulés).
- TODO V2 : génération thumbnails serveur-side (ffmpeg), capping galerie 10/produit, watermarking, durée vidéo en metadata.

### 3.7 Preuves anti-hallucination LOT 3

```
git log --oneline mp-media-1-video-product..mp-media-1-moderation-admin
git diff mp-media-1-video-product..mp-media-1-moderation-admin --stat
grep -nE "moderationStatus|relatedType|mediaType" apps/backend/src/media-assets/dto/ | head -5
ls apps/frontend/src/app/\(dashboard\)/admin/media-moderation/
ls apps/frontend/src/components/admin/MediaPreviewModal*
grep -nE "approve|reject|listForModeration" apps/frontend/src/lib/marketplace-media-assets.ts
pnpm --filter @iox/backend test src/media-assets 2>&1 | tail -10
pnpm --filter @iox/frontend test media-moderation 2>&1 | tail -10
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -3
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
ls docs/marketplace/MP_MEDIA_1_LOT_2_LOT_3.md
```

---

## Pre-flight checks (avant LOT 2)

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git status --short
git log --oneline -1 main                                        # → 7975d0d
git stash list                                                   # → vide
git branch | wc -l                                               # → 2
pnpm install --frozen-lockfile 2>&1 | tail -3
pnpm --filter @iox/backend exec prisma generate 2>&1 | tail -3
docker compose ps 2>&1 | head -5
```

Tout vert → démarrer LOT 2. Sinon STOP + handoff.

---

## Format rapport final attendu (`notes/handoff-megamandat-34.md`)

```
# Méga-mandat 34 — handoff MP-MEDIA-1 LOT 2 + LOT 3

## TL;DR
- LOT 2 vidéo : ✅ / 🟡 / ❌ — N commits, M nouveaux specs
- LOT 3 admin moderation : ✅ / 🟡 / ❌ — ...
- main intact (7975d0d)
- 0 migration Prisma
- Chantier MP-MEDIA-1 clos après cascade

## Branches livrées
- mp-media-1-video-product (HEAD: ...)
- mp-media-1-moderation-admin (HEAD: ...)

## LOT 2 — preuves brutes
[recopier sortie 11 commandes]

## LOT 3 — preuves brutes
[recopier sortie 11 commandes]

## Blocages rencontrés
[liste exhaustive]

## Notes pour push cascade
- ordre : push video → moderation (chaînés sans dépendance donc rebase --onto facultatif)
- aucune migration Prisma → cascade safe
- env vars VPS inchangés
- smoke post-deploy : upload mp4 sur produit demo, page publique vidéo player rendu, /admin/media-moderation accessible admin, approve+reject reason fonctionnels
- chantier MP-MEDIA-1 sera complet (LOT 1 + 2 + 3 cumulés)
```

---

## TL;DR pour Claude Code

2 lots, ~5h, branches chaînées locales, 0 migration Prisma, ~25 nouveaux specs jest+vitest, aucun envoi externe. Si doute, STOP + doc. À retour je vérifie via grep / git log / pnpm test.

Caveman resume off pour ce livrable car prompt opérationnel.
