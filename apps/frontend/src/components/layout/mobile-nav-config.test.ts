import { describe, it, expect } from 'vitest';
import { UserRole } from '@iox/shared';
import {
  getMobileNavConfig,
  isPathActive,
  SELLER_MOBILE_NAV,
  BUYER_MOBILE_NAV,
} from './mobile-nav-config';

describe('mobile-nav-config', () => {
  /* ── getMobileNavConfig ─────────────────────────────────────────── */

  describe('getMobileNavConfig', () => {
    it('retourne SELLER_MOBILE_NAV pour MARKETPLACE_SELLER', () => {
      expect(getMobileNavConfig(UserRole.MARKETPLACE_SELLER)).toBe(SELLER_MOBILE_NAV);
    });

    it('retourne BUYER_MOBILE_NAV pour MARKETPLACE_BUYER', () => {
      expect(getMobileNavConfig(UserRole.MARKETPLACE_BUYER)).toBe(BUYER_MOBILE_NAV);
    });

    it('retourne null pour ADMIN (hamburger)', () => {
      expect(getMobileNavConfig(UserRole.ADMIN)).toBeNull();
    });

    it('retourne null pour COORDINATOR (hamburger)', () => {
      expect(getMobileNavConfig(UserRole.COORDINATOR)).toBeNull();
    });

    it('retourne null pour BENEFICIARY (hamburger)', () => {
      expect(getMobileNavConfig(UserRole.BENEFICIARY)).toBeNull();
    });
  });

  /* ── isPathActive ───────────────────────────────────────────────── */

  describe('isPathActive', () => {
    it('exact — correspond au chemin exact', () => {
      expect(isPathActive('/seller/dashboard', '/seller/dashboard', true)).toBe(true);
    });

    it('exact — ne correspond pas à une sous-route', () => {
      expect(isPathActive('/seller/dashboard/something', '/seller/dashboard', true)).toBe(false);
    });

    it('préfixe — correspond à la route racine', () => {
      expect(isPathActive('/seller/marketplace-products', '/seller/marketplace-products')).toBe(
        true,
      );
    });

    it('préfixe — correspond à une sous-route', () => {
      expect(
        isPathActive('/seller/marketplace-products/new', '/seller/marketplace-products'),
      ).toBe(true);
    });

    it('préfixe — ne correspond pas à un autre chemin', () => {
      expect(isPathActive('/seller/quote-requests', '/seller/marketplace-products')).toBe(false);
    });

    it('préfixe — ne correspond pas à un chemin qui débute pareil mais diffère', () => {
      // /seller/marketplace-products-extra ≠ /seller/marketplace-products
      expect(
        isPathActive('/seller/marketplace-products-extra', '/seller/marketplace-products'),
      ).toBe(false);
    });
  });

  /* ── Config SELLER ──────────────────────────────────────────────── */

  describe('SELLER_MOBILE_NAV', () => {
    it('3 onglets primaires exactement', () => {
      expect(SELLER_MOBILE_NAV.primaryTabs).toHaveLength(3);
    });

    it('onglets primaires : Produits, Devis, Tableau', () => {
      const ids = SELLER_MOBILE_NAV.primaryTabs.map((t) => t.id);
      expect(ids).toContain('products');
      expect(ids).toContain('quotes');
      expect(ids).toContain('dashboard');
    });

    it('tab Produits pointe vers /seller/marketplace-products', () => {
      const tab = SELLER_MOBILE_NAV.primaryTabs.find((t) => t.id === 'products');
      expect(tab?.href).toBe('/seller/marketplace-products');
    });

    it('tab Devis pointe vers /seller/quote-requests', () => {
      const tab = SELLER_MOBILE_NAV.primaryTabs.find((t) => t.id === 'quotes');
      expect(tab?.href).toBe('/seller/quote-requests');
    });

    it('tab Tableau utilise exactMatch', () => {
      const tab = SELLER_MOBILE_NAV.primaryTabs.find((t) => t.id === 'dashboard');
      expect(tab?.exactMatch).toBe(true);
    });

    it('items secondaires incluent Paiements et Factures', () => {
      const ids = SELLER_MOBILE_NAV.secondaryItems.map((i) => i.id);
      expect(ids).toContain('payments');
      expect(ids).toContain('invoices');
    });

    it('actions contextuelles définies pour /seller/marketplace-products', () => {
      const entry = SELLER_MOBILE_NAV.contextualActions.find(
        (c) => c.pathPrefix === '/seller/marketplace-products',
      );
      expect(entry).toBeDefined();
      expect(entry!.actions).toHaveLength(1);
      expect(entry!.actions[0].href).toBe('/seller/marketplace-products/new');
    });

    it('action contextuelle produits utilise exactMatch', () => {
      const entry = SELLER_MOBILE_NAV.contextualActions.find(
        (c) => c.pathPrefix === '/seller/marketplace-products',
      );
      expect(entry?.exactMatch).toBe(true);
    });

    it("pas d'action contextuelle sur /seller/marketplace-products/new (sous-route)", () => {
      const entry = SELLER_MOBILE_NAV.contextualActions.find(
        (c) =>
          c.exactMatch &&
          isPathActive('/seller/marketplace-products/new', c.pathPrefix, c.exactMatch),
      );
      // exactMatch=true → /new ne matche pas /seller/marketplace-products
      expect(entry).toBeUndefined();
    });

    it('action contextuelle définie pour /seller/marketplace-offers', () => {
      const entry = SELLER_MOBILE_NAV.contextualActions.find(
        (c) => c.pathPrefix === '/seller/marketplace-offers',
      );
      expect(entry).toBeDefined();
      expect(entry!.actions[0].href).toBe('/seller/marketplace-offers/new');
    });

    it('2 entrées contextuelles pour seller (produits + offres)', () => {
      expect(SELLER_MOBILE_NAV.contextualActions).toHaveLength(2);
    });
  });

  /* ── Config BUYER ───────────────────────────────────────────────── */

  describe('BUYER_MOBILE_NAV', () => {
    it('3 onglets primaires exactement', () => {
      expect(BUYER_MOBILE_NAV.primaryTabs).toHaveLength(3);
    });

    it('onglets primaires : quotes, orders, invoices', () => {
      const ids = BUYER_MOBILE_NAV.primaryTabs.map((t) => t.id);
      expect(ids).toContain('quotes');
      expect(ids).toContain('orders');
      expect(ids).toContain('invoices');
    });

    it('tab Devis pointe vers /buyer/quote-requests', () => {
      const tab = BUYER_MOBILE_NAV.primaryTabs.find((t) => t.id === 'quotes');
      expect(tab?.href).toBe('/buyer/quote-requests');
    });

    it('tab Factures pointe vers /buyer/invoices', () => {
      const tab = BUYER_MOBILE_NAV.primaryTabs.find((t) => t.id === 'invoices');
      expect(tab?.href).toBe('/buyer/invoices');
    });

    it('aucune action contextuelle pour buyer', () => {
      expect(BUYER_MOBILE_NAV.contextualActions).toHaveLength(0);
    });

    it('/buyer/payments absent des onglets (pas de page liste)', () => {
      const allHrefs = [
        ...BUYER_MOBILE_NAV.primaryTabs.map((t) => t.href),
        ...BUYER_MOBILE_NAV.secondaryItems.map((i) => i.href),
      ];
      expect(allHrefs).not.toContain('/buyer/payments');
    });

    it('items secondaires incluent préférences et entreprise', () => {
      const ids = BUYER_MOBILE_NAV.secondaryItems.map((i) => i.id);
      expect(ids).toContain('preferences');
      expect(ids).toContain('company');
    });
  });

  /* ── Intégrité ──────────────────────────────────────────────────── */

  it('aucun href dupliqué dans les onglets primaires seller', () => {
    const hrefs = SELLER_MOBILE_NAV.primaryTabs.map((t) => t.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('aucun id dupliqué dans les items seller (primaire + secondaire)', () => {
    const ids = [
      ...SELLER_MOBILE_NAV.primaryTabs.map((t) => t.id),
      ...SELLER_MOBILE_NAV.secondaryItems.map((i) => i.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });
});
