# IOX — Fiche producteur (Seller Profile)

> Dernière mise à jour : 2026-04-26 — chantier "fiche producteur".
> Ce document décrit les capacités vitrine d'un `SellerProfile` /
> `MarketplaceProduct`, lot par lot, pour accompagner les revues PR.

## Lots livrés

| Lot   | Sujet                                       | Statut       |
| ----- | ------------------------------------------- | ------------ |
| FP-1  | Saisonnalité produit (vitrine + DTO backend)| ✅ Livré      |
| FP-2  | Certifications structurées                  | ✅ Livré      |
| FP-3  | Auto-édition profil seller (PATCH /me)      | ✅ Livré      |
| FP-4  | Saisonnalité — saisie seller (UI éditable)  | ✅ Livré      |
| FP-5  | Volumes / capacités / unités typées         | ⏳ À venir    |
| FP-6  | Histoire producteur + médias enrichis       | ⏳ À venir    |

## FP-2 — Certifications structurées

### Périmètre

Permet à un vendeur (ou au staff) de déclarer une **certification
structurée** (BIO_EU, ECOCERT, FAIRTRADE, GLOBALG.A.P., HACCP, etc.)
attachée soit à son profil vendeur, soit à un produit marketplace
spécifique. Chaque certification est validée par le staff qualité avant
d'apparaître dans la projection publique.

### Hors scope MVP (volontairement)

- Certifications attachées à une `MarketplaceOffer` (pas dans le MVP) ou
  à un `ProductBatch` (traçabilité amont déjà couverte).
- Pas de stockage spécifique : la **preuve documentaire** est portée par
  un `MediaAsset` standard (PDF scanné, photo de licence) lié à la même
  entité que la certification.
- Pas d'enqueue dans la `MarketplaceReviewQueue` : le pipeline est
  synchrone (`PENDING → VERIFIED/REJECTED` via deux endpoints staff),
  l'historique vit dans `audit_logs`.
- Pas de notification email staff/seller — non requis par le MVP.

### Modèle de données

Table : `marketplace_certifications` (migration
`20260425030000_add_marketplace_certifications`).

```text
id                    uuid (pk)
related_type          enum MarketplaceRelatedEntityType
                       MVP autorisé : SELLER_PROFILE, MARKETPLACE_PRODUCT
related_id            uuid
type                  enum CertificationType
                       BIO_EU, BIO_USDA, ECOCERT, FAIRTRADE,
                       RAINFOREST_ALLIANCE, HACCP, ISO_22000, ISO_9001,
                       GLOBALGAP, BRC, IFS, KOSHER, HALAL, OTHER
code                  text (nullable)            -- n° de licence (NULL = OK)
issuing_body          text (nullable)
issued_at             timestamp (nullable)
valid_from            timestamp (nullable)
valid_until           timestamp (nullable)       -- null = pas d'expiration
document_media_id     uuid (nullable)            -- pointeur MediaAsset
verification_status   enum (default PENDING)     -- PENDING / VERIFIED / REJECTED / EXPIRED
rejection_reason      text (nullable)
verified_by_user_id   uuid (nullable)
verified_at           timestamp (nullable)
created_*, updated_*  audit standards
```

Index :

- `(related_type, related_id)` — lookup principal vitrine
- `(type)`, `(verification_status)`, `(valid_until)` — facettes / cron
  d'expiration (cron à venir, hors scope FP-2)
- `UNIQUE (related_type, related_id, type, code)` — empêche les
  doublons. `code` étant nullable, Postgres autorise plusieurs entrées
  sans code (utile pour `OTHER`).

Migration **strictement additive** : aucune colonne existante touchée.
Ajoute aussi `EntityType.MARKETPLACE_CERTIFICATION` (audit log) via
`ALTER TYPE … ADD VALUE IF NOT EXISTS`.

### API REST (`/marketplace/certifications`)

| Verb / Path                                  | Rôles                                                       | Effet                                      |
| -------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------ |
| `GET /`                                       | ADMIN, COORDINATOR, QUALITY_MANAGER, AUDITOR, SELLER         | Listing scopé (filtre seller auto)         |
| `GET /public?relatedType=…&relatedId=…`       | tous rôles authentifiés                                      | VERIFIED + non expirées uniquement         |
| `GET /:id`                                    | staff + SELLER + AUDITOR                                     | Fiche                                      |
| `POST /`                                      | ADMIN, COORDINATOR, QUALITY_MANAGER, SELLER                  | Crée en `PENDING`                          |
| `PATCH /:id`                                  | idem                                                         | Modifie ; si VERIFIED, repasse PENDING     |
| `DELETE /:id`                                 | idem                                                         | Supprime + audit                           |
| `POST /:id/verify`                            | ADMIN, QUALITY_MANAGER                                       | `PENDING/REJECTED → VERIFIED`              |
| `POST /:id/reject`                            | ADMIN, QUALITY_MANAGER                                       | `* → REJECTED` + motif obligatoire         |

