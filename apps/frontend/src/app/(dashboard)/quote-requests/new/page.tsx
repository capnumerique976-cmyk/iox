'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShoppingBag, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/auth.context';
import { companiesApi, type CompanySummary } from '@/lib/companies';
import { quoteRequestsApi } from '@/lib/quote-requests';
import { UserRole } from '@iox/shared';
import { PageHeader } from '@/components/ui/page-header';

const inputCls =
  'w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

export default function NewQuoteRequestPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, token } = useAuth();
  const offerId = params.get('offerId') ?? '';

  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [form, setForm] = useState({
    buyerCompanyId: '',
    requestedQuantity: '',
    requestedUnit: 'kg',
    deliveryCountry: '',
    targetMarket: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    // BUGFIX: use /companies/mine (scoped to current user's memberships).
    // GET /companies?limit=200 requires ADMIN/COORDINATOR roles and returns 403
    // for MARKETPLACE_BUYER, causing the company dropdown to be silently empty.
    companiesApi
      .findMine(token)
      .then((list) => {
        setCompanies(list);
        // Pre-select if only one company
        if (list.length === 1) {
          setForm((f) => ({ ...f, buyerCompanyId: list[0].id }));
        }
      })
      .catch(() => setCompanies([]));
  }, [token]);

  if (!offerId) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-800"
        >
          <ArrowLeft className="h-3 w-3" /> Retour au catalogue
        </Link>
        <div
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"
        >
          <p className="font-medium">Lien invalide</p>
          <p className="mt-1 text-xs text-amber-700">
            Retournez sur une fiche produit du catalogue et cliquez sur{' '}
            <strong>Demander un devis</strong> pour envoyer votre demande.
          </p>
        </div>
      </div>
    );
  }

  const canCreate =
    user?.role === UserRole.MARKETPLACE_BUYER ||
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.COORDINATOR;

  if (!canCreate) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-800"
        >
          <ArrowLeft className="h-3 w-3" /> Retour au catalogue
        </Link>
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          Votre compte ne permet pas d&apos;envoyer une demande de devis. Contactez
          l&apos;administrateur IOX si vous pensez que c&apos;est une erreur.
        </div>
      </div>
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setErr(null);
    try {
      const rfq = await quoteRequestsApi.create(
        {
          marketplaceOfferId: offerId,
          buyerCompanyId: form.buyerCompanyId,
          requestedQuantity: form.requestedQuantity ? Number(form.requestedQuantity) : undefined,
          requestedUnit: form.requestedUnit || undefined,
          deliveryCountry: form.deliveryCountry || undefined,
          targetMarket: form.targetMarket || undefined,
          message: form.message || undefined,
        },
        token,
      );
      // Buyers → buyer-specific view; staff → shared view
      const dest =
        user?.role === UserRole.MARKETPLACE_BUYER
          ? `/buyer/quote-requests/${rfq.id}`
          : `/quote-requests/${rfq.id}`;
      router.push(dest);
    } catch (e) {
      setErr((e as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-800"
        data-testid="back-to-catalog"
      >
        <ArrowLeft className="h-3 w-3" /> Retour au catalogue
      </Link>

      <PageHeader
        icon={<ShoppingBag className="h-5 w-5" aria-hidden />}
        title="Demande de devis"
        subtitle="Precisez votre besoin. Le vendeur vous repondra avec une offre personnalisee."
      />

      <form
        onSubmit={onSubmit}
        data-testid="rfq-form"
        className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6"
      >
        {/* Entreprise */}
        <div>
          <label
            htmlFor="rfq-buyerCompanyId"
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            Votre entreprise <span className="text-red-500">*</span>
          </label>
          <select
            id="rfq-buyerCompanyId"
            required
            value={form.buyerCompanyId}
            onChange={(e) => setForm({ ...form, buyerCompanyId: e.target.value })}
            className={inputCls}
            data-testid="rfq-company"
          >
            <option value="">— choisir —</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.country ? ` (${c.country})` : ''}
              </option>
            ))}
          </select>
          {companies.length === 0 && (
            <p className="mt-1 text-xs text-amber-700">
              Aucune entreprise rattachee a votre compte. Contactez l&apos;administrateur.
            </p>
          )}
        </div>

        {/* Quantité + Unité */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="rfq-requestedQuantity"
              className="mb-1 block text-xs font-medium text-gray-700"
            >
              Quantité souhaitée
            </label>
            <input
              id="rfq-requestedQuantity"
              type="number"
              min="0"
              step="0.01"
              value={form.requestedQuantity}
              onChange={(e) => setForm({ ...form, requestedQuantity: e.target.value })}
              placeholder="Ex : 500"
              className={inputCls}
              data-testid="rfq-quantity"
            />
          </div>
          <div>
            <label
              htmlFor="rfq-requestedUnit"
              className="mb-1 block text-xs font-medium text-gray-700"
            >
              Unité
            </label>
            <input
              id="rfq-requestedUnit"
              type="text"
              value={form.requestedUnit}
              onChange={(e) => setForm({ ...form, requestedUnit: e.target.value })}
              placeholder="kg, tonnes, colis…"
              className={inputCls}
              data-testid="rfq-unit"
            />
          </div>
        </div>

        {/* Livraison + Destination */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="rfq-deliveryCountry"
              className="mb-1 block text-xs font-medium text-gray-700"
            >
              Pays de livraison
            </label>
            <input
              id="rfq-deliveryCountry"
              type="text"
              placeholder="Ex : France, Reunion, Comores"
              value={form.deliveryCountry}
              onChange={(e) => setForm({ ...form, deliveryCountry: e.target.value })}
              className={inputCls}
              data-testid="rfq-delivery-country"
            />
          </div>
          <div>
            <label
              htmlFor="rfq-targetMarket"
              className="mb-1 block text-xs font-medium text-gray-700"
            >
              Destination des produits
              <span className="ml-1 font-normal text-gray-400">(optionnel)</span>
            </label>
            <input
              id="rfq-targetMarket"
              type="text"
              placeholder="Ex : Grande distribution, restauration, export UE"
              value={form.targetMarket}
              onChange={(e) => setForm({ ...form, targetMarket: e.target.value })}
              className={inputCls}
              data-testid="rfq-target-market"
            />
          </div>
        </div>

        {/* Message */}
        <div>
          <label htmlFor="rfq-message" className="mb-1 block text-xs font-medium text-gray-700">
            Votre message au vendeur
          </label>
          <textarea
            id="rfq-message"
            rows={4}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className={inputCls}
            placeholder="Decrivez votre besoin : volumes, frequence, conditionnement, calendrier de livraison…"
            data-testid="rfq-message"
          />
        </div>

        {err && (
          <div
            role="alert"
            className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {err}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting || !form.buyerCompanyId}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            data-testid="rfq-submit"
          >
            {submitting ? 'Envoi…' : 'Envoyer ma demande'}
          </button>
        </div>
      </form>

      <p className="text-xs text-gray-400">
        Votre demande sera transmise au vendeur. Vous recevrez sa reponse dans votre espace
        acheteur sous &laquo; Mes demandes de devis &raquo;.
      </p>
    </div>
  );
}
