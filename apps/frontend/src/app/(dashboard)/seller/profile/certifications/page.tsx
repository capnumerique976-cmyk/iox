'use client';

// FP-2.1 — Édition seller des certifications du SellerProfile.
//
// Résout d'abord le profil du seller connecté via GET
// /marketplace/seller-profiles/me (mêmes hints 404/409 que /seller/profile/edit)
// puis instancie le manager avec relatedType=SELLER_PROFILE + relatedId=mon profil.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, Info, Loader2 } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { sellerProfilesApi, type MySellerProfile } from '@/lib/seller-profiles';
import { SellerCertificationsManager } from '@/components/marketplace/SellerCertificationsManager';
import { PageHeader } from '@/components/ui/page-header';
import { MarketplaceRelatedEntityType } from '@iox/shared';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string; status?: number }
  | { kind: 'ready'; profile: MySellerProfile };

export default function SellerProfileCertificationsPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const token = authStorage.getAccessToken() ?? '';
      const profile = await sellerProfilesApi.getMine(token);
      setState({ kind: 'ready', profile });
    } catch (err) {
      const status = err instanceof ApiError ? err.status : undefined;
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Profil indisponible';
      setState({ kind: 'error', message, status });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (state.kind === 'loading') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement de votre profil…
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="space-y-3">
        <PageHeader title="Mes certifications" />
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-medium">{state.message}</p>
            {state.status === 404 && (
              <p className="mt-1 text-xs">
                Aucun profil vendeur n’est rattaché à votre compte. Contactez un administrateur.
              </p>
            )}
            {state.status === 409 && (
              <p className="mt-1 text-xs">
                Votre compte est rattaché à plusieurs profils vendeurs. L’édition self-service
                n’est pas disponible — utilisez l’écran admin.
              </p>
            )}
          </div>
        </div>
        <Link
          href="/seller/profile/edit"
          className="inline-flex items-center gap-1 text-xs text-gray-600 hover:underline"
        >
          <ArrowLeft className="h-3 w-3" /> Retour à mon profil
        </Link>
      </div>
    );
  }

  const profile = state.profile;
  return (
    <div className="space-y-5">
      <PageHeader
        title="Mes certifications"
        subtitle={profile.publicDisplayName ?? profile.slug}
        actions={
          <Link
            href="/seller/profile/edit"
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-3 w-3" /> Mon profil
          </Link>
        }
      />

      <div
        data-testid="cert-review-warning"
        className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
      >
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <p>
          Les certifications sont vérifiées par notre équipe qualité avant d’apparaître sur
          votre vitrine publique. Modifier ou supprimer une certification déjà{' '}
          <strong>vérifiée</strong> la repasse automatiquement en{' '}
          <strong>attente de revue</strong>.
        </p>
      </div>

      <SellerCertificationsManager
        relatedType={MarketplaceRelatedEntityType.SELLER_PROFILE}
        relatedId={profile.id}
      />
    </div>
  );
}
