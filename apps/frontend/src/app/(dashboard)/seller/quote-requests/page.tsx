'use client';

// M58 — Page liste demandes de devis côté vendeur.
//
// Affiche toutes les demandes reçues sur les offres du vendeur connecté.
// L'API backend scope automatiquement au sellerProfile de l'acteur.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquareQuote, MessageSquare, ChevronRight } from 'lucide-react';
import { QuoteRequestStatus } from '@iox/shared';
import { useAuth } from '@/contexts/auth.context';
import { quoteRequestsApi, QuoteRequestSummary } from '@/lib/quote-requests';

const STATUS_LABELS: Record<QuoteRequestStatus, string> = {
  NEW: 'Nouvelle',
  QUALIFIED: 'Qualifiée',
  QUOTED: 'Devisée',
  NEGOTIATING: 'Négociation',
  WON: 'Gagnée',
  LOST: 'Perdue',
  CANCELLED: 'Annulée',
};

const STATUS_COLORS: Record<QuoteRequestStatus, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  QUALIFIED: 'bg-indigo-100 text-indigo-800',
  QUOTED: 'bg-amber-100 text-amber-800',
  NEGOTIATING: 'bg-orange-100 text-orange-800',
  WON: 'bg-emerald-100 text-emerald-800',
  LOST: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function SellerQuoteRequestsPage() {
  const { token } = useAuth();
  const [rfqs, setRfqs] = useState<QuoteRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const fetchRfqs = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await quoteRequestsApi.list(token, { limit: '50' });
        setRfqs(res.data);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchRfqs();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-gray-500" data-testid="seller-rfq-list-page">
        <MessageSquareQuote className="h-4 w-4 animate-pulse" />
        Chargement des demandes…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-3" data-testid="seller-rfq-list-page">
        <div role="alert" data-testid="seller-rfq-list-error" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6" data-testid="seller-rfq-list-page">
      <div className="flex items-center gap-2">
        <MessageSquareQuote className="h-5 w-5 text-gray-500" />
        <h1 className="text-xl font-bold text-gray-900">Demandes de devis reçues</h1>
      </div>

      {rfqs.length === 0 ? (
        <div
          className="rounded-xl border border-dashed border-gray-200 bg-gray-50 py-12 text-center"
          data-testid="seller-rfq-list-empty"
        >
          <MessageSquareQuote className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-500">Aucune demande pour le moment</p>
          <p className="mt-1 text-xs text-gray-400">Les demandes de vos acheteurs apparaîtront ici.</p>
        </div>
      ) : (
        <ul className="space-y-2" data-testid="seller-rfq-list">
          {rfqs.map((rfq) => (
            <li key={rfq.id}>
              <Link
                href={`/seller/quote-requests/${rfq.id}`}
                className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 hover:bg-gray-50 transition-colors group"
                data-testid="seller-rfq-list-item"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900 truncate">
                      {rfq.marketplaceOffer.title}
                    </span>
                    <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[rfq.status]}`}>
                      {STATUS_LABELS[rfq.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{rfq.buyerCompany?.name ?? rfq.buyerUser?.email ?? '—'}</span>
                    {rfq.requestedQuantity && (
                      <span>
                        {rfq.requestedQuantity}{rfq.requestedUnit ? ` ${rfq.requestedUnit}` : ''}
                      </span>
                    )}
                    {rfq._count?.messages !== undefined && rfq._count.messages > 0 && (
                      <span className="flex items-center gap-0.5 text-blue-600">
                        <MessageSquare className="h-3 w-3" />
                        {rfq._count.messages} message{rfq._count.messages > 1 ? 's' : ''}
                      </span>
                    )}
                    <span className="ml-auto">
                      {new Date(rfq.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 group-hover:text-gray-600" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
