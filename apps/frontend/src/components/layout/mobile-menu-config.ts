/**
 * IOX — Configuration Menu Principal Mobile (M117)
 *
 * Architecture à 3 niveaux :
 *   Niveau 1 — Bottom nav (4 onglets primaires, inchangée)
 *   Niveau 2 — Menu principal mobile (ce fichier) — 7 modules métier
 *   Niveau 3 — Navigation progressive : Modules → Sous-menus → Page
 *
 * Desktop parity (M117) :
 *   - MARKETPLACE_SELLER : parité avec section `marketplace` desktop + routes seller spécifiques
 *   - MARKETPLACE_BUYER  : parité avec section `buyer` desktop + catalogue marketplace
 *   - ADMIN              : parité avec TOUTES les sections desktop (admin + staff complet)
 *
 * Les 7 modules métier (structure commune par rôle) :
 *   1. Accueil      — tableau de bord et actions du jour
 *   2. Mon dossier  — profils, documents, certifications
 *   3. Production   — produits, lots, médias (seller/admin)
 *   4. Achats       — demandes, devis, paiements
 *   5. Catalogue    — offres, recherche, catégories
 *   6. Distribution — factures, commandes, suivi
 *   7. Administration — supervision, modération (admin uniquement)
 *
 * Règles :
 *   - Administration jamais exposée aux seller/buyer
 *   - Production cachée pour buyer (aucune route pertinente)
 *   - Aucun faux lien : seules les routes existantes sont référencées
 *   - Ce fichier est une source de données pure — testable en isolation
 */
