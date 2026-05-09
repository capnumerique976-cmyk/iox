# Prompt Claude Code — FP-2.1 — Édition certifications par seller

> **Usage** : à coller tel quel dans Claude Code après le merge propre de FP-3 et FP-4 sur main.
> **Pré-requis** : main contient FP-3 + FP-4 ; working tree clean ; tests verts.

---

## Contexte canonique IOX (rappel)

IOX = "Indian Ocean Xchange" — plateforme B2B (marketplace + socle MCH). Stack : monorepo pnpm + Turbo, NestJS + Prisma + PostgreSQL, Next.js (App Router), controlled state (pas de react-hook-form).

Marketplace : `SellerProfile`, `MarketplaceProduct`, `MarketplaceOffer`, `MarketplaceDocument`, `Certification`, `MediaAsset`. Trois surfaces seller / admin / public. **Projection publique filtrée**. Statuts marketplace (DRAFT / IN_REVIEW / APPROVED / PUBLISHED…) ≠ statuts MCH internes (`market_status`).

`MarketplaceProduct` ≠ `MarketplaceOffer` ≠ `SellerProfile`. Product = ce que c'est, Offer = comment c'est vendu maintenant, Seller = qui le vend.

Conventions de commits : `feat(scope): ...`, `docs(scope): ...`, `test(scope): ...`. Migrations Prisma additives uniquement. Pas de refacto large opportuniste. Préserver la CI.

## État avant ce lot

- `main` : Lot-8, Lot-9, FP-1, FP-2, FP-3, FP-4 mergés.
- Backend FP-2 entièrement câblé : modèle `Certification` polymorphe (`relatedType` ∈ `SELLER_PROFILE | MARKETPLACE_PRODUCT`), service, controller `marketplace/certifications` avec CRUD seller + endpoints verify/reject staff + projection publique.
- Frontend FP-2 partiel : `CertificationBadgeList.tsx` (affichage public uniquement), pas de helper API, **aucune page seller pour gérer ses certifications**.
- `MARKETPLACE_SELLER` est dans `SELLER_ROLES` du controller : il a déjà le droit `POST/PATCH/DELETE` sur `/marketplace/certifications`.

## Objectif FP-2.1

Donner au seller la capacité d'auto-éditer ses certifications **côté SellerProfile** et **côté chacun de ses MarketplaceProduct**, en respectant la projection publique filtrée et le workflow PENDING → VERIFIED/REJECTED. **Aucun changement backend**, **aucune migration Prisma**.

## Branche

```
fp-2-1-seller-certifications-edition
```

depuis `main` à jour.

## Règles absolues

- Aucune modification du schéma Prisma, aucune migration.
- Aucune modification du controller / service / DTO backend `marketplace-certifications` sauf bug avéré.
- Pas de refacto large des composants existants. `CertificationBadgeList.tsx` ne doit pas être touché sauf bug.
- Pas de uploader média dans ce lot (le `documentMediaId` est volontairement laissé hors formulaire seller — la liaison à un document justificatif PDF arrivera dans FP-3.1 ou plus tard ; documenter ce choix).
- Préserver la CI : `pnpm lint`, `pnpm typecheck`, `pnpm test` verts à chaque commit.
- Conventional commits, atomiques par sous-étape.
- Ne pas pousser, ne pas merger : livrer la branche locale verte, prête à être poussée par l'utilisateur.

## Périmètre fonctionnel

### Page 1 — Certifications du SellerProfile

Route : `/seller/profile/certifications`

Fonctionnalités :

