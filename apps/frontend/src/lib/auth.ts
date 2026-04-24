import { UserRole } from '@iox/shared';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

const ACCESS_TOKEN_KEY = 'iox_access_token';
const REFRESH_TOKEN_KEY = 'iox_refresh_token';
const USER_KEY = 'iox_user';

export const authStorage = {
  save(tokens: AuthTokens, user: AuthUser) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  getUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  },
  clear() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

// Permissions par rôle — utilisé pour masquer/afficher les menus et actions
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.ADMIN]: ['*'],
  [UserRole.COORDINATOR]: [
    'beneficiaries',
    'products',
    'supply',
    'batches',
    'market',
    'reporting',
    'users:read',
  ],
  [UserRole.BENEFICIARY_MANAGER]: ['beneficiaries', 'products:read', 'reporting:read'],
  [UserRole.SUPPLY_MANAGER]: ['supply', 'batches:inbound'],
  [UserRole.QUALITY_MANAGER]: ['batches', 'products', 'market:prepare', 'marketplace:review'],
  [UserRole.MARKET_VALIDATOR]: ['market', 'batches:read', 'products:read'],
  [UserRole.LOGISTICS_MANAGER]: ['logistics', 'batches:read'],
  [UserRole.COMMERCIAL_MANAGER]: ['crm', 'products:read'],
  [UserRole.BENEFICIARY]: ['beneficiary:own'],
  [UserRole.FUNDER]: ['reporting:read'],
  [UserRole.AUDITOR]: ['audit', 'reporting:read'],
  [UserRole.MARKETPLACE_SELLER]: ['marketplace:seller'],
  [UserRole.MARKETPLACE_BUYER]: ['marketplace:buyer'],
};

export function hasPermission(role: UserRole, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role] ?? [];
  return perms.includes('*') || perms.includes(permission);
}

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Administrateur',
  [UserRole.COORDINATOR]: 'Coordinateur ADAAM',
  [UserRole.BENEFICIARY_MANAGER]: 'Référent bénéficiaires',
  [UserRole.SUPPLY_MANAGER]: 'Référent approvisionnement',
  [UserRole.QUALITY_MANAGER]: 'Référent transformation/qualité',
  [UserRole.MARKET_VALIDATOR]: 'Valideur mise en marché',
  [UserRole.LOGISTICS_MANAGER]: 'Référent logistique',
  [UserRole.COMMERCIAL_MANAGER]: 'Référent commercial',
  [UserRole.BENEFICIARY]: 'Bénéficiaire',
  [UserRole.FUNDER]: 'Partenaire / Financeur',
  [UserRole.AUDITOR]: 'Auditeur',
  [UserRole.MARKETPLACE_SELLER]: 'Vendeur marketplace',
  [UserRole.MARKETPLACE_BUYER]: 'Acheteur marketplace',
};
