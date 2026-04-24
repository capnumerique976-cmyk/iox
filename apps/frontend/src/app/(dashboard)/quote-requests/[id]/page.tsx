'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth.context';
import { quoteRequestsApi, QuoteRequestSummary, QuoteRequestMessage } from '@/lib/quote-requests';
import { QuoteRequestStatus, UserRole } from '@iox/shared';

const STATUS_LABELS: Record<QuoteRequestStatus, string> = {
  NEW: 'Nouvelle',
  QUALIFIED: 'Qualifiée',
  QUOTED: 'Devisée',
  NEGOTIATING: 'Négociation',
  WON: 'Gagnée',
  LOST: 'Perdue',
  CANCELLED: 'Annulée',
};

// Timeline ordonnée du parcours standard.
// WON/LOST/CANCELLED sont des terminaisons, non inclues dans la timeline principale.
const TIMELINE: QuoteRequestStatus[] = [
  QuoteRequestStatus.NEW,
  QuoteRequestStatus.QUALIFIED,
  QuoteRequestStatus.QUOTED,
  QuoteRequestStatus.NEGOTIATING,
];

function StatusTimeline({ current }: { current: QuoteRequestStatus }) {
  const terminal =
    current === QuoteRequestStatus.WON ||
    current === QuoteRequestStatus.LOST ||
    current === QuoteRequestStatus.CANCELLED;
  const activeIdx = terminal ? TIMELINE.length : Math.max(0, TIMELINE.indexOf(current));

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-900">Parcours</h2>
      <ol className="flex items-center gap-0 overflow-x-auto text-xs">
        {TIMELINE.map((s, idx) => {
          const done = idx < activeIdx;
          const active = idx === activeIdx && !terminal;
          return (
            <li key={s} className="flex items-center gap-0">
              <div
                className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  done
                    ? 'bg-emerald-500 text-white'
                    : active
                      ? 'bg-blue-600 text-white ring-2 ring-blue-100'
                      : 'bg-gray-200 text-gray-600'
                }`}
              >
                {done ? '✓' : idx + 1}
              </div>
              <span
                className={`mx-2 whitespace-nowrap ${
                  done ? 'text-gray-600' : active ? 'font-semibold text-blue-700' : 'text-gray-400'
                }`}
              >
                {STATUS_LABELS[s]}
              </span>
              {idx < TIMELINE.length - 1 && (
                <span
                  className={`mr-2 h-0.5 w-8 ${done ? 'bg-emerald-400' : 'bg-gray-200'}`}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
      {terminal && (
        <p className="mt-2 text-xs font-medium">
          <span
            className={`rounded-full px-2 py-0.5 ${
              current === QuoteRequestStatus.WON
                ? 'bg-emerald-100 text-emerald-800'
                : current === QuoteRequestStatus.LOST
                  ? 'bg-gray-100 text-gray-700'
                  : 'bg-red-100 text-red-700'
            }`}
          >
            Statut final : {STATUS_LABELS[current]}
          </span>
        </p>
      )}
    </div>
  );
}

const PRICE_MODE_LABEL: Record<string, string> = {
  FIXED: 'Prix fixe',
  FROM_PRICE: 'À partir de',
  QUOTE_ONLY: 'Sur devis',
};

const ALLOWED: Record<QuoteRequestStatus, QuoteRequestStatus[]> = {
  NEW: [QuoteRequestStatus.QUALIFIED, QuoteRequestStatus.CANCELLED, QuoteRequestStatus.LOST],
  QUALIFIED: [QuoteRequestStatus.QUOTED, QuoteRequestStatus.CANCELLED, QuoteRequestStatus.LOST],
  QUOTED: [
    QuoteRequestStatus.NEGOTIATING,
    QuoteRequestStatus.WON,
    QuoteRequestStatus.LOST,
    QuoteRequestStatus.CANCELLED,
  ],
  NEGOTIATING: [
    QuoteRequestStatus.QUOTED,
    QuoteRequestStatus.WON,
    QuoteRequestStatus.LOST,
    QuoteRequestStatus.CANCELLED,
  ],
  WON: [],
  LOST: [],
  CANCELLED: [],
};

export default function QuoteRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, token } = useAuth();
  const [rfq, setRfq] = useState<QuoteRequestSummary | null>(null);
  const [messages, setMessages] = useState<QuoteRequestMessage[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !id) return;
    try {
      const [r, m] = await Promise.all([
        quoteRequestsApi.get(id, token),
        quoteRequestsApi.messages(id, token),
      ]);
      setRfq(r);
      setMessages(m);
    } catch (e) {
      setErr((e as Error).message);
    }
  }, [id, token]);

  useEffect(() => {
    load();
  }, [load]);

  const isBuyer = user?.role === UserRole.MARKETPLACE_BUYER;
  const isSeller = user?.role === UserRole.MARKETPLACE_SELLER;
  const isStaff =
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.COORDINATOR ||
    user?.role === UserRole.QUALITY_MANAGER;

  const transitions = rfq ? ALLOWED[rfq.status] : [];

  const onStatusChange = async (next: QuoteRequestStatus) => {
    if (!token || !rfq) return;
    setBusy(true);
    setErr(null);
    try {
      const updated = await quoteRequestsApi.updateStatus(rfq.id, next, token);
      setRfq(updated);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !rfq || !newMsg.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const msg = await quoteRequestsApi.addMessage(rfq.id, token, newMsg, isInternal);
      setMessages((prev) => [...prev, msg]);
      setNewMsg('');
      setIsInternal(false);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!rfq) {
    return (
      <div className="flex items-center justify-between">
        <Link href="/quote-requests" className="text-sm text-blue-700">
          ← Retour
        </Link>
        {err && <div className="text-sm text-red-700">{err}</div>}
        {!err && <div className="text-sm text-gray-500">Chargement…</div>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link href="/quote-requests" className="text-sm text-blue-700">
          ← Retour aux demandes
        </Link>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
          {STATUS_LABELS[rfq.status]}
        </span>
      </div>

      <StatusTimeline current={rfq.status} />

      <header className="rounded-lg border border-gray-200 bg-white p-4">
        <h1 className="text-xl font-bold text-gray-900">{rfq.marketplaceOffer.title}</h1>
        <div className="mt-1 text-sm text-gray-600">
          {rfq.marketplaceOffer.sellerProfile?.publicDisplayName ?? 'Vendeur'}
          {' · '}
          {rfq.marketplaceOffer.marketplaceProduct?.commercialName}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs md:grid-cols-4">
          <div>
            <dt className="text-gray-500">Acheteur</dt>
            <dd className="text-gray-800">{rfq.buyerCompany?.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Quantité</dt>
            <dd className="text-gray-800">
              {rfq.requestedQuantity
                ? `${rfq.requestedQuantity}${rfq.requestedUnit ? ` ${rfq.requestedUnit}` : ''}`
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Livraison</dt>
            <dd className="text-gray-800">{rfq.deliveryCountry ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Marché</dt>
            <dd className="text-gray-800">{rfq.targetMarket ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Mode prix offre</dt>
            <dd className="text-gray-800">
              {PRICE_MODE_LABEL[rfq.marketplaceOffer.priceMode] ?? rfq.marketplaceOffer.priceMode}
              {rfq.marketplaceOffer.unitPrice != null && (
                <>
                  {' '}
                  · {rfq.marketplaceOffer.unitPrice} {rfq.marketplaceOffer.currency ?? ''}
                </>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Incoterm offre</dt>
            <dd className="text-gray-800">{rfq.marketplaceOffer.incoterm ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">MOQ offre</dt>
            <dd className="text-gray-800">{rfq.marketplaceOffer.moq ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Délai offre</dt>
            <dd className="text-gray-800">
              {rfq.marketplaceOffer.leadTimeDays != null
                ? `${rfq.marketplaceOffer.leadTimeDays} j`
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Créée le</dt>
            <dd className="text-gray-800">{new Date(rfq.createdAt).toLocaleDateString('fr-FR')}</dd>
          </div>
        </dl>
      </header>

      {/* Actions transitions */}
      {transitions.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-900">Changer le statut</h2>
          <div className="flex flex-wrap gap-2">
            {transitions
              .filter((t) => {
                // Buyer ne peut qu'annuler
                if (isBuyer) return t === QuoteRequestStatus.CANCELLED;
                // WON/LOST réservé seller+staff
                if (
                  (t === QuoteRequestStatus.WON || t === QuoteRequestStatus.LOST) &&
                  !isSeller &&
                  !isStaff
                )
                  return false;
                return true;
              })
              .map((t) => (
                <button
                  key={t}
                  disabled={busy}
                  onClick={() => onStatusChange(t)}
                  className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  → {STATUS_LABELS[t]}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            Fil de discussion
            <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
              {messages.length}
            </span>
          </h2>
          {isBuyer && (
            <span className="text-xs text-gray-500">
              Les notes internes entre le vendeur et l&apos;équipe IOX ne vous sont pas visibles.
            </span>
          )}
        </div>
        <ul className="flex flex-col gap-3">
          {messages.length === 0 && (
            <li className="text-sm text-gray-500">Aucun message pour le moment.</li>
          )}
          {messages.map((m) => (
            <li
              key={m.id}
              className={`rounded-lg p-3 text-sm ${m.isInternalNote ? 'border border-amber-200 bg-amber-50' : 'border border-gray-100 bg-gray-50'}`}
            >
              <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                <span className="font-medium text-gray-800">
                  {m.authorUser.firstName} {m.authorUser.lastName}
                </span>
                <span>·</span>
                <span>{new Date(m.createdAt).toLocaleString('fr-FR')}</span>
                {m.isInternalNote && (
                  <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-900">
                    Note interne
                  </span>
                )}
              </div>
              <p className="whitespace-pre-line text-gray-800">{m.message}</p>
            </li>
          ))}
        </ul>

        <form onSubmit={onSend} className="mt-4 flex flex-col gap-2">
          <textarea
            rows={3}
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            placeholder="Répondre…"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="flex items-center justify-between">
            {!isBuyer && (
              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                />
                Note interne (invisible pour l&apos;acheteur)
              </label>
            )}
            <button
              type="submit"
              disabled={busy || !newMsg.trim()}
              className="ml-auto rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Envoyer
            </button>
          </div>
        </form>
      </section>

      {err && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {err}
        </div>
      )}
    </div>
  );
}
