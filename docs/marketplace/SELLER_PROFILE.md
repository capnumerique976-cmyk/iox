# IOX — Fiche producteur (Seller Profile)

> Dernière mise à jour : 2026-04-26 — chantier "fiche producteur".
> Ce document décrit les capacités vitrine d'un `SellerProfile` /
> `MarketplaceProduct`, lot par lot, pour accompagner les revues PR.

## Lots livrés

| Lot   | Sujet                                       | Statut       |
| ----- | ------------------------------------------- | ------------ |
| FP-1  | Saisonnalité produit                        | ✅ Livré      |
| FP-2  | Certifications structurées                  | ✅ Livré      |
| FP-3  | Auto-édition profil + SeasonalityPicker     | ⏳ À venir    |
| FP-4  | Volumes / capacités / unités typées         | ⏳ À venir    |
| FP-5  | Histoire producteur + médias enrichis       | ⏳ À venir    |

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

### Limites connues / dette future

- Pas de cron de transition `VERIFIED → EXPIRED` : actuellement déduit en
  lecture (`validUntil > now`). Stockage à plat reste à un état
  passé/présent intentionnellement (audit pur).
- Pas d'export CSV staff.
- Pas d'i18n EN du libellé sur le badge (FR-only MVP, aligné sur le
  reste de la fiche produit).
