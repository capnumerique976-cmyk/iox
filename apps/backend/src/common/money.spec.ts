// M59 — Tests helpers money/currency backend.

import {
  SUPPORTED_CURRENCIES,
  DEFAULT_CURRENCY,
  isSupportedCurrency,
  normalizeCurrency,
  formatCents,
  toStripeCurrency,
} from './money';

describe('money helpers (M59)', () => {
  describe('SUPPORTED_CURRENCIES', () => {
    it('inclut EUR et USD', () => {
      expect(SUPPORTED_CURRENCIES).toContain('EUR');
      expect(SUPPORTED_CURRENCIES).toContain('USD');
    });

    it('DEFAULT_CURRENCY est EUR', () => {
      expect(DEFAULT_CURRENCY).toBe('EUR');
    });
  });

  describe('isSupportedCurrency', () => {
    it('EUR → true', () => expect(isSupportedCurrency('EUR')).toBe(true));
    it('USD → true', () => expect(isSupportedCurrency('USD')).toBe(true));
    it('eur lowercase → true', () => expect(isSupportedCurrency('eur')).toBe(true));
    it('GBP → false', () => expect(isSupportedCurrency('GBP')).toBe(false));
    it('empty string → false', () => expect(isSupportedCurrency('')).toBe(false));
  });

  describe('normalizeCurrency', () => {
    it('EUR → EUR', () => expect(normalizeCurrency('EUR')).toBe('EUR'));
    it('usd → USD', () => expect(normalizeCurrency('usd')).toBe('USD'));
    it('undefined → EUR (default)', () => expect(normalizeCurrency(undefined)).toBe('EUR'));
    it('null → EUR (default)', () => expect(normalizeCurrency(null)).toBe('EUR'));
    it('GBP → throws', () => expect(() => normalizeCurrency('GBP')).toThrow('non supportée'));
    it('XYZ → throws', () => expect(() => normalizeCurrency('XYZ')).toThrow('Devises acceptées'));
  });

  describe('formatCents', () => {
    it('EUR 100000 cents → 1000,00 EUR affichage', () => {
      const result = formatCents(100000, 'EUR', 'fr-FR');
      // Intl format for EUR in fr-FR contains '1' and '000' and 'EUR' or '€'
      expect(result).toMatch(/1/);
      expect(result).toMatch(/000/);
    });

    it('USD 120000 cents → affiche USD', () => {
      const result = formatCents(120000, 'USD', 'fr-FR');
      expect(result).toMatch(/1/);
      expect(result).toMatch(/200/);
      expect(result).toMatch(/\$|USD/);
    });

    it('EUR par défaut si currency absent', () => {
      const result = formatCents(500, undefined, 'fr-FR');
      expect(result).toMatch(/5/);
    });

    it('0 cents → affiche 0', () => {
      const result = formatCents(0, 'EUR', 'fr-FR');
      expect(result).toMatch(/0/);
    });
  });

  describe('toStripeCurrency', () => {
    it('EUR → eur', () => expect(toStripeCurrency('EUR')).toBe('eur'));
    it('USD → usd', () => expect(toStripeCurrency('USD')).toBe('usd'));
    it('eur (déjà lowercase) → eur', () => expect(toStripeCurrency('eur')).toBe('eur'));
  });
});
