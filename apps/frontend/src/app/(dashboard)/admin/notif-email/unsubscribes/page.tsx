'use client';

// MP-NOTIF-3 phase 4 — Page admin : registre des désinscriptions email.
//
// Lecture seule (audit trail). Filtres type + email + pagination 20.
// Restreint backend ADMIN/COORDINATOR. Symétrique avec la page logs.

import { useCallback, useEffect, useState } from 'react';
import { Mail, ShieldOff } from 'lucide-react';
import { authStorage } from '@/lib/auth';
import {
  notifEmailApi,
  EmailUnsubscribeItem,
  EmailUnsubscribeType,
  UnsubscribeListResponse,
} from '@/lib/notif-email';
import { PageHeader } from '@/components/ui/page-header';

const TYPE_LABELS: Record<EmailUnsubscribeType, string> = {
  ALL: 'Tous emails',
  RFQ_NOTIFICATIONS: 'Notifs RFQ',
  TRANSACTIONAL: 'Transactionnel',
};

const TYPE_COLORS: Record<EmailUnsubscribeType, string> = {
  ALL: 'bg-red-100 text-red-800',
  RFQ_NOTIFICATIONS: 'bg-amber-100 text-amber-800',
  TRANSACTIONAL: 'bg-blue-100 text-blue-800',
};

const PAGE_LIMIT = 20;

export default function AdminNotifEmailUnsubscribesPage() {
  const [items, setItems] = useState<EmailUnsubscribeItem[]>([]);
  const [meta, setMeta] = useState<UnsubscribeListResponse['meta']>({
    total: 0,
    page: 1,
    limit: PAGE_LIMIT,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<'' | EmailUnsubscribeType>('');
  const [emailFilter, setEmailFilter] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    const token = authStorage.getAccessToken();
    if (!token) return;
    setLoading(true);
    setErr(null);
    notifEmailApi
      .listUnsubscribes(
        {
          page,
          limit: PAGE_LIMIT,
          type: typeFilter || undefined,
          email: emailFilter || undefined,
        },
        token,
      )
      .then((res) => {
        setItems(res.data);
        setMeta(res.meta);
      })
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [page, typeFilter, emailFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<ShieldOff className="h-5 w-5" aria-hidden />}
        title="Désinscriptions email"
        subtitle={`${meta.total} entrée${meta.total > 1 ? 's' : ''}`}
      />

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Type
          <select
            value={typeFilter}
            onChange={(e) => {
              setPage(1);
              setTypeFilter(e.target.value as '' | EmailUnsubscribeType);
            }}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">— Tous —</option>
            <option value="ALL">Tous emails</option>
            <option value="RFQ_NOTIFICATIONS">Notifs RFQ</option>
            <option value="TRANSACTIONAL">Transactionnel</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Email (contains)
          <input
            value={emailFilter}
            onChange={(e) => {
              setPage(1);
              setEmailFilter(e.target.value);
            }}
            placeholder="ex. @gmail.com"
            className="w-56 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setTypeFilter('');
            setEmailFilter('');
            setPage(1);
          }}
          className="self-end rounded border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
        >
          Réinitialiser
        </button>
      </div>

      {err && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {err}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500">Chargement…</div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-600">
          Aucune désinscription enregistrée.
        </div>
      ) : (
        <div className="iox-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Type</th>
                <th>User ID</th>
                <th>Raison</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="hover:bg-gray-50" data-testid={`unsub-row-${it.id}`}>
                  <td className="px-4 py-2 text-gray-800">{it.email}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${TYPE_COLORS[it.unsubscribeType]}`}
                    >
                      <Mail className="mr-1 h-3 w-3" aria-hidden />
                      {TYPE_LABELS[it.unsubscribeType]}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-600">
                    {it.userId ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-600">{it.reason ?? '—'}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {new Date(it.createdAt).toLocaleString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Page {meta.page} / {meta.totalPages} — {meta.total} entrée{meta.total > 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 disabled:opacity-50"
            >
              ← Précédent
            </button>
            <button
              type="button"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 disabled:opacity-50"
            >
              Suivant →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
