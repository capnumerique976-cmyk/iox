# ADR-0006 — BuyerOwnershipService (deepening #4)

**Status** : Accepted
**Date** : 2026-05-26
**Decision-maker** : Caveman session — architecture deepening #4

## Context

`SellerOwnershipService` (ADR implicite, créé V2) centralise les règles
d'ownership pour les ressources seller-scope (SellerProfile,
MarketplaceProduct, MarketplaceOffer, MediaAsset, MarketplaceDocument).
Pattern réussi : staff bypass, seller scopé via `sellerProfileIds`.

**Absent symétrique** : les ressources buyer-scope (Company, Invoice,
Payment, QuoteRequest côté buyer) ont leur ownership checks **inline et
dispersés** :

- `payments/invoices.controller.ts` (1 call-site)
- `payments/invoices.service.ts` (3 call-sites)
- `seller-profiles/seller-profiles.service.ts` (1 call-site mixte)
- `users/journey.service.ts` (3 call-sites)
- `companies/companies.controller.ts` (2 call-sites)
- `companies/companies.service.ts` (2 call-sites)

Pattern répété : `(actor.companyIds ?? []).includes(...)`.

Conséquences :
- Ajouter une règle (ex : "buyer doit avoir membership ACTIVE") = 11+
  endroits à modifier
- Tests doivent setup actor.companyIds dans chaque spec
- Aucune symétrie avec `SellerOwnershipService` → cognitive load
- Risque d'oubli sur nouveau endpoint buyer-scope

Diagnostic skill `improve-codebase-architecture` (candidat #4) :
**ownership scattering, missing higher-level seam**.

## Decision

Créer `BuyerOwnershipService` dans
`apps/backend/src/common/services/buyer-ownership.service.ts`.

**Interface** (mirror de `SellerOwnershipService`) :

```typescript
@Injectable()
export class BuyerOwnershipService {
  isStaff(actor: RequestUser): boolean;
  isBuyer(actor: RequestUser): boolean;

  /** Where clause partial : scope par companyIds du buyer. Staff → {}. */
  scopeBuyerCompanyFilter(actor: RequestUser): { buyerCompanyId?: { in: string[] } };

  /** Idem mais générique sur champ `companyId`. */
  scopeCompanyFilter(actor: RequestUser): { id?: { in: string[] } };

  /** Asserte que actor peut agir sur cette company (membership). */
  assertCompanyOwnership(actor: RequestUser, companyId: string): Promise<void>;

  /** Asserte qu'une ressource buyer-scope (buyerCompanyId) appartient au scope. */
  assertBuyerCompanyOwnership(actor: RequestUser, buyerCompanyId: string): void;

  /** Helper booléen (pas de throw). */
  canReadBuyerCompany(actor: RequestUser, buyerCompanyId: string): boolean;
}
```

## Migration plan (strict)

**Cette PR (phase 1)** :
- Créer `BuyerOwnershipService` + tests purs (no Prisma queries, sauf
  `assertCompanyOwnership` qui peut hit DB pour vérifier existence)
- Provider dans `CommonModule`
- Migrer **uniquement** `payments/invoices.{service,controller}.ts`
  (4 call-sites) — scope reviewable
- Tests existants `invoices` passent

**Hors scope (phases futures, issues séparées)** :
- Migrer `seller-profiles`, `journey`, `companies` services (phase 2)
- Migrer `payments.service` (phase 2)
- Unifier `SellerOwnershipService` + `BuyerOwnershipService` en
  `MarketplaceOwnershipService` (V2+, demande réflexion)

## Consequences

**Positives** :
- Symétrie avec `SellerOwnershipService` (cognitive load réduit)
- Single source of truth pour règles buyer ownership
- Tests services consommant ce module : mock simple
- Locality : modif règle = 1 fichier

**Négatives** :
- 1 service supplémentaire à comprendre
- Coût migration phasé

## Tests strategy

- Tests purs sur `scope*` (no DB)
- Test `assertCompanyOwnership` avec Prisma mock (vérifie existence)
- Test `assertBuyerCompanyOwnership` pur (vérifie includes)
- Tests services migrés inchangés (delegate vers mock)
