# ADR-0002 — PricingPolicy domain module

**Status** : Accepted
**Date** : 2026-05-25
**Decision-maker** : Caveman session — architecture deepening

## Context

Les règles monétaires IOX (devises supportées, validation prix offre,
lock du `agreedAmountCents` à la transition RFQ→WON, calcul commission
plateforme 5%) sont éparpillées :

- `marketplace-offers.service:846` — private `validatePricing(priceMode,
  unitPrice, currency)`
- `quote-requests.service:435` — lock M133 inline
- `payments.service:68` — `computeApplicationFeeCents(amount)` inline

Chaque service réimplémente partiellement la même logique. Ajouter une
règle compliance (ex : blocked currency) = patch N services.

Diagnostic du skill `improve-codebase-architecture` : **missing seam,
ratio leverage / locality très bas**.

## Decision

Créer un module **PricingPolicy** dans `apps/backend/src/payments/domain/`.

**Interface** (petite, leverage élevé) :

```typescript
interface PricingPolicy {
  // Constantes domaine
  readonly SUPPORTED_CURRENCIES: readonly ['EUR', 'USD'];
  readonly APPLICATION_FEE_PERCENT: number; // 0.05

  // Normalisation + assertions
  normalizeCurrency(input: string | null | undefined): SupportedCurrency;
  assertSupportedCurrency(input: string): asserts input is SupportedCurrency;

  // Offre — validation input
  assertOfferPricingValid(args: {
    priceMode: MarketplacePriceMode;
    unitPrice: number | null | undefined;
    currency: string | null | undefined;
  }): void;

  // RFQ → WON — lock invariant
  lockAgreedAmount(args: {
    dtoAmountCents?: number;
    dtoCurrency?: string;
    offerUnitPriceCents?: number | null;
    offerCurrency?: string | null;
    requestedQuantity?: Decimal | number | null;
  }): { agreedAmountCents: number; agreedCurrency: SupportedCurrency };

  assertAgreedAmountLocked(rfq: {
    agreedAmountCents: number | null;
    agreedCurrency: string | null;
  }): asserts rfq is { agreedAmountCents: number; agreedCurrency: SupportedCurrency };

  // Payment — commission policy
  computeApplicationFeeCents(amountCents: number): number;
}
```

**Représentation monétaire** : `amountCents: number` (entier signé)
partout. Pas de `Decimal.js`, pas de string. La conversion
quantity × unitPrice → cents est gérée *à un seul endroit*
(`lockAgreedAmount`).

**Devises supportées V1** : `EUR`, `USD` uniquement. Hardcodé. Toute
extension passe par un PR explicite (pas de config DB / env).

**Conversion multi-devise** : hors scope V1. Le checkout exige
`buyer.currency = seller.currency` (vérifié dans `lockAgreedAmount`).

## Consequences

**Positives** :
- Single source of truth pour règles monétaires
- Locality : ajouter une devise = 1 fichier modifié
- Tests : `PricingPolicy` testable en isolation (pas de Prisma, pas de
  Stripe) — assertions sur invariants purs
- Leverage : tous services payments / offers / RFQ partagent la même
  policy gratuitement
- Audit : violations de policy auditées au même endroit

**Négatives** :
- 1 module supplémentaire à comprendre
- Coût migration : refactor de 3 services + leurs specs

**Risques** :
- Si on passe Decimal.js plus tard, refactor large. Mitigé : V1 cents
  int suffit pour EUR/USD avec amounts < 21M EUR.

## Migration plan

1. Créer `apps/backend/src/payments/domain/pricing-policy.service.ts`
2. Extraire 3 implémentations existantes vers méthodes
3. Inject dans `MarketplaceOffersService`, `QuoteRequestsService`,
   `PaymentsService`
4. Supprimer private methods + inline logic dupliquées
5. Tests unitaires PricingPolicy (~10 specs)
6. Re-run specs services concernés (ne doivent pas régresser)

## Hors scope

- Conversion multi-devise (V2)
- Tax / VAT (V2)
- Decimal.js (V3+ si volumes > 21M EUR)
- Commission tiered (V2 — possibilité 3% pour gros volumes)
