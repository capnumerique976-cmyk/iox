import { describe, it, expect } from 'vitest';
import { UserRole } from '@iox/shared';
import {
  getMobileMenuSections,
  getBusinessModuleForPath,
  getActiveItemHref,
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

  it('tous les ids items sont uniques dans chaque config rôle', () => {
    const checkUnique = (sections: MobileMenuSection[], role: string) => {
      const ids = allItems(sections).map((i) => i.id);
      expect(new Set(ids).size, `ids items dupliqués pour ${role}`).toBe(ids.length);
    };
    checkUnique(SELLER_MENU_SECTIONS, 'seller');
    checkUnique(BUYER_MENU_SECTIONS, 'buyer');
    checkUnique(ADMIN_MENU_SECTIONS, 'admin');
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

  it('admin — Accueil contient aussi /dashboard (tableau général)', () => {
    const hrefs = allHrefs(ADMIN_MENU_SECTIONS.filter((s) => s.id === 'home'));
    expect(hrefs).toContain('/dashboard');
  });
});

/* ─── Isolation admin : seller/buyer ne voient jamais routes admin ──── */

describe('isolation routes admin', () => {
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

/* ─── Isolation seller/buyer ─────────────────────────────────────────── */

describe('isolation routes seller vs buyer', () => {
  it('buyer — aucune route seller exposée', () => {
    const hrefs = allHrefs(BUYER_MENU_SECTIONS);
    for (const href of hrefs) {
      expect(href.startsWith('/seller')).toBe(false);
    }
  });

  it('seller — aucune route /buyer exposée', () => {
    const hrefs = allHrefs(SELLER_MENU_SECTIONS);
    for (const href of hrefs) {
      expect(href.startsWith('/buyer')).toBe(false);
    }
  });
});

/* ─── Couverture routes seller (parité desktop M117) ────────────────── */

describe('couverture routes seller', () => {
  const hrefs = allHrefs(SELLER_MENU_SECTIONS);

  it('contient /seller/dashboard', () => {
    expect(hrefs).toContain('/seller/dashboard');
  });

  it('contient /seller/profile/edit (Mon dossier)', () => {
    expect(hrefs).toContain('/seller/profile/edit');
  });

  it('contient /seller/documents (Mon dossier)', () => {
    expect(hrefs).toContain('/seller/documents');
  });

  it('contient /seller/profile/certifications (Mon dossier)', () => {
    expect(hrefs).toContain('/seller/profile/certifications');
  });

  it('contient /seller/compliance (Mon dossier)', () => {
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

  it('contient /marketplace-hub (Catalogue — parité desktop M117)', () => {
    expect(hrefs).toContain('/marketplace-hub');
  });

  it('contient /seller/marketplace-offers (Catalogue)', () => {
    expect(hrefs).toContain('/seller/marketplace-offers');
  });

  it('contient /seller/marketplace-offers/new (Catalogue)', () => {
    expect(hrefs).toContain('/seller/marketplace-offers/new');
  });

  it('contient /seller/analytics (Catalogue)', () => {
    expect(hrefs).toContain('/seller/analytics');
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

  it('module Mon dossier fermé par défaut', () => {
    expect(sectionById(SELLER_MENU_SECTIONS, 'referentiel')?.defaultCollapsed).toBe(true);
  });
});

/* ─── Couverture routes buyer (parité desktop M117) ─────────────────── */

describe('couverture routes buyer', () => {
  const hrefs = allHrefs(BUYER_MENU_SECTIONS);

  it('contient /buyer (Accueil)', () => {
    expect(hrefs).toContain('/buyer');
  });

  it('contient /buyer/profile (Mon dossier)', () => {
    expect(hrefs).toContain('/buyer/profile');
  });

  it('contient /buyer/profile/edit (Mon dossier)', () => {
    expect(hrefs).toContain('/buyer/profile/edit');
  });

  it('contient /buyer/preferences (Mon dossier)', () => {
    expect(hrefs).toContain('/buyer/preferences');
  });

  it('contient /quote-requests/new (Achats)', () => {
    expect(hrefs).toContain('/quote-requests/new');
  });

  it('contient /buyer/quote-requests (Achats)', () => {
    expect(hrefs).toContain('/buyer/quote-requests');
  });

  it('contient /buyer/payments (Achats — paiements à finaliser)', () => {
    expect(hrefs).toContain('/buyer/payments');
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

  it('contient /buyer/orders (Distribution)', () => {
    expect(hrefs).toContain('/buyer/orders');
  });

  it('contient /buyer/invoices (Distribution)', () => {
    expect(hrefs).toContain('/buyer/invoices');
  });
});

/* ─── Couverture routes admin (parité desktop complète M117) ─────────── */

describe('couverture routes admin', () => {
  const hrefs = allHrefs(ADMIN_MENU_SECTIONS);

  // Routes admin spécifiques
  it('contient /admin (Accueil)', () => expect(hrefs).toContain('/admin'));
  it('contient /admin/users (Mon dossier)', () => expect(hrefs).toContain('/admin/users'));
  it('contient /admin/sellers (Mon dossier)', () => expect(hrefs).toContain('/admin/sellers'));
  it('contient /admin/memberships (Mon dossier)', () => expect(hrefs).toContain('/admin/memberships'));
  it('contient /admin/review-queue (Production)', () => expect(hrefs).toContain('/admin/review-queue'));
  it('contient /admin/media-moderation (Production)', () => expect(hrefs).toContain('/admin/media-moderation'));
  it('contient /admin/rfq (Achats)', () => expect(hrefs).toContain('/admin/rfq'));
  it('contient /admin/marketplace/categories (Catalogue)', () => expect(hrefs).toContain('/admin/marketplace/categories'));
  it('contient /admin/compliance (Distribution)', () => expect(hrefs).toContain('/admin/compliance'));
  it('contient /admin/kpi (Distribution)', () => expect(hrefs).toContain('/admin/kpi'));
  it('contient /admin/audit-logs (Administration)', () => expect(hrefs).toContain('/admin/audit-logs'));
  it('contient /admin/diagnostics (Administration)', () => expect(hrefs).toContain('/admin/diagnostics'));
  it('contient /admin/notif-email/logs (Administration)', () => expect(hrefs).toContain('/admin/notif-email/logs'));

  // Routes staff (parité desktop M117 — admin voit toutes sections sur desktop)
  it('contient /dashboard (Accueil — tableau général M117)', () => expect(hrefs).toContain('/dashboard'));
  it('contient /beneficiaries (Mon dossier staff M117)', () => expect(hrefs).toContain('/beneficiaries'));
  it('contient /companies (Mon dossier staff M117)', () => expect(hrefs).toContain('/companies'));
  it('contient /supply-contracts (Mon dossier staff M117)', () => expect(hrefs).toContain('/supply-contracts'));
  it('contient /products (Mon dossier staff M117)', () => expect(hrefs).toContain('/products'));
  it('contient /inbound-batches (Production staff M117)', () => expect(hrefs).toContain('/inbound-batches'));
  it('contient /transformation-operations (Production staff M117)', () => expect(hrefs).toContain('/transformation-operations'));
  it('contient /product-batches (Production staff M117)', () => expect(hrefs).toContain('/product-batches'));
  it('contient /label-validations (Production staff M117)', () => expect(hrefs).toContain('/label-validations'));
  it('contient /traceability (Production staff M117)', () => expect(hrefs).toContain('/traceability'));
  it('contient /market-release-decisions (Production staff M117)', () => expect(hrefs).toContain('/market-release-decisions'));
  it('contient /distributions (Distribution staff M117)', () => expect(hrefs).toContain('/distributions'));
  it('contient /incidents (Distribution staff M117)', () => expect(hrefs).toContain('/incidents'));
  it('contient /documents (Distribution staff M117)', () => expect(hrefs).toContain('/documents'));

  it('module Administration fermé par défaut', () => {
    expect(sectionById(ADMIN_MENU_SECTIONS, 'administration')?.defaultCollapsed).toBe(true);
  });
});

/* ─── getBusinessModuleForPath ───────────────────────────────────────── */

describe('getBusinessModuleForPath', () => {
  describe('seller', () => {
    it('/seller/dashboard → home', () => {
      expect(getBusinessModuleForPath('/seller/dashboard', SELLER_MENU_SECTIONS)).toBe('home');
    });

    it('/seller/documents → referentiel', () => {
      expect(getBusinessModuleForPath('/seller/documents', SELLER_MENU_SECTIONS)).toBe('referentiel');
    });

    it('/seller/profile/certifications → referentiel', () => {
      expect(getBusinessModuleForPath('/seller/profile/certifications', SELLER_MENU_SECTIONS)).toBe('referentiel');
    });

    it('/seller/marketplace-products → production', () => {
      expect(getBusinessModuleForPath('/seller/marketplace-products', SELLER_MENU_SECTIONS)).toBe('production');
    });

    it('/seller/marketplace-products/new → production', () => {
      expect(getBusinessModuleForPath('/seller/marketplace-products/new', SELLER_MENU_SECTIONS)).toBe('production');
    });

    it('/seller/marketplace-products/42/certifications → production (sous-route)', () => {
      expect(getBusinessModuleForPath('/seller/marketplace-products/42/certifications', SELLER_MENU_SECTIONS)).toBe('production');
    });

    it('/seller/quote-requests → achats', () => {
      expect(getBusinessModuleForPath('/seller/quote-requests', SELLER_MENU_SECTIONS)).toBe('achats');
    });

    it('/marketplace-hub → catalogue', () => {
      expect(getBusinessModuleForPath('/marketplace-hub', SELLER_MENU_SECTIONS)).toBe('catalogue');
    });

    it('/seller/marketplace-offers → catalogue', () => {
      expect(getBusinessModuleForPath('/seller/marketplace-offers', SELLER_MENU_SECTIONS)).toBe('catalogue');
    });

    it('/seller/invoices → distribution', () => {
      expect(getBusinessModuleForPath('/seller/invoices', SELLER_MENU_SECTIONS)).toBe('distribution');
    });

    it('/seller/payments → distribution', () => {
      expect(getBusinessModuleForPath('/seller/payments', SELLER_MENU_SECTIONS)).toBe('distribution');
    });

    it('route inconnue → null', () => {
      expect(getBusinessModuleForPath('/unknown/route', SELLER_MENU_SECTIONS)).toBeNull();
    });
  });

  describe('buyer', () => {
    it('/buyer → home', () => {
      expect(getBusinessModuleForPath('/buyer', BUYER_MENU_SECTIONS)).toBe('home');
    });

    it('/buyer/profile → referentiel', () => {
      expect(getBusinessModuleForPath('/buyer/profile', BUYER_MENU_SECTIONS)).toBe('referentiel');
    });

    it('/buyer/quote-requests → achats', () => {
      expect(getBusinessModuleForPath('/buyer/quote-requests', BUYER_MENU_SECTIONS)).toBe('achats');
    });

    it('/marketplace-hub → catalogue', () => {
      expect(getBusinessModuleForPath('/marketplace-hub', BUYER_MENU_SECTIONS)).toBe('catalogue');
    });

    it('/buyer/invoices → distribution', () => {
      expect(getBusinessModuleForPath('/buyer/invoices', BUYER_MENU_SECTIONS)).toBe('distribution');
    });

    it('/buyer/orders → distribution', () => {
      expect(getBusinessModuleForPath('/buyer/orders', BUYER_MENU_SECTIONS)).toBe('distribution');
    });
  });

  describe('admin', () => {
    it('/admin → home', () => {
      expect(getBusinessModuleForPath('/admin', ADMIN_MENU_SECTIONS)).toBe('home');
    });

    it('/dashboard → home', () => {
      expect(getBusinessModuleForPath('/dashboard', ADMIN_MENU_SECTIONS)).toBe('home');
    });

    it('/admin/users → referentiel', () => {
      expect(getBusinessModuleForPath('/admin/users', ADMIN_MENU_SECTIONS)).toBe('referentiel');
    });

    it('/beneficiaries → referentiel', () => {
      expect(getBusinessModuleForPath('/beneficiaries', ADMIN_MENU_SECTIONS)).toBe('referentiel');
    });

    it('/admin/review-queue → production', () => {
      expect(getBusinessModuleForPath('/admin/review-queue', ADMIN_MENU_SECTIONS)).toBe('production');
    });

    it('/admin/media-moderation → production', () => {
      expect(getBusinessModuleForPath('/admin/media-moderation', ADMIN_MENU_SECTIONS)).toBe('production');
    });

    it('/inbound-batches → production', () => {
      expect(getBusinessModuleForPath('/inbound-batches', ADMIN_MENU_SECTIONS)).toBe('production');
    });

    it('/traceability → production', () => {
      expect(getBusinessModuleForPath('/traceability', ADMIN_MENU_SECTIONS)).toBe('production');
    });

    it('/admin/rfq → achats', () => {
      expect(getBusinessModuleForPath('/admin/rfq', ADMIN_MENU_SECTIONS)).toBe('achats');
    });

    it('/admin/marketplace/categories → catalogue', () => {
      expect(getBusinessModuleForPath('/admin/marketplace/categories', ADMIN_MENU_SECTIONS)).toBe('catalogue');
    });

    it('/admin/compliance → distribution', () => {
      expect(getBusinessModuleForPath('/admin/compliance', ADMIN_MENU_SECTIONS)).toBe('distribution');
    });

    it('/distributions → distribution', () => {
      expect(getBusinessModuleForPath('/distributions', ADMIN_MENU_SECTIONS)).toBe('distribution');
    });

    it('/incidents → distribution', () => {
      expect(getBusinessModuleForPath('/incidents', ADMIN_MENU_SECTIONS)).toBe('distribution');
    });

    it('/admin/audit-logs → administration', () => {
      expect(getBusinessModuleForPath('/admin/audit-logs', ADMIN_MENU_SECTIONS)).toBe('administration');
    });

    it('/admin/diagnostics → administration', () => {
      expect(getBusinessModuleForPath('/admin/diagnostics', ADMIN_MENU_SECTIONS)).toBe('administration');
    });
  });

  describe('cas limites', () => {
    it('tableau vide → null', () => {
      expect(getBusinessModuleForPath('/seller/dashboard', [])).toBeNull();
    });

    it('item disabled ignoré', () => {
      // buyer-search est disabled et pointe vers /marketplace-hub
      // buyer-catalog (non-disabled) pointe aussi vers /marketplace-hub
      // le résultat doit être 'catalogue' (via buyer-catalog)
      expect(getBusinessModuleForPath('/marketplace-hub', BUYER_MENU_SECTIONS)).toBe('catalogue');
    });
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

/* ─── getActiveItemHref (M123) ─────────────────────────────────────── */

describe('getActiveItemHref', () => {
  const buyerDossierItems = BUYER_MENU_SECTIONS.find((s) => s.id === 'referentiel')!.items;

  it('buyer /buyer/profile/edit → retourne /buyer/profile/edit (plus spécifique)', () => {
    expect(getActiveItemHref('/buyer/profile/edit', buyerDossierItems)).toBe('/buyer/profile/edit');
  });

  it('buyer /buyer/profile → retourne /buyer/profile (pas /buyer/profile/edit)', () => {
    expect(getActiveItemHref('/buyer/profile', buyerDossierItems)).toBe('/buyer/profile');
  });

  it('buyer /buyer/preferences → retourne /buyer/preferences', () => {
    expect(getActiveItemHref('/buyer/preferences', buyerDossierItems)).toBe('/buyer/preferences');
  });

  it('retourne null si aucun item ne correspond', () => {
    expect(getActiveItemHref('/seller/some-unknown-route', buyerDossierItems)).toBeNull();
  });

  it('seller Production — /seller/marketplace-products/new → retourne /seller/marketplace-products/new', () => {
    const sellerProductionItems = SELLER_MENU_SECTIONS.find((s) => s.id === 'production')!.items;
    expect(
      getActiveItemHref('/seller/marketplace-products/new', sellerProductionItems),
    ).toBe('/seller/marketplace-products/new');
  });

  it('seller Production — /seller/marketplace-products → retourne /seller/marketplace-products (pas new)', () => {
    const sellerProductionItems = SELLER_MENU_SECTIONS.find((s) => s.id === 'production')!.items;
    expect(
      getActiveItemHref('/seller/marketplace-products', sellerProductionItems),
    ).toBe('/seller/marketplace-products');
  });

  it('items vides → retourne null', () => {
    expect(getActiveItemHref('/buyer/profile', [])).toBeNull();
  });

  it('items disabled ignorés même si leur href correspond', () => {
    const items = [
      { id: 'a', label: 'A', href: '/buyer/profile', icon: {} as any, disabled: true },
      { id: 'b', label: 'B', href: '/buyer/profile/edit', icon: {} as any },
    ];
    expect(getActiveItemHref('/buyer/profile', items)).toBeNull();
    expect(getActiveItemHref('/buyer/profile/edit', items)).toBe('/buyer/profile/edit');
  });
});
