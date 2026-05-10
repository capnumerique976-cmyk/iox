/**
 * IOX — Configuration de navigation centrale
 *
 * Source de vérité unique pour la navigation à 3 niveaux :
 *   1. Top bar horizontale (sections principales)
 *   2. Sidebar contextuelle (items de la section active)
 *   3. Dashboards de rubrique (landings agrégeant chaque domaine)
 *
 * Inspiration : navigation Basecamp (top bar + contextuel) — adaptée au métier IOX
 * (référentiel, chaîne de production, marketplace, distribution, administration).
 *
 * Détection de la section active = plus long préfixe `pathPrefixes` matchant
 * le pathname courant. Voir `getActiveSection()`.
 */
import { UserRole } from '@iox/shared';
import {
  Home,
  LayoutDashboard,
  Users,
  Package,
  Building2,
  FileSignature,
  Inbox,
  GitBranch,
  Boxes,
  Tag,
  CheckCircle2,
  Search,
  Store,
  MessageSquareQuote,
  FolderLock,
  Truck,
  AlertTriangle,
  FileArchive,
  ShieldCheck,
  UserCog,
  Network,
  ClipboardList,
  Activity,
  ScrollText,
  Database,
  Factory,
  ShoppingBag,
  ShoppingCart,
  Receipt,
  Bell,
  CreditCard,
  type LucideIcon,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface NavItem {
  label: string;
  href: string;
  permission: string;
  icon: LucideIcon;
  /** Description courte affichée dans les cards d'accès rapide. */
  description?: string;
  /** true = uniquement dans la sidebar contextuelle, exclu de la dashboard cards grid */
  hideOnDashboard?: boolean;
}

export interface NavSection {
  id: string;
  label: string;
  /** Landing page de la section (Tableau Référentiel, Tableau Production, …). */
  href: string;
  icon: LucideIcon;
  description: string;
  /** Permission gate de la section entière. */
  permission: string;
  /**
   * Rôles autorisés à voir cette section. `undefined` = tous les rôles.
   * Les ADMIN voient toujours tout indépendamment de ce champ.
   */
  roles?: UserRole[];
  /** Préfixes URL appartenant à cette section (pour détection active). */
  pathPrefixes: string[];
  /** Items affichés dans la sidebar contextuelle ET dans la dashboard de rubrique. */
  items: NavItem[];
}

/* ------------------------------------------------------------------ */
/*  Section Accueil — globale                                           */
/* ------------------------------------------------------------------ */

export const HOME_SECTION: NavSection = {
  id: 'home',
  label: 'Accueil',
  href: '/dashboard',
  icon: Home,
  description: 'Vue globale et profil utilisateur',
  permission: '*',
  pathPrefixes: ['/dashboard', '/profile'],
  items: [
    {
      label: 'Tableau de bord',
      href: '/dashboard',
      permission: '*',
      icon: LayoutDashboard,
      description: "Vue d'ensemble consolidée",
    },
    {
      label: 'Profil',
      href: '/profile',
      permission: '*',
      icon: UserCog,
      description: 'Préférences et compte',
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  Rôles opérationnels (staff interne — pas marketplace)               */
/* ------------------------------------------------------------------ */

const STAFF_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.BENEFICIARY_MANAGER,
  UserRole.SUPPLY_MANAGER,
  UserRole.QUALITY_MANAGER,
  UserRole.MARKET_VALIDATOR,
  UserRole.LOGISTICS_MANAGER,
  UserRole.COMMERCIAL_MANAGER,
  UserRole.BENEFICIARY,
  UserRole.FUNDER,
  UserRole.AUDITOR,
];

/* ------------------------------------------------------------------ */
/*  Sections principales                                                */
/* ------------------------------------------------------------------ */

export const SECTIONS: NavSection[] = [
  {
    id: 'referentiel',
    label: 'Référentiel',
    href: '/referentiel',
    icon: Database,
    description: 'Données métier de référence : bénéficiaires, produits, entreprises, contrats.',
    permission: '*',
    roles: STAFF_ROLES,
    pathPrefixes: [
      '/referentiel',
      '/beneficiaries',
      '/products',
      '/companies',
      '/supply-contracts',
    ],
    items: [
      {
        label: 'Tableau Référentiel',
        href: '/referentiel',
        permission: '*',
        icon: LayoutDashboard,
        description: 'Vue consolidée du référentiel',
        hideOnDashboard: true,
      },
      {
        label: 'Bénéficiaires',
        href: '/beneficiaries',
        permission: '*',
        icon: Users,
        description: 'Personnes habilitées à recevoir une aide',
      },
      {
        label: 'Produits',
        href: '/products',
        permission: '*',
        icon: Package,
        description: 'Catalogue produits et fiches techniques',
      },
      {
        label: 'Entreprises',
        href: '/companies',
        permission: '*',
        icon: Building2,
        description: 'Acteurs de la chaîne (fournisseurs, transformateurs, distributeurs)',
      },
      {
        label: "Contrats d'approvisionnement",
        href: '/supply-contracts',
        permission: '*',
        icon: FileSignature,
        description: "Engagements amont d'approvisionnement",
      },
    ],
  },
  {
    id: 'production',
    label: 'Production',
    href: '/production',
    icon: Factory,
    description: "Chaîne de production : entrants, transformations, lots finis, traçabilité.",
    permission: '*',
    roles: STAFF_ROLES,
    pathPrefixes: [
      '/production',
      '/inbound-batches',
      '/transformation-operations',
      '/product-batches',
      '/label-validations',
      '/traceability',
      '/market-release-decisions',
    ],
    items: [
      {
        label: 'Tableau Production',
        href: '/production',
        permission: '*',
        icon: LayoutDashboard,
        description: 'Vue consolidée de la chaîne',
        hideOnDashboard: true,
      },
      {
        label: 'Lots entrants',
        href: '/inbound-batches',
        permission: '*',
        icon: Inbox,
        description: 'Réception et qualification des matières',
      },
      {
        label: 'Transformations',
        href: '/transformation-operations',
        permission: '*',
        icon: GitBranch,
        description: 'Opérations de transformation enregistrées',
      },
      {
        label: 'Lots finis',
        href: '/product-batches',
        permission: '*',
        icon: Boxes,
        description: 'Lots prêts à être validés et mis en marché',
      },
      {
        label: 'Étiquetage',
        href: '/label-validations',
        permission: '*',
        icon: Tag,
        description: "Validation conformité étiquetage",
      },
      {
        label: 'Traçabilité',
        href: '/traceability',
        permission: '*',
        icon: Search,
        description: 'Recherche end-to-end de la chaîne',
      },
      {
        label: 'Mise en marché',
        href: '/market-release-decisions',
        permission: '*',
        icon: CheckCircle2,
        description: 'Décisions de libération marché',
      },
    ],
  },
  {
    id: 'buyer',
    label: 'Achats',
    href: '/buyer',
    icon: ShoppingCart,
    description: 'Espace acheteur : commandes, factures, préférences.',
    permission: '*',
    roles: [...STAFF_ROLES, UserRole.MARKETPLACE_BUYER],
    pathPrefixes: ['/buyer'],
    items: [
      {
        label: 'Mon espace acheteur',
        href: '/buyer',
        permission: '*',
        icon: LayoutDashboard,
        description: 'Tableau de bord acheteur',
        hideOnDashboard: true,
      },
      {
        label: 'Mes commandes',
        href: '/buyer/orders',
        permission: '*',
        icon: Package,
        description: 'Commandes en cours et passées',
      },
      {
        label: 'Mes factures',
        href: '/buyer/invoices',
        permission: '*',
        icon: Receipt,
        description: 'Historique des factures',
      },
      {
        label: 'Paiements',
        href: '/buyer/payments',
        permission: '*',
        icon: CreditCard,
        description: 'Suivi des paiements',
      },
      {
        label: 'Préférences',
        href: '/buyer/preferences',
        permission: '*',
        icon: Bell,
        description: 'Notifications et préférences',
      },
      {
        label: 'Profil entreprise',
        href: '/buyer/profile',
        permission: '*',
        icon: Building2,
        description: 'Informations de votre entreprise',
      },
    ],
  },
  {
    id: 'marketplace',
    label: 'Catalogue',
    href: '/marketplace-hub',
    icon: ShoppingBag,
    description: "Espace vendeur, demandes de devis, documents.",
    permission: '*',
    roles: [...STAFF_ROLES, UserRole.MARKETPLACE_SELLER],
    pathPrefixes: ['/marketplace-hub', '/seller', '/seller/quote-requests'],
    items: [
      {
        label: 'Vue d\'ensemble',
        href: '/marketplace-hub',
        permission: '*',
        icon: LayoutDashboard,
        description: 'Vue consolidée vendeur',
        hideOnDashboard: true,
      },
      {
        label: 'Mon espace vendeur',
        href: '/seller/dashboard',
        permission: '*',
        icon: Store,
        description: 'Indicateurs et alertes de votre boutique',
      },
      {
        label: 'Demandes de devis',
        href: '/seller/quote-requests',
        permission: '*',
        icon: MessageSquareQuote,
        description: 'Demandes reçues et en cours',
      },
      {
        label: 'Analytique',
        href: '/seller/analytics',
        permission: '*',
        icon: Activity,
        description: 'Performance et conversion des ventes',
      },
      {
        label: 'Mes produits',
        href: '/seller/marketplace-products',
        permission: '*',
        icon: Package,
        description: 'Gérer vos produits en vente',
      },
      {
        label: 'Mes offres',
        href: '/seller/marketplace-offers',
        permission: '*',
        icon: Tag,
        description: 'Offres commerciales publiées',
      },
      {
        label: 'Mes documents',
        href: '/seller/documents',
        permission: '*',
        icon: FolderLock,
        description: 'Pièces justificatives et contrats',
      },
      {
        label: 'Ma conformité',
        href: '/seller/compliance',
        permission: '*',
        icon: ShieldCheck,
        description: 'Statut de conformité et documents requis',
      },
      {
        label: 'Paiements',
        href: '/seller/payments',
        permission: '*',
        icon: CreditCard,
        description: 'Configuration des encaissements',
      },
      {
        label: 'Mes factures',
        href: '/seller/invoices',
        permission: '*',
        icon: Receipt,
        description: 'Historique des factures émises',
      },
    ],
  },
  {
    id: 'distribution',
    label: 'Distribution',
    href: '/distribution',
    icon: Truck,
    description: 'Distributions terrain, incidents, documents associés.',
    permission: '*',
    roles: STAFF_ROLES,
    pathPrefixes: ['/distribution', '/distributions', '/incidents', '/documents'],
    items: [
      {
        label: 'Tableau Distribution',
        href: '/distribution',
        permission: '*',
        icon: LayoutDashboard,
        description: 'Vue consolidée distribution',
        hideOnDashboard: true,
      },
      {
        label: 'Distributions',
        href: '/distributions',
        permission: '*',
        icon: Truck,
        description: 'Distributions planifiées et réalisées',
      },
      {
        label: 'Incidents',
        href: '/incidents',
        permission: '*',
        icon: AlertTriangle,
        description: 'Incidents terrain à traiter',
      },
      {
        label: 'Documents',
        href: '/documents',
        permission: '*',
        icon: FileArchive,
        description: 'Pièces justificatives distribution',
      },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    href: '/admin',
    icon: ShieldCheck,
    description: 'Gestion plateforme, utilisateurs, revue marketplace, diagnostics.',
    permission: 'users:read',
    pathPrefixes: ['/admin'],
    items: [
      {
        label: 'Tableau admin',
        href: '/admin',
        permission: 'users:read',
        icon: ShieldCheck,
        description: 'Vue consolidée administration',
        hideOnDashboard: true,
      },
      {
        label: 'Utilisateurs',
        href: '/admin/users',
        permission: 'users:read',
        icon: UserCog,
        description: 'Comptes et rôles',
      },
      {
        label: 'Rattachements',
        href: '/admin/memberships',
        permission: 'users:read',
        icon: Network,
        description: 'Liens utilisateurs ↔ entreprises',
      },
      {
        label: 'Vendeurs',
        href: '/admin/sellers',
        permission: 'marketplace:review',
        icon: Store,
        description: 'Profils vendeurs marketplace',
      },
      {
        label: 'Conformité',
        href: '/admin/compliance',
        permission: 'marketplace:review',
        icon: ShieldCheck,
        description: 'Vue conformité documents et certifications',
      },
      {
        label: 'File de revue',
        href: '/admin/review-queue',
        permission: 'marketplace:review',
        icon: ClipboardList,
        description: 'Soumissions vendeurs à modérer',
      },
      {
        label: 'Demandes de devis',
        href: '/admin/rfq',
        permission: 'marketplace:review',
        icon: MessageSquareQuote,
        description: 'Suivi RFQ côté plateforme',
      },
      {
        label: 'Diagnostics',
        href: '/admin/diagnostics',
        permission: 'users:read',
        icon: Activity,
        description: 'Santé technique de la plateforme',
      },
      {
        label: "Journal d'audit",
        href: '/admin/audit-logs',
        permission: 'audit',
        icon: ScrollText,
        description: 'Traçabilité des actions sensibles',
      },
      {
        label: 'Emails',
        href: '/admin/notif-email/logs',
        permission: 'users:read',
        icon: Bell,
        description: 'Logs et statistiques emails',
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const ALL_SECTIONS: NavSection[] = [HOME_SECTION, ...SECTIONS];

/**
 * Détecte la section active à partir du pathname courant.
 * Stratégie : plus long préfixe matchant. Fallback : HOME_SECTION.
 *
 * Exemples :
 *   /admin/users          → admin
 *   /beneficiaries/42     → referentiel
 *   /seller/dashboard     → marketplace
 *   /dashboard            → home
 *   /                     → home
 */
export function getActiveSection(pathname: string): NavSection {
  let best: NavSection = HOME_SECTION;
  let bestLen = -1;
  for (const section of ALL_SECTIONS) {
    for (const prefix of section.pathPrefixes) {
      if (pathname === prefix || pathname.startsWith(prefix + '/')) {
        if (prefix.length > bestLen) {
          best = section;
          bestLen = prefix.length;
        }
      }
    }
  }
  return best;
}

/**
 * Sections visibles pour un rôle donné.
 * ADMIN voit tout. Les autres ne voient que les sections dont `roles`
 * inclut leur rôle (ou `roles` est undefined = visible par tous).
 */
export function getVisibleSections(role: UserRole): NavSection[] {
  if (role === UserRole.ADMIN) return SECTIONS;
  return SECTIONS.filter((s) => !s.roles || s.roles.includes(role));
}

/**
 * Retourne la landing page par défaut selon le rôle.
 * Sellers → cockpit vendeur, buyers → cockpit acheteur, staff → dashboard général.
 */
export function getDefaultLanding(role: UserRole): string {
  if (role === UserRole.MARKETPLACE_SELLER) return '/seller/dashboard';
  if (role === UserRole.MARKETPLACE_BUYER) return '/buyer';
  return '/dashboard';
}