### Règles métier (service)

- **Scope** : `relatedType` doit appartenir à
  `CERTIFICATION_ALLOWED_SCOPES` (`SELLER_PROFILE`,
  `MARKETPLACE_PRODUCT`). Tout autre scope → `BadRequestException`.
- **Ownership** : chaque mutation seller appelle
  `SellerOwnershipService.assertRelatedEntityOwnership` ; un seller hors
  périmètre reçoit `403`.
- **OTHER** : impossible sans `code` *et* sans `issuingBody` (au moins
  l'un des deux).
- **Validité** : `validUntil > validFrom` ; `validUntil` ne peut pas être
  dans le passé à la création.
- **Document de preuve** : si `documentMediaId` fourni, le `MediaAsset`
  doit être attaché à la **même entité** que la certification (cohérence
  ownership).
- **Update post-vérification** : toute modification d'un champ factuel
  (`code`, `issuingBody`, `issuedAt`, `validFrom`, `validUntil`,
  `documentMediaId`) sur une certif `VERIFIED` la replace en `PENDING`
  et purge `rejectionReason / verifiedBy*`.
- **Verify d'une certif expirée** : refusé (`BadRequestException`).
- **Conflit unicité** (`P2002`) : remappé en `BadRequestException`
  ("certif type+code déjà déclarée").

### Audit

Toutes les mutations émettent un `audit.log` :
`MARKETPLACE_CERTIFICATION_CREATED / UPDATED / DELETED / VERIFIED /
REJECTED` avec `entityType = MARKETPLACE_CERTIFICATION`.

### Projection publique

Les certifications `VERIFIED` non expirées sont jointes par le module
catalog :

- `GET /marketplace/catalog/products/by-slug/:slug` → champ
  `certifications` agrège produit + vendeur en une seule requête
  (`AND[OR scopes, OR validUntil-null/futur]`).
- `GET /marketplace/catalog/sellers/by-slug/:slug` → champ
  `certifications` (scope seller seul).

### Frontend

- `apps/frontend/src/lib/marketplace/types.ts` :
  `Certification`, `CertificationType`, `CertificationScope`.
- Composant lecture seule
  `apps/frontend/src/components/marketplace/CertificationBadgeList.tsx` :
  - rend rien si liste vide (no-op silencieux),
  - chaque badge expose `data-scope`, `data-cert-id`, `aria-label`
    (label + organisme + code + validité),
  - styling aligné `iox-glass` + `bg-gradient-iox-neon` (homogène avec
    `SeasonalityCalendar`),
  - titre masquable via `title={null}`.
- Intégré sur :
  - `marketplace/products/[slug]/page.tsx` (sous la saisonnalité)
  - `marketplace/sellers/[slug]/page.tsx` (entre header et story)

### Tests

- Backend : `marketplace-certifications.service.spec.ts` — 13 cas
  (création, scope refusé, OTHER incomplet, ownership 403, validUntil
  passée, media incohérent, verify, reject, expiration, update repasse
  PENDING, findPublic).
- Frontend : `CertificationBadgeList.test.tsx` — 4 cas (vide, plusieurs
  badges + scopes, a11y label, titre masqué).
- Adaptation `marketplace-catalog.service.spec.ts` : ajout du mock
  `prisma.certification.findMany` pour les nouvelles jointures
  (zéro régression sur les 446 tests existants).

### Limites connues FP-2 / dette future

- Pas de cron de transition `VERIFIED → EXPIRED` : actuellement déduit en
  lecture (`validUntil > now`). Stockage à plat reste à un état
  passé/présent intentionnellement (audit pur).
- Pas d'export CSV staff.
- Pas d'i18n EN du libellé sur le badge (FR-only MVP, aligné sur le
  reste de la fiche produit).

## FP-3 — Auto-édition du profil seller

### Périmètre

Permet au seller connecté (rôle `MARKETPLACE_SELLER`) d'éditer
**lui-même** sa fiche vendeur sans passer par un admin. Endpoint dédié
`PATCH /marketplace/seller-profiles/me` qui résout le profil via
`actor.sellerProfileIds` puis délègue au pipeline de mise à jour
existant (ownership + audit + bascule vitrine).

### Hors scope FP-3 (volontairement)

