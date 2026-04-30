# MP-MEDIA-1 LOT 2 + LOT 3 — clôture chantier média marketplace

## TL;DR

Termine MP-MEDIA-1 démarré au mandat 28 (LOT 1 galerie multi-images mergé via PR #49). Ajoute :
- **LOT 2** : vidéo produit (1 max V1, 50 MB, mp4/webm/quicktime) + player public.
- **LOT 3** : page admin de modération média avec filtres + actions approve/reject + modal preview.

État final : 6 endpoints `/marketplace/media-assets` câblés (list / public / :id / :id/url / upload / patch / set-primary / approve / reject / delete / reorder) + UI seller (galerie + vidéo) + UI admin (modération).

---

## LOT 2 — Vidéo produit

### Backend

`apps/backend/src/media-assets/media-assets.service.ts` :
- `MEDIA_VIDEO_MAX_BYTES = 50 * 1024 * 1024` (50 MB).
- `MEDIA_ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime']`.
- Service `upload()` : `mediaType` calculé serveur-side depuis le MIME réel détecté. Le client ne peut pas forcer `mediaType=VIDEO` sur un fichier image (ou inverse) — règle de sécurité essentielle.
- 3 branches : `image/*` (5 MB), `video/*` (50 MB, MIME whitelist), autre → `BadRequestException`.

`apps/backend/src/marketplace-catalog/marketplace-catalog.service.ts` :
- Projection publique `findProductBySlug()` : `select` étendu avec `mediaType` + `mimeType`. Sépare `videos[0]` de `gallery` (images uniquement). Expose `product.video` (null si absent ou rejected).

### Frontend

`apps/frontend/src/lib/marketplace-media-assets.ts` :
- Constantes miroir backend `MEDIA_VIDEO_MAX_BYTES` + `MEDIA_ALLOWED_VIDEO_MIMES`.
- `validateVideoFile(file)` retourne `{ ok: true } | { ok: false, error }`.

`apps/frontend/src/components/marketplace/ProductVideoUploader.tsx` :
- Single-file picker `accept="video/*"`.
- Preview html5 `<video controls>` sur `URL.createObjectURL(file)` avant upload.
- États : `idle / preview / uploading { progress } / success / error`.
- Si vidéo existante : player + boutons "Remplacer" (DELETE old → POST new séquentiel) + "Supprimer" (avec confirm).

`apps/frontend/src/app/(dashboard)/seller/marketplace-products/[id]/page.tsx` :
- Section "Vidéo produit" sous "Galerie".
- `loadGallery()` filtre `mediaType === VIDEO` → `setVideo(videos[0] ?? null)`, le reste vers `setGallery(images)`.

`apps/frontend/src/app/marketplace/products/[slug]/page.tsx` :
- Player `<video controls preload="metadata">` rendu sous la galerie si `product.video?.publicUrl` (filtre APPROVED côté backend).
- Pas d'autoplay V1 (économie data).

### Tests LOT 2
- Backend `media-assets.service.spec.ts` : +4 specs (upload mp4, upload webm, > 50 MB → 400, MIME avi → 400).
- Frontend `ProductVideoUploader.test.tsx` : 6 specs (rendu vide, preview, upload OK, MIME error, size error, replace+delete confirm).

---

## LOT 3 — Admin modération média

### Backend

`apps/backend/src/media-assets/dto/media-asset.dto.ts` :
- `QueryMediaAssetsDto` étendu :
  - `moderationStatus` accepte string OR string[] via `Transform` (CSV split).
  - `mediaType` (IMAGE / VIDEO / ILLUSTRATION).
- `RejectMediaAssetDto.reason` : `@MinLength(3) @MaxLength(500)`.

`apps/backend/src/media-assets/media-assets.service.ts` :
- `findAll()` : `where.moderationStatus = Array.isArray ? { in } : value` + filtre `where.mediaType`.

Endpoints `/approve` et `/reject` existent depuis MP-NOTIF (controller inchangé).

### Frontend

`apps/frontend/src/lib/marketplace-media-assets.ts` :
- `listForModeration(filters, token)` : GET avec status array (CSV) + relatedType + mediaType + pagination.
- `approve(id, token)` : POST `/:id/approve`.
- `reject(id, { reason }, token)` : POST `/:id/reject` JSON body.

`apps/frontend/src/components/admin/MediaPreviewModal.tsx` :
- Affiche image full ou vidéo player + métadonnées (mimeType, sizeBytes, role, relatedType, dates).
- Boutons approve / reject. Reject ouvre sous-modal avec textarea reason obligatoire (>=3 chars).

`apps/frontend/src/app/(dashboard)/admin/media-moderation/page.tsx` :
- Filtres : status (default PENDING) + relatedType + mediaType.
- Tableau : type icon + role + entité + ID parent + créé le + status badge + bouton "Voir".
- Pagination 20/page.

### Tests LOT 3
- Backend `media-assets.controller.spec.ts` : +6 specs (filter status array + relatedType + mediaType, pagination, seller scope, reject reason, approve).
- Backend `media-assets.service.spec.ts` : +2 specs (mediaType=VIDEO filter, moderationStatus array → `where.in`).
- Frontend `media-moderation/page.test.tsx` : 5 specs (rendu liste, filter status, approve action, reject avec reason, reason < 3 → erreur).

---

## Récap MP-MEDIA-1 complet (LOT 1 + 2 + 3)

| LOT | Périmètre | PR |
|---|---|---|
| LOT 1 | Galerie multi-images produit + reorder + lightbox public | #49 (mergé) |
| LOT 2 | Vidéo produit + player public | local branche `mp-media-1-video-product` |
| LOT 3 | Page admin modération média + filtres + modal preview | local branche `mp-media-1-moderation-admin` |

**Total nouveaux specs cumulés (LOT 2 + 3)** : ~25 (backend +12, frontend +13).

---

## TODO V2 (hors scope V1)

- Génération thumbnails serveur-side via ffmpeg (poster image du player vidéo).
- Capping galerie 10/produit côté backend (V1 illimité, V1 cap UI à 20).
- Watermarking automatique sur upload (logo IOX en bas à droite).
- Durée vidéo en metadata (extraction ffprobe au upload).
- Compression vidéo serveur-side (transcoder en mp4 1080p si > 1080p).
- ES / AR / ZH locales (chantier I18N-5+ séparé).
- Bulk approve/reject (sélection multiple côté admin).
- Notifications seller à approve/reject (email transactionnel).

---

## Migration Prisma

**Aucune.** Modèle `MediaAsset` couvre déjà `mediaType=VIDEO` (FP-3.1 P4) + `moderationStatus` + `moderationReason`. Tout est additif sur l'existant.

## Env vars VPS

Inchangés. MinIO bucket `iox-documents` accepte les vidéos (pas de quota par MIME).

## Smoke post-deploy

1. Login seller `seller@iox.test`, naviguer vers `/seller/marketplace-products/[id]`, scroll → section "Vidéo produit". Sélectionner une vidéo mp4 < 50 MB → upload → success.
2. Login admin, naviguer vers `/admin/media-moderation` → liste PENDING. Click "Voir" sur la vidéo uploadée → modal player. Click "Approuver" → status passe APPROVED.
3. Page publique `/marketplace/products/[slug]` → player `<video controls>` rendu sous la galerie.
4. Test reject : upload nouvelle vidéo → modération → click "Rejeter" → textarea "Image floue" → confirme → status REJECTED + page publique n'affiche plus la vidéo (filtre APPROVED côté backend).
