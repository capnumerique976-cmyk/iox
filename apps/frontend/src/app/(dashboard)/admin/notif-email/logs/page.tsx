'use client';

// MP-NOTIF-3 — Page admin : journal des emails transactionnels.
//
// Lecture seule. Affiche les `email_logs` paginés avec filtres
// status / templateId / recipientEmail / createdAtAfter. Restreint
// côté backend aux rôles ADMIN/COORDINATOR ; cette page délègue le
// contrôle d'accès au backend (un user non-autorisé verra une 403).

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Mail, AlertTriangle, CheckCircle2, MinusCircle } from 'lucide-react';
import { authStorage } from '@/lib/auth';
import { notifEmailApi, EmailLogItem, EmailLogListResponse } from '@/lib/notif-email';
import { PageHeader } from '@/components/ui/page-header';

const STATUS_LABELS: Record<EmailLogItem['status'], string> = {
  SENT: 'Envoyé',
  FAILED: 'Échec',
  SKIPPED: 'Ignoré',
};

const STATUS_COLORS: Record<EmailLogItem['status'], string> = {
  SENT: 'bg-emerald-100 text-emerald-800',
  FAILED: 'bg-red-100 text-red-800',
  SKIPPED: 'bg-gray-100 text-gray-700',
};

const PAGE_LIMIT = 20;

export default function AdminNotifEmailLogsPage() {
  const [items, setItems] = useState<EmailLogItem[]>([]);
  const [meta, setMeta] = useState<EmailLogListResponse['meta']>({
    total: 0,
    page: 1,
    limit: PAGE_LIMIT,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<'' | EmailLogItem['status']>('');
  const [templateId, setTemplateId] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [createdAtAfter, setCreatedAtAfter] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    const token = authStorage.getAccessToken();
    if (!token) return;
    setLoading(true);
    setErr(null);
    notifEmailApi
      .listLogs(
        {
          page,
          limit: PAGE_LIMIT,
          status: statusFilter || undefined,
          templateId: templateId || undefined,
          recipientEmail: recipientEmail || undefined,
          createdAtAfter: createdAtAfter ? new Date(createdAtAfter).toISOString() : undefined,
        },
        token,
      )
      .then((res) => {
        setItems(res.data);
        setMeta(res.meta);
      })
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [page, statusFilter, templateId, recipientEmail, createdAtAfter]);

  useEffect(() => {
    load();
  }, [load]);

  const StatusIcon = ({ status }: { status: EmailLogItem['status'] }) => {
    if (status === 'SENT') return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />;
    if (status === 'FAILED') return <AlertTriangle className="h-3.5 w-3.5 text-red-600" />;
    return <MinusCircle className="h-3.5 w-3.5 text-gray-500" />;
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<Mail className="h-5 w-5" aria-hidden />}
        title="Journal des emails transactionnels"
        subtitle={`${meta.total} entrée${meta.total > 1 ? 's' : ''}`}
        actions={
          <Link
            href="/admin/notif-email/stats"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            📊 Statistiques
          </Link>
        }
      />

      {/* Filtres */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Statut
          <select
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(e.target.value as '' | EmailLogItem['status']);
            }}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">— Tous —</option>
            <option value="SENT">Envoyés</option>
            <option value="FAILED">Échecs</option>
            <option value="SKIPPED">Ignorés</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Template
          <input
            value={templateId}
            onChange={(e) => {
              setPage(1);
              setTemplateId(e.target.value);
            }}
            placeholder="ex. rfq-message-created"
            className="w-56 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Destinataire (contains)
          <input
            value={recipientEmail}
            onChange={(e) => {
              setPage(1);
              setRecipientEmail(e.target.value);
            }}
            placeholder="ex. @gmail.com"
            className="w-48 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Créé après
          <input
            type="date"
            value={createdAtAfter}
            onChange={(e) => {
              setPage(1);
              setCreatedAtAfter(e.target.value);
            }}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setStatusFilter('');
            setTemplateId('');
            setRecipientEmail('');
            setCreatedAtAfter('');
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
          Aucun email correspondant.
        </div>
      ) : (
        <div className="iox-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Statut</th>
                <th>Template</th>
                <th>Destinataire</th>
                <th>Sujet</th>
                <th>Transport</th>
                <th>Créé</th>
                <th>Erreur</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${STATUS_COLORS[it.status]}`}
                    >
                      <StatusIcon status={it.status} />
                      {STATUS_LABELS[it.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-700">{it.templateId}</td>
                  <td className="px-4 py-2 text-gray-800">{it.recipientEmail}</td>
                  <td className="px-4 py-2 text-gray-700">{it.subject}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">{it.transport}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {new Date(it.createdAt).toLocaleString('fr-FR')}
                  </td>
                  <td className="px-4 py-2 text-xs text-red-700">
                    {it.errorCode ? (
                      <span title={it.errorMessage ?? ''} className="font-mono">
                        {it.errorCode}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/admin/notif-email/logs/${it.id}`}
                      data-testid={`detail-${it.id}`}
                      className="text-xs text-blue-700 hover:text-blue-800"
                    >
                      Détail →
                    </Link>
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