- Édition du `slug` (impacte SEO + liens publics) → reste staff via
  `PATCH /:id`.
- Édition du `legalName` (identité légale) → idem.
- Upload d'avatar / bannière depuis ce form : pas d'uploader inline
  dans ce lot, le téléversement passe par `MediaAsset` standard ou
  l'écran `/seller/documents`. Les champs `logoMediaId` / `bannerMediaId`
  sont rendus en lecture seule sur l'écran d'édition.
- Création de profil par le seller : déjà couvert par `POST /` (DRAFT).

### API

| Verb / Path                                         | Rôles                       | Effet                                                              |
| --------------------------------------------------- | --------------------------- | ------------------------------------------------------------------ |
| `GET /marketplace/seller-profiles/me`               | MARKETPLACE_SELLER, ADMIN   | Renvoie le profil unique. 404 si aucun, 409 si plusieurs.          |
| `PATCH /marketplace/seller-profiles/me`             | MARKETPLACE_SELLER, ADMIN   | Auto-édition restreinte (DTO `UpdateMySellerProfileDto`).          |

Les deux routes sont enregistrées **avant** `/:id` pour ne pas être
avalées par le `ParseUUIDPipe` (Express router ordre-dépendant).

### DTO `UpdateMySellerProfileDto`

Champs whitelistés (tout le reste rejeté par
`ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`) :

- `publicDisplayName` 2–80
- `country` ≤ 80, `region` ≤ 80, `cityOrZone` ≤ 120
- `descriptionShort` ≤ 280, `descriptionLong` ≤ 2000, `story` ≤ 4000
- `languages: string[]` (chaque code ≤ 8)
- `salesEmail` (IsEmail, ≤ 160), `salesPhone` ≤ 30,
  `website` (IsUrl http/https, ≤ 255)
- `supportedIncoterms: string[]` (≤ 8 chars), `destinationsServed: string[]` (≤ 3 chars)
- `averageLeadTimeDays: int ≥ 0`
- `logoMediaId`, `bannerMediaId` (UUID)

### Service

- `SellerProfilesService.findMine(actor)` :
  - 0 profil → `NotFoundException` ("aucun profil rattaché"),
  - >1 profil → `ConflictException` (utiliser `PATCH /:id`),
  - 1 profil → délègue à `findById(id, actor)`.
- `SellerProfilesService.updateMine(dto, actor)` : résout via `findMine`,
  puis appelle `update(id, dto, actor)` qui gère ownership + audit +
  bascule `APPROVED → PENDING_REVIEW` quand un champ vitrine change.

### Frontend

- Page `apps/frontend/src/app/(dashboard)/seller/profile/edit/page.tsx`
  (controlled state, sans react-hook-form, miroir du style de `/profile`).
- Helper `apps/frontend/src/lib/seller-profiles.ts` : ajout
  `getMine(token)` + `updateMine(dto, token)` typés.
- Lien depuis `/seller/dashboard` : badge "Éditer mon profil" à côté
  de "Voir fiche publique" + raccourci dédié dans la section
  "Raccourcis".
- UX :
  - dirty state via diff JSON ; bouton Enregistrer désactivé tant qu'aucun
    changement ;
  - bandeau d'avertissement si profil `APPROVED` ("modifier un champ
    vitrine repassera la fiche en revue qualité") ;
  - mapping des erreurs serveur (`ApiError.details` array → join, sinon
    `.message`) ;
  - hint contextuel sur les écrans d'erreur 404 (onboarding incomplet)
    et 409 (plusieurs profils).

### Tests

- Backend : 4 nouveaux cas dans `seller-profiles.service.spec.ts`
  (findMine 0/1/N, updateMine délègue + bascule vitrine + audit).
  Total 29/29 sur le module, 450/450 sur le backend.
- Frontend : 3 cas dans `seller/profile/edit/page.test.tsx`
  (hydratation + bouton désactivé, payload diff + succès, 404 hint).
  Total 104/104 sur le frontend.

### Cohérence FP-1 / FP-2

Le PATCH `/me` ne touche aucun champ saisonnalité (FP-1) ni les
certifications (FP-2). Une bascule en `PENDING_REVIEW` ne dépublie pas
les certifications déjà `VERIFIED` ni la saisonnalité du produit (les
deux sont scopés à des entités distinctes).

### Limites connues / dette future

- Multi-profil par user : bloqué côté `/me`. Une UI staff dédiée
  permettrait de choisir explicitement un profil (hors MVP).
- Avatar/bannière en lecture seule sur cet écran : un sous-lot
  `FP-3.1 inline media uploader` permettrait d'unifier l'upload depuis
  le form sans passer par `/seller/documents`.
