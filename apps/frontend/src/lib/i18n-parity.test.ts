// I18N-5 — Parité FR ↔ EN messages.
//
// Walk récursif des deux dictionnaires, vérifie que toutes les clés FR
// existent en EN et inversement. Garde-fou contre régressions ajoutant
// une clé dans un seul des deux fichiers.

import { describe, it, expect } from 'vitest';
import frMessages from '../../messages/fr.json';
import enMessages from '../../messages/en.json';

type Messages = Record<string, unknown>;

function collectKeys(obj: Messages, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...collectKeys(v as Messages, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

describe('i18n parity FR ↔ EN', () => {
  const frKeys = new Set(collectKeys(frMessages as Messages));
  const enKeys = new Set(collectKeys(enMessages as Messages));

  it('toutes les clés FR existent en EN (pas d\'oubli de traduction)', () => {
    const missingInEn = [...frKeys].filter((k) => !enKeys.has(k));
    expect(missingInEn).toEqual([]);
  });

  it('toutes les clés EN existent en FR (pas de clé fantôme côté EN)', () => {
    const missingInFr = [...enKeys].filter((k) => !frKeys.has(k));
    expect(missingInFr).toEqual([]);
  });

  it('compte total identique FR vs EN', () => {
    expect(frKeys.size).toBe(enKeys.size);
  });

  it('compte total ≥ 70 clés (I18N-1 baseline)', () => {
    expect(frKeys.size).toBeGreaterThanOrEqual(70);
  });

  // I18N-5 phase 1 — produit + seller détail.
  it('compte total ≥ 120 clés (I18N-5 ph1 — public marketplace produit + seller)', () => {
    expect(frKeys.size).toBeGreaterThanOrEqual(120);
  });

  // I18N-6 — extension sellers index + seller detail.
  it('compte total ≥ 140 clés (I18N-6 — sellers index hero + seller detail)', () => {
    expect(frKeys.size).toBeGreaterThanOrEqual(140);
  });

  it('namespaces I18N-6 présents : sellers.heroBadge / heroDescription / emptyTitle, seller.sections.about / publishedProducts', () => {
    const requiredKeys = [
      'marketplace.sellers.heroBadge',
      'marketplace.sellers.heroDescription',
      'marketplace.sellers.emptyTitle',
      'marketplace.sellers.totalCount',
      'marketplace.seller.sections.about',
      'marketplace.seller.sections.publishedProducts',
      'marketplace.seller.sections.exportCapabilities',
      'marketplace.seller.fields.leadTimeShort',
      'marketplace.seller.productsCount',
    ];
    for (const key of requiredKeys) {
      expect(frKeys.has(key)).toBe(true);
      expect(enKeys.has(key)).toBe(true);
    }
  });

  it('namespaces I18N-5 présents : marketplace.product.* et marketplace.seller.*', () => {
    const requiredKeys = [
      'marketplace.product.sellerLabel',
      'marketplace.product.sections.description',
      'marketplace.product.sections.characteristics',
      'marketplace.product.sections.logistics',
      'marketplace.product.fields.moq',
      'marketplace.product.fields.leadTime',
      'marketplace.product.fields.variety',
      'marketplace.seller.sections.story',
      'marketplace.seller.sections.products',
      'marketplace.seller.fields.country',
      'common.states.noImage',
      'common.breadcrumb.label',
    ];
    for (const key of requiredKeys) {
      expect(frKeys.has(key)).toBe(true);
      expect(enKeys.has(key)).toBe(true);
    }
  });
});
