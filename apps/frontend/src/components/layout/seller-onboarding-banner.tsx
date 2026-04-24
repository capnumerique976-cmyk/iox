'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { UserRole } from '@iox/shared';
import { useAuth } from '@/contexts/auth.context';
import { authStorage } from '@/lib/auth';
import { api } from '@/lib/api';

interface MeResponse {
  id: string;
  role: UserRole;
  sellerProfileIds: string[];
  needsSellerOnboarding: boolean;
}

/**
 * Affiche un bandeau d'avertissement si l'utilisateur connecté est un
 * MARKETPLACE_SELLER sans rattachement Company → SellerProfile. Dans ce cas
 * l'ownership service traite son périmètre comme vide et aucune action
 * marketplace n'est possible — l'admin doit créer un membership.
 *
 * La source de vérité est `/auth/me` (résout sellerProfileIds à chaque appel
 * via UserCompanyMembership). On ne se fie pas au JWT qui peut être obsolète.
 */
export function SellerOnboardingBanner() {
  const { user, token } = useAuth();
  const [needs, setNeeds] = useState<boolean>(false);

  useEffect(() => {
    if (!user || user.role !== UserRole.MARKETPLACE_SELLER) return;
    const t = token ?? authStorage.getAccessToken() ?? '';
    if (!t) return;
    let cancelled = false;
    api
      .get<MeResponse>('/auth/me', t)
      .then((me) => {
        if (!cancelled) setNeeds(!!me.needsSellerOnboarding);
      })
      .catch(() => {
        /* silencieux : la sidebar reste utilisable même en cas d'erreur réseau */
      });
    return () => {
      cancelled = true;
    };
  }, [user, token]);

  if (!user || user.role !== UserRole.MARKETPLACE_SELLER || !needs) return null;

  return (
    <div className="mb-4 rounded-lg border border-orange-300 bg-orange-50 p-4 flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
      <div className="text-sm">
        <p className="font-medium text-orange-900">
          Votre compte vendeur n'est pas encore rattaché à une entreprise.
        </p>
        <p className="text-orange-800 mt-1">
          Les actions de création marketplace sont désactivées tant qu'un administrateur n'a pas
          créé votre rattachement. Contactez l'équipe IOX pour finaliser l'onboarding.
        </p>
      </div>
    </div>
  );
}
