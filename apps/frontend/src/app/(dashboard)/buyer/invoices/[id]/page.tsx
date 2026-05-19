'use client';

// PAY-2 — Page détail facture acheteur.
//
// Charge GET /invoices/:id (scopé buyer via JWT).
// Affiche les infos clés : numéro, montant, statut, date, parties.
// Propose un lien de téléchargement PDF si pdfStorageKey est disponible.

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Receipt, Download, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/auth.context';
import { invoicesApi, type InvoiceSummary } from '@/lib/invoices';
import { PageHeader } from '@/components/ui/page-header';

const STATUS_LABEL: Record<InvoiceSummary['status'], string> = {
  DRAFT: 'Brouillon',
  ISSUED: 'Emise',
  PAID: 'Payee',
  CANCELED: 'Annulee',
};

const STATUS_CLS: Record<InvoiceSummary['status'], string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  ISSUED: 'bg-blue-100 text-blue-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  CANCELED: 'bg-red-100 text-red-700',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency || 'EUR',
  }).format(cents / 100);
}

export default function BuyerInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [invoice, setInvoice] = useState<InvoiceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(() => {
    if (!token || !id) return;
    setLoading(true);
    setErr(null);
    setNotFound(false);
    invoicesApi
      .get(id, token)
      .then((data) => setInvoice(data))
      .catch((e: Error) => {
        if (e.message?.includes('404') || e.message?.toLowerCase().includes('not found')) {
          setNotFound(true);
        } else {
          setErr(e.message);
        }
      })
      .finally(() => setLoading(false));
  }, [token, id]);

  useEffect(() => {
    load();
  }, [load]);

  // État chargement
  if (loading) {
    return (
      <div className="flex flex-col gap-6" data-testid="buyer-invoice-detail-page">
        <Link
          href="/buyer/invoices"
          className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-800"
          data-testid="buyer-invoice-back"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux factures
        </Link>
        <div className="text-sm text-gray-500" data-testid="buyer-invoice-loading">
          Chargement de la facture…
        </div>
      </div>
    );
  }

  // Facture introuvable
  if (notFound) {
    return (
      <div className="flex flex-col gap-6" data-testid="buyer-invoice-detail-page">
        <Link
          href="/buyer/invoices"
          className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-800"
          data-testid="buyer-invoice-back"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux factures
        </Link>
        <div
          role="alert"
          data-testid="buyer-invoice-not-found"
          className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
        >
          Facture introuvable. Elle n&apos;existe pas ou ne vous appartient pas.
        </div>
      </div>
    );
  }

  // Erreur API générique
  if (err) {
    return (
      <div className="flex flex-col gap-6" data-testid="buyer-invoice-detail-page">
        <Link
          href="/buyer/invoices"
          className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-800"
          data-testid="buyer-invoice-back"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux factures
        </Link>
        <div
          role="alert"
          data-testid="buyer-invoice-error"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {err}
        </div>
      </div>
    );
  }

  if (!invoice) return null;

  return (
    <div className="flex flex-col gap-6" data-testid="buyer-invoice-detail-page">
      {/* Navigation retour */}
      <Link
        href="/buyer/invoices"
        className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-800"
        data-testid="buyer-invoice-back"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux factures
      </Link>

      <PageHeader
        icon={<Receipt className="h-5 w-5" aria-hidden />}
        title={`Facture ${invoice.invoiceNumber}`}
        subtitle={formatDate(invoice.issuedAt)}
        actions={
          invoice.pdfStorageKey ? (
            // TODO: remplacer par l'URL signée du backend quand l'endpoint GET /invoices/:id/pdf est disponible
            <a
              href={`/api/v1/invoices/${invoice.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              data-testid="buyer-invoice-download-pdf"
            >
              <Download className="h-4 w-4" />
              Télécharger le PDF
            </a>
          ) : undefined
        }
      />

      {/* Carte statut + montant */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Montant total
            </p>
            <p
              className="mt-1 text-3xl font-bold text-gray-900"
              data-testid="buyer-invoice-amount"
            >
              {formatAmount(invoice.amountCents, invoice.currency)}
            </p>
          </div>
          <span
            data-testid="buyer-invoice-status"
            className={`inline-flex self-start rounded-full px-3 py-1 text-sm font-medium sm:self-auto ${STATUS_CLS[invoice.status]}`}
          >
            {STATUS_LABEL[invoice.status]}
          </span>
        </div>
      </div>

      {/* Détails de la facture */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Informations</h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-gray-500">N° de facture</dt>
            <dd
              className="mt-0.5 font-medium text-gray-900"
              data-testid="buyer-invoice-number"
            >
              {invoice.invoiceNumber}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Devise</dt>
            <dd className="mt-0.5 uppercase text-gray-700">{invoice.currency}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Date d&apos;émission</dt>
            <dd className="mt-0.5 text-gray-700" data-testid="buyer-invoice-issued-at">
              {formatDate(invoice.issuedAt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Créée le</dt>
            <dd className="mt-0.5 text-gray-700">{formatDate(invoice.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Identifiant</dt>
            <dd className="mt-0.5 font-mono text-xs text-gray-500">{invoice.id}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Référence paiement</dt>
            <dd className="mt-0.5 font-mono text-xs text-gray-500">
              {invoice.paymentId}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
