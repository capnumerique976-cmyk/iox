'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authStorage, AuthUser, AuthTokens } from '@/lib/auth';
import { api } from '@/lib/api';
import { installApiClient } from '@/lib/api-client';
import { installGlobalErrorHandler } from '@/lib/notify';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  /**
   * `redirectTo` (optionnel) : URL interne absolue (démarre par `/`) sur
   * laquelle rediriger après login. Utilisé par le CTA public "Demander un
   * devis" qui passe par `/login?redirect=...`.
   */
  login: (email: string, password: string, redirectTo?: string) => Promise<void>;
  logout: () => Promise<void>;
}

/**
 * Normalise une URL de redirection pour éviter les open redirects :
 *  - elle doit démarrer par `/`
 *  - elle ne doit PAS être `//` (protocol-relative) ni contenir `:` (URL absolue)
 *  - fallback : `/dashboard`
 */
function safeRedirect(target: string | null | undefined): string {
  if (!target) return '/dashboard';
  if (!target.startsWith('/') || target.startsWith('//')) return '/dashboard';
  return target;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restaure la session + installe le client API Lot 8.
  // Le client patche `window.fetch` et gère le cycle JWT court (15 min) via
  // POST /auth/refresh + retry unique + redirect login si le refresh échoue.
  // Tous les `fetch('/api/v1/...')` existants en profitent automatiquement.
  useEffect(() => {
    installApiClient();
    // L9-1 : capture les promesses rejetées non interceptées (toaster
    // global de dernier recours) — sans ça, un `void someAsync()` qui
    // plante laisse l'utilisateur devant un écran muet.
    installGlobalErrorHandler();
    const storedUser = authStorage.getUser();
    const storedToken = authStorage.getAccessToken();
    if (storedUser && storedToken) {
      setUser(storedUser);
      setToken(storedToken);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string, redirectTo?: string) => {
      const response = await api.post<AuthTokens & { user: AuthUser }>('/auth/login', {
        email,
        password,
      });

      const { user: authUser, accessToken, refreshToken, expiresIn } = response;
      authStorage.save({ accessToken, refreshToken, expiresIn }, authUser);
      setUser(authUser);
      setToken(accessToken);
      router.push(safeRedirect(redirectTo));
    },
    [router],
  );

  const logout = useCallback(async () => {
    try {
      if (token) {
        await api.post('/auth/logout', {}, token);
      }
    } finally {
      authStorage.clear();
      setUser(null);
      setToken(null);
      router.push('/login');
    }
  }, [token, router]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}
