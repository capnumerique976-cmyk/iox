# FP-2.1 — Édition certifications par seller (plan court)

## Branche
`fp-2-1-seller-certifications-edition` (depuis `main` 2d28d4c, FP-3+FP-4 mergés).

## Backend (lecture seule — rien à modifier)

- Endpoints existants `/marketplace/certifications` :
  - `GET /` (scope auto via `SellerOwnershipService.scopeRelatedEntityFilter`),
  - `GET /:id`,
  - `POST /` (relatedType + relatedId obligatoires, `verificationStatus=PENDING`),
  - `PATCH /:id` (revue auto si VERIFIED + factualChange),
  - `DELETE /:id`.
- `SELLER_ROLES` inclut déjà `MARKETPLACE_SELLER` sur tous ces endpoints.
- DTO : `type` requis (`CertificationType` enum), `code/issuingBody/issuedAt/validFrom/validUntil/documentMediaId` optionnels.
- Validations métier serveur :
  - `type=OTHER` ⇒ au moins `code` ou `issuingBody`,
  - `validUntil > validFrom` si les deux fournis,
  - `validUntil > now` (à la création seulement).

## Frontend — livrables

### 1. Helper `apps/frontend/src/lib/marketplace-certifications.ts`
- Types : `MarketplaceCertification`, `CreateMarketplaceCertificationInput`, `UpdateMarketplaceCertificationInput`, `ListMarketplaceCertificationsParams`.
- Méthodes : `list({relatedType, relatedId})`, `create`, `update(id)`, `remove(id)`.

### 2. Composant `apps/frontend/src/components/marketplace/SellerCertificationsManager.tsx`
- Props : `relatedType`, `relatedId`, `disabled?`.
- État interne : load (loading/ready/error), liste, form (création ou édition `editingId`).
- Champs form : `type` (select), `issuingBody`, `code`, `issuedAt`, `validFrom`, `validUntil` (dates type=date).
- Validation client :
  - `type` requis,
  - `type=OTHER` ⇒ `code` ou `issuingBody`,
  - `validUntil >= validFrom` si les deux fournis (miroir backend mais moins strict : on accepte égaux pour ne pas trop frustrer).
- Suppression via `useConfirm()` (ConfirmDialog L9-2), tone=danger.
- Mapping erreurs serveur 4xx → message inline.

### 3. Page `/seller/profile/certifications`
- Résoudre `sellerProfileId` via `sellerProfilesApi.getMine()`.
- Hints 404 (pas de profil) / 409 (profils multiples) miroir FP-3.
- Banner d'avertissement : modifier/supprimer une VERIFIED ⇒ revue.
- Lien retour `/seller/profile/edit`.
- Rend `<SellerCertificationsManager relatedType="SELLER_PROFILE" relatedId={profile.id} />`.

### 4. Page `/seller/marketplace-products/[id]/certifications`
- `getById(id)` pour valider l'existence + récupérer un nom d'affichage.
- Hints 403/404 miroir page seasonality.
- Banner avertissement identique.
- Rend `<SellerCertificationsManager relatedType="MARKETPLACE_PRODUCT" relatedId={id} />`.

### 5. Liens navigation
- `/seller/profile/edit` : ajouter "Gérer mes certifications" → `/seller/profile/certifications`.
- `/seller/marketplace-products` index : colonne ou lien "Certifications" par ligne.
- `/seller/dashboard` Raccourcis : QuickLink "Mes certifications" → `/seller/profile/certifications`.

## Tests vitest visés (~+12)
- `SellerCertificationsManager.test.tsx` : liste vide, liste pleine, ouverture form, submit OK création, submit erreur 4xx mappée, validation client (type requis, OTHER sans code/body, validUntil < validFrom), suppression confirmée + annulée.
- `seller/profile/certifications/page.test.tsx` : hint 404, banner avertissement.
- `seller/marketplace-products/[id]/certifications/page.test.tsx` : hint 403, banner avertissement.

## Hors scope FP-2.1 (différé)
- `documentMediaId` pas de champ formulaire (pas d'uploader PDF). Différé à FP-3.1+.
- UI staff verify/reject déjà absente / hors mandat.
- Composant public `CertificationBadgeList` non touché.
- Pas de support `MARKETPLACE_OFFER`.

## Doc
Compléter `docs/marketplace/SELLER_PROFILE.md` avec section "FP-2.1 — Certifications self-edit", documenter explicitement l'omission `documentMediaId`.