import { UserRole } from '@iox/shared';
import {
  Home,
  BookOpen,
  Package,
  ShoppingCart,
  Store,
  Truck,
  ShieldCheck,
  Plus,
  Tag,
  MessageSquareQuote,
  FolderLock,
  CreditCard,
  Receipt,
  UserCog,
  BarChart3,
  Activity,
  Search,
  ShoppingBag,
  Bell,
  Building2,
  Layers,
  ClipboardList,
  Image,
  ScrollText,
  Network,
  Heart,
  LayoutDashboard,
  Inbox,
  GitBranch,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  FileArchive,
  FileSignature,
  Users,
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
  /** Titre du module métier. */
  label: string;
  /** Description courte affichée dans l'en-tête accordéon. */
  description?: string;
  icon: LucideIcon;
  items: MobileMenuItem[];
  /** Si true, section fermée à l'ouverture du menu. Défaut : false (ouverte). */
  defaultCollapsed?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Sections MARKETPLACE_SELLER (6 modules — Administration cachée)    */
/*  Parité desktop : section `marketplace` + routes seller spécifiques */
/* ------------------------------------------------------------------ */

export const SELLER_MENU_SECTIONS: MobileMenuSection[] = [
  {
    id: 'home',
    label: 'Accueil',
    description: 'Vos actions du jour et votre tableau de bord.',
    icon: Home,
    defaultCollapsed: false,
    items: [
      {
        id: 'seller-dashboard',
        label: 'Tableau de bord',
        href: '/seller/dashboard',
        icon: Home,
        description: 'Alertes, tâches et résumé du jour',
      },
    ],
  },
  {
    id: 'referentiel',
    label: 'Mon dossier',
    description: 'Votre profil, vos documents et votre conformité.',
    icon: BookOpen,
    defaultCollapsed: true,
    items: [
      {
        id: 'seller-profile-edit',
        label: 'Mon profil vendeur',
        href: '/seller/profile/edit',
        icon: UserCog,
        description: 'Modifier vos informations de vitrine',
      },
      {
        id: 'seller-documents',
        label: 'Mes documents',
        href: '/seller/documents',
        icon: FolderLock,
        description: 'Pièces justificatives et contrats',
      },
      {
        id: 'seller-certifications',
        label: 'Certifications',
        href: '/seller/profile/certifications',
        icon: ShieldCheck,
        description: 'Vos certifications et labels qualité',
      },
      {
        id: 'seller-compliance',
        label: 'Conformité',
        href: '/seller/compliance',
        icon: ShieldCheck,
        description: 'Statut réglementaire et documents requis',
      },
    ],
  },
  {
    id: 'production',
    label: 'Production',
    description: 'Vos produits, lots et médias.',
    icon: Package,
    defaultCollapsed: true,
    items: [
      {
        id: 'seller-products',
        label: 'Mes produits',
        href: '/seller/marketplace-products',
        icon: Package,
        description: 'Gérez vos fiches produit',
      },
      {
        id: 'seller-products-new',
        label: 'Ajouter un produit',
        href: '/seller/marketplace-products/new',
        icon: Plus,
        description: 'Créer une nouvelle fiche produit',
      },
    ],
  },
  {
    id: 'achats',
    label: 'Achats',
    description: 'Demandes reçues et réponses.',
    icon: ShoppingCart,
    defaultCollapsed: true,
    items: [
      {
        id: 'seller-quote-requests',
        label: 'Demandes reçues',
        href: '/seller/quote-requests',
        icon: MessageSquareQuote,
        description: 'Demandes de devis des acheteurs',
      },
    ],
  },
  {
    id: 'catalogue',
    label: 'Catalogue',
    description: 'Vos offres publiées sur le marché.',
    icon: Store,
    defaultCollapsed: true,
    items: [
      {
        id: 'seller-hub',
        label: "Vue d'ensemble marché",
        href: '/marketplace-hub',
        icon: ShoppingBag,
        description: 'Vue consolidée vendeur sur le marché',
      },
      {
        id: 'seller-offers',
        label: 'Mes offres',
        href: '/seller/marketplace-offers',
        icon: Tag,
        description: 'Offres commerciales publiées',
      },
      {
        id: 'seller-offers-new',
        label: 'Ajouter une offre',
        href: '/seller/marketplace-offers/new',
        icon: Plus,
        description: 'Créer une nouvelle offre',
      },
      {
        id: 'seller-analytics',
        label: 'Statistiques',
        href: '/seller/analytics',
        icon: BarChart3,
        description: 'Performance de votre boutique',
      },
    ],
  },
  {
    id: 'distribution',
    label: 'Distribution',
    description: 'Factures, paiements et suivi commercial.',
    icon: Truck,
    defaultCollapsed: true,
    items: [
      {
        id: 'seller-invoices',
        label: 'Mes factures',
        href: '/seller/invoices',
        icon: Receipt,
        description: 'Historique des factures émises',
      },
      {
        id: 'seller-payments',
        label: 'Paiements',
        href: '/seller/payments',
        icon: CreditCard,
        description: 'Configuration des encaissements Stripe',
      },
    ],
  },
  // Administration : cachée pour seller — aucune route admin exposée
];

/* ------------------------------------------------------------------ */
/*  Sections MARKETPLACE_BUYER (5 modules — Production + Admin cachés) */
/*  Parité desktop : section `buyer` desktop + catalogue marketplace   */
/* ------------------------------------------------------------------ */

export const BUYER_MENU_SECTIONS: MobileMenuSection[] = [
  {
    id: 'home',
    label: 'Accueil',
    description: 'Vos actions du jour et votre tableau de bord.',
    icon: Home,
    defaultCollapsed: false,
    items: [
      {
        id: 'buyer-dashboard',
        label: 'Tableau de bord',
        href: '/buyer',
        icon: Home,
        description: 'Alertes, tâches et résumé du jour',
      },
    ],
  },
  {
    id: 'referentiel',
    label: 'Mon dossier',
    description: 'Votre profil, vos documents et votre conformité.',
    icon: BookOpen,
    defaultCollapsed: true,
    items: [
      {
        id: 'buyer-profile',
        label: 'Mon profil acheteur',
        href: '/buyer/profile',
        icon: Building2,
        description: 'Informations de votre entreprise',
      },
      {
        id: 'buyer-profile-edit',
        label: 'Modifier le profil',
        href: '/buyer/profile/edit',
        icon: UserCog,
        description: 'Mettre à jour vos informations',
      },
      {
        id: 'buyer-preferences',
        label: 'Préférences',
        href: '/buyer/preferences',
        icon: Bell,
        description: 'Notifications et alertes',
      },
    ],
  },
  // Production : cachée pour buyer — aucune route pertinente
  {
    id: 'achats',
    label: 'Achats',
    description: 'Demandes, devis et commandes.',
    icon: ShoppingCart,
    defaultCollapsed: true,
    items: [
      {
        id: 'buyer-rfq-new',
        label: 'Nouvelle demande',
        href: '/quote-requests/new',
        icon: Plus,
        description: 'Envoyer une demande de devis à un vendeur',
      },
      {
        id: 'buyer-quote-requests',
        label: 'Mes demandes',
        href: '/buyer/quote-requests',
        icon: MessageSquareQuote,
        description: 'Suivi de toutes vos demandes',
      },
      {
        id: 'buyer-payments-pending',
        label: 'Paiements à finaliser',
        href: '/buyer/payments',
        icon: CreditCard,
        description: 'Commandes en attente de paiement',
      },
    ],
  },
  {
    id: 'catalogue',
    label: 'Catalogue',
    description: 'Recherche, offres et catégories.',
    icon: Store,
    defaultCollapsed: true,
    items: [
      {
        id: 'buyer-catalog',
        label: 'Catalogue',
        href: '/marketplace-hub',
        icon: ShoppingBag,
        description: 'Parcourir tous les produits',
      },
      {
        id: 'buyer-categories',
        label: 'Catégories',
        href: '/marketplace/categories',
        icon: Layers,
        description: 'Parcourir par catégorie',
      },
      {
        id: 'buyer-favorites',
        label: 'Mes favoris',
        href: '/marketplace/favorites',
        icon: Heart,
        description: 'Produits sauvegardés',
      },
    ],
  },
  {
    id: 'distribution',
    label: 'Distribution',
    description: 'Factures, commandes et suivi.',
    icon: Truck,
    defaultCollapsed: true,
    items: [
      {
        id: 'buyer-payments',
        label: 'Paiements',
        href: '/buyer/payments',
        icon: CreditCard,
        description: 'Commandes en attente de paiement',
      },
      {
        id: 'buyer-orders',
        label: 'Mes commandes',
        href: '/buyer/orders',
        icon: ShoppingCart,
        description: 'Historique des commandes passées',
      },
      {
        id: 'buyer-invoices',
        label: 'Mes factures',
        href: '/buyer/invoices',
        icon: Receipt,
        description: 'Téléchargez vos factures',
      },
    ],
  },
  // Administration : cachée pour buyer — aucune route admin exposée
];

/* ------------------------------------------------------------------ */
/*  Sections ADMIN (7 modules — parité desktop complète M117)         */
/*  Inclut routes staff visibles sur desktop pour le rôle ADMIN       */
/*  (getVisibleSections(ADMIN) retourne toutes les sections).         */
/* ------------------------------------------------------------------ */

export const ADMIN_MENU_SECTIONS: MobileMenuSection[] = [
  {
    id: 'home',
    label: 'Accueil',
    description: 'Tableau de bord et alertes plateforme.',
    icon: Home,
    defaultCollapsed: false,
    items: [
      {
        id: 'admin-dashboard',
        label: 'Tableau admin',
        href: '/admin',
        icon: ShieldCheck,
        description: 'Vue globale de la plateforme',
      },
      {
        id: 'admin-general-dashboard',
        label: 'Tableau de bord général',
        href: '/dashboard',
        icon: LayoutDashboard,
        description: 'Vue consolidée toutes opérations',
      },
    ],
  },
  {
    id: 'referentiel',
    label: 'Mon dossier',
    description: 'Votre profil, vos documents et votre conformité.',
    icon: BookOpen,
    defaultCollapsed: true,
    items: [
      {
        id: 'admin-users',
        label: 'Utilisateurs',
        href: '/admin/users',
        icon: UserCog,
        description: 'Comptes et rôles',
      },
      {
        id: 'admin-sellers',
        label: 'Vendeurs',
        href: '/admin/sellers',
        icon: Store,
        description: 'Profils vendeurs et statuts',
      },
      {
        id: 'admin-memberships',
        label: 'Rattachements',
        href: '/admin/memberships',
        icon: Network,
        description: 'Liens utilisateurs ↔ entreprises',
      },
      {
        id: 'admin-beneficiaries',
        label: 'Bénéficiaires',
        href: '/beneficiaries',
        icon: Users,
        description: 'Personnes habilitées à recevoir une aide',
      },
      {
        id: 'admin-companies',
        label: 'Entreprises',
        href: '/companies',
        icon: Building2,
        description: 'Acteurs de la chaîne',
      },
      {
        id: 'admin-supply-contracts',
        label: "Contrats d'approvisionnement",
        href: '/supply-contracts',
        icon: FileSignature,
        description: 'Engagements amont',
      },
      {
        id: 'admin-products-ref',
        label: 'Produits référentiel',
        href: '/products',
        icon: Package,
        description: 'Catalogue produits et fiches techniques',
      },
    ],
  },
  {
    id: 'production',
    label: 'Production',
    description: 'Revue documentaire, modération et chaîne de production.',
    icon: Package,
    defaultCollapsed: true,
    items: [
      {
        id: 'admin-review-queue',
        label: 'À valider',
        href: '/admin/review-queue',
        icon: ClipboardList,
        description: 'Documents et soumissions en attente',
      },
      {
        id: 'admin-media-moderation',
        label: 'Médias',
        href: '/admin/media-moderation',
        icon: Image,
        description: 'Photos et vidéos à modérer',
      },
      {
        id: 'admin-inbound-batches',
        label: 'Lots entrants',
        href: '/inbound-batches',
        icon: Inbox,
        description: 'Réception et qualification des matières',
      },
      {
        id: 'admin-transformation-ops',
        label: 'Transformations',
        href: '/transformation-operations',
        icon: GitBranch,
        description: 'Opérations de transformation',
      },
      {
        id: 'admin-product-batches',
        label: 'Lots finis',
        href: '/product-batches',
        icon: Boxes,
        description: 'Lots prêts à être validés',
      },
      {
        id: 'admin-label-validations',
        label: 'Étiquetage',
        href: '/label-validations',
        icon: Tag,
        description: 'Validation conformité étiquetage',
      },
      {
        id: 'admin-traceability',
        label: 'Traçabilité',
        href: '/traceability',
        icon: Search,
        description: 'Recherche end-to-end de la chaîne',
      },
      {
        id: 'admin-market-release',
        label: 'Mise en marché',
        href: '/market-release-decisions',
        icon: CheckCircle2,
        description: 'Décisions de libération marché',
      },
    ],
  },
  {
    id: 'achats',
    label: 'Achats',
    description: 'Suivi des demandes de la plateforme.',
    icon: ShoppingCart,
    defaultCollapsed: true,
    items: [
      {
        id: 'admin-rfq',
        label: 'Demandes de devis',
        href: '/admin/rfq',
        icon: MessageSquareQuote,
        description: 'Suivi global des demandes plateforme',
      },
    ],
  },
  {
    id: 'catalogue',
    label: 'Catalogue',
    description: 'Catégories et taxonomie.',
    icon: Store,
    defaultCollapsed: true,
    items: [
      {
        id: 'admin-categories',
        label: 'Catégories',
        href: '/admin/marketplace/categories',
        icon: Layers,
        description: 'Taxonomie du catalogue produit',
      },
    ],
  },
  {
    id: 'distribution',
    label: 'Distribution',
    description: 'Conformité, indicateurs et opérations terrain.',
    icon: Truck,
    defaultCollapsed: true,
    items: [
      {
        id: 'admin-compliance',
        label: 'Conformité',
        href: '/admin/compliance',
        icon: ShieldCheck,
        description: 'Documents et certifications vendeurs',
      },
      {
        id: 'admin-kpi',
        label: 'KPI',
        href: '/admin/kpi',
        icon: BarChart3,
        description: 'Indicateurs de performance plateforme',
      },
      {
        id: 'admin-distributions',
        label: 'Distributions terrain',
        href: '/distributions',
        icon: Truck,
        description: 'Distributions planifiées et réalisées',
      },
      {
        id: 'admin-incidents',
        label: 'Incidents',
        href: '/incidents',
        icon: AlertTriangle,
        description: 'Incidents terrain à traiter',
      },
      {
        id: 'admin-documents',
        label: 'Documents distribution',
        href: '/documents',
        icon: FileArchive,
        description: 'Pièces justificatives distribution',
      },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    description: 'Contrôle, modération et exploitation.',
    icon: ShieldCheck,
    defaultCollapsed: true,
    items: [
      {
        id: 'admin-audit',
        label: "Journal d'audit",
        href: '/admin/audit-logs',
        icon: ScrollText,
        description: 'Traçabilité complète des actions',
      },
      {
        id: 'admin-diagnostics',
        label: 'Diagnostics',
        href: '/admin/diagnostics',
        icon: Activity,
        description: 'Santé technique de la plateforme',
      },
      {
        id: 'admin-emails',
        label: 'Emails',
        href: '/admin/notif-email/logs',
        icon: Bell,
        description: 'Logs et statistiques emails',
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Retourne les sections du menu principal mobile (7 modules métier)
 * pour un rôle donné. null si le rôle n'a pas de menu mobile.
 *
 * seller → 6 modules (Administration cachée)
 * buyer  → 5 modules (Production + Administration cachées)
 * admin  → 7 modules complets (parité desktop M117)
 */
export function getMobileMenuSections(role: UserRole): MobileMenuSection[] | null {
  if (role === UserRole.MARKETPLACE_SELLER) return SELLER_MENU_SECTIONS;
  if (role === UserRole.MARKETPLACE_BUYER) return BUYER_MENU_SECTIONS;
  if (role === UserRole.ADMIN) return ADMIN_MENU_SECTIONS;
  return null;
}

/**
 * Détecte le module métier actif à partir du pathname courant.
 * Stratégie : cherche un item (non disabled) dont le href correspond au pathname.
 * Retourne l'id du module parent ou null si aucune correspondance.
 *
 * Exemples :
 *   /seller/marketplace-products/new → 'production'
 *   /seller/documents                → 'referentiel'
 *   /buyer/quote-requests            → 'achats'
 *   /admin/media-moderation          → 'production'
 *   /admin/audit-logs                → 'administration'
 *   /distributions                   → 'distribution'
 */
export function getBusinessModuleForPath(
  pathname: string,
  sections: MobileMenuSection[],
): string | null {
  // Stratégie "longest match wins" : si plusieurs items matchent le pathname,
  // on retient celui dont le href est le plus long (le plus spécifique).
  // Exemple : /admin/compliance matche à la fois /admin (home) et
  // /admin/compliance (distribution) → on retient /admin/compliance.
  let bestSectionId: string | null = null;
  let bestMatchLength = -1;

  for (const section of sections) {
    for (const item of section.items) {
      if (item.disabled) continue;
      if (pathname === item.href || pathname.startsWith(item.href + '/')) {
        if (item.href.length > bestMatchLength) {
          bestMatchLength = item.href.length;
          bestSectionId = section.id;
        }
      }
    }
  }

  return bestSectionId;
}

/**
 * Trouve l'item actif le plus spécifique parmi une liste d'items (longest match wins).
 * Évite le double état actif quand un item parent et son enfant correspondent tous les deux
 * au pathname courant via la règle startsWith.
 *
 * Exemples :
 *   pathname = '/buyer/profile/edit'
 *   items = ['/buyer/profile', '/buyer/profile/edit', '/buyer/preferences']
 *   → retourne '/buyer/profile/edit'  (plus spécifique que '/buyer/profile')
 *
 *   pathname = '/buyer/profile'
 *   → retourne '/buyer/profile'  ('/buyer/profile/edit' ne matche pas)
 *
 *   pathname = '/seller/marketplace-products/new'
 *   items = ['/seller/marketplace-products', '/seller/marketplace-products/new']
 *   → retourne '/seller/marketplace-products/new'
 */
export function getActiveItemHref(
  pathname: string,
  items: MobileMenuItem[],
): string | null {
  let best: string | null = null;
  let bestLen = -1;

  for (const item of items) {
    if (item.disabled) continue;
    if (pathname === item.href || pathname.startsWith(item.href + '/')) {
      if (item.href.length > bestLen) {
        best = item.href;
        bestLen = item.href.length;
      }
    }
  }

  return best;
}
