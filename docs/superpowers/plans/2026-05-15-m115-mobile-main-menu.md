# M115 Mobile Main Menu — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat "Plus" sheet in mobile bottom nav with a rich sectioned "Menu" drawer giving full access to all features, without breaking the simple 4-tab bottom nav or any existing tests.

**Architecture:** Add a new `mobile-menu-config.ts` with typed section/item data for each role. Update `mobile-bottom-nav.tsx` to render an accordion drawer (custom, no shadcn dep) in place of the flat secondary-items sheet. Bottom nav stays at 4 primary tabs + "Menu" button = 5 visual items max. All existing `mobile-nav-config.test.ts` assertions remain green without modification.

**Tech Stack:** Next.js 14, TypeScript, lucide-react, shadcn/ui Sheet (already used), vitest, Tailwind CSS.

---

## Audit Summary (Part A)

### Routes inaccessibles mobile avant M115

**Seller** — présentes sur desktop, absentes de bottom nav + Plus sheet :
- `/seller/profile/edit` — profil vendeur modifiable
- `/seller/marketplace-products/new` — uniquement via contextual action (liste produits), pas dans Plus
- `/seller/marketplace-offers/new` — idem, uniquement contextual action
- `/seller/certifications` → `/seller/profile/certifications` — absent partout mobile

**Buyer** — absentes :
- `/buyer/payments` — page hub paiements (Fix 2, M115)
- `/buyer/profile/edit` — modifier profil
- `/marketplace/favorites` — favoris
- `/marketplace/categories` — catégories
- `/quote-requests/new` — nouvelle demande (pas accessible sans naviguer vers catalogue)

**Admin** — secondaryItems couvre l'essentiel mais sans regroupement :
- `/admin/memberships` — absent du secondaryItems
- Structure plate = difficile à scanner pour un admin mobile

### Problème UX principal
Le sheet "Plus" présente tous les liens en liste plate sans groupement ni description. Impossible de comprendre à quoi sert chaque section d'un coup d'œil. Non adapté aux utilisateurs peu technophiles.

---

## File Structure

| Fichier | Statut | Rôle |
|---|---|---|
| `components/layout/mobile-menu-config.ts` | CREATE | Types + sections data pour les 3 rôles |
| `components/layout/mobile-menu-config.test.ts` | CREATE | Tests sections + couverture routes |
| `components/layout/mobile-bottom-nav.tsx` | MODIFY | Utilise sections accordion, renomme Plus→Menu |
| `components/layout/mobile-nav-config.ts` | NO CHANGE | Existant, tests restent verts |
| `notes/mobile-main-menu-audit-iox.md` | CREATE | Audit Part A |
| `notes/mobile-main-menu-navigation-iox.md` | CREATE | Doc navigation Part K |
| `notes/handoff-mandat-115-mobile-main-menu.md` | CREATE | Handoff final |

---

## Task 1 — Audit doc (Part A)

**Files:**
- Create: `notes/mobile-main-menu-audit-iox.md`

- [ ] **Step 1: Create audit file**

```markdown
# Audit UX Mobile — IOX Navigation (M115)

**Date** : 2026-05-15
**Analysé par** : Chantier M115

---

## Problème constaté

La navigation mobile IOX (M102) utilise une bottom nav à 4 onglets + sheet "Plus".
Le sheet "Plus" affiche une liste plate de liens secondaires sans structure.
Résultat : utilisateurs peu technophiles ne trouvent pas les fonctionnalités importantes.

---

## Routes inaccessibles sur mobile (avant M115)

### Seller

| Route | Description | Impact |
|---|---|---|
| `/seller/profile/edit` | Modifier le profil vendeur | Bloquant si l'utilisateur doit modifier son profil |
| `/seller/marketplace-products/new` | Nouveau produit | Accessible seulement depuis la liste produits (contextual action) |
| `/seller/marketplace-offers/new` | Nouvelle offre | Idem — contextual action uniquement |
| `/seller/profile/certifications` | Certifications | Absent de toute navigation mobile |

### Buyer

| Route | Description | Impact |
|---|---|---|
| `/buyer/payments` | Paiements à finaliser | Lien depuis daily actions mais pas depuis menu |
| `/buyer/profile/edit` | Modifier profil acheteur | Non accessible |
| `/marketplace/favorites` | Favoris produits | Non accessible |
| `/marketplace/categories` | Catégories catalogue | Non accessible |
| `/quote-requests/new` | Nouvelle demande de devis | Non accessible sans passer par le catalogue |

### Admin

| Route | Description | Impact |
|---|---|---|
| `/admin/memberships` | Rattachements user↔entreprise | Absent du secondaryItems admin |

---

## Analyse UX

### Problème 1 — Liste plate sans groupement
Le sheet "Plus" affiche N liens sans catégorie. L'utilisateur doit tout lire pour trouver ce qu'il cherche.

### Problème 2 — Pas de description
Aucune explication sur ce que fait chaque lien. Non-évident pour un vendeur agriculteur.

### Problème 3 — Fonctionnalités masquées
Plusieurs routes clés ne sont dans aucun menu mobile.

---

## Recommandation UX

1. Remplacer le sheet "Plus" par un drawer structuré par sections
2. Sections en accordéon : l'utilisateur voit les catégories, ouvre la bonne
3. Chaque item : icône + label simple + description courte
4. Renommer "Plus" en "Menu" pour indiquer l'accès complet
5. Ajouter profil, certifications, favoris, paiements aux sections
6. Ne pas dépasser 6 sections par rôle (charge cognitive)
7. Ouvrir la 1ère section par défaut (guidage)
```

