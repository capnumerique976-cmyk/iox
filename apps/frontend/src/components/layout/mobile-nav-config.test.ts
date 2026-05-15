import { describe, it, expect } from 'vitest';
import { UserRole } from '@iox/shared';
import {
  getMobileNavConfig,
  isPathActive,
  SELLER_MOBILE_NAV,
  BUYER_MOBILE_NAV,
  ADMIN_MOBILE_NAV,
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

    it('retourne ADMIN_MOBILE_NAV pour ADMIN', () => {
      expect(getMobileNavConfig(UserRole.ADMIN)).toBe(ADMIN_MOBILE_NAV);
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
    it('4 onglets primaires exactement (Accueil, Produits, Demandes, Messages)', () => {
      expect(SELLER_MOBILE_NAV.primaryTabs).toHaveLength(4);
    });

    it('onglets primaires : home, products, quotes, messages', () => {
      const ids = SELLER_MOBILE_NAV.primaryTabs.map((t) => t.id);
      expect(ids).toContain('home');
      expect(ids).toContain('products');
      expect(ids).toContain('quotes');
      expect(ids).toContain('messages');
    });

    it('tab Accueil pointe vers /seller/dashboard avec exactMatch', () => {
      const tab = SELLER_MOBILE_NAV.primaryTabs.find((t) => t.id === 'home');
      expect(tab?.href).toBe('/seller/dashboard');
      expect(tab?.exactMatch).toBe(true);
    });

    it('tab Produits pointe vers /seller/marketplace-products', () => {
      const tab = SELLER_MOBILE_NAV.primaryTabs.find((t) => t.id === 'products');
      expect(tab?.href).toBe('/seller/marketplace-products');
    });

    it('tab Demandes pointe vers /seller/quote-requests', () => {
      const tab = SELLER_MOBILE_NAV.primaryTabs.find((t) => t.id === 'quotes');
      expect(tab?.href).toBe('/seller/quote-requests');
    });

    it('tab Messages est désactivé (feature future)', () => {
      const tab = SELLER_MOBILE_NAV.primaryTabs.find((t) => t.id === 'messages');
      expect(tab?.disabled).toBe(true);
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
    it('4 onglets primaires exactement (Accueil, Rechercher, Demandes, Messages)', () => {
      expect(BUYER_MOBILE_NAV.primaryTabs).toHaveLength(4);
    });

    it('onglets primaires : home, search, quotes, messages', () => {
      const ids = BUYER_MOBILE_NAV.primaryTabs.map((t) => t.id);
      expect(ids).toContain('home');
      expect(ids).toContain('search');
      expect(ids).toContain('quotes');
      expect(ids).toContain('messages');
    });

    it('tab Accueil pointe vers /buyer avec exactMatch', () => {
      const tab = BUYER_MOBILE_NAV.primaryTabs.find((t) => t.id === 'home');
      expect(tab?.href).toBe('/buyer');
      expect(tab?.exactMatch).toBe(true);
    });

    it('tab Rechercher pointe vers /marketplace-hub', () => {
      const tab = BUYER_MOBILE_NAV.primaryTabs.find((t) => t.id === 'search');
      expect(tab?.href).toBe('/marketplace-hub');
    });

    it('tab Demandes pointe vers /buyer/quote-requests', () => {
      const tab = BUYER_MOBILE_NAV.primaryTabs.find((t) => t.id === 'quotes');
      expect(tab?.href).toBe('/buyer/quote-requests');
    });

    it('tab Messages est désactivé (feature future)', () => {
      const tab = BUYER_MOBILE_NAV.primaryTabs.find((t) => t.id === 'messages');
      expect(tab?.disabled).toBe(true);
    });

    it('aucune action contextuelle pour buyer', () => {
      expect(BUYER_MOBILE_NAV.contextualActions).toHaveLength(0);
    });

    it('/buyer/payments absent des onglets primaires (pas de page liste)', () => {
      const primaryHrefs = BUYER_MOBILE_NAV.primaryTabs.map((t) => t.href);
      expect(primaryHrefs).not.toContain('/buyer/payments');
    });

    it('commandes et factures en items secondaires', () => {
      const ids = BUYER_MOBILE_NAV.secondaryItems.map((i) => i.id);
      expect(ids).toContain('orders');
      expect(ids).toContain('invoices');
    });

    it('items secondaires incluent préférences et entreprise', () => {
      const ids = BUYER_MOBILE_NAV.secondaryItems.map((i) => i.id);
      expect(ids).toContain('preferences');
      expect(ids).toContain('company');
    });
  });

  /* ── Config ADMIN ───────────────────────────────────────────────── */

  describe('ADMIN_MOBILE_NAV', () => {
    it('4 onglets primaires exactement', () => {
      expect(ADMIN_MOBILE_NAV.primaryTabs).toHaveLength(4);
    });

    it('onglets primaires : dashboard, review, sellers, users', () => {
      const ids = ADMIN_MOBILE_NAV.primaryTabs.map((t) => t.id);
      expect(ids).toContain('dashboard');
      expect(ids).toContain('review');
      expect(ids).toContain('sellers');
      expect(ids).toContain('users');
    });

    it('tab Tableau pointe vers /admin avec exactMatch', () => {
      const tab = ADMIN_MOBILE_NAV.primaryTabs.find((t) => t.id === 'dashboard');
      expect(tab?.href).toBe('/admin');
      expect(tab?.exactMatch).toBe(true);
    });

    it('tab Revue pointe vers /admin/review-queue', () => {
      const tab = ADMIN_MOBILE_NAV.primaryTabs.find((t) => t.id === 'review');
      expect(tab?.href).toBe('/admin/review-queue');
    });

    it('items secondaires incluent kpi, media, categories', () => {
      const ids = ADMIN_MOBILE_NAV.secondaryItems.map((i) => i.id);
      expect(ids).toContain('kpi');
      expect(ids).toContain('media');
      expect(ids).toContain('categories');
    });

    it('items secondaires incluent audit et diagnostics', () => {
      const ids = ADMIN_MOBILE_NAV.secondaryItems.map((i) => i.id);
      expect(ids).toContain('audit');
      expect(ids).toContain('diagnostics');
    });

    it('aucun onglet primaire admin désactivé', () => {
      const disabled = ADMIN_MOBILE_NAV.primaryTabs.filter((t) => t.disabled);
      expect(disabled).toHaveLength(0);
    });

    it('aucune action contextuelle pour admin', () => {
      expect(ADMIN_MOBILE_NAV.contextualActions).toHaveLength(0);
    });
  });

  /* ── Intégrité ──────────────────────────────────────────────────── */

  it('aucun id dupliqué dans les onglets primaires seller', () => {
    const ids = SELLER_MOBILE_NAV.primaryTabs.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('aucun id dupliqué dans les items seller (primaire + secondaire)', () => {
    const ids = [
      ...SELLER_MOBILE_NAV.primaryTabs.map((t) => t.id),
      ...SELLER_MOBILE_NAV.secondaryItems.map((i) => i.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('aucun id dupliqué dans les items buyer (primaire + secondaire)', () => {
    const ids = [
      ...BUYER_MOBILE_NAV.primaryTabs.map((t) => t.id),
      ...BUYER_MOBILE_NAV.secondaryItems.map((i) => i.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('aucun id dupliqué dans les items admin (primaire + secondaire)', () => {
    const ids = [
      ...ADMIN_MOBILE_NAV.primaryTabs.map((t) => t.id),
      ...ADMIN_MOBILE_NAV.secondaryItems.map((i) => i.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('onglets primaires seller : 4 max (limite UX)', () => {
    expect(SELLER_MOBILE_NAV.primaryTabs.length).toBeLessThanOrEqual(4);
  });

  it('onglets primaires buyer : 4 max (limite UX)', () => {
    expect(BUYER_MOBILE_NAV.primaryTabs.length).toBeLessThanOrEqual(4);
  });

  it('onglets primaires admin : 4 max (limite UX)', () => {
    expect(ADMIN_MOBILE_NAV.primaryTabs.length).toBeLessThanOrEqual(4);
  });
});
