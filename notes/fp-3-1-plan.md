# FP-3.1 — InlineMediaUploader logo / bannière (plan court)

## Branche
`fp-3-1-seller-media-uploader` (depuis `fp-2-1-seller-certifications-edition`).

## Backend (rien à modifier)

`POST /marketplace/media-assets/upload` existe déjà pour les sellers :
- `FileInterceptor('file', { storage: memoryStorage() })`
- DTO multipart `UploadMediaAssetDto` : `relatedType` + `relatedId` requis,
  `mediaType?` (défaut IMAGE), `role?` (défaut GALLERY), `altTextFr?`,
  `altTextEn?`, `sortOrder?`.
- MIME accepté : `image/jpeg`, `image/png`, `image/webp` (`MEDIA_ALLOWED_IMAGE_MIMES`).
- Taille max : `MEDIA_MAX_BYTES = 5 MB`.
- Insertion immédiate avec `moderationStatus = PENDING`.
- Ownership imposée par `SellerOwnershipService.assertRelatedEntityOwnership`.

`GET /marketplace/media-assets/:id/url` renvoie `{ id, url, expiresIn }`
(URL signée temporaire — pattern identique à `marketplaceDocumentsApi.getUrl`).

## Frontend — livrables

### 1. Helper `apps/frontend/src/lib/marketplace-media-assets.ts`
- `upload(file, { relatedType, relatedId, role, ...meta }, token)` —
  utilise `fetch` directement (multipart, pas de `Content-Type` fixe pour
  laisser le navigateur poser le boundary). Réplique le routage
  `/api/v1` du wrapper `api` mais en POST multipart.
- `getUrl(id, token)` — proxie `/marketplace/media-assets/:id/url`.

Les bornes côté client (MIME + taille) miroir backend (constantes
exportées).

### 2. Composant `InlineMediaUploader`
`apps/frontend/src/components/marketplace/InlineMediaUploader.tsx`

Props :
- `relatedType` + `relatedId` (forcés `SELLER_PROFILE` ici, mais le
  composant reste générique).
- `role` : `MediaAssetRole.LOGO` ou `MediaAssetRole.BANNER`.
- `currentMediaId: string | null` — pour afficher la preview du média
  courant (résolu par appel à `getUrl`).
- `label`, `aspectRatio` (preview cosmétique), `altTextFr?`.
- `disabled?`, `onUploaded(mediaId, role)` — callback qui appelle le
  PATCH du parent.

Comportement :
- input `<input type="file" accept="image/png,image/jpeg,image/webp">`,
- preview avant upload (URL.createObjectURL),
- bouton "Téléverser" → POST multipart → callback,
- gestion erreurs MIME / taille côté client + serveur,
- preview du média actuel via `getUrl` (URL signée).

### 3. Intégration `/seller/profile/edit`
- Remplacer la zone read-only "Logo (mediaId)" / "Bannière (mediaId)" par
  deux `InlineMediaUploader`.
- À chaque upload réussi : on appelle `sellerProfilesApi.updateMine` avec
  `{ logoMediaId }` ou `{ bannerMediaId }` puis on ré-hydrate.

## Tests
- `InlineMediaUploader.test.tsx` : rendu, sélection fichier valide,
  rejet MIME, rejet taille > 5 MB, upload OK appelle onUploaded, erreur
  serveur affichée.
- `seller/profile/edit/page.test.tsx` : présence des 2 uploaders.

Cible : **+8 tests environ** (le flux "PATCH /me" est déjà couvert).

## Hors scope FP-3.1 (différé)
- Pas de gestion de galerie (juste logo + bannière côté SellerProfile).
- Pas de crop côté client.
- Pas d'uploader pour les certifs (`documentMediaId` reste différé).
- Pas de modification de la modération admin.

## Doc
Compléter `docs/marketplace/SELLER_PROFILE.md` avec section FP-3.1.