- [ ] **Step 2: Commit audit doc**

```bash
git add notes/mobile-main-menu-audit-iox.md
git commit -m "docs(m115): audit navigation mobile — routes inaccessibles et recommandation UX"
```

---

## Task 2 — Types et données sections (`mobile-menu-config.ts`)

**Files:**
- Create: `apps/frontend/src/components/layout/mobile-menu-config.ts`

- [ ] **Step 1: Create the file with types + all three role sections**

```typescript
/**
 * IOX — Configuration Menu Principal Mobile (M115)
 *
 * Architecture à 3 niveaux :
 *   Niveau 1 — Bottom nav (4 onglets primaires, inchangée)
 *   Niveau 2 — Menu principal mobile (ce fichier)
 *   Niveau 3 — Sous-menus par section (accordéon dans le drawer)
 *
 * Ce fichier est une source de données pure — aucun hook React,
 * aucun import component. Testable en isolation totale.
 */
import { UserRole } from '@iox/shared';
import {
  Package,
  Plus,
  Tag,
  MessageSquareQuote,
  FolderLock,
  ShieldCheck,
  CreditCard,
  Receipt,
  UserCog,
  BarChart3,
  Activity,
  Search,
  ShoppingBag,
  ShoppingCart,
  Bell,
  Building2,
  Layers,
  Store,
  ClipboardList,
  Image,
  ScrollText,
  Network,
  Heart,
  type LucideIcon,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface MobileMenuItem {
  id: string;
  /** Label court — pas de jargon technique, pas de termes anglais. */
  label: string;
  href: string;
  icon: LucideIcon;
  /** Description courte affichée sous le label. */
  description?: string;
  /** Badge numérique (ex: nb d'alertes). */
  badge?: number;
  /** Item non cliquable avec explication. */
  disabled?: boolean;
  /** Note affichée quand disabled=true. */
  disabledNote?: string;
}

export interface MobileMenuSection {
  id: string;
  /** Titre de la section. */
  label: string;
  icon: LucideIcon;
  items: MobileMenuItem[];
  /** Si true, section fermée à l'ouverture du menu. Défaut : false (ouverte). */
  defaultCollapsed?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Sections MARKETPLACE_SELLER                                         */
/* ------------------------------------------------------------------ */

export const SELLER_MENU_SECTIONS: MobileMenuSection[] = [
  {
    id: 'products',
    label: 'Mes produits',
    icon: Package,
    items: [
      {
        id: 'products-list',
        label: 'Voir mes produits',
        href: '/seller/marketplace-products',
        icon: Package,
        description: 'Gérez vos fiches produit',
      },
      {
        id: 'products-new',
        label: 'Ajouter un produit',
        href: '/seller/marketplace-products/new',
        icon: Plus,
        description: 'Créer une nouvelle fiche produit',
      },
      {
        id: 'offers-list',
        label: 'Mes offres',
        href: '/seller/marketplace-offers',
        icon: Tag,
        description: 'Offres commerciales publiées',
      },
      {
        id: 'offers-new',
        label: 'Ajouter une offre',
        href: '/seller/marketplace-offers/new',
        icon: Plus,
        description: 'Créer une nouvelle offre',
      },
    ],
  },
  {
    id: 'quotes',
    label: 'Mes demandes',
    icon: MessageSquareQuote,
    defaultCollapsed: true,
    items: [
      {
        id: 'quote-requests',
        label: 'Demandes reçues',
        href: '/seller/quote-requests',
        icon: MessageSquareQuote,
        description: 'Demandes de devis à traiter',
      },
      {
        id: 'messages-note',
        label: 'Messages',
        href: '/seller/quote-requests',
        icon: MessageSquareQuote,
        description: 'Les messages sont dans chaque demande',
        disabled: true,
        disabledNote: 'Accessible dans chaque demande',
      },
    ],
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: FolderLock,
    defaultCollapsed: true,
    items: [
      {
        id: 'documents',
        label: 'Mes documents',
        href: '/seller/documents',
        icon: FolderLock,
        description: 'Pièces justificatives et contrats',
      },
      {
        id: 'certifications',
        label: 'Certifications',
        href: '/seller/profile/certifications',
        icon: ShieldCheck,
        description: 'Vos certifications et labels',
      },
    ],
  },
  {
    id: 'compliance',
    label: 'Conformité',
    icon: ShieldCheck,
    defaultCollapsed: true,
    items: [
      {
        id: 'compliance',
        label: 'Ma conformité',
        href: '/seller/compliance',
        icon: ShieldCheck,
        description: 'Statut et documents requis',
      },
    ],
  },
  {
    id: 'payments',
    label: 'Paiements et factures',
    icon: CreditCard,
    defaultCollapsed: true,
    items: [
      {
        id: 'invoices',
        label: 'Mes factures',
        href: '/seller/invoices',
        icon: Receipt,
        description: 'Historique des factures émises',
      },
      {
        id: 'payments',
        label: 'Paiements reçus',
        href: '/seller/payments',
        icon: CreditCard,
        description: 'Configuration des encaissements',
      },
    ],
  },
  {
    id: 'account',
    label: 'Mon compte',
    icon: UserCog,
    defaultCollapsed: true,
    items: [
      {
        id: 'profile-edit',
        label: 'Mon profil vendeur',
        href: '/seller/profile/edit',
        icon: UserCog,
        description: 'Modifier vos informations',
      },
      {
        id: 'analytics',
        label: 'Statistiques',
        href: '/seller/analytics',
        icon: BarChart3,
        description: 'Performance de votre boutique',
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Sections MARKETPLACE_BUYER                                          */
/* ------------------------------------------------------------------ */

export const BUYER_MENU_SECTIONS: MobileMenuSection[] = [
  {
    id: 'search',
    label: 'Rechercher',
    icon: Search,
    items: [
      {
        id: 'catalog',
        label: 'Catalogue',
        href: '/marketplace-hub',
        icon: ShoppingBag,
        description: 'Parcourir tous les produits',
      },
      {
        id: 'favorites',
        label: 'Mes favoris',
        href: '/marketplace/favorites',
        icon: Heart,
        description: 'Produits sauvegardés',
      },
      {
        id: 'categories',
        label: 'Catégories',
        href: '/marketplace/categories',
        icon: Layers,
        description: 'Parcourir par catégorie',
      },
    ],
  },
  {
    id: 'quotes',
    label: 'Mes demandes',
    icon: MessageSquareQuote,
    defaultCollapsed: true,
    items: [
      {
        id: 'new-rfq',
        label: 'Nouvelle demande',
        href: '/quote-requests/new',
        icon: Plus,
        description: 'Demander un devis à un vendeur',
      },
      {
        id: 'my-rfqs',
        label: 'Toutes mes demandes',
        href: '/buyer/quote-requests',
        icon: MessageSquareQuote,
        description: 'Suivi de toutes vos demandes',
      },
    ],
  },
  {
    id: 'payments',
    label: 'Paiements',
    icon: CreditCard,
    defaultCollapsed: true,
    items: [
      {
        id: 'payments',
        label: 'Paiements à finaliser',
        href: '/buyer/payments',
        icon: CreditCard,
        description: 'Commandes en attente de paiement',
      },
      {
        id: 'orders',
        label: 'Mes commandes',
        href: '/buyer/orders',
        icon: ShoppingCart,
        description: 'Historique des commandes',
      },
    ],
  },
  {
    id: 'invoices',
    label: 'Factures',
    icon: Receipt,
    defaultCollapsed: true,
    items: [
      {
        id: 'invoices',
        label: 'Mes factures',
        href: '/buyer/invoices',
        icon: Receipt,
        description: 'Téléchargez vos factures',
      },
    ],
  },
  {
    id: 'account',
    label: 'Mon compte',
    icon: UserCog,
    defaultCollapsed: true,
    items: [
      {
        id: 'profile',
        label: 'Mon profil acheteur',
        href: '/buyer/profile',
        icon: Building2,
        description: 'Informations de votre entreprise',
      },
      {
        id: 'profile-edit',
        label: 'Modifier le profil',
        href: '/buyer/profile/edit',
        icon: UserCog,
        description: 'Mettre à jour vos informations',
      },
      {
        id: 'preferences',
        label: 'Préférences',
        href: '/buyer/preferences',
        icon: Bell,
        description: 'Notifications et alertes',
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Sections ADMIN                                                      */
/* ------------------------------------------------------------------ */

export const ADMIN_MENU_SECTIONS: MobileMenuSection[] = [
  {
    id: 'review',
    label: 'À traiter',
    icon: ClipboardList,
    items: [
      {
        id: 'review-queue',
        label: 'Documents à valider',
        href: '/admin/review-queue',
        icon: ClipboardList,
        description: 'Soumissions vendeurs en attente',
      },
      {
        id: 'media-moderation',
        label: 'Médias en attente',
        href: '/admin/media-moderation',
        icon: Image,
        description: 'Photos et vidéos à modérer',
      },
      {
        id: 'sellers-pending',
        label: 'Vendeurs en attente',
        href: '/admin/sellers',
        icon: Store,
        description: 'Profils à valider',
      },
    ],
  },
  {
    id: 'users',
    label: 'Utilisateurs',
    icon: UserCog,
    defaultCollapsed: true,
    items: [
      {
        id: 'users',
        label: 'Utilisateurs',
        href: '/admin/users',
        icon: UserCog,
        description: 'Comptes et rôles',
      },
      {
        id: 'memberships',
        label: 'Rattachements',
        href: '/admin/memberships',
        icon: Network,
        description: 'Liens utilisateurs ↔ entreprises',
      },
    ],
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    icon: Store,
    defaultCollapsed: true,
    items: [
      {
        id: 'categories',
        label: 'Catégories',
        href: '/admin/marketplace/categories',
        icon: Layers,
        description: 'Taxonomie du catalogue',
      },
      {
        id: 'rfq',
        label: 'Demandes de devis',
        href: '/admin/rfq',
        icon: MessageSquareQuote,
        description: 'Suivi RFQ côté plateforme',
      },
      {
        id: 'compliance-admin',
        label: 'Conformité',
        href: '/admin/compliance',
        icon: ShieldCheck,
        description: 'Documents et certifications',
      },
    ],
  },
  {
    id: 'operations',
    label: 'Exploitation',
    icon: Activity,
    defaultCollapsed: true,
    items: [
      {
        id: 'kpi',
        label: 'KPI',
        href: '/admin/kpi',
        icon: BarChart3,
        description: 'Indicateurs de performance',
      },
      {
        id: 'audit',
        label: "Journal d'audit",
        href: '/admin/audit-logs',
        icon: ScrollText,
        description: 'Traçabilité des actions',
      },
      {
        id: 'diagnostics',
        label: 'Diagnostics',
        href: '/admin/diagnostics',
        icon: Activity,
        description: 'Santé technique',
      },
      {
        id: 'emails',
        label: 'Emails',
        href: '/admin/notif-email/logs',
        icon: Bell,
        description: 'Logs et statistiques emails',
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Helper                                                             */
/* ------------------------------------------------------------------ */

/**
 * Retourne les sections du menu principal mobile pour un rôle donné.
 * null si le rôle n'a pas de menu mobile (staff → hamburger existant).
 */
export function getMobileMenuSections(role: UserRole): MobileMenuSection[] | null {
  if (role === UserRole.MARKETPLACE_SELLER) return SELLER_MENU_SECTIONS;
  if (role === UserRole.MARKETPLACE_BUYER) return BUYER_MENU_SECTIONS;
  if (role === UserRole.ADMIN) return ADMIN_MENU_SECTIONS;
  return null;
}
```

