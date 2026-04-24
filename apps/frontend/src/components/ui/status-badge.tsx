import { cn } from '@/lib/utils';

/**
 * StatusBadge — badge sémantique lié à un statut métier IOX.
 *
 * DS-1 : migration non-breaking. L'API (`status` + `type`, ou `label` + `variant`)
 * est conservée à l'identique — les 13 usages existants ne changent pas.
 *
 * Nouveauté opt-in : prop `tone?: 'flat' | 'premium'` (défaut `flat`).
 *   - `flat`    : rendu actuel (bg-{color}-100 + text-{color}-800)
 *   - `premium` : gradient cohérent avec les tokens DS-0 + shadow-premium-sm
 *
 * Pour un badge non-métier (filtre, tag décoratif), utiliser plutôt
 * `@/components/ui/badge` (Badge générique).
 */

export type ColorVariant = 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'purple' | 'orange';
export type StatusBadgeTone = 'flat' | 'premium';

export interface StatusConfig {
  label: string;
  variant: ColorVariant;
  /** Tailwind dot color class for inline indicators */
  dot: string;
  /** Tailwind bg class for icon / avatar backgrounds */
  iconBg: string;
}

const VARIANT_CLASSES: Record<ColorVariant, string> = {
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-800',
  blue: 'bg-blue-100 text-blue-800',
  gray: 'bg-gray-100 text-gray-600',
  purple: 'bg-purple-100 text-purple-800',
  orange: 'bg-orange-100 text-orange-800',
};

const DOT_CLASSES: Record<ColorVariant, string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  gray: 'bg-gray-400',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
};

const ICON_BG_CLASSES: Record<ColorVariant, string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  gray: 'bg-gray-400',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
};

// Mapping variant → gradient DS-0 (tone="premium")
// Reste volontairement distinct de VARIANT_CLASSES (flat) pour ne pas
// altérer le rendu historique.
const PREMIUM_GRADIENT_CLASSES: Record<ColorVariant, string> = {
  green: 'bg-gradient-iox-success text-white',
  yellow: 'bg-gradient-iox-warning text-white',
  red: 'bg-premium-danger text-white',
  blue: 'bg-gradient-iox-accent text-white',
  gray: 'bg-premium-primary text-white',
  purple: 'bg-[linear-gradient(135deg,#8b5cf6_0%,#a78bfa_100%)] text-white',
  orange: 'bg-gradient-iox-warning text-white',
};

type StatusType =
  | 'beneficiary'
  | 'product'
  | 'batch'
  | 'marketDecision'
  | 'action'
  | 'supplyContract'
  | 'inboundBatch';

// API 1 — shorthand: <StatusBadge status="DRAFT" type="product" />
// API 2 — explicit:  <StatusBadge label="Brouillon" variant="gray" />
// Nouveau (opt-in, DS-1) : prop `tone?: 'flat' | 'premium'` (défaut 'flat').
type StatusBadgeProps =
  | {
      status: string;
      type: StatusType;
      label?: never;
      variant?: never;
      tone?: StatusBadgeTone;
      className?: string;
    }
  | {
      label: string;
      variant?: ColorVariant;
      status?: never;
      type?: never;
      tone?: StatusBadgeTone;
      className?: string;
    };

export function StatusBadge(props: StatusBadgeProps) {
  let label: string;
  let variant: ColorVariant;

  if (props.status !== undefined && props.type !== undefined) {
    const cfg = getConfig(props.type, props.status);
    label = cfg?.label ?? props.status;
    variant = cfg?.variant ?? 'gray';
  } else {
    label = (props as { label: string }).label;
    variant = (props as { variant?: ColorVariant }).variant ?? 'gray';
  }

  const tone: StatusBadgeTone = props.tone ?? 'flat';

  return (
    <span
      className={cn(
        'inline-flex items-center text-xs font-medium',
        tone === 'flat'
          ? ['px-2 py-0.5 rounded', VARIANT_CLASSES[variant]]
          : ['px-3 py-1 rounded-xl shadow-premium-sm', PREMIUM_GRADIENT_CLASSES[variant]],
        props.className,
      )}
    >
      {label}
    </span>
  );
}

