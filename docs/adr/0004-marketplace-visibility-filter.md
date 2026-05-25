# ADR-0004 — MarketplaceVisibilityFilter domain module

**Status** : Accepted
**Date** : 2026-05-25
**Decision-maker** : Caveman session — architecture deepening #3

## Context

Les règles de visibilité publique marketplace sont documentées dans
`docs/MARKETPLACE.md` (4 projections officielles) mais implémentées de
manière procédurale et **dupliquées** dans `marketplace-catalog.service.ts`
(~5 répétitions par projection).

Inventaire des duplications dans `marketplace-catalog.service.ts` :

| Projection | Règle | Répétitions |
|------------|-------|-------------|
| Offer public | `publicationStatus=PUBLISHED ∧ visibilityScope≠PRIVATE` | 5+ |
| Product public | `publicationStatus ∈ {APPROVED,PUBLISHED} ∧ seller=APPROVED ∧ ≥1 media PRIMARY APPROVED` | 3 |
| Seller public | `status=APPROVED` | 5+ |
| Document public | `visibility=PUBLIC ∧ verificationStatus=VERIFIED ∧ (validUntil null OR > now)` | 3 |
| Media public | `moderationStatus=APPROVED` | 6+ |

Conséquences :
- Modifier une règle = patcher 5+ endroits. Risque d'oubli (bug `seller
  SUSPENDED leak` déjà attrapé une fois par E2E P13-E).
- Les tests catalog doivent setup datasets exhaustifs pour valider une
  règle simple (ex : doc expiré).
- Aucun moyen de tester directement une projection en isolation.
- La doc `MARKETPLACE.md` n'est pas directement vérifiable.

Diagnostic du skill `improve-codebase-architecture` (candidat #5) :
**procedural duplicated logic, hard-to-test pattern, missing seam**.

## Decision

Créer **MarketplaceVisibilityFilter** dans
`apps/backend/src/marketplace-catalog/domain/`.

**Interface** (small, declarative) :

```typescript
@Injectable()
export class MarketplaceVisibilityFilter {
  /** Where partial pour les offres publiques. */
  publicOfferWhere(): Prisma.MarketplaceOfferWhereInput;

  /** Where partial pour les produits publiquement listables. */
  publicProductWhere(): Prisma.MarketplaceProductWhereInput;

  /** Where partial pour les sellers publiquement visibles. */
  publicSellerWhere(): Prisma.SellerProfileWhereInput;

  /** Where partial pour les documents publics non expirés. */
  publicDocumentWhere(now?: Date): Prisma.MarketplaceDocumentWhereInput;

  /** Where partial pour les médias APPROVED. */
  publicMediaWhere(): Prisma.MediaAssetWhereInput;
}
```

Chaque méthode retourne un **`WhereInput` Prisma partiel et composable**.
Le caller compose avec ses propres filtres via `AND`/`OR` ou via étalement.

## Migration plan (strict, reviewable)

**Scope : 1 PR = 1 service migré**.

1. **Phase 1 — Cette PR** :
   - Créer `MarketplaceVisibilityFilter` + 5 méthodes
   - Tests purs (snapshot du retour `WhereInput`, no Prisma exec)
   - Migrer **uniquement** `marketplace-catalog.service.ts` (5 call-sites
     identifiés)
   - Aucun changement comportement runtime (mêmes tests catalog passent)

2. **Phase 2 — PR séparée plus tard** :
   - Étendre vers `marketplace-products.service.ts`,
     `marketplace-offers.service.ts`,
     `marketplace-documents.service.ts`
   - Idem : pas de changement comportement

3. **Phase 3 — Documentation** :
   - `docs/MARKETPLACE.md` référence directement
     `MarketplaceVisibilityFilter` comme source de vérité

## Consequences

**Positives** :
- Single source of truth aligné avec `MARKETPLACE.md`
- Locality : modifier une règle = 1 fichier
- Tests : assertion directe sur la projection (`expect(filter.publicOfferWhere()).toMatchSnapshot()`)
- Leverage : tout futur service marketplace consomme le filter
- Le bug `seller SUSPENDED leak` devient impossible à introduire dans un
  nouveau call-site (le filter applique TOUTES les règles)

**Négatives** :
- 1 module supplémentaire à comprendre
- Coût migration progressif (3 phases)

## Hors scope (V2+)

- Filtres "preview" pour admin (voir les rejected, expired, etc.)
- Filtres par contexte buyer (ex : "visible pour buyer X seulement")
- Performance optimization (compile-time WHERE → SQL views)

## Tests strategy

Tests **purs** sur les méthodes :
- Pas de Prisma, pas de DB
- Assertions structurelles : `expect(result).toEqual({ ... })` ou snapshots
- Test du `now()` injectable pour `publicDocumentWhere` (expiration)
- 1 test par règle métier de la table d'inventaire

Tests d'intégration **inchangés** : les specs catalog passent sans
modification.