- [ ] **Step 2: Verify file compiles**

```bash
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -10
```

Expected: 0 errors.

---

## Task 3 — Tests `mobile-menu-config.test.ts`

**Files:**
- Create: `apps/frontend/src/components/layout/mobile-menu-config.test.ts`
- Test: `apps/frontend/src/components/layout/mobile-menu-config.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
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
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
pnpm --filter @iox/frontend test -- src/components/layout/mobile-menu-config.test.ts 2>&1 | tail -15
```

Expected: all new tests PASS.

- [ ] **Step 3: Confirm existing tests still pass**

```bash
pnpm --filter @iox/frontend test -- src/components/layout/mobile-nav-config.test.ts 2>&1 | tail -8
```

Expected: 48 tests, all PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/components/layout/mobile-menu-config.ts \
        apps/frontend/src/components/layout/mobile-menu-config.test.ts
git commit -m "feat(m115): mobile-menu-config — types, sections data et tests (seller/buyer/admin)"
```

---

## Task 4 — Mise à jour `mobile-bottom-nav.tsx`

**Files:**
- Modify: `apps/frontend/src/components/layout/mobile-bottom-nav.tsx`

Le fichier actuel (261 lignes) doit :
1. Importer `getMobileMenuSections` depuis `mobile-menu-config`
2. Ajouter `useState<Set<string>>` pour gérer les sections ouvertes dans l'accordéon
3. Remplacer le Sheet content (flat list `secondaryItems`) par sections accordéon
4. Renommer le bouton "Plus" → "Menu", changer l'icône `MoreHorizontal` → `Menu`

- [ ] **Step 1: Replace `mobile-bottom-nav.tsx` entirely**

```typescript
'use client';

