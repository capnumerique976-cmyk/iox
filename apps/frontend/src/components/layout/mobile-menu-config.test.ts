import { describe, it, expect } from 'vitest';
import { UserRole } from '@iox/shared';
import {
  getMobileMenuSections,
  SELLER_MENU_SECTIONS,
  BUYER_MENU_SECTIONS,
  ADMIN_MENU_SECTIONS,
  type MobileMenuSection,
} from './mobile-menu-config';

/* ─── Helpers ──────────────────────────────────────────────────────── */

function allItems(sections: MobileMenuSection[]) {
  return sections.flatMap((s) => s.items);
}

function allHrefs(sections: MobileMenuSection[]) {
  return allItems(sections)
    .filter((i) => !i.disabled)
    .map((i) => i.href);
}

/* ─── getMobileMenuSections ─────────────────────────────────────────── */

describe('getMobileMenuSections', () => {
  it('retourne SELLER_MENU_SECTIONS pour MARKETPLACE_SELLER', () => {
    expect(getMobileMenuSections(UserRole.MARKETPLACE_SELLER)).toBe(SELLER_MENU_SECTIONS);
  });

  it('retourne BUYER_MENU_SECTIONS pour MARKETPLACE_BUYER', () => {
    expect(getMobileMenuSections(UserRole.MARKETPLACE_BUYER)).toBe(BUYER_MENU_SECTIONS);
  });

  it('retourne ADMIN_MENU_SECTIONS pour ADMIN', () => {
    expect(getMobileMenuSections(UserRole.ADMIN)).toBe(ADMIN_MENU_SECTIONS);
  });

  it('retourne null pour COORDINATOR (hamburger existant)', () => {
    expect(getMobileMenuSections(UserRole.COORDINATOR)).toBeNull();
  });

  it('retourne null pour BENEFICIARY', () => {
    expect(getMobileMenuSections(UserRole.BENEFICIARY)).toBeNull();
  });
});

/* ─── Structure générique ────────────────────────────────────────────── */

