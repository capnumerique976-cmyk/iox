# IOX — Domain Language

Vocabulaire métier de référence. Évolue avec les sessions de design. Les
ADRs (`docs/adr/`) capturent les décisions architecturales.

## Acteurs

- **Seller** — producteur (Mayotte, Madagascar, océan Indien). Possède un
  `SellerProfile`, des `MarketplaceProduct`, des `MarketplaceOffer`, des
  `Certification`. Compte Stripe Connect via `SellerStripeAccount`.
- **Buyer** — importateur / distributeur B2B (UE, océan Indien). Rattaché
  à une `Company` via `UserCompanyMembership`. Initie des `QuoteRequest`.
- **Admin** / **Coordinator** — staff IOX qui modère, qualifie, débloque.
- **Quality** — sous-rôle admin focalisé moderation médias / documents /
  produits.

## Concepts marketplace

- **MarketplaceProduct** — fiche produit publique. Décline 8 dimensions
  FP-x (fine origin, logistics, quality, seasonality, volumes…).
- **MarketplaceOffer** — instance commerciale d'un produit avec prix,
  MOQ, conditions, batch. Statut `DRAFT` → `PUBLISHED` → `SUSPENDED` →
  `ARCHIVED`.
- **MarketplaceCatalog** — projection publique : produit visible ssi
  ≥1 offre publique + seller non-suspendu + status `PUBLISHED`.
- **MarketplaceDocument** — document attaché à offer/product (HACCP, BIO,
  Phytosanitaire). Visibilité `PUBLIC`/`PRIVATE` + verification `VERIFIED`.
- **MediaAsset** — image / vidéo produit ou seller. Moderation
  `PENDING`/`APPROVED`/`REJECTED`.
- **MarketplaceReviewQueue** — file de modération admin.

## Concepts RFQ + paiement

- **QuoteRequest (RFQ)** — demande de devis buyer → seller. Lifecycle :
  `NEW` → `QUALIFIED` → `QUOTED` → `NEGOTIATING` → `WON` | `LOST`.
- **agreedAmountCents** — montant final verrouillé serveur à la transition
  `→ WON`. Source de vérité pour checkout Stripe. Voir M133.
- **Payment** — intent Stripe (CheckoutSession + PaymentIntent). Statuts :
  `PENDING` → `SUCCEEDED` | `FAILED` | `REFUNDED`. Lié 1:1 à une RFQ WON.
- **Invoice** — facture B2B générée à partir d'un Payment SUCCEEDED.
  Numéro `IOX-YYYY-NNNNNN`. Génération PDF via pdfkit.
- **Order** (PAY-2 — design, non implémenté) — entité commerciale post-paiement.
  Lifecycle `CONFIRMED → SHIPPED → DELIVERED → COMPLETED`. Trigger payout
  seller à l'escrow release.

## Concepts paiement Stripe

- **PaymentProvider** — interface adapter (seam réel : `StripePaymentProvider`
  + `MockPaymentProvider`). Découple le domaine du SDK Stripe.
- **SellerStripeAccount** — compte Stripe Connect Express d'un seller.
  Champs `chargesEnabled`, `payoutsEnabled`, `detailsSubmitted`. Onboarding
  via account link.
- **Application Fee** — commission plateforme IOX prélevée sur chaque
  Payment (5% V1).

## Concepts transversaux

- **Ownership** — règle métier : un seller voit/modifie uniquement ses
  propres entités (`SellerProfile.id ∈ user.sellerProfileIds`). Centralisé
  dans `SellerOwnershipService`.
- **Idempotency** — clé HTTP `Idempotency-Key` injectée par le frontend
  sur POST/PATCH/PUT, dédupliquée 24h via `IdempotencyKey` table.
- **AuditLog** — journal immuable de toute mutation. Champs `action`,
  `entityType`, `entityId`, `previousData`, `newData`, `userId`, `requestId`.
- **Notif-email** — système d'envoi email avec 3 transports (mock,
  smtp-stream, resend) et templates Handlebars. `EmailLog` persiste
  chaque envoi avec statut.

## Visibilité publique (4 projections)

Documentées dans `docs/MARKETPLACE.md`, répliquées dans mock SSR E2E :

- `isOfferPublic` — `status ∉ {ARCHIVED, SUSPENDED, DRAFT}` ∧
  `isPublished` ∧ `publishedAt ≤ now`
- `isProductPublic` — ≥1 offre publique ∧ seller `≠ SUSPENDED` ∧
  product `status = PUBLISHED`
- `isMediaPublic` — `moderationStatus = APPROVED`
- `isDocumentPublic` — `visibility = PUBLIC` ∧ `verificationStatus =
  VERIFIED` ∧ (absent `validUntil` ∨ `validUntil > now`)

## Architecture

- **Monorepo** pnpm — `apps/backend` (NestJS), `apps/frontend` (Next.js
  14 App Router), `packages/shared` (types domaine).
- **Persistence** — PostgreSQL 15 via Prisma. `@iox/shared` réexporte des
  types domaine string-based découplés de `@prisma/client`.
- **Auth** — JWT access (15min) + refresh (7j). RolesGuard par décorateur
  `@Roles()`.
- **Cohabitation VPS** — IOX coexiste avec Telemante, Agora, Vavo sur
  `rahiss-vps`. Voir `CLAUDE.md` pour règles d'isolation.
