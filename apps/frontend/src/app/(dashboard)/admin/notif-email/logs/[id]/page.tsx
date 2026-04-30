'use client';

// MP-NOTIF-3 phase 3 — Détail unitaire EmailLog admin.
//
// Affiche tous les champs persistés y compris `metadataJson` (volumineux,
// affiché en bloc <pre>). Restreint backend ADMIN/COORDINATOR.

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, CheckCircle2, MinusCircle, Mail } from 'lucide-react';
import { authStorage } from '@/lib/auth';
import { notifEmailApi, EmailLogItem } from '@/lib/notif-email';
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

export default function AdminNotifEmailLogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [log, setLog] = useState<EmailLogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    const token = authStorage.getAccessToken();
    if (!token || !id) return;
    setLoading(true);
    setErr(null);
    notifEmailApi
      .getLogById(id, token)
      .then(setLog)
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [id]);

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
      <div className="flex items-center justify-between">
        <Link
          href="/admin/notif-email/logs"
          className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-800"
        >
          <ArrowLeft className="h-3 w-3" />
          Retour au journal
        </Link>
      </div>

      <PageHeader
        icon={<Mail className="h-5 w-5" aria-hidden />}
        title="Détail EmailLog"
        subtitle={id ?? ''}
      />

      {err && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {err}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500">Chargement…</div>
      ) : !log ? (
        <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-600">
          Log introuvable.
        </div>
      ) : (
        <>
          <section className="rounded-xl border border-gray-200 bg-white p-5" data-testid="log-summary">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Résumé</h2>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <Field label="Statut">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${STATUS_COLORS[log.status]}`}
                >
                  <StatusIcon status={log.status} />
                  {STATUS_LABELS[log.status]}
                </span>
              </Field>
              <Field label="Template">
                <span className="font-mono text-xs">{log.templateId}</span>
              </Field>
              <Field label="Transport">
                <span className="text-xs uppercase text-gray-700">{log.transport}</span>
              </Field>
              <Field label="Créé le">
                <span className="text-gray-700">{new Date(log.createdAt).toLocaleString('fr-FR')}</span>
              </Field>
              <Field label="Destinataire">
                <span className="text-gray-900">{log.recipientEmail}</span>
              </Field>
              <Field label="Recipient User ID">
                <span className="font-mono text-xs text-gray-600">
                  {log.recipientUserId ?? '—'}
                </span>
              </Field>
              <Field label="Provider Message ID" wide>
                <span className="break-all font-mono text-xs text-gray-600">
                  {log.providerMessageId ?? '—'}
                </span>
              </Field>
              <Field label="Sujet" wide>
                <span className="text-gray-800">{log.subject}</span>
              </Field>
            </dl>
          </section>

          {(log.errorCode || log.errorMessage) && (
            <section
              className="rounded-xl border border-red-200 bg-red-50 p-5"
              data-testid="log-error"
            >
              <h2 className="mb-3 text-sm font-semibold text-red-900">Erreur</h2>
              <dl className="grid grid-cols-1 gap-3 text-sm">
                {log.errorCode && (
                  <Field label="Code">
                    <span className="font-mono text-xs text-red-800">{log.errorCode}</span>
                  </Field>
                )}
                {log.errorMessage && (
                  <Field label="Message" wide>
                    <span className="text-red-800">{log.errorMessage}</span>
                  </Field>
                )}
              </dl>
            </section>
          )}

          <section className="rounded-xl border border-gray-200 bg-white p-5" data-testid="log-metadata">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Metadata JSON</h2>
            {log.metadataJson === null || log.metadataJson === undefined ? (
              <p className="text-xs italic text-gray-500">Pas de metadata pour cet email.</p>
            ) : (
              <pre className="overflow-x-auto rounded border border-gray-100 bg-gray-50 p-3 text-xs text-gray-800">
                {JSON.stringify(log.metadataJson, null, 2)}
              </pre>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Field({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <dt className="text-[10px] uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