describe('structure sections', () => {
  it('chaque section seller a un id unique', () => {
    const ids = SELLER_MENU_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('chaque section buyer a un id unique', () => {
    const ids = BUYER_MENU_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('chaque section admin a un id unique', () => {
    const ids = ADMIN_MENU_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('seller : max 6 sections (charge cognitive)', () => {
    expect(SELLER_MENU_SECTIONS.length).toBeLessThanOrEqual(6);
  });

  it('buyer : max 6 sections', () => {
    expect(BUYER_MENU_SECTIONS.length).toBeLessThanOrEqual(6);
  });

  it('admin : max 6 sections', () => {
    expect(ADMIN_MENU_SECTIONS.length).toBeLessThanOrEqual(6);
  });

  it('chaque item a un id, label, href, icon', () => {
    const all = [
      ...allItems(SELLER_MENU_SECTIONS),
      ...allItems(BUYER_MENU_SECTIONS),
      ...allItems(ADMIN_MENU_SECTIONS),
    ];
    for (const item of all) {
      expect(item.id).toBeTruthy();
      expect(item.label).toBeTruthy();
      expect(item.href).toBeTruthy();
      expect(item.icon).toBeDefined();
    }
  });

  it('items disabled ont une disabledNote', () => {
    const all = [
      ...allItems(SELLER_MENU_SECTIONS),
      ...allItems(BUYER_MENU_SECTIONS),
      ...allItems(ADMIN_MENU_SECTIONS),
    ];
    const disabledItems = all.filter((i) => i.disabled);
    for (const item of disabledItems) {
      expect(item.disabledNote).toBeTruthy();
    }
  });
});

/* ─── Couverture routes seller ───────────────────────────────────────── */

describe('couverture routes seller', () => {
  const hrefs = allHrefs(SELLER_MENU_SECTIONS);

  it('contient /seller/marketplace-products', () => {
    expect(hrefs).toContain('/seller/marketplace-products');
  });

  it('contient /seller/marketplace-products/new', () => {
    expect(hrefs).toContain('/seller/marketplace-products/new');
  });

  it('contient /seller/marketplace-offers', () => {
    expect(hrefs).toContain('/seller/marketplace-offers');
  });

  it('contient /seller/marketplace-offers/new', () => {
    expect(hrefs).toContain('/seller/marketplace-offers/new');
  });

  it('contient /seller/quote-requests', () => {
    expect(hrefs).toContain('/seller/quote-requests');
  });

  it('contient /seller/documents', () => {
    expect(hrefs).toContain('/seller/documents');
  });

  it('contient /seller/compliance', () => {
    expect(hrefs).toContain('/seller/compliance');
  });

  it('contient /seller/invoices', () => {
    expect(hrefs).toContain('/seller/invoices');
  });

  it('contient /seller/payments', () => {
    expect(hrefs).toContain('/seller/payments');
  });

  it('contient /seller/profile/edit', () => {
    expect(hrefs).toContain('/seller/profile/edit');
  });

  it('contient /seller/profile/certifications', () => {
    expect(hrefs).toContain('/seller/profile/certifications');
  });

  it('section products ouverte par défaut (non defaultCollapsed)', () => {
    const section = SELLER_MENU_SECTIONS.find((s) => s.id === 'products');
    expect(section?.defaultCollapsed).toBeFalsy();
  });
});

/* ─── Couverture routes buyer ────────────────────────────────────────── */

describe('couverture routes buyer', () => {
  const hrefs = allHrefs(BUYER_MENU_SECTIONS);

  it('contient /marketplace-hub (catalogue)', () => {
    expect(hrefs).toContain('/marketplace-hub');
  });

  it('contient /marketplace/favorites', () => {
    expect(hrefs).toContain('/marketplace/favorites');
  });

  it('contient /marketplace/categories', () => {
    expect(hrefs).toContain('/marketplace/categories');
  });

  it('contient /quote-requests/new', () => {
    expect(hrefs).toContain('/quote-requests/new');
  });

  it('contient /buyer/quote-requests', () => {
    expect(hrefs).toContain('/buyer/quote-requests');
  });

  it('contient /buyer/payments', () => {
    expect(hrefs).toContain('/buyer/payments');
  });

  it('contient /buyer/orders', () => {
    expect(hrefs).toContain('/buyer/orders');
  });

  it('contient /buyer/invoices', () => {
    expect(hrefs).toContain('/buyer/invoices');
  });

  it('contient /buyer/profile', () => {
    expect(hrefs).toContain('/buyer/profile');
  });

  it('contient /buyer/profile/edit', () => {
    expect(hrefs).toContain('/buyer/profile/edit');
  });

  it('contient /buyer/preferences', () => {
    expect(hrefs).toContain('/buyer/preferences');
  });

  it('section search ouverte par défaut', () => {
    const section = BUYER_MENU_SECTIONS.find((s) => s.id === 'search');
    expect(section?.defaultCollapsed).toBeFalsy();
  });
});

/* ─── Couverture routes admin ────────────────────────────────────────── */

describe('couverture routes admin', () => {
  const hrefs = allHrefs(ADMIN_MENU_SECTIONS);

  it('contient /admin/review-queue', () => {
    expect(hrefs).toContain('/admin/review-queue');
  });

  it('contient /admin/media-moderation', () => {
    expect(hrefs).toContain('/admin/media-moderation');
  });

  it('contient /admin/sellers', () => {
    expect(hrefs).toContain('/admin/sellers');
  });

  it('contient /admin/users', () => {
    expect(hrefs).toContain('/admin/users');
  });

  it('contient /admin/memberships', () => {
    expect(hrefs).toContain('/admin/memberships');
  });

  it('contient /admin/marketplace/categories', () => {
    expect(hrefs).toContain('/admin/marketplace/categories');
  });

  it('contient /admin/compliance', () => {
    expect(hrefs).toContain('/admin/compliance');
  });

  it('contient /admin/kpi', () => {
    expect(hrefs).toContain('/admin/kpi');
  });

  it('contient /admin/audit-logs', () => {
    expect(hrefs).toContain('/admin/audit-logs');
  });

  it('contient /admin/diagnostics', () => {
    expect(hrefs).toContain('/admin/diagnostics');
  });

  it('section review ouverte par défaut', () => {
    const section = ADMIN_MENU_SECTIONS.find((s) => s.id === 'review');
    expect(section?.defaultCollapsed).toBeFalsy();
  });
});
