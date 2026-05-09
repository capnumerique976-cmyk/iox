# Mandat 3h LOCAL-ONLY — MP-MEDIA-1 LOT 1 (galerie images produit, standalone)

> Coller dans Claude Code pour run autonome ~3h. Standalone. Ne touche pas LOT 2 (vidéo) ni LOT 3 (modération admin) — ces lots viendront après en mandats séparés. **Aucun push, deploy, gh, ssh, envoi externe.**
>
> **Pré-requis (STOP si non remplis)** :
>
> - chemin `/Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox`
> - working tree clean (untracked autorisés : `docs-projet/`, `notes/`)
> - `main` à `f717294` ou plus récent (post round 2 autonome)
> - `git stash list` vide
> - `git branch | wc -l` = 2

Si pas vert → STOP + `notes/handoff-mandat-28-stop.md`.

---

## Garde-fous anti-hallucination

User absent ~3h. Toute invention détectée par grep / git log / pnpm test à retour.

1. Toujours vérifier disque (`ls`, `cat`, `git status`) avant marquer fini.
2. Jamais inventer output / test / fichier. Si commande échoue, rapport erreur brute.
3. Fin lot, recopier output réel des preuves dans handoff.
4. Si tu détectes invention → STOP, revert, doc.

---

## Contexte canonique IOX

Stack : monorepo pnpm + Turbo, NestJS + Prisma + PostgreSQL, Next.js App Router, controlled state, conventional commits, migrations Prisma additives.

5 invariants : Product ≠ Offer ≠ SellerProfile / projection publique filtrée / statuts marketplace ≠ MCH / FP ≠ Lot ≠ MP / Seller = `MARKETPLACE_SELLER`.

---

## État avant mandat

- main = `f717294` (46 lots cumulés round 1+2 autonomes).
- VPS aligné, base peuplée. MinIO bucket `iox-documents`.
- `MediaAssetType` enum : IMAGE / ILLUSTRATION / VIDEO.
- `MediaAssetRole` enum : PRIMARY / GALLERY / PACKAGING / LABEL / LOT / ORIGIN / MARKETING / LOGO / BANNER (9 rôles).
- Backend `/api/v1/marketplace/media-assets` câblé : list / public / :id / :id/url / upload / patch / set-primary / approve / reject / delete.
- Frontend `InlineMediaUploader` (FP-3.1, MP-EDIT-PRODUCT.3-light) : 1 image PRIMARY produit + LOGO/BANNER seller. Max 5 MB image.

**Manque actuel** : galerie multi-images produit (role=GALLERY) — DB OK, UI absente.

---

## Périmètre LOT 1 (galerie seule)

**Branche unique** : `mp-media-1-gallery-product` à partir de main.

**Objectif** : permettre au seller d'attacher plusieurs images de galerie à son produit (en plus du PRIMARY), réordonner par drag-handle, supprimer.

