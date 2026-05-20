'use client';

// BUYER-DASHBOARD-1 — Détail RFQ côté buyer.
//
// Vue dédiée acheteur : récap demande + offre, thread des messages
// (sans les notes internes — l'API les filtre déjà côté backend pour
// les rôles non-staff), formulaire d'envoi de message, et bouton
// "Annuler la demande" si le statut est NEW ou QUALIFIED.

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Circle, XCircle, CreditCard } from 'lucide-react';
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

const CANCELLABLE_STATUSES: QuoteRequestStatus[] = [
  QuoteRequestStatus.NEW,
  QuoteRequestStatus.QUALIFIED,
];

export default function BuyerQuoteRequestDetailPage() {
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
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onCancel = async () => {
    if (!token || !rfq) return;
    if (!window.confirm('Annuler définitivement cette demande de devis ?')) return;
    setBusy(true);
    setErr(null);
    try {
      const updated = await quoteRequestsApi.updateStatus(
        rfq.id,
        QuoteRequestStatus.CANCELLED,
        token,
      );
      setRfq(updated);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (err && !rfq) {
    return (
      <div className="flex flex-col gap-3">
        <Link href="/buyer/quote-requests" className="text-sm text-blue-700">
          ← Retour à mes demandes
        </Link>
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {err}
        </div>
      </div>
    );
  }

  if (!rfq) {
    return (
      <div className="flex items-center justify-between">
        <Link href="/buyer/quote-requests" className="text-sm text-blue-700">
          ← Retour
        </Link>
        <div className="text-sm text-gray-500">Chargement…</div>
      </div>
    );
  }

  const canCancel = CANCELLABLE_STATUSES.includes(rfq.status);
  const canMessage =
    rfq.status !== QuoteRequestStatus.CANCELLED &&
    rfq.status !== QuoteRequestStatus.LOST &&
    rfq.status !== QuoteRequestStatus.WON;
  // M133 — bouton paiement visible uniquement si WON ET agreedAmountCents défini côté serveur
  const canPay = rfq.status === QuoteRequestStatus.WON && !!rfq.agreedAmountCents;
  const isWonNoAmount = rfq.status === QuoteRequestStatus.WON && !rfq.agreedAmountCents;

  /** Formate un montant en centimes en valeur lisible (ex: 12345 → "123.45"). */
  function formatCents(cents: number, currency: string | null): string {
    return `${(cents / 100).toFixed(2)} ${currency ?? 'EUR'}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link href="/buyer/quote-requests" className="text-sm text-blue-700 hover:text-blue-800">
          ← Retour à mes demandes
        </Link>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[rfq.status]}`}>
          {STATUS_LABELS[rfq.status]}
        </span>
      </div>

      <header className="rounded-xl border border-gray-200 bg-white p-5">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
          {rfq.marketplaceOffer.title}
        </h1>
        <div className="mt-1 text-sm text-gray-600">
          {rfq.marketplaceOffer.sellerProfile?.publicDisplayName ?? 'Vendeur'}
          {rfq.marketplaceOffer.marketplaceProduct &&
            ` · ${rfq.marketplaceOffer.marketplaceProduct.commercialName}`}
        </div>
        <div className="mt-1 text-xs text-gray-500">
          Créée le {new Date(rfq.createdAt).toLocaleDateString('fr-FR')}
        </div>
      </header>

      {/* Status Timeline */}
      <RfqTimeline status={rfq.status} />

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Votre demande</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs md:grid-cols-4">
          <div>
            <dt className="text-gray-500">Quantité</dt>
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

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          Échanges ({messages.length})
        </h2>
        {messages.length === 0 ? (
          <div className="rounded border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-xs text-gray-500">
            Aucun message pour le moment.
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {messages.map((m) => (
              <li key={m.id} className="rounded border border-gray-100 bg-gray-50 p-3">
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
          <form onSubmit={onSend} className="mt-4 flex flex-col gap-2">
            <label htmlFor="rfq-message" className="text-xs font-medium text-gray-700">
              Nouveau message
            </label>
            <textarea
              id="rfq-message"
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              rows={3}
              placeholder="Posez une question ou apportez des précisions…"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              disabled={busy}
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={busy || !newMsg.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {busy ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          </form>
        ) : (
          <p className="mt-3 text-xs italic text-gray-500">
            Cette demande est terminée — les échanges sont fermés.
          </p>
        )}
      </section>

      {err && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {err}
        </div>
      )}

      {/* CTA paiement — visible uniquement si statut WON ET agreedAmountCents défini */}
      {canPay && (
        <div
          className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5"
          data-testid="buyer-rfq-payment-cta"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-900">
                Votre demande a été acceptée&nbsp;!
              </p>
              <p className="mt-0.5 text-sm text-emerald-700">
                Finalisez votre commande en procédant au paiement sécurisé via Stripe.
              </p>
              {rfq.agreedAmountCents && (
                <p className="mt-1 text-sm font-semibold text-emerald-900" data-testid="buyer-rfq-agreed-amount">
                  Montant à payer : {formatCents(rfq.agreedAmountCents, rfq.agreedCurrency)}
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end">
            <Link
              href={`/buyer/payments/checkout/${rfq.id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              data-testid="buyer-rfq-pay-button"
            >
              <CreditCard className="h-4 w-4" />
              Finaliser le paiement
            </Link>
          </div>
        </div>
      )}

      {/* Message si WON mais montant non encore défini */}
      {isWonNoAmount && (
        <div
          className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5"
          data-testid="buyer-rfq-no-amount-notice"
          role="alert"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold text-amber-900">Demande acceptée — en attente de validation du montant</p>
            <p className="mt-0.5 text-sm text-amber-700">
              Votre coordinateur IOX est en train de valider le montant définitif. Vous serez notifié dès que le paiement sera disponible.
            </p>
          </div>
        </div>
      )}

      {canCancel && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Annuler la demande
          </button>
        </div>
      )}
    </div>
  );
}

// ─── RFQ Status Timeline ──────────────────────────────────────────────────────

const FUNNEL_STEPS: QuoteRequestStatus[] = [
  QuoteRequestStatus.NEW,
  QuoteRequestStatus.QUALIFIED,
  QuoteRequestStatus.QUOTED,
  QuoteRequestStatus.NEGOTIATING,
  QuoteRequestStatus.WON,
];

const TERMINAL_NEGATIVE: QuoteRequestStatus[] = [
  QuoteRequestStatus.LOST,
  QuoteRequestStatus.CANCELLED,
];

function RfqTimeline({ status }: { status: QuoteRequestStatus }) {
  const isTerminalNeg = TERMINAL_NEGATIVE.includes(status);
  const currentIdx = FUNNEL_STEPS.indexOf(status);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Progression
      </h2>
      <div className="flex items-center gap-1">
        {FUNNEL_STEPS.map((step, idx) => {
          let state: 'done' | 'current' | 'future' | 'negative' = 'future';
          if (isTerminalNeg) {
            // All steps before current position are done, rest grayed
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
                <div
                  className={`h-0.5 w-6 sm:w-10 ${
                    state === 'done' || state === 'current'
                      ? 'bg-blue-500'
                      : 'bg-gray-200'
                  }`}
                />
              )}
              <div className="flex flex-col items-center gap-0.5">
                {state === 'done' ? (
                  <CheckCircle2 className="h-5 w-5 text-blue-500" />
                ) : state === 'current' ? (
                  <Circle className="h-5 w-5 fill-blue-500 text-blue-500" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300" />
                )}
                <span
                  className={`text-[10px] leading-tight ${
                    state === 'future' ? 'text-gray-400' : 'text-gray-700 font-medium'
                  }`}
                >
                  {STATUS_LABELS[step]}
                </span>
              </div>
            </div>
          );
        })}

        {/* Terminal negative badge */}
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
