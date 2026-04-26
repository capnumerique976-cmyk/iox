'use client';

// FP-4 — Édition seller de la saisonnalité d'un produit marketplace.
//
// Charge GET /marketplace/products/:id puis pose un PATCH ciblé n'incluant
// que les 3 champs saisonnalité (cf. décisions notes/fp-4-plan.md). Le
// backend gère :
//   - l'ownership (403 si ce n'est pas un produit du seller connecté),
//   - la normalisation (vidage de availabilityMonths quand isYearRound=true),
//   - la bascule APPROVED/PUBLISHED → IN_REVIEW (audit + completion score).
//
// On signale visuellement à l'utilisateur si une bascule est attendue
// (statut courant APPROVED/PUBLISHED) avant qu'il ne sauvegarde.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, AlertCircle, CheckCircle2, Info, Loader2, Save } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import {
  marketplaceProductsApi,
  type SellerMarketplaceProduct,
} from '@/lib/marketplace-products';
import {
  SeasonalityPicker,
  type SeasonalityPickerValue,
} from '@/components/marketplace/SeasonalityPicker';
import { PageHeader } from '@/components/ui/page-header';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string; status?: number }
  | { kind: 'ready'; product: SellerMarketplaceProduct };

function fromProduct(p: SellerMarketplaceProduct): SeasonalityPickerValue {
  return {
    availabilityMonths: p.availabilityMonths ?? [],
    harvestMonths: p.harvestMonths ?? [],
    isYearRound: Boolean(p.isYearRound),
  };
}

function sameSeasonality(a: SeasonalityPickerValue, b: SeasonalityPickerValue): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Validation client : si !isYearRound on exige au moins 1 mois de
 * disponibilité, conformément à l'esprit de la règle métier vitrine.
 * (Le backend ne refuse pas tant que la fiche reste en DRAFT, mais on
 * empêche d'enregistrer un produit publié dans cet état dégénéré.)
 */
function validateClient(v: SeasonalityPickerValue): string | null {
  if (!v.isYearRound && v.availabilityMonths.length === 0) {
    return 'Cochez au moins un mois de disponibilité, ou activez « toute l’année ».';
  }
  return null;
}

export default function SellerProductSeasonalityPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';

  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [initial, setInitial] = useState<SeasonalityPickerValue>({
    availabilityMonths: [],
    harvestMonths: [],
    isYearRound: false,
  });
  const [value, setValue] = useState<SeasonalityPickerValue>(initial);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    setSubmitError(null);
    setSuccess(false);
    try {
      const token = authStorage.getAccessToken() ?? '';
      const product = await marketplaceProductsApi.getById(id, token);
      const next = fromProduct(product);
      setInitial(next);
      setValue(next);
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

  const dirty = useMemo(() => !sameSeasonality(initial, value), [initial, value]);

  const handleChange = useCallback((next: SeasonalityPickerValue) => {
    setValue(next);
    setSuccess(false);
    setSubmitError(null);
    setValidationError(null);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    const v = validateClient(value);
    if (v) {
      setValidationError(v);
      return;
    }
    setSaving(true);
    setSubmitError(null);
    setValidationError(null);
    setSuccess(false);
    try {
      const token = authStorage.getAccessToken() ?? '';
      const updated = await marketplaceProductsApi.updateSeasonality(id, value, token);
      const next = fromProduct(updated);
      setInitial(next);
      setValue(next);
      setState({ kind: 'ready', product: updated });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3500);
    } catch (err) {
      if (err instanceof ApiError) {
        const details = err.details as unknown;
        if (Array.isArray(details) && details.length > 0) {
          setSubmitError(details.map((d) => String(d)).join(' · '));
        } else {
          setSubmitError(err.message);
        }
      } else if (err instanceof Error) {
        setSubmitError(err.message);
      } else {
        setSubmitError('Échec de la mise à jour');
      }
    } finally {
      setSaving(false);
    }
  }

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
        <PageHeader title="Saisonnalité produit" />
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
  const willTriggerReview =
    product.publicationStatus === 'APPROVED' || product.publicationStatus === 'PUBLISHED';

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Saisonnalité — ${product.commercialName}`}
        subtitle={`Statut : ${product.publicationStatus}`}
        actions={
          <Link
            href="/seller/marketplace-products"
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-3 w-3" /> Mes produits
          </Link>
        }
      />

      {willTriggerReview && dirty && (
        <div
          data-testid="review-warning"
          className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
        >
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>
            Ce produit est <strong>{product.publicationStatus}</strong>. Modifier la
            saisonnalité repassera la fiche en <strong>revue qualité</strong> avant
            republication.
          </p>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <SeasonalityPicker
          value={value}
          onChange={handleChange}
          disabled={saving}
          errorMessage={validationError ?? undefined}
        />

        {submitError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{submitError}</span>
          </div>
        )}
        {success && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"
          >
            <CheckCircle2 className="h-4 w-4" /> Saisonnalité mise à jour avec succès.
          </div>
        )}

        <div className="sticky bottom-2 flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white/95 p-3 shadow-premium-sm backdrop-blur">
          <p className="text-xs text-gray-500">
            {dirty ? 'Modifications non enregistrées.' : 'Aucune modification.'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setValue(initial);
                setSubmitError(null);
                setValidationError(null);
                setSuccess(false);
              }}
              disabled={!dirty || saving}
              className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Réinitialiser
            </button>
            <button
              type="submit"
              disabled={!dirty || saving}
              data-testid="submit-seasonality"
              className="inline-flex items-center gap-2 rounded-md bg-premium-accent px-3 py-1.5 text-xs font-semibold text-white shadow-premium-sm transition-all duration-fast ease-premium hover:bg-premium-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
