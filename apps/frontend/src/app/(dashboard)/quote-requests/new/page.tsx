'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth.context';
import { api } from '@/lib/api';
import { quoteRequestsApi } from '@/lib/quote-requests';
import { UserRole } from '@iox/shared';

interface Company {
  id: string;
  code: string;
  name: string;
  country?: string | null;
}

export default function NewQuoteRequestPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, token } = useAuth();
  const offerId = params.get('offerId') ?? '';

  const [companies, setCompanies] = useState<Company[]>([]);
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
    api
      .get<{ data: Company[] }>('/companies?limit=200', token)
      .then((res) => setCompanies(res.data ?? []))
      .catch(() => setCompanies([]));
  }, [token]);

  if (!offerId) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Paramètre <code>offerId</code> manquant. Repartez depuis une fiche produit du catalogue.
      </div>
    );
  }

  const canCreate =
    user?.role === UserRole.MARKETPLACE_BUYER ||
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.COORDINATOR;

  if (!canCreate) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Votre rôle ne permet pas de créer une demande de devis.
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
      router.push(`/quote-requests/${rfq.id}`);
    } catch (e) {
      setErr((e as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Nouvelle demande de devis</h1>
      <p className="mb-6 text-sm text-gray-600">
        Offre cible : <code className="rounded bg-gray-100 px-1">{offerId}</code>
      </p>

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6"
      >
        <div>
          <label
            htmlFor="rfq-buyerCompanyId"
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            Société acheteuse *
          </label>
          <select
            id="rfq-buyerCompanyId"
            required
            value={form.buyerCompanyId}
            onChange={(e) => setForm({ ...form, buyerCompanyId: e.target.value })}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">— choisir —</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.country ? `(${c.country})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
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
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
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
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
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
              placeholder="FR, DE, MA…"
              value={form.deliveryCountry}
              onChange={(e) => setForm({ ...form, deliveryCountry: e.target.value })}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="rfq-targetMarket"
              className="mb-1 block text-xs font-medium text-gray-700"
            >
              Marché cible
            </label>
            <input
              id="rfq-targetMarket"
              type="text"
              placeholder="EU, Moyen-Orient…"
              value={form.targetMarket}
              onChange={(e) => setForm({ ...form, targetMarket: e.target.value })}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label htmlFor="rfq-message" className="mb-1 block text-xs font-medium text-gray-700">
            Message au vendeur
          </label>
          <textarea
            id="rfq-message"
            rows={4}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="Présentez votre besoin, vos volumes, votre calendrier…"
          />
        </div>

        {err && (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {err}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-gradient-iox-primary px-4 py-2 text-sm font-semibold text-white hover:shadow-premium-md disabled:opacity-50"
          >
            {submitting ? 'Envoi…' : 'Envoyer la demande'}
          </button>
        </div>
      </form>
    </div>
  );
}
