# MP-MEDIA-1 LOT 1 — Galerie multi-images produit

Permet au seller d'attacher plusieurs images de galerie (`role=GALLERY`)
à son produit marketplace en plus de l'image principale (`role=PRIMARY`,
livrée en MP-EDIT-PRODUCT.3-light). Drag-reorder, suppression, lightbox
publique sur la fiche produit.

## Endpoints

| Méthode | URL | Description | Rôles |
|---------|-----|-------------|-------|
| `POST` | `/api/v1/marketplace/media-assets/upload` | Upload image (multipart) — accepte `role=GALLERY` | SELLER_ROLES |
| `GET` | `/api/v1/marketplace/media-assets?relatedType=&relatedId=&role=` | Liste filtrée | SELLER_ROLES |
| `GET` | `/api/v1/marketplace/media-assets/:id/url` | URL signée temporaire pour thumb | SELLER_ROLES + AUDITOR + BUYER |
| **`PATCH`** | **`/api/v1/marketplace/media-assets/reorder`** | **Bulk reorder sortOrder (nouveau)** | SELLER_ROLES |
| `DELETE` | `/api/v1/marketplace/media-assets/:id` | Suppression DB + storage | SELLER_ROLES |

### `PATCH /reorder` — DTO

```typescript
ReorderMediaAssetsDto {
  items: Array<{ id: string; sortOrder: number }>; // [1, 50]
}
```

Contraintes :
- ArrayMinSize 1, ArrayMaxSize 50.
- Tous les médias doivent exister (`NotFoundException` sinon).
- Tous doivent partager la même entité parente (`relatedType` + `relatedId`)
  — empêche les reorders cross-entity (`ForbiddenException`).
- Ownership check sur l'entité parente unique.
- Transaction Prisma : 1 update par item.
- Audit `MEDIA_ASSETS_REORDERED { count, relatedType, relatedId }`.

## Bornes

| Borne | Valeur | Niveau |
|-------|--------|--------|
| `MEDIA_MAX_BYTES` | 5 MB | backend + UI |
| MIME autorisés | `image/jpeg`, `image/png`, `image/webp` | backend + UI |
| `MEDIA_GALLERY_MAX_PER_PRODUCT_UI` | 20 images / produit | UI seulement (V1) |
| `take` reorder DTO | 50 items max | backend |

V1 : pas de cap backend sur le nombre d'images de galerie par produit
(potentiel V2 si abus détecté).

## Workflow upload

1. Seller clique "Ajouter des photos" sur la page produit.
2. Multi-file picker (jusqu'à `MEDIA_GALLERY_MAX_PER_PRODUCT_UI - currentCount` images).
3. Validation client (MIME + taille).
4. Upload :
   - Parallèle si < 3 fichiers.
   - Séquentiel sinon (limite charge réseau).
5. Chaque upload crée `MediaAsset { role: GALLERY, moderationStatus: PENDING }`
   + enqueue `MarketplaceReviewQueue { reviewType: MEDIA }`.
6. UI refetch via `onChange` callback parent.

## Workflow reorder

1. Seller drag une tuile en mode édition.
2. Drop sur autre tuile → réordonnage local optimiste.
3. `PATCH /reorder` avec nouveau `sortOrder` index-based.
4. Sur succès : `onChange` parent refetch.
5. Sur erreur : `state.kind === 'error'` + message.

## Workflow delete

1. Seller clique poubelle sur tuile.
2. Confirm dialog (FR, tone=danger).
3. Si confirmé : `DELETE /:id` + storage delete + audit.
4. UI refetch.

## Modération

Héritée des endpoints existants `/approve`, `/reject` (page admin
modération à venir en mandat ultérieur LOT 3). Tant que
`moderationStatus !== APPROVED`, l'image n'apparaît pas sur la fiche
produit publique.

## UI

### Page seller `/seller/marketplace-products/[id]`

Section "Galerie produit" sous "Image principale". Composant
`ProductGalleryUploader` :
- Grille 2/3/4 colonnes responsive.
- Tuile : thumbnail (URL signée) + badge `sortOrder` + bouton supprimer
  au hover.
- Drag handle visuel + drag & drop natif HTML5.
- Bouton "Ajouter des photos" + compteur `n/20` + spec MIME/taille.

### Page publique `/marketplace/products/[slug]`

Composant `PublicGalleryLightbox` (client) sous l'image hero :
- Grille 4 colonnes thumbnails (max 8 affichés).
- Clic thumbnail → overlay fullscreen avec navigation prev/next.
- Fermeture par bouton X, clic backdrop, ou touche `Escape`.
- Navigation par boutons ou touches `ArrowLeft`/`ArrowRight`.
- Badge compteur `idx / total` en bas.
- Filtre `publicUrl !== null` (médias non encore signés exclus).
- Si 0 image valide → composant ne rend rien (pas de section vide).

### Backend filtre publication

Catalog service (`marketplace-catalog`) déjà filtre :
- `moderationStatus: APPROVED` côté query Prisma.
- `gallery = media.filter(m => m.role !== PRIMARY)`.
- Le frontend ne reçoit donc QUE les images approuvées.

## Tests

### Backend

| Fichier | Specs nouveaux | Total |
|---------|----------------|-------|
| `media-assets.service.spec.ts` | 7 (5 reorder + 2 GALLERY upload) | 35 |
| `media-assets.controller.spec.ts` | 2 (reorder happy + 403) | 2 |

```bash
pnpm --filter @iox/backend test src/media-assets
# Test Suites: 2 passed — Tests: 37 passed
```

### Frontend

| Fichier | Specs nouveaux | Total |
|---------|----------------|-------|
| `ProductGalleryUploader.test.tsx` | 6 | 6 |
| `PublicGalleryLightbox.test.tsx` | 4 | 4 |
| `seller/marketplace-products/[id]/page.test.tsx` | +2 (section galerie + list call) | 29 |

```bash
pnpm --filter @iox/frontend exec vitest run
# Test Files: 46 passed — Tests: 296 passed
```

Total nouveaux specs MP-MEDIA-1 LOT 1 : **21**.

## Décisions

- **`MEDIA_REORDER` = `SELLER_ROLES`** : pas de rôle dédié, miroir des
  autres opérations seller.
- **Reorder bulk** plutôt que multi-PATCH `:id` : transaction atomique
  + audit unique + un seul ownership check.
- **Cap `[1, 50]` items** : ample pour une galerie produit (V2 pourra
  passer à 100 si volumes le justifient).
- **Drag & drop natif HTML5** : aucune lib externe, fonctionne sur
  desktop + tablette. Mobile = limitation (pas de drag tactile natif),
  reportée à V2.
- **Lightbox sans lib** : `useState<number | null>` + overlay fixed
  natif. Léger (~150 lignes), accessible (aria-modal, Escape).
- **`product.gallery` côté catalog déjà filtré APPROVED** : pas besoin
  de re-filtrer côté frontend.
- **Cap UI 20** : limite côté composant uniquement. Backend illimité V1
  (sera resserré si abus en prod).

## Hors scope

- LOT 2 — vidéo produit (mandat ultérieur).
- LOT 3 — page admin `/admin/media-moderation` (mandat ultérieur).
- Mobile drag & drop tactile.
- Crop / resize images côté client.
- Ordre par drag handle dédié (la tuile entière est draggable V1).
- Cap backend strict sur nombre de médias par produit.
