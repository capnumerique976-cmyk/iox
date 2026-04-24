'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Bell, ShieldX, ClipboardCheck, AlertTriangle, FileX, CalendarX } from 'lucide-react';
import { authStorage } from '@/lib/auth';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface Alerts {
  total: number;
  blockedBatches: number;
  pendingValidation: number;
  openIncidents: number;
  criticalIncidents: number;
  expiredDocuments: number;
  expiringSoonDocuments: number;
  plannedDistributions: number;
}

/* ------------------------------------------------------------------ */
/*  Composant                                                           */
/* ------------------------------------------------------------------ */

export function AlertsBell() {
  const [alerts, setAlerts] = useState<Alerts | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const token = authStorage.getAccessToken();
      if (!token) return;
      const res = await fetch('/api/v1/dashboard/alerts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      setAlerts(json.data ?? json);
    } catch (err) {
      // Polling silencieux : pas de toast pour éviter le spam toutes les 2min.
      // eslint-disable-next-line no-console
      console.warn('[alerts-bell] fetch échec', err);
    }
  }, []);

  /* Chargement initial + rafraîchissement toutes les 2 minutes */
  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  /* Fermer le dropdown en cliquant à l'extérieur */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const count = alerts?.total ?? 0;
  const hasAlerts = count > 0;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        aria-label={`Alertes${hasAlerts ? ` — ${count} action${count > 1 ? 's' : ''} requise${count > 1 ? 's' : ''}` : ''}`}
      >
        <Bell className="h-5 w-5" />
        {hasAlerts && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <span className="text-sm font-semibold text-gray-700">Alertes</span>
            {hasAlerts && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                {count} action{count > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="divide-y divide-gray-50">
            {!alerts || !hasAlerts ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-gray-400">
                <Bell className="h-8 w-8" />
                <p className="text-sm">Aucune alerte en cours</p>
                <p className="text-xs text-gray-300">Tout est en ordre ✓</p>
              </div>
            ) : (
              <>
                {alerts.blockedBatches > 0 && (
                  <AlertRow
                    href="/product-batches?status=BLOCKED"
                    icon={ShieldX}
                    iconCls="text-red-500"
                    bgCls="bg-red-50"
                    label="Lot(s) fini(s) bloqué(s)"
                    count={alerts.blockedBatches}
                    severity="high"
                    onClick={() => setOpen(false)}
                  />
                )}
                {alerts.pendingValidation > 0 && (
                  <AlertRow
                    href="/product-batches?status=READY_FOR_VALIDATION"
                    icon={ClipboardCheck}
                    iconCls="text-yellow-600"
                    bgCls="bg-yellow-50"
                    label="En attente de validation"
                    count={alerts.pendingValidation}
                    severity="medium"
                    onClick={() => setOpen(false)}
                  />
                )}
                {alerts.criticalIncidents > 0 && (
                  <AlertRow
                    href="/incidents?status=OPEN"
                    icon={AlertTriangle}
                    iconCls="text-red-500"
                    bgCls="bg-red-50"
                    label="Incident(s) critique(s) ouvert(s)"
                    count={alerts.criticalIncidents}
                    severity="high"
                    onClick={() => setOpen(false)}
                  />
                )}
                {alerts.openIncidents > alerts.criticalIncidents && (
                  <AlertRow
                    href="/incidents?status=OPEN"
                    icon={AlertTriangle}
                    iconCls="text-orange-500"
                    bgCls="bg-orange-50"
                    label="Incident(s) ouvert(s)"
                    count={alerts.openIncidents - alerts.criticalIncidents}
                    severity="medium"
                    onClick={() => setOpen(false)}
                  />
                )}
                {alerts.expiredDocuments > 0 && (
                  <AlertRow
                    href="/documents?status=ACTIVE"
                    icon={FileX}
                    iconCls="text-red-400"
                    bgCls="bg-red-50"
                    label="Document(s) expiré(s)"
                    count={alerts.expiredDocuments}
                    severity="high"
                    onClick={() => setOpen(false)}
                  />
                )}
                {alerts.expiringSoonDocuments > 0 && (
                  <AlertRow
                    href="/documents"
                    icon={FileX}
                    iconCls="text-yellow-500"
                    bgCls="bg-yellow-50"
                    label="Document(s) expirant sous 30j"
                    count={alerts.expiringSoonDocuments}
                    severity="low"
                    onClick={() => setOpen(false)}
                  />
                )}
                {alerts.plannedDistributions > 0 && (
                  <AlertRow
                    href="/distributions?status=PLANNED"
                    icon={CalendarX}
                    iconCls="text-orange-500"
                    bgCls="bg-orange-50"
                    label="Distribution(s) planifiée(s) en retard"
                    count={alerts.plannedDistributions}
                    severity="medium"
                    onClick={() => setOpen(false)}
                  />
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
            <button
              onClick={fetchAlerts}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Actualiser
            </button>
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="text-xs text-blue-600 hover:underline"
            >
              Tableau de bord →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Ligne d'alerte                                                      */
/* ------------------------------------------------------------------ */

function AlertRow({
  href,
  icon: Icon,
  iconCls,
  bgCls,
  label,
  count,
  severity,
  onClick,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconCls: string;
  bgCls: string;
  label: string;
  count: number;
  severity: 'high' | 'medium' | 'low';
  onClick: () => void;
}) {
  const severityDot =
    severity === 'high' ? 'bg-red-500' : severity === 'medium' ? 'bg-orange-400' : 'bg-yellow-400';
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
    >
      <div className={`rounded-lg p-2 flex-shrink-0 ${bgCls}`}>
        <Icon className={`h-4 w-4 ${iconCls}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 group-hover:text-gray-900 truncate">{label}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`inline-block h-1.5 w-1.5 rounded-full flex-shrink-0 ${severityDot}`} />
          <span className="text-xs text-gray-400">
            {count} élément{count > 1 ? 's' : ''}
          </span>
        </div>
      </div>
      <span className="text-xs font-semibold text-gray-700 bg-gray-100 rounded-full px-2 py-0.5 flex-shrink-0">
        {count}
      </span>
    </Link>
  );
}
