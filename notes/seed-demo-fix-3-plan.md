# SEED-DEMO-FIX-3 — Plan

Branche `seed-demo-fix-3-public-docs-and-rfq` depuis
`mp-offer-duplicate-1-seller-clone`.

## Objectif

Enrichir le seed-demo avec :
1. **4 `MarketplaceDocument` PUBLIC** (1 par seller principal) — pour que
   le filtre `hasPublicDocs=true` retourne 4 au lieu de 0.
2. **1 compte `smoke-buyer@iox.mch`** + une `Company` `DEMO-BUYER-001`
   (rôle MARKETPLACE_BUYER, password `IoxSmoke2026!`).
3. **2 `QuoteRequest` demo** + **4 `QuoteRequestMessage`** entre smoke-
   buyer et 2 offres seedées (1 vanille, 1 mangues frozen).

## Contraintes

- **Idempotent** strict : double-run = mêmes counts, pas de duplication.
- Le seed appelle `prisma.quoteRequest.create` directement (pas le service)
  — donc on **bypass** le hook `NotifEmailService.send` du LOT 1. Les
  emails seraient quand même skippés en transport `mock` (qui est le
  default), mais on ne s'expose pas au flux complet.
- **Aucune migration Prisma** — tous les modèles existent déjà.
- Tests jest seed-demo restent verts (étendus avec 5 nouveaux specs).
- Le run réel local valide les counts en DB (psql / prisma studio).

## Architecture

Le seed crée :
- `Document` MCH-level (linkedEntityType=PRODUCT, mimeType=application/pdf,
  storageKey placeholder) → puis `MarketplaceDocument` qui le référence
  avec `relatedType=MARKETPLACE_PRODUCT` + visibility=PUBLIC.
- `Company` demo-buyer-co (type IMPORTER) + `User` smoke-buyer + lien
  `UserCompanyMembership` (isPrimary=true).
- `QuoteRequest` upsert via composite naturel : `(buyerCompanyId,
  marketplaceOfferId, createdAtSeed)`. Schema n'a PAS d'unique sur ce
  triplet → utilisation `findFirst + create` pattern (idempotent).
- `QuoteRequestMessage` : `findFirst + create` sur `(quoteRequestId,
  authorUserId, message)`.

## Commits

1. `chore(notes): plan SEED-DEMO-FIX-3`
2. `feat(seed-demo): SEED-DEMO-FIX-3 — étend RunnerOptions/Summary (docs PUBLIC, RFQ, smoke-buyer)`
3. `feat(seed-demo): SEED-DEMO-FIX-3 — dataset (4 docs PUBLIC, 2 RFQ, 4 messages, smoke-buyer)`
4. `feat(seed-demo): SEED-DEMO-FIX-3 — runner (création + idempotence)`
5. `test(seed-demo): SEED-DEMO-FIX-3 — couverture nouveaux compteurs (+5 specs)`

## Mapping documents PUBLIC

| Seller slug | Document title | documentType |
|-------------|----------------|--------------|
| demo-coop-vanille | Fiche technique — Vanille Bourbon Grade A | TECHNICAL_DATA_SHEET |
| demo-pecheurs-mayotte | Certificat sanitaire — Thon jaune IQF | PHYTOSANITARY_CERTIFICATE |
| demo-ylang-bandrele | Fiche technique — Ylang-Ylang Extra | TECHNICAL_DATA_SHEET |
| demo-fruits-tsingoni | Certificat phytosanitaire — Mangue Maya | PHYTOSANITARY_CERTIFICATE |

## RFQ scenarios

| RFQ # | Buyer | Seller | Offre cible | Statut | Messages |
|-------|-------|--------|-------------|--------|----------|
| 1 | smoke-buyer | demo-coop-vanille | demo-vanille-poudre — offre principale | NEW | 2 (buyer init + seller reply) |
| 2 | smoke-buyer | demo-fruits-tsingoni | demo-mangue-maya — offre principale | QUOTED | 2 (buyer init + seller devis) |