**Hors scope ce mandat** :
- Vidéo produit (mandat 29 futur, LOT 2 d'origine)
- Modération admin média (mandat 30 futur, LOT 3 d'origine)
- Création endpoint `MEDIA_VIDEO_MAX_BYTES` etc.
- Page `/admin/media-moderation`

---

## Règles absolues — interdictions

- AUCUN `git push`, `gh`, `git fetch origin`, `git pull`.
- AUCUN merge sur main local. Main reste à `f717294`.
- AUCUN deploy / ssh / VPS.
- AUCUN force-push.
- AUCUNE migration Prisma (modèle MediaAsset déjà complet).
- AUCUNE installation système.

---

## Exigences techniques transverses

- Conventional commits : `feat(media)`, `feat(marketplace)`, `feat(frontend)`, `test(media)`, `chore(media)`, `docs(media)`.
- TypeScript strict : pas de `any`, casts justifiés.
- DTOs class-validator : whitelist + forbidNonWhitelisted.
- Tests : `.spec.ts` backend, `.test.tsx` frontend. Cible jest + vitest verts.
- Logs : `Logger` Nest, jamais `console.log`.
- i18n : textes UI FR. Textes EN possible si pattern next-intl déjà câblé sur la page (vérifier).
- Controlled state : pas de react-hook-form. `useState`.

---

## Étapes

### 1. Backend — endpoint reorder

Ajouter `PATCH /api/v1/marketplace/media-assets/reorder` :

- DTO `ReorderMediaAssetsDto` :
  ```typescript
  class ReorderMediaAssetsItem {
    @IsUUID() id: string;
    @IsInt() @Min(0) sortOrder: number;
  }
  class ReorderMediaAssetsDto {
    @ValidateNested({ each: true })
    @Type(() => ReorderMediaAssetsItem)
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(50)
    items: ReorderMediaAssetsItem[];
  }
  ```
- Permissions : ADMIN, COORDINATOR, SELLER. Ownership : tous les media doivent appartenir au même `relatedId` dont le seller est propriétaire (vérifier via `prisma.mediaAsset.findMany({ where: { id: { in: ids } }, include: { ... } })` + check ownership unique).
- Service `MediaAssetsService.reorder(items, actor)` :
  - Validate ownership pour chaque media.
  - Transaction Prisma : `$transaction(items.map(i => prisma.mediaAsset.update({ where: { id: i.id }, data: { sortOrder: i.sortOrder } })))`.
  - Audit log `MEDIA_ASSETS_REORDERED` avec count + relatedType + relatedId.
- Controller : `@Patch('reorder')` avec `@Roles(...MEDIA_REORDER)` (créer la constante role group si pas existante, miroir des autres groupes).
- Tests :
  - happy path 3 items même produit OK
  - mix items différents produits → 403
  - items < 1 → 400 ArrayMinSize
  - items > 50 → 400 ArrayMaxSize
  - non-propriétaire → 403

### 2. Backend — vérifier upload accepte role=GALLERY

Vérifier `POST /upload` actuel accepte `role=GALLERY` sans restriction. Si erreur, débloquer dans le service (probablement pas de filtrage actuel — tester).

Tests :
- upload role=GALLERY produit OK (pas d'erreur)
- count GALLERY illimité par produit V1 (V2 pourra capper à 10)

### 3. Frontend — composant `ProductGalleryUploader`

Créer `apps/frontend/src/components/marketplace/ProductGalleryUploader.tsx` :

Props :
```typescript
interface Props {
  productId: string;
  sellerProfileId: string;
  existingMedia: MediaAsset[];  // role=GALLERY filtered
  onChange: () => Promise<void>; // refetch parent
  disabled?: boolean;
  testId?: string;
}
```

Comportement :
- Affiche grille (3-4 colonnes responsive) de tuiles avec thumbnail (URL signée via `getUrl`) + badge sortOrder.
- Bouton "Ajouter des photos" → multi-file picker (max 5 simultanés via input `multiple`).
- Validation client miroir backend (MIME jpeg/png/webp + 5 MB par image).
- Upload séquentiel ou parallèle (parallèle si < 3 fichiers).
- Drag-reorder via HTML5 native (`draggable="true"`, `onDragStart/Over/End`). Sort visuel + `PATCH /reorder` après drop.
- Bouton suppression sur tuile (icône poubelle) + confirm dialog FR.
- États : `idle` / `uploading { count, total }` / `reordering` / `error { message }`.
- Loading skeleton pour les nouvelles uploads.
- Helper `MEDIA_GALLERY_MAX_PER_PRODUCT_UI = 20` (limite client V1, backend illimité).

### 4. Frontend — intégration page seller produit

Étendre `apps/frontend/src/app/(dashboard)/seller/marketplace-products/[id]/page.tsx` :

- Ajouter section "Galerie" sous la section image principale.
- Charge les MediaAsset filtrés `relatedType=MARKETPLACE_PRODUCT relatedId=productId role=GALLERY` triés par `sortOrder`.
- Passe au composant + callback refetch après upload/reorder/delete.
- Pas de toucher à la section image principale existante (PRIMARY).

### 5. Frontend — affichage public fiche produit

Étendre `apps/frontend/src/app/marketplace/products/[slug]/page.tsx` :

- Section "Galerie" sous la zone hero (image principale).
- Display grille thumbnails — **uniquement médias `moderationStatus=APPROVED`**.
- Click image → lightbox simple (composant léger natif via `<dialog>` ou state `useState<number | null>(null)` + overlay fixed). Pas de lib externe.
- Si 0 image GALLERY → ne pas afficher la section.

### 6. Helper API frontend

Étendre `apps/frontend/src/lib/marketplace-media-assets.ts` :

```typescript
export const MEDIA_GALLERY_MAX_PER_PRODUCT_UI = 20;

export async function reorder(
  items: { id: string; sortOrder: number }[],
  token: string,
): Promise<{ count: number }> {
  return api.patch<{ count: number }>(
    '/marketplace/media-assets/reorder',
    { items },
    token,
  );
}
```

Garder backward compat existante (FP-3.1 InlineMediaUploader doit continuer à marcher).

### 7. Tests

- Backend `apps/backend/src/media-assets/media-assets.service.spec.ts` étendu (+5 reorder + 2 GALLERY upload).
- Backend `apps/backend/src/media-assets/media-assets.controller.spec.ts` (+1 reorder happy path + 1 reorder 403).
- Frontend `apps/frontend/src/components/marketplace/ProductGalleryUploader.test.tsx` (+5 specs : rendu vide, upload 3 fichiers, reorder drag, delete + confirm, error MIME).
- Frontend page seller produit (+2 specs : section galerie présente, refetch après action).
- Frontend page publique produit (+1 spec : galerie APPROVED rendue, lightbox open/close).

Cible : tous nouveaux specs verts. Pas de régression sur specs existants.

### 8. Documentation

Créer `docs/marketplace/MP_MEDIA_1_LOT_1_GALLERY.md` :
- Endpoints (existants + nouveau reorder)
- Bornes (5 MB image, 20 max UI client)
- Workflow upload + reorder + delete
- Modération : héritée des endpoints existants `/approve`, `/reject` (pas de UI dédiée dans ce lot)
- TODO LOT 2 vidéo + LOT 3 admin moderation

---

## Pre-flight checks

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git status --short
git log --oneline -1 main                                        # → f717294 ou plus récent
git stash list                                                   # → vide
git branch | wc -l                                               # → 2
pnpm install --frozen-lockfile 2>&1 | tail -3
pnpm --filter @iox/backend exec prisma generate 2>&1 | tail -3
docker compose ps 2>&1 | head -5
```

Tout vert → démarrer. Sinon STOP + handoff.

---

## Preuves anti-hallucination obligatoires (à recopier en fin de rapport)

```
git log --oneline main..mp-media-1-gallery-product
git diff main..mp-media-1-gallery-product --stat
grep -n "@Patch.*reorder\|reorder(" apps/backend/src/media-assets/media-assets.controller.ts
grep -n "reorder" apps/backend/src/media-assets/media-assets.service.ts
ls apps/frontend/src/components/marketplace/ProductGalleryUploader*
grep -n "ProductGalleryUploader" apps/frontend/src/app/\(dashboard\)/seller/marketplace-products/\[id\]/page.tsx
grep -n "GALLERY\|galerie" apps/frontend/src/app/marketplace/products/\[slug\]/page.tsx
grep -n "reorder\|MEDIA_GALLERY_MAX_PER_PRODUCT_UI" apps/frontend/src/lib/marketplace-media-assets.ts
pnpm --filter @iox/backend test src/media-assets 2>&1 | tail -10
pnpm --filter @iox/frontend test ProductGallery 2>&1 | tail -10
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -3
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
ls docs/marketplace/MP_MEDIA_1_LOT_1_GALLERY.md
```

---

## Format rapport final attendu (`notes/handoff-mandat-28.md`)

```
# Mandat 28 — handoff MP-MEDIA-1 LOT 1 (galerie produit)

## TL;DR
- Statut : ✅ / 🟡 / ❌
- N commits, M nouveaux specs (backend X, frontend Y)
- main intact (f717294 ou SHA pré-flight)
- 0 migration Prisma
- branche `mp-media-1-gallery-product` (HEAD: ...)

## Périmètre livré
- Backend : endpoint PATCH /reorder + 8 specs
- Frontend : composant ProductGalleryUploader + intégration page seller + affichage public + lightbox + 8 specs
- Doc : MP_MEDIA_1_LOT_1_GALLERY.md

## Preuves brutes
[recopier sortie 13 commandes anti-hallucination]

## Blocages rencontrés
[liste exhaustive]

## Notes pour push cascade
- branche prête à push (rebase --onto main pas requis si main pas avancé)
- 0 migration Prisma → cascade safe
- env vars VPS inchangés
- smoke post-deploy : upload multi-images sur produit demo, reorder, delete, vérifier lightbox public sur fiche produit
- LOTs 2 (vidéo) + 3 (modération admin) à programmer en mandats séparés ultérieurs
```

---

## TL;DR pour Claude Code

1 lot, ~3h, 1 branche locale `mp-media-1-gallery-product`, 0 migration Prisma, ~16 nouveaux specs jest+vitest, aucun envoi externe. Si doute, STOP + doc. À retour je vérifie via grep / git log / pnpm test.

Caveman resume off pour ce livrable car prompt opérationnel.
