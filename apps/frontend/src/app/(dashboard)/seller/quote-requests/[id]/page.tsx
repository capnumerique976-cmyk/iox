'use client';

// M58 — Page détail demande de devis côté vendeur.
//
// Le vendeur/agriculteur voit le détail de la demande et peut échanger
// avec l'acheteur via la conversation attachée à la RFQ.
// Les notes internes (isInternalNote=true) ne sont PAS affichées ici
// (filtrées côté backend) — espace purement conversationnel.

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Circle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { QuoteRequestStatus } from '@iox/shared';
import { useAuth } from '@/contexts/auth.context';
import {
  quoteRequestsApi,
  QuoteRequestSummary,
  QuoteRequestMessage,
} from '@/lib/quote-requests';

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

const TERMINAL_STATUSES: QuoteRequestStatus[] = [
  QuoteRequestStatus.WON,
  QuoteRequestStatus.LOST,
  QuoteRequestStatus.CANCELLED,
];

const FUNNEL_STEPS: QuoteRequestStatus[] = [
  QuoteRequestStatus.NEW,
  QuoteRequestStatus.QUALIFIED,
  QuoteRequestStatus.QUOTED,
  QuoteRequestStatus.NEGOTIATING,
  QuoteRequestStatus.WON,
];

export default function SellerQuoteRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [rfq, setRfq] = useState<QuoteRequestSummary | null>(null);
  const [messages, setMessages] = useState<QuoteRequestMessage[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !id) return;
    setErr(null);
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

  const onSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !rfq || !newMsg.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const msg = await quoteRequestsApi.addMessage(rfq.id, token, newMsg.trim(), false);
      setMessages((prev) => [...prev, msg]);
      setNewMsg('');
      toast.success('Votre message a été envoyé.');
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Erreur lors de l\'envoi';
      setErr(errMsg);
      toast.error(errMsg);
    } finally {
      setBusy(false);
    }
  };

  if (err && !rfq) {
    return (
      <div className="flex flex-col gap-3 p-6" data-testid="seller-rfq-detail-page">
        <Link href="/seller/quote-requests" className="text-sm text-blue-700">
          ← Retour aux demandes
        </Link>
        <div role="alert" data-testid="seller-rfq-detail-error" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {err}
        </div>
      </div>
    );
  }

  if (!rfq) {
    return (
      <div className="flex items-center justify-between p-6" data-testid="seller-rfq-detail-page">
        <Link href="/seller/quote-requests" className="text-sm text-blue-700">
          ← Retour
        </Link>
        <div className="text-sm text-gray-500">Chargement…</div>
      </div>
    );
  }

  const isTerminal = TERMINAL_STATUSES.includes(rfq.status);
  const canMessage = !isTerminal;

  return (
    <div className="flex flex-col gap-6 p-6" data-testid="seller-rfq-detail-page">
      <div className="flex items-center justify-between">
        <Link href="/seller/quote-requests" className="text-sm text-blue-700 hover:text-blue-800">
          ← Retour aux demandes
        </Link>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[rfq.status]}`}>
          {STATUS_LABELS[rfq.status]}
        </span>
      </div>

      {/* En-tête demande */}
      <header className="rounded-xl border border-gray-200 bg-white p-5">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
          {rfq.marketplaceOffer.title}
        </h1>
        <div className="mt-1 text-sm text-gray-600">
          Demande de {rfq.buyerCompany?.name ?? `${rfq.buyerUser.firstName} ${rfq.buyerUser.lastName}`}
        </div>
        <div className="mt-1 text-xs text-gray-500">
          Reçue le {new Date(rfq.createdAt).toLocaleDateString('fr-FR')}
        </div>
      </header>

      {/* Progression */}
      <SellerRfqTimeline status={rfq.status} />

      {/* Détail demande */}
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Détail de la demande</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs md:grid-cols-4">
          <div>
            <dt className="text-gray-500">Quantité demandée</dt>
            <dd className="text-gray-800">
              {rfq.requestedQuantity
                ? `${rfq.requestedQuantity}${rfq.requestedUnit ? ` ${rfq.requestedUnit}` : ''}`
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Pays de livraison</dt>
            <dd className="text-gray-800">{rfq.deliveryCountry ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Marché cible</dt>
            <dd className="text-gray-800">{rfq.targetMarket ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Société acheteuse</dt>
            <dd className="text-gray-800">{rfq.buyerCompany?.name ?? '—'}</dd>
          </div>
        </dl>
        {rfq.message && (
          <div className="mt-3 whitespace-pre-wrap rounded border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700">
            {rfq.message}
          </div>
        )}
      </section>

      {/* Conversation */}
      <section className="rounded-lg border border-gray-200 bg-white p-4" data-testid="seller-rfq-messages-section">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          Conversation avec l&apos;acheteur ({messages.length})
        </h2>

        {messages.length === 0 ? (
          <div
            className="rounded border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-xs text-gray-500"
            data-testid="seller-rfq-empty-state"
          >
            Aucun message pour le moment. Vous pouvez répondre si vous avez besoin d&apos;une précision.
          </div>
        ) : (
          <ul className="flex flex-col gap-3" data-testid="seller-rfq-messages-list">
            {messages.map((m) => (
              <li key={m.id} className="rounded border border-gray-100 bg-gray-50 p-3" data-testid="seller-rfq-message-item">
                <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                  <span className="font-medium text-gray-700">
                    {m.authorUser.firstName} {m.authorUser.lastName}
                  </span>
                  <span>{new Date(m.createdAt).toLocaleString('fr-FR')}</span>
                </div>
                <div className="whitespace-pre-wrap text-sm text-gray-800">{m.message}</div>
              </li>
            ))}
          </ul>
        )}

        {canMessage ? (
          <form onSubmit={onSend} className="mt-4 flex flex-col gap-2" data-testid="seller-rfq-message-form">
            <label htmlFor="seller-rfq-message" className="text-xs font-medium text-gray-700">
              Votre réponse
            </label>
            <textarea
              id="seller-rfq-message"
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              rows={3}
              placeholder="Écrire un message à l'acheteur…"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              disabled={busy}
              data-testid="seller-rfq-message-input"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={busy || !newMsg.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                data-testid="seller-rfq-send-btn"
              >
                {busy ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          </form>
        ) : (
          <p
            className="mt-3 text-xs italic text-gray-500"
            data-testid="seller-rfq-closed-notice"
          >
            Cette demande est terminée. La conversation est conservée pour historique.
          </p>
        )}

        {err && (
          <div role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {err}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

function SellerRfqTimeline({ status }: { status: QuoteRequestStatus }) {
  const isTerminalNeg =
    status === QuoteRequestStatus.LOST || status === QuoteRequestStatus.CANCELLED;
  const currentIdx = FUNNEL_STEPS.indexOf(status);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Progression
      </h2>
      <div className="flex items-center gap-1">
        {FUNNEL_STEPS.map((step, idx) => {
          let state: 'done' | 'current' | 'future' = 'future';
          if (isTerminalNeg) {
            const lastGoodIdx = FUNNEL_STEPS.indexOf(
              status === QuoteRequestStatus.CANCELLED
                ? QuoteRequestStatus.NEW
                : QuoteRequestStatus.QUOTED,
            );
            if (idx <= lastGoodIdx) state = 'done';
          } else if (idx < currentIdx) {
            state = 'done';
          } else if (idx === currentIdx) {
            state = 'current';
          }
          return (
            <div key={step} className="flex items-center gap-1">
              {idx > 0 && (
                <div className={`h-0.5 w-6 sm:w-10 ${state === 'done' || state === 'current' ? 'bg-blue-500' : 'bg-gray-200'}`} />
              )}
              <div className="flex flex-col items-center gap-0.5">
                {state === 'done' ? (
                  <CheckCircle2 className="h-5 w-5 text-blue-500" />
                ) : state === 'current' ? (
                  <Circle className="h-5 w-5 fill-blue-500 text-blue-500" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300" />
                )}
                <span className={`text-[10px] leading-tight ${state === 'future' ? 'text-gray-400' : 'text-gray-700 font-medium'}`}>
                  {STATUS_LABELS[step]}
                </span>
              </div>
            </div>
          );
        })}
        {isTerminalNeg && (
          <div className="ml-2 flex items-center gap-1">
            <div className="h-0.5 w-6 bg-red-300" />
            <div className="flex flex-col items-center gap-0.5">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-[10px] font-medium leading-tight text-red-600">
                {STATUS_LABELS[status]}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