/**
 * IOX — MobileBottomNav (M115)
 *
 * Structure :
 *   ┌──────────────────────────────────────────────┐
 *   │  [Action contextuelle flottante]             │  ← selon la route
 *   ├──────────────────────────────────────────────┤
 *   │ Onglet1 │ Onglet2 │ Onglet3 │ Onglet4 │ Menu │  ← toujours visible
 *   └──────────────────────────────────────────────┘
 *
 * Menu ouvre un drawer bottom sheet avec sections accordéon :
 *   Section 1 (ouverte par défaut)
 *     └ Item A / Item B / ...
 *   Section 2 (fermée)
 *   ...
 *
 * Règles :
 *   - primaryTabs : inchangés (4 max, tests existants verts)
 *   - "Menu" remplace "Plus" — même Sheet, contenu restructuré
 *   - Accordéon custom (pas de dep externe)
 *   - Visible uniquement sur mobile (<md)
 */
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, LogOut, UserCog, ChevronDown, ChevronRight } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/auth.context';
import { ROLE_LABELS } from '@/lib/auth';
import { cn } from '@/lib/utils';
import {
  getMobileNavConfig,
  isPathActive,
  type MobileTab,
} from './mobile-nav-config';
import {
  getMobileMenuSections,
  type MobileMenuSection,
} from './mobile-menu-config';

/* ------------------------------------------------------------------ */
/*  Composant interne — Section accordéon                               */
/* ------------------------------------------------------------------ */

interface SectionProps {
  section: MobileMenuSection;
  isOpen: boolean;
  onToggle: () => void;
  pathname: string;
  onItemClick: () => void;
}

