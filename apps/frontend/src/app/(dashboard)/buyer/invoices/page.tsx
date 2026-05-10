'use client';

// PAY-2 — Page factures acheteur.
//
// Liste paginee des factures rattachees au buyer connecte.
// L'API GET /invoices scope automatiquement par buyerCompanyId via le
// role MARKETPLACE_BUYER du JWT.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Receipt } from 'lucide-react';
import { useAuth } from '@/contexts/auth.context';
import { invoicesApi, type InvoiceSummary, type InvoiceListResponse } from '@/lib/invoices';
import { PageHeader } from '@/components/ui/page-header';

const PAGE_LIMIT = 20;

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
  return new Date(iso).toLocaleDateString('fr-FR');
}

function formatAmount(cents: number): string {
  return `${(cents / 100).toFixed(2)} €`;
}

export default function BuyerInvoicesPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<InvoiceSummary[]>([]);
  const [meta, setMeta] = useState<InvoiceListResponse['meta']>({
    total: 0,
    page: 1,
    limit: PAGE_LIMIT,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setErr(null);
    invoicesApi
      .list({ page: String(page), limit: String(PAGE_LIMIT) }, token)
      .then((res) => {
        setItems(res.data);
        setMeta(res.meta);
      })
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [token, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6" data-testid="buyer-invoices-page">
      <PageHeader
        icon={<Receipt className="h-5 w-5" aria-hidden />}
        title="Mes factures"
        subtitle={`${meta.total} facture${meta.total > 1 ? 's' : ''}`}
      />

      {err && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {err}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500">Chargement...</div>
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="iox-table-wrap" data-testid="invoices-table">
          <table>
            <thead>
              <tr>
                <th>N&deg; facture</th>
                <th>Montant</th>
                <th>Devise</th>
                <th>Statut</th>
                <th>Date &eacute;mission</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((inv) => (
                <tr
                  key={inv.id}
                  data-testid={`invoice-row-${inv.id}`}
                  className="hover:bg-gray-50"
                >
                  <td className="px-4 py-2 font-medium text-gray-900">
                    {inv.invoiceNumber}
                  </td>
                  <td className="px-4 py-2 text-gray-700 tabular-nums">
                    {formatAmount(inv.amountCents)}
                  </td>
                  <td className="px-4 py-2 text-gray-500 uppercase">
                    {inv.currency}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      data-testid={`invoice-status-${inv.id}`}
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLS[inv.status]}`}
                    >
                      {STATUS_LABEL[inv.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {formatDate(inv.issuedAt)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/buyer/invoices/${inv.id}`}
                      className="text-blue-700 hover:text-blue-800"
                      data-testid={`invoice-link-${inv.id}`}
                    >
                      Voir &rarr;
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div
          className="flex items-center justify-between text-sm"
          data-testid="invoices-pagination"
        >
          <span className="text-gray-500">
            Page {meta.page} / {meta.totalPages} &mdash; {meta.total} facture
            {meta.total > 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 disabled:opacity-50"
            >
              &larr; Pr&eacute;c&eacute;dent
            </button>
            <button
              type="button"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 disabled:opacity-50"
            >
              Suivant &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-gray-200 bg-white p-10 text-center"
      data-testid="invoices-empty"
    >
      <Receipt className="h-8 w-8 text-blue-500" />
      <p className="text-sm font-medium text-gray-800">
        Aucune facture pour le moment.
      </p>
      <p className="max-w-sm text-xs text-gray-500">
        Les factures apparaitront ici une fois vos paiements
        confirm&eacute;s.
      </p>
    </div>
  );
}