- Lister les certifications du SellerProfile du seller connecté (résolu via `findMine`).
- Pour chaque certification : afficher type (libellé FR), `issuingBody`, `code`, `validFrom`, `validUntil`, `verificationStatus` (badge PENDING/VERIFIED/REJECTED/EXPIRED — calcul `EXPIRED` côté UI dérivé de `validUntil < now()`), motif de rejet le cas échéant.
- Action "Ajouter une certification" : formulaire inline ou modale.
- Action "Modifier" sur chaque ligne.
- Action "Supprimer" avec confirmation destructive (réutiliser le composant existant — cf. Lot-9 L9-2 standardize destructive confirmations).
- Banner d'avertissement : "Modifier ou supprimer une certification VERIFIED la repasse en PENDING (revérification staff requise)."
- Lien retour vers `/seller/profile/edit`.

### Page 2 — Certifications d'un MarketplaceProduct

Route : `/seller/marketplace-products/[id]/certifications`

Mêmes fonctionnalités que la page 1, mais scope `MARKETPLACE_PRODUCT` avec `relatedId = [id]`.

Pré-vérification d'ownership : si l'API renvoie 403/404, afficher hint clair (miroir de ce qui est fait sur la page seasonality FP-4).

Lien retour vers la page index `/seller/marketplace-products` et/ou la fiche produit.

### Composant partagé — `SellerCertificationsManager`

Composant unique paramétré par `relatedType` + `relatedId`, réutilisé par les deux pages. Contient :

- Liste + état chargement / vide / erreur.
- Formulaire création / édition (champs : `type` select sur `CertificationType` enum, `issuingBody` text optionnel, `code` text optionnel, `issuedAt` date optionnelle, `validFrom` date optionnelle, `validUntil` date optionnelle).
- Validation client miroir des contraintes serveur (au minimum : `type` requis ; `validUntil >= validFrom` si les deux fournis).
- Gestion des erreurs serveur retournées par champ.

Pas de `documentMediaId` dans ce lot — laisser l'API recevoir `null/undefined` sur ce champ.

### Helper API frontend

Créer `apps/frontend/src/lib/marketplace/certifications-api.ts` (ou ajouter dans `marketplace/api.ts` selon pattern existant — vérifier ce qui est en place puis être cohérent) :

- `list({ relatedType, relatedId })` → GET `/marketplace/certifications?relatedType=...&relatedId=...`
- `create(payload)` → POST `/marketplace/certifications`
- `update(id, payload)` → PATCH `/marketplace/certifications/:id`
- `remove(id)` → DELETE `/marketplace/certifications/:id`

Types alignés sur le DTO backend (lire `apps/backend/src/marketplace-certifications/dto/marketplace-certification.dto.ts` avant d'écrire le helper).

### Lien d'accès

- Sur `/seller/profile/edit`, ajouter un lien "Gérer mes certifications" vers `/seller/profile/certifications`.
- Sur l'index `/seller/marketplace-products`, ajouter une colonne ou un lien "Certifications" par ligne, à côté du lien "Saisonnalité" existant (cf. FP-4).
- Optionnel mais bienvenu : QuickLink dans Raccourcis du dashboard seller.

## Périmètre exclu

- Pas d'upload de PDF justificatif (déféré).
- Pas de gestion staff (verify/reject) — déjà fait, l'UI staff est hors scope FP-2.1.
- Pas de modification du composant public `CertificationBadgeList.tsx`.
- Pas de support `MARKETPLACE_OFFER` (volontairement hors MVP, cf. contexte canonique).
- Pas d'i18n complète (libellés FR uniquement comme le reste de l'app).

## Méthodologie de travail

