# FP-3 — auto-édition profil seller — plan d'attaque

## Contraintes héritées
- `PATCH /marketplace/seller-profiles/:id` existe déjà et gère ownership +
  audit + bascule vitrine APPROVED → PENDING_REVIEW.
- Le ValidationPipe global est en `whitelist + forbidNonWhitelisted` →
  un nouveau DTO suffit pour bloquer les champs hors whitelist.
- Nom des champs en BDD : `publicDisplayName`, `descriptionShort`,
  `descriptionLong`, `story`, `salesEmail`, `salesPhone`, `website`,
  `country`, `region`, `cityOrZone`, `logoMediaId`, `bannerMediaId`,
  `languages`, `supportedIncoterms`, `destinationsServed`,
  `averageLeadTimeDays`. On colle à ces noms (pas de remap inutile).
- Un user MARKETPLACE_SELLER peut être attaché à >1 sellerProfile via
  `actor.sellerProfileIds` → `/me` ambigu → on renvoie 409 si plusieurs
  et on demande d'utiliser `PATCH /:id`. 0 → 404.

## Périmètre exact
### Backend
1. `UpdateMySellerProfileDto` (dans `dto/seller-profile.dto.ts`) avec
   bornes (publicDisplayName 2–80, descriptionShort 0–280,
   descriptionLong 0–2000, story 0–4000, salesPhone 0–30,
   `IsUrl({ protocols:['https','http']})` website pour rester compat
   donnée existante, MaxLength sur city/region/country). Pas de slug,
   pas de legalName, pas de status (interdits côté self).
2. Service :
   - `findMine(actor)` : reads single seller profile via
     `actor.sellerProfileIds`. 0 → NotFoundException, >1 → ConflictException.
   - `updateMine(dto, actor)` : résout id puis délègue à `update(id, dto, actor)`.
3. Controller : ajouter `GET /me` et `PATCH /me` AVANT `/:id` (priorité de
   route Nest). Roles MARKETPLACE_SELLER + ADMIN (admin pourrait n'avoir
   aucun seller profile → renverra 404, c'est OK).
4. Tests : 4 nouveaux cas dans `seller-profiles.service.spec.ts` :
   - findMine 0 → NotFound
   - findMine 1 → ok
   - findMine 2 → Conflict
   - updateMine délègue à update et renvoie payload

### Frontend
1. Helper `apps/frontend/src/lib/seller-profiles.ts` : ajouter
   `getMyProfile(token)` et `updateMyProfile(dto, token)` typés.
2. Page `apps/frontend/src/app/(dashboard)/seller/profile/edit/page.tsx` :
   - `'use client'` + react-hook-form + zod (déjà installés).
   - Charge GET /me, mappe en form, dirty state, submit PATCH /me.
   - Mapping des erreurs serveur (ApiError.details ou message générique).
   - Avatar / banner : champs en lecture seule (afficher l'ID + hint
     "uploader pas dans ce lot"). À justifier dans le commit.
3. Lien depuis `seller/dashboard` : ajouter un bouton "Éditer mon profil"
   à côté de "Voir fiche publique".
4. Tests vitest : un test léger sur le helper API + un test rendu form
   (valeurs initiales + submit appelle updateMyProfile). On reste light
   pour ne pas dériver.

## Sortie attendue
- Branche `fp-3-seller-self-edit` sur main, commits atomiques.
- pnpm lint + typecheck + test verts.
- handoff dans `notes/handoff-2026-04-26.md` à la fin de la journée.

## Décisions conservatrices documentées
- `slug` non éditable côté self : un changement de slug casse les liens
  publics (SEO + emails). Reste en `PATCH /:id` admin/coordinator.
- `legalName` non éditable côté self : touchant l'identité légale, doit
  rester au staff.
- Avatar / banner read-only dans ce lot : pas d'uploader prêt en SR-only,
  pas de scope MVP pour upload depuis ce form (reuse uploader marketplace
  documents prévu dans un futur lot).
