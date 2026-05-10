// M59 — Tests helpers money/currency frontend.

import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_CURRENCIES,
  DEFAULT_CURRENCY,
  isSupportedCurrency,
  normalizeCurrency,
  formatCents,
  formatAmount,
} from './money';

describe('money helpers (M59)', () => {
  describe('SUPPORTED_CURRENCIES / DEFAULT_CURRENCY', () => {
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
    it('vide → false', () => expect(isSupportedCurrency('')).toBe(false));
  });

  describe('normalizeCurrency', () => {
    it('EUR → EUR', () => expect(normalizeCurrency('EUR')).toBe('EUR'));
    it('usd lowercase → USD', () => expect(normalizeCurrency('usd')).toBe('USD'));
    it('undefined → EUR', () => expect(normalizeCurrency(undefined)).toBe('EUR'));
    it('null → EUR', () => expect(normalizeCurrency(null)).toBe('EUR'));
    it('GBP non supporté → fallback EUR (frontend silencieux)', () => {
      expect(normalizeCurrency('GBP')).toBe('EUR');
    });
  });

  describe('formatCents', () => {
    it('EUR 100000 cents → contient 1000 et symbole €', () => {
      const result = formatCents(100000, 'EUR', 'fr-FR');
      expect(result).toMatch(/1[\s ]?000/);
      expect(result).toContain('€');
    });

    it('USD 120050 cents → contient 1200 et signe $', () => {
      const result = formatCents(120050, 'USD', 'fr-FR');
      expect(result).toMatch(/1[\s ]?200/);
      expect(result).toMatch(/\$|USD/);
    });

    it('0 cents → affiche 0,00', () => {
      const result = formatCents(0, 'EUR', 'fr-FR');
      expect(result).toContain('0');
    });

    it('currency null → fallback EUR', () => {
      const result = formatCents(500, null, 'fr-FR');
      expect(result).toContain('€');
    });

    it('currency undefined → fallback EUR', () => {
      const result = formatCents(1000, undefined, 'fr-FR');
      expect(result).toContain('€');
    });
  });

  describe('formatAmount', () => {
    it('EUR amount 42.50 → affiche € et 42', () => {
      const result = formatAmount('42.50', 'EUR', 'fr-FR');
      expect(result).toContain('42');
      expect(result).toContain('€');
    });

    it('USD amount 100 → affiche $ ou USD', () => {
      const result = formatAmount(100, 'USD', 'fr-FR');
      expect(result).toMatch(/\$|USD/);
      expect(result).toContain('100');
    });

    it('null amount → "—"', () => {
      expect(formatAmount(null, 'EUR')).toBe('—');
    });

    it('undefined amount → "—"', () => {
      expect(formatAmount(undefined, 'EUR')).toBe('—');
    });

    it('empty string → "—"', () => {
      expect(formatAmount('', 'EUR')).toBe('—');
    });

    it('NaN string → "—"', () => {
      expect(formatAmount('not-a-number', 'EUR')).toBe('—');
    });
  });
});
