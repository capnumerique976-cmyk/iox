/**
 * IOX — Configuration navigation mobile (bottom nav)
 *
 * Navigation progressive par rôle :
 *   - Onglets primaires : 3 destinations clés + bouton "Plus"
 *   - Items secondaires : révélés via sheet "Plus" (progressive disclosure)
 *   - Actions contextuelles : affichées au-dessus de la barre selon la route
 *
 * Uniquement pour MARKETPLACE_SELLER et MARKETPLACE_BUYER.
 * Les rôles staff conservent le drawer hamburger existant.
 */
import { UserRole } from '@iox/shared';
import {
  Package,
  MessageSquareQuote,
  Store,
  ShoppingCart,
  Receipt,
  CreditCard,
  Tag,
  FolderLock,
  ShieldCheck,
  Activity,
  Bell,
  Building2,
  Plus,
  type LucideIcon,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface MobileTab {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Préfixe de route pour la détection de l'onglet actif. */
  pathPrefix: string;
  /** Si true, comparaison exacte (pas de préfixe). */
  exactMatch?: boolean;
}

export interface MobileContextAction {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface MobileNavConfig {
  /** Onglets toujours visibles (3 max + le bouton "Plus" implicite). */
  primaryTabs: MobileTab[];
  /** Items révélés dans le sheet "Plus". */
  secondaryItems: MobileTab[];
  /**
   * Actions contextuelles affichées en flottant au-dessus de la barre
   * lorsque le pathname correspond à `pathPrefix`.
   */
  contextualActions: {
    pathPrefix: string;
    /** true = correspond à ce chemin exact uniquement (pas les sous-routes). */
    exactMatch?: boolean;
    actions: MobileContextAction[];
  }[];
}

/* ------------------------------------------------------------------ */
/*  Config MARKETPLACE_SELLER                                           */
/* ------------------------------------------------------------------ */

export const SELLER_MOBILE_NAV: MobileNavConfig = {
  primaryTabs: [
    {
      id: 'products',
      label: 'Produits',
      href: '/seller/marketplace-products',
      icon: Package,
      pathPrefix: '/seller/marketplace-products',
    },
    {
      id: 'quotes',
      label: 'Devis',
      href: '/seller/quote-requests',
      icon: MessageSquareQuote,
      pathPrefix: '/seller/quote-requests',
    },
    {
      id: 'dashboard',
      label: 'Tableau',
      href: '/seller/dashboard',
      icon: Store,
      pathPrefix: '/seller/dashboard',
      exactMatch: true,
    },
  ],
  secondaryItems: [
    {
      id: 'offers',
      label: 'Mes offres',
      href: '/seller/marketplace-offers',
      icon: Tag,
      pathPrefix: '/seller/marketplace-offers',
    },
    {
      id: 'analytics',
      label: 'Analytique',
      href: '/seller/analytics',
      icon: Activity,
      pathPrefix: '/seller/analytics',
    },
    {
      id: 'documents',
      label: 'Documents',
      href: '/seller/documents',
      icon: FolderLock,
      pathPrefix: '/seller/documents',
    },
    {
      id: 'compliance',
      label: 'Conformité',
      href: '/seller/compliance',
      icon: ShieldCheck,
      pathPrefix: '/seller/compliance',
    },
    {
      id: 'payments',
      label: 'Paiements',
      href: '/seller/payments',
      icon: CreditCard,
      pathPrefix: '/seller/payments',
    },
    {
      id: 'invoices',
      label: 'Factures',
      href: '/seller/invoices',
      icon: Receipt,
      pathPrefix: '/seller/invoices',
    },
  ],
  contextualActions: [
    {
      // Sur la liste des produits → raccourci "Nouveau produit"
      pathPrefix: '/seller/marketplace-products',
      exactMatch: true,
      actions: [
        {
          id: 'new-product',
          label: 'Nouveau produit',
          href: '/seller/marketplace-products/new',
          icon: Plus,
        },
      ],
    },
    {
      // Sur la liste des offres → raccourci "Nouvelle offre"
      pathPrefix: '/seller/marketplace-offers',
      exactMatch: true,
      actions: [
        {
          id: 'new-offer',
          label: 'Nouvelle offre',
          href: '/seller/marketplace-offers/new',
          icon: Plus,
        },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  Config MARKETPLACE_BUYER                                            */
/* ------------------------------------------------------------------ */

export const BUYER_MOBILE_NAV: MobileNavConfig = {
  primaryTabs: [
    {
      id: 'quotes',
      label: 'Devis',
      href: '/buyer/quote-requests',
      icon: MessageSquareQuote,
      pathPrefix: '/buyer/quote-requests',
    },
    {
      id: 'orders',
      label: 'Commandes',
      href: '/buyer/orders',
      icon: ShoppingCart,
      pathPrefix: '/buyer/orders',
    },
    {
      id: 'invoices',
      label: 'Factures',
      href: '/buyer/invoices',
      icon: Receipt,
      pathPrefix: '/buyer/invoices',
    },
  ],
  secondaryItems: [
    {
      id: 'preferences',
      label: 'Préférences',
      href: '/buyer/preferences',
      icon: Bell,
      pathPrefix: '/buyer/preferences',
    },
    {
      id: 'company',
      label: 'Mon entreprise',
      href: '/buyer/profile',
      icon: Building2,
      pathPrefix: '/buyer/profile',
    },
  ],
  contextualActions: [],
};

/* ------------------------------------------------------------------ */
/*  Helper                                                             */
/* ------------------------------------------------------------------ */

export function getMobileNavConfig(role: UserRole): MobileNavConfig | null {
  if (role === UserRole.MARKETPLACE_SELLER) return SELLER_MOBILE_NAV;
  if (role === UserRole.MARKETPLACE_BUYER) return BUYER_MOBILE_NAV;
  return null; // staff → hamburger drawer existant
}

/** Vérifie si un pathname correspond à un préfixe de tab. */
export function isPathActive(pathname: string, pathPrefix: string, exactMatch = false): boolean {
  if (exactMatch) return pathname === pathPrefix;
  return pathname === pathPrefix || pathname.startsWith(pathPrefix + '/');
}
