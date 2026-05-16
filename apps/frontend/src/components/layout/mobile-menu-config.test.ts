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

function sectionById(sections: MobileMenuSection[], id: string) {
  return sections.find((s) => s.id === id);
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

/* ─── Structure — 7 modules métier ──────────────────────────────────── */

describe('structure 7 modules métier', () => {
  const EXPECTED_MODULE_IDS = [
    'home',
    'referentiel',
    'production',
    'achats',
    'catalogue',
    'distribution',
    'administration',
  ];

  it('admin contient les 7 modules métier', () => {
    const ids = ADMIN_MENU_SECTIONS.map((s) => s.id);
    for (const moduleId of EXPECTED_MODULE_IDS) {
      expect(ids).toContain(moduleId);
    }
  });

  it('seller contient 6 modules (Administration cachée)', () => {
    expect(SELLER_MENU_SECTIONS.length).toBe(6);
    const ids = SELLER_MENU_SECTIONS.map((s) => s.id);
    expect(ids).not.toContain('administration');
  });

  it('buyer contient 5 modules (Production + Administration cachées)', () => {
    expect(BUYER_MENU_SECTIONS.length).toBe(5);
    const ids = BUYER_MENU_SECTIONS.map((s) => s.id);
    expect(ids).not.toContain('administration');
    expect(ids).not.toContain('production');
  });

  it('admin contient 7 modules', () => {
    expect(ADMIN_MENU_SECTIONS.length).toBe(7);
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

  it('chaque section a un label et un icon', () => {
    const all = [...SELLER_MENU_SECTIONS, ...BUYER_MENU_SECTIONS, ...ADMIN_MENU_SECTIONS];
    for (const section of all) {
      expect(section.label).toBeTruthy();
      expect(section.icon).toBeDefined();
    }
  });

  it('chaque section a une description métier', () => {
    const all = [...SELLER_MENU_SECTIONS, ...BUYER_MENU_SECTIONS, ...ADMIN_MENU_SECTIONS];
    for (const section of all) {
      expect(section.description).toBeTruthy();
    }
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

/* ─── Module Accueil ─────────────────────────────────────────────────── */

describe('module Accueil', () => {
  it('seller — Accueil ouvert par défaut', () => {
    const section = sectionById(SELLER_MENU_SECTIONS, 'home');
    expect(section?.defaultCollapsed).toBeFalsy();
  });

  it('buyer — Accueil ouvert par défaut', () => {
    const section = sectionById(BUYER_MENU_SECTIONS, 'home');
    expect(section?.defaultCollapsed).toBeFalsy();
  });

  it('admin — Accueil ouvert par défaut', () => {
    const section = sectionById(ADMIN_MENU_SECTIONS, 'home');
    expect(section?.defaultCollapsed).toBeFalsy();
  });

  it('seller — Accueil pointe vers /seller/dashboard', () => {
    const hrefs = allHrefs(SELLER_MENU_SECTIONS.filter((s) => s.id === 'home'));
    expect(hrefs).toContain('/seller/dashboard');
  });

  it('buyer — Accueil pointe vers /buyer', () => {
    const hrefs = allHrefs(BUYER_MENU_SECTIONS.filter((s) => s.id === 'home'));
    expect(hrefs).toContain('/buyer');
  });

  it('admin — Accueil pointe vers /admin', () => {
    const hrefs = allHrefs(ADMIN_MENU_SECTIONS.filter((s) => s.id === 'home'));
    expect(hrefs).toContain('/admin');
  });
});

/* ─── Isolation admin : seller/buyer ne voient jamais routes admin ──── */

describe('isolation routes admin', () => {
  const ADMIN_ROUTE_PATTERNS = ['/admin/', '/admin'];

  it('seller — aucune route admin exposée', () => {
    const hrefs = allHrefs(SELLER_MENU_SECTIONS);
    for (const href of hrefs) {
      expect(href.startsWith('/admin')).toBe(false);
    }
  });

  it('buyer — aucune route admin exposée', () => {
    const hrefs = allHrefs(BUYER_MENU_SECTIONS);
    for (const href of hrefs) {
      expect(href.startsWith('/admin')).toBe(false);
    }
  });

  it('admin — le module Administration existe', () => {
    const section = sectionById(ADMIN_MENU_SECTIONS, 'administration');
    expect(section).toBeDefined();
  });

  it('admin — le module Administration a des routes admin', () => {
    const section = sectionById(ADMIN_MENU_SECTIONS, 'administration');
    const hrefs = (section?.items ?? []).filter((i) => !i.disabled).map((i) => i.href);
    expect(hrefs.some((h) => h.startsWith('/admin'))).toBe(true);
  });
});

/* ─── Couverture routes seller ───────────────────────────────────────── */

describe('couverture routes seller', () => {
  const hrefs = allHrefs(SELLER_MENU_SECTIONS);

  it('contient /seller/dashboard', () => {
    expect(hrefs).toContain('/seller/dashboard');
  });

  it('contient /seller/profile/edit (Référentiel)', () => {
    expect(hrefs).toContain('/seller/profile/edit');
  });

  it('contient /seller/documents (Référentiel)', () => {
    expect(hrefs).toContain('/seller/documents');
  });

  it('contient /seller/profile/certifications (Référentiel)', () => {
    expect(hrefs).toContain('/seller/profile/certifications');
  });

  it('contient /seller/compliance (Référentiel)', () => {
    expect(hrefs).toContain('/seller/compliance');
  });

  it('contient /seller/marketplace-products (Production)', () => {
    expect(hrefs).toContain('/seller/marketplace-products');
  });

  it('contient /seller/marketplace-products/new (Production)', () => {
    expect(hrefs).toContain('/seller/marketplace-products/new');
  });

  it('contient /seller/quote-requests (Achats)', () => {
    expect(hrefs).toContain('/seller/quote-requests');
  });

  it('contient /seller/marketplace-offers (Catalogue)', () => {
    expect(hrefs).toContain('/seller/marketplace-offers');
  });

  it('contient /seller/marketplace-offers/new (Catalogue)', () => {
    expect(hrefs).toContain('/seller/marketplace-offers/new');
  });

  it('contient /seller/invoices (Distribution)', () => {
    expect(hrefs).toContain('/seller/invoices');
  });

  it('contient /seller/payments (Distribution)', () => {
    expect(hrefs).toContain('/seller/payments');
  });

  it('module Production fermé par défaut', () => {
    expect(sectionById(SELLER_MENU_SECTIONS, 'production')?.defaultCollapsed).toBe(true);
  });

  it('module Référentiel fermé par défaut', () => {
    expect(sectionById(SELLER_MENU_SECTIONS, 'referentiel')?.defaultCollapsed).toBe(true);
  });
});

/* ─── Couverture routes buyer ────────────────────────────────────────── */

describe('couverture routes buyer', () => {
  const hrefs = allHrefs(BUYER_MENU_SECTIONS);

  it('contient /buyer (Accueil)', () => {
    expect(hrefs).toContain('/buyer');
  });

  it('contient /buyer/profile (Référentiel)', () => {
    expect(hrefs).toContain('/buyer/profile');
  });

  it('contient /buyer/profile/edit (Référentiel)', () => {
    expect(hrefs).toContain('/buyer/profile/edit');
  });

  it('contient /buyer/preferences (Référentiel)', () => {
    expect(hrefs).toContain('/buyer/preferences');
  });

  it('contient /quote-requests/new (Achats)', () => {
    expect(hrefs).toContain('/quote-requests/new');
  });

  it('contient /buyer/quote-requests (Achats)', () => {
    expect(hrefs).toContain('/buyer/quote-requests');
  });

  it('contient /marketplace-hub (Catalogue)', () => {
    expect(hrefs).toContain('/marketplace-hub');
  });

  it('contient /marketplace/categories (Catalogue)', () => {
    expect(hrefs).toContain('/marketplace/categories');
  });

  it('contient /marketplace/favorites (Catalogue)', () => {
    expect(hrefs).toContain('/marketplace/favorites');
  });

  it('contient /buyer/payments (Distribution)', () => {
    expect(hrefs).toContain('/buyer/payments');
  });

  it('contient /buyer/orders (Distribution)', () => {
    expect(hrefs).toContain('/buyer/orders');
  });

  it('contient /buyer/invoices (Distribution)', () => {
    expect(hrefs).toContain('/buyer/invoices');
  });
});

/* ─── Couverture routes admin ────────────────────────────────────────── */

describe('couverture routes admin', () => {
  const hrefs = allHrefs(ADMIN_MENU_SECTIONS);

  it('contient /admin (Accueil)', () => {
    expect(hrefs).toContain('/admin');
  });

  it('contient /admin/users (Référentiel)', () => {
    expect(hrefs).toContain('/admin/users');
  });

  it('contient /admin/sellers (Référentiel)', () => {
    expect(hrefs).toContain('/admin/sellers');
  });

  it('contient /admin/memberships (Référentiel)', () => {
    expect(hrefs).toContain('/admin/memberships');
  });

  it('contient /admin/review-queue (Production)', () => {
    expect(hrefs).toContain('/admin/review-queue');
  });

  it('contient /admin/media-moderation (Production)', () => {
    expect(hrefs).toContain('/admin/media-moderation');
  });

  it('contient /admin/rfq (Achats)', () => {
    expect(hrefs).toContain('/admin/rfq');
  });

  it('contient /admin/marketplace/categories (Catalogue)', () => {
    expect(hrefs).toContain('/admin/marketplace/categories');
  });

  it('contient /admin/compliance (Distribution)', () => {
    expect(hrefs).toContain('/admin/compliance');
  });

  it('contient /admin/kpi (Distribution)', () => {
    expect(hrefs).toContain('/admin/kpi');
  });

  it('contient /admin/audit-logs (Administration)', () => {
    expect(hrefs).toContain('/admin/audit-logs');
  });

  it('contient /admin/diagnostics (Administration)', () => {
    expect(hrefs).toContain('/admin/diagnostics');
  });

  it('contient /admin/notif-email/logs (Administration)', () => {
    expect(hrefs).toContain('/admin/notif-email/logs');
  });

  it('module Administration fermé par défaut', () => {
    expect(sectionById(ADMIN_MENU_SECTIONS, 'administration')?.defaultCollapsed).toBe(true);
  });
});

/* ─── Labels — pas de jargon technique ──────────────────────────────── */

describe('labels sans jargon', () => {
  const FORBIDDEN_TERMS = ['rfq', 'RFQ', 'slug', 'workflow', 'cockpit', 'incoterm', 'dashboard'];
  const ALLOWED_TECHNICAL_EXCEPTIONS = ['Tableau de bord']; // "dashboard" ok dans ce contexte français

  it('aucun label item ne contient de jargon technique interdit', () => {
    const all = [
      ...allItems(SELLER_MENU_SECTIONS),
      ...allItems(BUYER_MENU_SECTIONS),
      ...allItems(ADMIN_MENU_SECTIONS),
    ];
    for (const item of all) {
      const isException = ALLOWED_TECHNICAL_EXCEPTIONS.some((ex) => item.label.includes(ex));
      if (!isException) {
        for (const term of FORBIDDEN_TERMS) {
          if (term !== 'dashboard') {
            expect(item.label).not.toContain(term);
          }
        }
      }
    }
  });
});