function MenuSection({ section, isOpen, onToggle, pathname, onItemClick }: SectionProps) {
  const Icon = section.icon;
  const hasActive = section.items.some(
    (item) => !item.disabled && isPathActive(pathname, item.href),
  );

  return (
    <div className="rounded-xl overflow-hidden">
      {/* En-tête section */}
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors',
          isOpen ? 'bg-white/5' : 'hover:bg-white/5',
          hasActive && 'text-[#00D4FF]',
        )}
        aria-expanded={isOpen}
      >
        <Icon
          className={cn(
            'h-5 w-5 flex-shrink-0',
            hasActive ? 'text-[#00D4FF]' : 'text-white/50',
          )}
          aria-hidden
        />
        <span className={cn('flex-1 text-sm font-semibold', !hasActive && 'text-white/85')}>
          {section.label}
        </span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-white/30" aria-hidden />
        ) : (
          <ChevronRight className="h-4 w-4 text-white/30" aria-hidden />
        )}
      </button>

      {/* Items de la section */}
      {isOpen && (
        <div className="px-2 pb-2">
          {section.items.map((item) => {
            const ItemIcon = item.icon;
            const active = !item.disabled && isPathActive(pathname, item.href);

            if (item.disabled) {
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-lg px-3 py-2.5 text-white/25 cursor-not-allowed"
                  title={item.disabledNote}
                >
                  <ItemIcon className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-snug">{item.label}</p>
                    {item.disabledNote && (
                      <p className="text-xs text-white/20 leading-snug mt-0.5">{item.disabledNote}</p>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={onItemClick}
                className={cn(
                  'flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors',
                  active
                    ? 'bg-[#00D4FF]/10 text-[#00D4FF] ring-1 ring-inset ring-[#00D4FF]/20'
                    : 'text-white/75 hover:bg-white/5 hover:text-white',
                )}
              >
                <ItemIcon
                  className={cn(
                    'mt-0.5 h-4 w-4 flex-shrink-0',
                    active ? 'text-[#00D4FF]' : 'text-white/40',
                  )}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-snug">{item.label}</p>
                  {item.description && (
                    <p className="text-xs text-white/35 leading-snug mt-0.5">{item.description}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Composant principal                                                 */
/* ------------------------------------------------------------------ */

export function MobileBottomNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const config = getMobileNavConfig(user?.role ?? null);
  const sections = user ? getMobileMenuSections(user.role) : null;

  // Sections ouvertes par défaut = celles dont defaultCollapsed !== true
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set((sections ?? []).filter((s) => !s.defaultCollapsed).map((s) => s.id)),
  );

  if (!user || !config) return null;

  const isTabActive = (tab: MobileTab) => isPathActive(pathname, tab.pathPrefix, tab.exactMatch);

  const contextualEntry = config.contextualActions.find((c) =>
    isPathActive(pathname, c.pathPrefix, c.exactMatch),
  );
  const contextualActions = contextualEntry?.actions ?? [];

  const isAnyMenuActive = sections
    ? sections.some((s) => s.items.some((i) => !i.disabled && isPathActive(pathname, i.href)))
    : false;

  function toggleSection(id: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      {/* ── Action contextuelle flottante ────────────────────────────── */}
      {contextualActions.length > 0 && (
        <div
          className="md:hidden fixed left-0 right-0 z-20 flex justify-center px-6"
          style={{ bottom: 'calc(4.25rem + env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#0A0E1A]/90 px-2 py-1.5 backdrop-blur-xl shadow-lg shadow-black/40">
            {contextualActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.id}
                  href={action.href}
                  className="flex items-center gap-1.5 rounded-full bg-[#00D4FF]/15 px-4 py-1.5 text-sm font-semibold text-[#00D4FF] ring-1 ring-[#00D4FF]/30 transition-colors hover:bg-[#00D4FF]/25 active:scale-95"
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                  {action.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Barre de navigation principale ───────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-[#0A0E1A]/95 backdrop-blur-xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Navigation principale"
      >
        <div className="flex h-[4rem] items-stretch">
          {/* Onglets primaires (inchangés) */}
          {config.primaryTabs.map((tab) => {
            const Icon = tab.icon;
            const active = isTabActive(tab);

            if (tab.disabled) {
              return (
                <span
                  key={tab.id}
                  aria-disabled="true"
                  title="Bientôt disponible"
                  className="flex flex-1 flex-col items-center justify-center gap-1 px-1 text-white/25 cursor-not-allowed select-none"
                >
                  <Icon className="h-[1.25rem] w-[1.25rem]" aria-hidden />
                  <span className="text-[11px] font-medium leading-none tracking-[0.01em]">
                    {tab.label}
                  </span>
                </span>
              );
            }

            return (
              <Link
                key={tab.id}
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-1 px-1 transition-colors duration-fast',
                  active ? 'text-[#00D4FF]' : 'text-white/55 hover:text-white/75',
                )}
              >
                <Icon
                  className={cn(
                    'h-[1.25rem] w-[1.25rem] transition-[filter] duration-fast',
                    active && 'drop-shadow-[0_0_8px_rgba(0,212,255,0.75)]',
                  )}
                  aria-hidden
                />
                <span className="text-[11px] font-medium leading-none tracking-[0.01em]">
                  {tab.label}
                </span>
              </Link>
            );
          })}

          {/* Bouton Menu (remplace Plus) */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Menu principal"
            aria-expanded={menuOpen}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 px-1 transition-colors duration-fast',
              isAnyMenuActive || menuOpen ? 'text-[#00D4FF]' : 'text-white/55 hover:text-white/75',
            )}
          >
            <Menu
              className={cn(
                'h-[1.25rem] w-[1.25rem] transition-[filter] duration-fast',
                (isAnyMenuActive || menuOpen) && 'drop-shadow-[0_0_8px_rgba(0,212,255,0.75)]',
              )}
              aria-hidden
            />
            <span className="text-[11px] font-medium leading-none tracking-[0.01em]">Menu</span>
          </button>
        </div>
      </nav>

      {/* ── Drawer Menu Principal ─────────────────────────────────────── */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[90vh] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-[#0A0E1A]/98 p-0 text-white backdrop-blur-xl"
        >
          {/* Poignée visuelle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-white/20" aria-hidden />
          </div>

          {/* En-tête utilisateur */}
          <div className="px-5 py-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-iox-neon text-sm font-semibold text-white shadow-glow-cyan-sm ring-1 ring-[#00D4FF]/30">
                {(user.firstName?.[0] ?? '').toUpperCase()}
                {(user.lastName?.[0] ?? '').toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {user.firstName} {user.lastName}
                </p>
                <p className="truncate text-xs text-white/50">{ROLE_LABELS[user.role]}</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-white/40">Choisissez ce que vous voulez faire.</p>
          </div>

          {/* Sections accordéon */}
          {sections && (
            <div className="px-2 py-2 space-y-0.5">
              {sections.map((section) => (
                <MenuSection
                  key={section.id}
                  section={section}
                  isOpen={openSections.has(section.id)}
                  onToggle={() => toggleSection(section.id)}
                  pathname={pathname}
                  onItemClick={() => setMenuOpen(false)}
                />
              ))}
            </div>
          )}

          {/* Pied — profil + déconnexion */}
          <div className="border-t border-white/10 px-3 py-3">
            <Link
              href="/profile"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-white/5"
            >
              <UserCog className="h-5 w-5 flex-shrink-0 text-white/40" aria-hidden />
              <span className="text-sm font-medium text-white/75">Mon profil</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                logout();
              }}
              className="mt-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/50 transition-colors hover:bg-white/5 hover:text-white"
            >
              <LogOut className="h-5 w-5 flex-shrink-0 text-white/40" aria-hidden />
              <span className="font-medium">Déconnexion</span>
            </button>
          </div>

          {/* Safe area iOS */}
          <div style={{ height: 'env(safe-area-inset-bottom)' }} />
        </SheetContent>
      </Sheet>
    </>
  );
}
```

> **Note:** Le composant `getMobileNavConfig` acceptait `UserRole` — il faut vérifier que `user?.role ?? null` compile. Si `getMobileNavConfig` attend `UserRole` (non-nullable), conserver `if (!user) return null` AVANT l'appel. Le code ci-dessus gère ça car on retourne `null` si `!user || !config`.

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -10
```

Expected: 0 errors.

**Si erreur sur `getMobileNavConfig(user?.role ?? null)`** — la signature attend `UserRole`, pas `UserRole | null`. Corriger l'appel :

```typescript
// Remplacer les 2 lignes:
const config = getMobileNavConfig(user?.role ?? null);
const sections = user ? getMobileMenuSections(user.role) : null;

// Par:
if (!user) return null;
const config = getMobileNavConfig(user.role);
const sections = getMobileMenuSections(user.role);
```

Et retirer le `if (!user || !config)` pour le remplacer par `if (!config) return null;`.

- [ ] **Step 3: Run all frontend tests**

```bash
pnpm --filter @iox/frontend test 2>&1 | tail -8
```

Expected: ≥ 609 + nouveaux tests (menu-config), tous PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/components/layout/mobile-bottom-nav.tsx
git commit -m "feat(m115): menu principal mobile — drawer sections accordéon remplace sheet Plus"
```

---

## Task 5 — Vérification complète

**Files:**
- No changes

- [ ] **Step 1: TypeScript full check**

```bash
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1
```

Expected: 0 errors.

- [ ] **Step 2: All tests**

```bash
pnpm --filter @iox/frontend test 2>&1 | tail -10
```

Expected: tous les fichiers PASS, aucune régression.

- [ ] **Step 3: Verify specific test files**

```bash
pnpm --filter @iox/frontend test -- src/components/layout/ src/lib/daily-actions.test.ts 2>&1 | tail -12
```

Expected:
- `mobile-nav-config.test.ts` — 48 tests PASS (inchangés)
- `mobile-menu-config.test.ts` — tous les nouveaux tests PASS
- `daily-actions.test.ts` — 47 tests PASS (inchangés)
- `marketplace-bell.test.tsx` — 3 tests PASS (inchangés)

---

## Task 6 — Documentation finale

**Files:**
- Create: `notes/mobile-main-menu-navigation-iox.md`
- Create: `notes/handoff-mandat-115-mobile-main-menu.md`

- [ ] **Step 1: Write navigation doc (Part K)**

```markdown
# Navigation Mobile IOX — Principe M115

**Date** : 2026-05-15
**Mandat** : M115

---

## Problème utilisateur

Après M102, la navigation mobile est simple mais incomplète.
Les fonctionnalités importantes (profil, certifications, paiements, favoris)
ne sont accessibles que sur desktop.
Les utilisateurs agriculteurs/artisans abandonnent sur mobile.

---

## Principe retenu

Architecture à 3 niveaux :

```
Niveau 1 — Bottom nav (4 onglets + Menu)
  → Actions fréquentes. Toujours visibles.

Niveau 2 — Menu principal (drawer bottom sheet)
  → Accès complet. Sections accordéon.

Niveau 3 — Sous-menus par section
  → Items groupés. Description courte.
```

---

## Bottom nav vs Menu principal

| Bottom nav | Menu principal |
|---|---|
| 4 onglets fréquents + Menu | Toutes les fonctionnalités |
| Accès immédiat, 1 tap | Accès 2 taps (Menu → Section) |
| Inchangé (tests verts) | Nouveau drawer accordéon |
| Icônes + labels courts | Labels clairs + descriptions |

---

## Structure seller

Bottom nav : Accueil / Produits / Demandes / Messages(désactivé) / Menu

Menu sections :
1. **Mes produits** (ouverte par défaut) — produits, offres, créer
2. **Mes demandes** (fermée) — devis reçus, note messages
3. **Documents** (fermée) — documents, certifications
4. **Conformité** (fermée) — statut
5. **Paiements et factures** (fermée) — factures, paiements
6. **Mon compte** (fermée) — profil edit, statistiques

---

## Structure buyer

Bottom nav : Accueil / Rechercher / Demandes / Messages(désactivé) / Menu

Menu sections :
1. **Rechercher** (ouverte) — catalogue, favoris, catégories
2. **Mes demandes** (fermée) — nouvelle demande, toutes les demandes
3. **Paiements** (fermée) — à finaliser, commandes
4. **Factures** (fermée) — mes factures
5. **Mon compte** (fermée) — profil, modifier profil, préférences

---

## Structure admin

Bottom nav : Tableau / Revue / Vendeurs / Utilisateurs / Menu

Menu sections :
1. **À traiter** (ouverte) — documents, médias, vendeurs en attente
2. **Utilisateurs** (fermée) — users, rattachements
3. **Marketplace** (fermée) — catégories, RFQ, conformité
4. **Exploitation** (fermée) — KPI, audit, diagnostics, emails

---

## Routes couvertes

### Seller
`/seller`, `/seller/marketplace-products`, `/seller/marketplace-products/new`,
`/seller/marketplace-offers`, `/seller/marketplace-offers/new`,
`/seller/quote-requests`, `/seller/documents`, `/seller/compliance`,
`/seller/invoices`, `/seller/payments`, `/seller/profile/edit`,
`/seller/profile/certifications`, `/seller/analytics`

### Buyer
`/buyer`, `/marketplace-hub`, `/marketplace/favorites`, `/marketplace/categories`,
`/quote-requests/new`, `/buyer/quote-requests`, `/buyer/payments`,
`/buyer/orders`, `/buyer/invoices`, `/buyer/profile`, `/buyer/profile/edit`,
`/buyer/preferences`

### Admin
`/admin`, `/admin/review-queue`, `/admin/media-moderation`, `/admin/sellers`,
`/admin/users`, `/admin/memberships`, `/admin/marketplace/categories`,
`/admin/rfq`, `/admin/compliance`, `/admin/kpi`, `/admin/audit-logs`,
`/admin/diagnostics`, `/admin/notif-email/logs`

---

## Décisions UX

| Question | Décision | Raison |
|---|---|---|
| Accordion ou page séparée ? | Accordion dans Sheet | Pas de rupture de contexte, 0 dépendance lourde |
| Sections ouvertes par défaut ? | Première section ouverte | Guide l'utilisateur vers l'essentiel |
| Nombre max sections ? | 6 | Au-delà = surcharge cognitive |
| "Plus" ou "Menu" ? | "Menu" | Plus intuitif pour un non-technophile |
| Route /messages ? | Désactivée + note explicative | Route non prête (M58) |

---

## Limites

| Élément | État | Suite |
|---|---|---|
| Route `/messages` | Désactivée, note dans Mes demandes | Activer quand route prête |
| Badges dynamiques sur sections | Non implémentés | Passer `badge` depuis daily actions via context |
| Animations accordéon | CSS transition simple (`height: auto` → CSS vars) | Améliorer si besoin UX |
| Admin : KPI / Swagger | KPI dans menu, Swagger non exposé mobile | Swagger = outil dev, pas besoin mobile |
```

- [ ] **Step 2: Write handoff doc**

```markdown
# Handoff — Mandat 115 : Navigation Mobile Complète (Menu Principal)

**Date** : 2026-05-15
**Branche** : main
**Tests** : 609 + nouveaux, tous verts
**TypeScript** : clean

---

## Fichiers créés

| Fichier | Rôle |
|---|---|
| `components/layout/mobile-menu-config.ts` | Types + sections data (seller/buyer/admin) |
| `components/layout/mobile-menu-config.test.ts` | Tests couverture routes + structure |
| `notes/mobile-main-menu-audit-iox.md` | Audit UX routes inaccessibles |
| `notes/mobile-main-menu-navigation-iox.md` | Doc navigation M115 |
| `notes/handoff-mandat-115-mobile-main-menu.md` | Ce fichier |

## Fichiers modifiés

| Fichier | Changement |
|---|---|
| `components/layout/mobile-bottom-nav.tsx` | Drawer sections accordéon, Plus→Menu |

## Fichiers NON modifiés

| Fichier | Raison |
|---|---|
| `components/layout/mobile-nav-config.ts` | Tests existants 100% verts, aucun changement nécessaire |
| `lib/daily-actions.ts` | M103/M104 inchangé |

---

## Tests ajoutés

- `mobile-menu-config.test.ts` — N nouveaux tests :
  - `getMobileMenuSections` retourne le bon objet par rôle
  - Structure sections (ids uniques, max 6 sections, items valides)
  - Items disabled ont une disabledNote
  - Couverture routes seller (13 routes vérifiées)
  - Couverture routes buyer (11 routes vérifiées)
  - Couverture routes admin (10 routes vérifiées)

---

## Résultats

| Check | Résultat |
|---|---|
| Tests frontend | ≥ 609 + nouveaux ✅ |
| mobile-nav-config.test.ts (48 tests) | ✅ inchangés |
| mobile-menu-config.test.ts | ✅ nouveaux verts |
| daily-actions.test.ts (47 tests) | ✅ inchangés |
| TypeScript | ✅ 0 erreur |
| Build | À vérifier au déploiement |

---

## Routes ajoutées au menu mobile

Seller : `/seller/profile/edit`, `/seller/profile/certifications`, `/seller/marketplace-products/new`, `/seller/marketplace-offers/new`

Buyer : `/buyer/payments`, `/buyer/profile/edit`, `/marketplace/favorites`, `/marketplace/categories`, `/quote-requests/new`

Admin : `/admin/memberships`

---

## Risques restants

| Risque | Probabilité | Mitigation |
|---|---|---|
| Scroll Sheet sur iOS (bounce) | Faible | `overflow-y-auto` + `max-h-[90vh]` |
| Sections ouvertes par défaut à rouvrir à chaque ouverture du menu | Attendu | État `openSections` initialisé à chaque mount du Sheet |
| Animations accordéon saccadées | Faible | Transition CSS simple, pas d'animation hauteur |

---

## Décision

**GO** — Navigation mobile complète, accès à toutes les fonctionnalités, tests verts, TypeScript clean.

**GO avec réserve** si les animations accordéon sont saccadées sur device réel → améliorer CSS.
```

- [ ] **Step 3: Commit docs**

```bash
git add notes/mobile-main-menu-navigation-iox.md notes/handoff-mandat-115-mobile-main-menu.md
git commit -m "docs(m115): navigation mobile M115 — principe, structures, handoff"
```

---

## Task 7 — Commit final plan

**Files:**
- `docs/superpowers/plans/2026-05-15-m115-mobile-main-menu.md` (ce fichier)

- [ ] **Step 1: Commit plan**

```bash
git add docs/superpowers/plans/2026-05-15-m115-mobile-main-menu.md
git commit -m "docs(m115): plan implémentation navigation mobile complète"
```

---

## Self-Review

### Spec coverage check

| Partie spec | Tâche couverte |
|---|---|
| Part A — Audit | Task 1 (audit doc) + inline dans plan |
| Part B — Architecture 3 niveaux | Reflété dans types + drawer |
| Part C — MobileMenuSection avec accordéon | Task 2 (types) + Task 4 (drawer) |
| Part D — Structure seller | Task 2 (SELLER_MENU_SECTIONS) |
| Part E — Structure buyer | Task 2 (BUYER_MENU_SECTIONS) |
| Part F — Structure admin | Task 2 (ADMIN_MENU_SECTIONS) |
| Part G — Daily Actions non remplacées | Bottom nav + Daily Actions sur Accueil, inchangés |
| Part H — Couverture routes | Task 3 (tests couverture routes) |
| Part I — Composants + fonctions | Task 2 + Task 4 |
| Part J — Tests | Task 3 + Task 5 (vérification) |
| Part K — Documentation | Task 6 |

### Placeholder scan
Aucun "TBD" ou "TODO" dans le plan. Code complet à chaque étape.

### Type consistency
- `MobileMenuSection.id: string` — utilisé dans `openSections: Set<string>` ✓
- `getMobileMenuSections(role: UserRole): MobileMenuSection[] | null` — utilisé dans bottom-nav ✓
- `MobileMenuItem.disabled?: boolean` — rendu conditionnel dans `MenuSection` ✓
- `MobileMenuItem.disabledNote?: string` — affiché quand disabled + testé ✓
- `isPathActive` importé depuis `mobile-nav-config` — inchangé ✓