// ─── Helper: resolve config from type + status key ───────────────────────────
function getConfig(type: StatusType, status: string): StatusConfig | undefined {
  const map: Record<StatusType, Record<string, StatusConfig>> = {
    beneficiary: BENEFICIARY_STATUS_CONFIG,
    product: PRODUCT_STATUS_CONFIG,
    batch: BATCH_STATUS_CONFIG,
    marketDecision: MARKET_DECISION_CONFIG,
    action: ACTION_STATUS_CONFIG,
    supplyContract: SUPPLY_CONTRACT_STATUS_CONFIG,
    inboundBatch: INBOUND_BATCH_STATUS_CONFIG,
  };
  return map[type]?.[status];
}

function makeConfig(label: string, variant: ColorVariant): StatusConfig {
  return { label, variant, dot: DOT_CLASSES[variant], iconBg: ICON_BG_CLASSES[variant] };
}

// ─── Mapping statuts bénéficiaires ────────────────────────────────────────────
export const BENEFICIARY_STATUS_CONFIG: Record<string, StatusConfig> = {
  DRAFT: makeConfig('Brouillon', 'gray'),
  QUALIFIED: makeConfig('Qualifié', 'blue'),
  IN_PROGRESS: makeConfig('En accompagnement', 'green'),
  SUSPENDED: makeConfig('Suspendu', 'orange'),
  EXITED: makeConfig('Sorti', 'gray'),
};

// ─── Mapping statuts produits ──────────────────────────────────────────────────
export const PRODUCT_STATUS_CONFIG: Record<string, StatusConfig> = {
  DRAFT: makeConfig('Brouillon', 'gray'),
  IN_PREPARATION: makeConfig('En préparation', 'blue'),
  READY_FOR_VALIDATION: makeConfig('Prêt à validation', 'yellow'),
  COMPLIANT: makeConfig('Conforme', 'green'),
  COMPLIANT_WITH_RESERVATIONS: makeConfig('Conforme sous réserve', 'orange'),
  BLOCKED: makeConfig('Bloqué', 'red'),
  ARCHIVED: makeConfig('Archivé', 'gray'),
};

// ─── Mapping statuts lots ─────────────────────────────────────────────────────
export const BATCH_STATUS_CONFIG: Record<string, StatusConfig> = {
  CREATED: makeConfig('Créé', 'gray'),
  READY_FOR_VALIDATION: makeConfig('Prêt à validation', 'yellow'),
  AVAILABLE: makeConfig('Disponible', 'green'),
  RESERVED: makeConfig('Réservé', 'blue'),
  SHIPPED: makeConfig('Expédié', 'purple'),
  BLOCKED: makeConfig('Bloqué', 'red'),
  DESTROYED: makeConfig('Détruit', 'gray'),
};

// ─── Mapping décision mise en marché ─────────────────────────────────────────
export const MARKET_DECISION_CONFIG: Record<string, StatusConfig> = {
  COMPLIANT: makeConfig('Conforme', 'green'),
  COMPLIANT_WITH_RESERVATIONS: makeConfig('Conforme sous réserve', 'orange'),
  NON_COMPLIANT: makeConfig('Non conforme', 'red'),
};

// ─── Mapping actions accompagnement ──────────────────────────────────────────
export const ACTION_STATUS_CONFIG: Record<string, StatusConfig> = {
  PLANNED: makeConfig('Planifiée', 'blue'),
  IN_PROGRESS: makeConfig('En cours', 'yellow'),
  COMPLETED: makeConfig('Terminée', 'green'),
  CANCELLED: makeConfig('Annulée', 'gray'),
};

// ─── Mapping statuts lots entrants ───────────────────────────────────────────
export const INBOUND_BATCH_STATUS_CONFIG: Record<string, StatusConfig> = {
  RECEIVED: makeConfig('Reçu', 'blue'),
  IN_CONTROL: makeConfig('En contrôle', 'yellow'),
  ACCEPTED: makeConfig('Accepté', 'green'),
  REJECTED: makeConfig('Rejeté', 'red'),
};

// ─── Mapping statuts contrats d'approvisionnement ────────────────────────────
export const SUPPLY_CONTRACT_STATUS_CONFIG: Record<string, StatusConfig> = {
  DRAFT: makeConfig('Brouillon', 'gray'),
  ACTIVE: makeConfig('Actif', 'green'),
  SUSPENDED: makeConfig('Suspendu', 'orange'),
  EXPIRED: makeConfig('Expiré', 'red'),
  TERMINATED: makeConfig('Résilié', 'gray'),
};
