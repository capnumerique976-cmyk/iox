/**
 * IOX — Configuration navigation mobile (bottom nav)
 *
 * Navigation progressive par rôle :
 *   - Onglets primaires : jusqu'à 4 destinations clés + bouton "Plus" implicite
 *   - Items secondaires : révélés via sheet "Plus" (progressive disclosure)
 *   - Actions contextuelles : affichées au-dessus de la barre selon la route
 *
 * Rôles couverts :
 *   MARKETPLACE_SELLER → 4 tabs (Accueil, Produits, Demandes, Messages[futur])
 *   MARKETPLACE_BUYER  → 4 tabs (Accueil, Rechercher, Demandes, Messages[futur])
 *   ADMIN              → 4 tabs (Tableau, Revue, Vendeurs, Utilisateurs)
 *   Staff autres       → hamburger drawer existant (null retourné)
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
  Search,
  LayoutDashboard,
  MessageCircle,
  ClipboardList,
  UserCog,
  BarChart3,
  Image,
  Layers,
  ScrollText,
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
  /**
   * Onglet présent dans la barre mais non encore disponible.
   * Rendu grisé, non cliquable. Communique la roadmap produit.
   */
  disabled?: boolean;
}

export interface MobileContextAction {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface MobileNavConfig {
  /** Onglets toujours visibles (4 max + le bouton "Plus" implicite). */
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
      id: 'home',
      label: 'Accueil',
      href: '/seller/dashboard',
      icon: Store,
      pathPrefix: '/seller/dashboard',
      exactMatch: true,
    },
    {
      id: 'products',
      label: 'Produits',
      href: '/seller/marketplace-products',
      icon: Package,
      pathPrefix: '/seller/marketplace-products',
    },
    {
      id: 'quotes',
      label: 'Demandes',
      href: '/seller/quote-requests',
      icon: MessageSquareQuote,
      pathPrefix: '/seller/quote-requests',
    },
    {
      // Onglet futur — messaging non encore implémenté.
      // Visible mais non cliquable : communique la roadmap.
      id: 'messages',
      label: 'Messages',
      href: '/messages',
      icon: MessageCircle,
      pathPrefix: '/__messages_seller__',
      disabled: true,
    },
  ],
  secondaryItems: [
    {
      id: 'analytics',
      label: 'Analytique',
      href: '/seller/analytics',
      icon: Activity,
      pathPrefix: '/seller/analytics',
    },
    {
      id: 'offers',
      label: 'Mes offres',
      href: '/seller/marketplace-offers',
      icon: Tag,
      pathPrefix: '/seller/marketplace-offers',
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
      id: 'home',
      label: 'Accueil',
      href: '/buyer',
      icon: LayoutDashboard,
      pathPrefix: '/buyer',
      exactMatch: true,
    },
    {
      id: 'search',
      label: 'Rechercher',
      href: '/marketplace-hub',
      icon: Search,
      pathPrefix: '/marketplace-hub',
    },
    {
      id: 'quotes',
      label: 'Demandes',
      href: '/buyer/quote-requests',
      icon: MessageSquareQuote,
      pathPrefix: '/buyer/quote-requests',
    },
    {
      // Onglet futur — messaging non encore implémenté.
      id: 'messages',
      label: 'Messages',
      href: '/messages',
      icon: MessageCircle,
      pathPrefix: '/__messages_buyer__',
      disabled: true,
    },
  ],
  secondaryItems: [
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
/*  Config ADMIN                                                        */
/* ------------------------------------------------------------------ */

export const ADMIN_MOBILE_NAV: MobileNavConfig = {
  primaryTabs: [
    {
      id: 'dashboard',
      label: 'Tableau',
      href: '/admin',
      icon: ShieldCheck,
      pathPrefix: '/admin',
      exactMatch: true,
    },
    {
      id: 'review',
      label: 'Revue',
      href: '/admin/review-queue',
      icon: ClipboardList,
      pathPrefix: '/admin/review-queue',
    },
    {
      id: 'sellers',
      label: 'Vendeurs',
      href: '/admin/sellers',
      icon: Store,
      pathPrefix: '/admin/sellers',
    },
    {
      id: 'users',
      label: 'Utilisateurs',
      href: '/admin/users',
      icon: UserCog,
      pathPrefix: '/admin/users',
    },
  ],
  secondaryItems: [
    {
      id: 'kpi',
      label: 'KPIs',
      href: '/admin/kpi',
      icon: BarChart3,
      pathPrefix: '/admin/kpi',
    },
    {
      id: 'compliance',
      label: 'Conformité',
      href: '/admin/compliance',
      icon: ShieldCheck,
      pathPrefix: '/admin/compliance',
    },
    {
      id: 'media',
      label: 'Médias',
      href: '/admin/media-moderation',
      icon: Image,
      pathPrefix: '/admin/media-moderation',
    },
    {
      id: 'categories',
      label: 'Catégories',
      href: '/admin/marketplace/categories',
      icon: Layers,
      pathPrefix: '/admin/marketplace/categories',
    },
    {
      id: 'rfq',
      label: 'Devis admin',
      href: '/admin/rfq',
      icon: MessageSquareQuote,
      pathPrefix: '/admin/rfq',
    },
    {
      id: 'memberships',
      label: 'Rattachements',
      href: '/admin/memberships',
      icon: Building2,
      pathPrefix: '/admin/memberships',
    },
    {
      id: 'emails',
      label: 'Emails',
      href: '/admin/notif-email/logs',
      icon: Bell,
      pathPrefix: '/admin/notif-email',
    },
    {
      id: 'audit',
      label: 'Journal',
      href: '/admin/audit-logs',
      icon: ScrollText,
      pathPrefix: '/admin/audit-logs',
    },
    {
      id: 'diagnostics',
      label: 'Diagnostics',
      href: '/admin/diagnostics',
      icon: Activity,
      pathPrefix: '/admin/diagnostics',
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
  if (role === UserRole.ADMIN) return ADMIN_MOBILE_NAV;
  return null; // autres rôles staff → hamburger drawer
}

/** Vérifie si un pathname correspond à un préfixe de tab. */
export function isPathActive(pathname: string, pathPrefix: string, exactMatch = false): boolean {
  if (exactMatch) return pathname === pathPrefix;
  return pathname === pathPrefix || pathname.startsWith(pathPrefix + '/');
}