1. Lire d'abord, dans cet ordre :
   - `apps/backend/src/marketplace-certifications/marketplace-certifications.controller.ts`
   - `apps/backend/src/marketplace-certifications/marketplace-certifications.service.ts`
   - `apps/backend/src/marketplace-certifications/dto/marketplace-certification.dto.ts`
   - `apps/frontend/src/components/marketplace/CertificationBadgeList.tsx`
   - `apps/frontend/src/app/(dashboard)/seller/marketplace-products/[id]/seasonality/page.tsx` (pattern de référence pour l'auth, la résolution d'ownership, la gestion d'erreur)
   - `apps/frontend/src/app/(dashboard)/seller/profile/edit/page.tsx` (pattern controlled state)
   - `apps/frontend/src/lib/marketplace/api.ts` et `apps/frontend/src/lib/marketplace/types.ts`
2. Écrire un mini-plan de 10 lignes max dans `notes/fp-2-1-plan.md` avant de coder. Commit `chore(notes): plan FP-2.1`.
3. Coder en boucle courte : modifier → typecheck → test ciblé → commit atomique.
4. Lancer la suite complète de tests à chaque sous-étape majeure.

## Tests attendus

Frontend (vitest) :

- `SellerCertificationsManager` : rendu liste vide, rendu liste pleine, ouverture formulaire création, validation client (`type` requis, `validUntil >= validFrom`), submit OK, submit erreur 4xx avec mapping de champ, suppression avec confirmation.
- Page `/seller/profile/certifications` : redirection si non authentifié (couvert par middleware existant), affichage hints 404/409 sur `findMine`, banner d'avertissement présent.
- Page `/seller/marketplace-products/[id]/certifications` : hints 403/404 si pas propriétaire, banner d'avertissement présent.

Pas de nouveau test backend nécessaire (le service est déjà couvert).

Cibler **+10 à +15 tests vitest** (passer de 117 à ~130).

## Critères de succès

- Branche locale `fp-2-1-seller-certifications-edition` verte.
- `pnpm --filter @iox/backend test` toujours 450/450.
- `pnpm --filter @iox/frontend exec vitest run` ≥ 127 tests passants.
- `pnpm lint` et `pnpm typecheck` propres sur les deux apps.
- Aucune modification de migration Prisma, du schéma, du controller backend.
- Doc mise à jour : créer `docs/marketplace/MARKETPLACE_CERTIFICATIONS.md` (vue d'ensemble FP-2 + FP-2.1) ou compléter `docs/marketplace/SELLER_PROFILE.md` si plus cohérent. Documenter explicitement le choix d'omettre `documentMediaId` du formulaire seller.
- Working tree clean en fin.

## Smoke tests à valider après merge (à reporter dans le handoff)

- [ ] Seller approuvé : ajouter une certification BIO_EU sur son profil, voir le statut PENDING.
- [ ] Staff QUALITY_MANAGER : appeler `POST /marketplace/certifications/:id/verify` (via Postman ou via l'UI admin existante si présente) → la certif passe VERIFIED, et le badge apparaît côté public.
- [ ] Seller modifie cette certif → elle repasse PENDING, le badge disparaît du public.
- [ ] Buyer reçoit 403 sur `POST /marketplace/certifications`.
- [ ] La projection publique sur `/marketplace/products/[slug]` continue d'afficher uniquement les certifs VERIFIED non expirées.

## Gestion des blocages

- **Pattern API frontend non clair** : suivre exactement le pattern de `sellerProfilesApi` introduit en FP-3 (helper dédié, types stricts, gestion d'erreur via `ApiError`).
- **DTO backend incomplet pour `Certification`** (peu probable) : compléter côté frontend uniquement, ne pas modifier le DTO backend dans ce lot.
- **Scope ambigu sur la page produit** : si l'API ne propose pas de filtrage exact `relatedType + relatedId`, vérifier ce qui est implémenté côté `findAll` du service backend (`marketplace-certifications.service.ts`) avant d'inventer un endpoint.

## Rapport attendu en fin

Mettre à jour `notes/handoff-<date>.md` avec :

- Résumé FP-2.1 (3 lignes).
- Liste des fichiers créés / modifiés.
- Tests : avant / après (backend, frontend).
- Décisions clés (omission `documentMediaId`, composant partagé, etc.).
- Smoke tests à effectuer.
- Branche prête à push : `git push -u origin fp-2-1-seller-certifications-edition && gh pr create --base main --head fp-2-1-seller-certifications-edition --title "feat(marketplace): FP-2.1 édition certifications par seller"`.
