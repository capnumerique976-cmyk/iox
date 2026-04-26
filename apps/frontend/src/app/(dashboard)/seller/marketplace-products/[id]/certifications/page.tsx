'use client';

// FP-2.1 — Édition seller des certifications d'un produit marketplace.
//
// Charge GET /marketplace/products/:id pour valider l'existence et
// l'ownership (le backend renvoie 403 si le produit n'appartient pas au
// seller connecté), puis instancie le manager paramétré
// MARKETPLACE_PRODUCT + relatedId=:id.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, AlertCircle, Info, Loader2 } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import {
  marketplaceProductsApi,
  type SellerMarketplaceProduct,
} from '@/lib/marketplace-products';
import { SellerCertificationsManager } from '@/components/marketplace/SellerCertificationsManager';
import { PageHeader } from '@/components/ui/page-header';
import { MarketplaceRelatedEntityType } from '@iox/shared';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string; status?: number }
  | { kind: 'ready'; product: SellerMarketplaceProduct };

export default function SellerProductCertificationsPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const token = authStorage.getAccessToken() ?? '';
      const product = await marketplaceProductsApi.getById(id, token);
      setState({ kind: 'ready', product });
    } catch (err) {
      const status = err instanceof ApiError ? err.status : undefined;
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Produit indisponible';
      setState({ kind: 'error', message, status });
    }
  }, [id]);

  useEffect(() => {
    if (id) load();
  }, [id, load]);

  if (state.kind === 'loading') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement du produit…
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="space-y-3">
        <PageHeader title="Certifications produit" />
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-medium">{state.message}</p>
            {state.status === 403 && (
              <p className="mt-1 text-xs">
                Ce produit n’est pas rattaché à votre profil vendeur.
              </p>
            )}
            {state.status === 404 && (
              <p className="mt-1 text-xs">Produit introuvable ou supprimé.</p>
            )}
          </div>
        </div>
        <Link
          href="/seller/marketplace-products"
          className="inline-flex items-center gap-1 text-xs text-gray-600 hover:underline"
        >
          <ArrowLeft className="h-3 w-3" /> Retour à mes produits
        </Link>
      </div>
    );
  }

  const product = state.product;
  return (
    <div className="space-y-5">
      <PageHeader
        title={`Certifications — ${product.commercialName}`}
        subtitle={`Statut produit : ${product.publicationStatus}`}
        actions={
          <Link
            href="/seller/marketplace-products"
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-3 w-3" /> Mes produits
          </Link>
        }
      />

      <div
        data-testid="cert-review-warning"
        className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
      >
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <p>
          Les certifications produit sont vérifiées par notre équipe qualité avant publication
          sur la fiche publique. Modifier ou supprimer une certification déjà{' '}
          <strong>vérifiée</strong> la repasse automatiquement en{' '}
          <strong>attente de revue</strong>.
        </p>
      </div>

      <SellerCertificationsManager
        relatedType={MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT}
        relatedId={product.id}
      />
    </div>
  );
}
