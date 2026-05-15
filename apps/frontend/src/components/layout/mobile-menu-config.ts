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
