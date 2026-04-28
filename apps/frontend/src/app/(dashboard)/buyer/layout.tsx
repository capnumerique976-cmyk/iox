'use client';

// BUYER-DASHBOARD-1 — Layout des pages buyer + role guard.
//
// Le layout dashboard parent assure déjà l'authentification. Ce layout
// supplémentaire restreint l'accès aux rôles `MARKETPLACE_BUYER`. ADMIN
// et COORDINATOR sont tolérés pour les besoins de QA / support.
//
// Si le rôle ne correspond pas, on redirige vers `/dashboard` (page
// d'accueil dashboard standard).

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@iox/shared';
import { useAuth } from '@/contexts/auth.context';

const ALLOWED: ReadonlyArray<UserRole> = [
  UserRole.MARKETPLACE_BUYER,
  UserRole.ADMIN,
  UserRole.COORDINATOR,
];

export default function BuyerLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const allowed = !!user && ALLOWED.includes(user.role as UserRole);

  useEffect(() => {
    if (!isLoading && user && !allowed) {
      router.replace('/dashboard');
    }
  }, [isLoading, user, allowed, router]);

  if (isLoading || !user) {
    return <div className="p-6 text-sm text-gray-500">Chargement…</div>;
  }
  if (!allowed) {
    return (
      <div className="p-6 text-sm text-gray-600">
        Accès réservé aux acheteurs marketplace. Redirection…
      </div>
    );
  }
  return <>{children}</>;
}
