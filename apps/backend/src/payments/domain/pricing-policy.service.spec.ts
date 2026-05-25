// ADR-0002 — PricingPolicy domain module unit tests.
//
// Pas de Prisma, pas de Stripe. Pure domain logic.

import { BadRequestException } from '@nestjs/common';
import { MarketplacePriceMode } from '@iox/shared';
import { PricingPolicyService } from './pricing-policy.service';

describe('PricingPolicyService', () => {
  let svc: PricingPolicyService;

  beforeEach(() => {
    svc = new PricingPolicyService();
  });

  // ─── normalizeCurrency ──────────────────────────────────────────────

  describe('normalizeCurrency', () => {
    it('"eur" → "EUR"', () => {
      expect(svc.normalizeCurrency('eur')).toBe('EUR');
    });

    it('" USD " → "USD"', () => {
      expect(svc.normalizeCurrency(' USD ')).toBe('USD');
    });

    it('null → BadRequest', () => {
      expect(() => svc.normalizeCurrency(null)).toThrow(BadRequestException);
    });

    it('"GBP" → BadRequest (non supportée)', () => {
      expect(() => svc.normalizeCurrency('GBP')).toThrow(
        /non supportée.*GBP/,
      );
    });
  });

  // ─── assertOfferPricingValid ────────────────────────────────────────

  describe('assertOfferPricingValid', () => {
    it('QUOTE_ONLY sans prix → OK', () => {
      expect(() =>
        svc.assertOfferPricingValid({
          priceMode: MarketplacePriceMode.QUOTE_ONLY,
          unitPrice: null,
          currency: null,
        }),
      ).not.toThrow();
    });

    it('FIXED avec unitPrice=12.5 + EUR → OK', () => {
      expect(() =>
        svc.assertOfferPricingValid({
          priceMode: MarketplacePriceMode.FIXED,
          unitPrice: 12.5,
          currency: 'EUR',
        }),
      ).not.toThrow();
    });

    it('FIXED sans unitPrice → BadRequest', () => {
      expect(() =>
        svc.assertOfferPricingValid({
          priceMode: MarketplacePriceMode.FIXED,
          unitPrice: null,
          currency: 'EUR',
        }),
      ).toThrow(/unitPrice > 0/);
    });

    it('FIXED unitPrice=0 → BadRequest', () => {
      expect(() =>
        svc.assertOfferPricingValid({
          priceMode: MarketplacePriceMode.FIXED,
          unitPrice: 0,
          currency: 'EUR',
        }),
      ).toThrow(/unitPrice > 0/);
    });

    it('FROM_PRICE sans currency → BadRequest', () => {
      expect(() =>
        svc.assertOfferPricingValid({
          priceMode: MarketplacePriceMode.FROM_PRICE,
          unitPrice: 5,
          currency: null,
        }),
      ).toThrow(/currency/);
    });

    it('FIXED avec currency=GBP → BadRequest (non supportée)', () => {
      expect(() =>
        svc.assertOfferPricingValid({
          priceMode: MarketplacePriceMode.FIXED,
          unitPrice: 10,
          currency: 'GBP',
        }),
      ).toThrow(/non supportée/);
    });

    it('FIXED avec Prisma.Decimal-like → OK', () => {
      expect(() =>
        svc.assertOfferPricingValid({
          priceMode: MarketplacePriceMode.FIXED,
          unitPrice: { toNumber: () => 7.5 },
          currency: 'USD',
        }),
      ).not.toThrow();
    });
  });

  // ─── lockAgreedAmount ───────────────────────────────────────────────

  describe('lockAgreedAmount', () => {
    it('dtoAmountCents fourni → utilisé directement avec EUR par défaut', () => {
      expect(
        svc.lockAgreedAmount({ dtoAmountCents: 150000 }),
      ).toEqual({ agreedAmountCents: 150000, agreedCurrency: 'EUR' });
    });

    it('dtoAmountCents + dtoCurrency=usd → normalisée USD', () => {
      expect(
        svc.lockAgreedAmount({
          dtoAmountCents: 999900,
          dtoCurrency: 'usd',
        }),
      ).toEqual({ agreedAmountCents: 999900, agreedCurrency: 'USD' });
    });

    it('dtoAmountCents = 0 → BadRequest', () => {
      expect(() => svc.lockAgreedAmount({ dtoAmountCents: 0 })).toThrow(
        /entier > 0/,
      );
    });

    it('dtoAmountCents non entier → BadRequest', () => {
      expect(() =>
        svc.lockAgreedAmount({ dtoAmountCents: 12.5 }),
      ).toThrow(/entier > 0/);
    });

    it('pas de dto → calcul unitPrice × quantity', () => {
      expect(
        svc.lockAgreedAmount({
          offerUnitPrice: 12.5,
          offerCurrency: 'EUR',
          requestedQuantity: 100,
        }),
      ).toEqual({ agreedAmountCents: 125000, agreedCurrency: 'EUR' });
    });

    it('calcul avec Prisma.Decimal-like sur unitPrice + quantity', () => {
      expect(
        svc.lockAgreedAmount({
          offerUnitPrice: { toNumber: () => 7.5 },
          offerCurrency: 'USD',
          requestedQuantity: { toNumber: () => 200 },
        }),
      ).toEqual({ agreedAmountCents: 150000, agreedCurrency: 'USD' });
    });

    it('aucune source → BadRequest', () => {
      expect(() =>
        svc.lockAgreedAmount({
          offerUnitPrice: null,
          requestedQuantity: null,
        }),
      ).toThrow(/Impossible de verrouiller/);
    });

    it('Math.round sur arrondi : 12.501 × 1 = 1250.1 → 1250', () => {
      // 12.501 * 1 * 100 = 1250.1 → round = 1250
      expect(
        svc.lockAgreedAmount({
          offerUnitPrice: 12.501,
          offerCurrency: 'EUR',
          requestedQuantity: 1,
        }).agreedAmountCents,
      ).toBe(1250);
    });
  });

  // ─── assertAgreedAmountLocked ───────────────────────────────────────

  describe('assertAgreedAmountLocked', () => {
    it('rfq valide → ne throw pas', () => {
      expect(() =>
        svc.assertAgreedAmountLocked({
          agreedAmountCents: 150000,
          agreedCurrency: 'EUR',
        }),
      ).not.toThrow();
    });

    it('agreedAmountCents null → BadRequest', () => {
      expect(() =>
        svc.assertAgreedAmountLocked({
          agreedAmountCents: null,
          agreedCurrency: 'EUR',
        }),
      ).toThrow(/n'est pas verrouillé/);
    });

    it('agreedAmountCents 0 → BadRequest', () => {
      expect(() =>
        svc.assertAgreedAmountLocked({
          agreedAmountCents: 0,
          agreedCurrency: 'EUR',
        }),
      ).toThrow(/n'est pas verrouillé/);
    });

    it('agreedCurrency null → BadRequest', () => {
      expect(() =>
        svc.assertAgreedAmountLocked({
          agreedAmountCents: 150000,
          agreedCurrency: null,
        }),
      ).toThrow(/devise verrouillée est absente/);
    });

    it('agreedCurrency=GBP → BadRequest (non supportée)', () => {
      expect(() =>
        svc.assertAgreedAmountLocked({
          agreedAmountCents: 150000,
          agreedCurrency: 'GBP',
        }),
      ).toThrow(/non supportée/);
    });
  });

  // ─── computeApplicationFeeCents ─────────────────────────────────────

  describe('computeApplicationFeeCents', () => {
    it('100000 → 5000 (5%)', () => {
      expect(svc.computeApplicationFeeCents(100000)).toBe(5000);
    });

    it('Math.floor : 99 → 4 (4.95 → 4)', () => {
      expect(svc.computeApplicationFeeCents(99)).toBe(4);
    });

    it('0 → 0', () => {
      expect(svc.computeApplicationFeeCents(0)).toBe(0);
    });

    it('non entier → BadRequest', () => {
      expect(() => svc.computeApplicationFeeCents(12.5)).toThrow(
        /entier ≥ 0/,
      );
    });

    it('négatif → BadRequest', () => {
      expect(() => svc.computeApplicationFeeCents(-100)).toThrow(
        /entier ≥ 0/,
      );
    });
  });
});
