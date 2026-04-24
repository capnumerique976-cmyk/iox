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
    id: 'marketplace',
    label: 'Marketplace',
    href: '/marketplace-hub',
    icon: ShoppingBag,
    description: "Cockpit vendeur, demandes de devis, documents marketplace.",
    permission: '*',
    pathPrefixes: ['/marketplace-hub', '/seller', '/quote-requests'],
    items: [
      {
        label: 'Tableau Marketplace',
        href: '/marketplace-hub',
        permission: '*',
        icon: LayoutDashboard,
        description: 'Vue consolidée vendeur',
        hideOnDashboard: true,
      },
      {
        label: 'Cockpit vendeur',
        href: '/seller/dashboard',
        permission: '*',
        icon: Store,
        description: 'Indicateurs et alertes de votre boutique',
      },
      {
        label: 'Demandes de devis',
        href: '/quote-requests',
        permission: '*',
        icon: MessageSquareQuote,
        description: 'Demandes reçues et en cours',
      },
      {
        label: 'Documents marketplace',
        href: '/seller/documents',
        permission: '*',
        icon: FolderLock,
        description: 'Pièces justificatives et contrats',
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
    pathPrefixes: ['/admin', '/audit-logs'],
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
        href: '/audit-logs',
        permission: 'audit',
        icon: ScrollText,
        description: 'Traçabilité des actions sensibles',
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
