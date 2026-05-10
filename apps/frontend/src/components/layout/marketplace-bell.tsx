'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Store, ShoppingCart, Clock, FileText, MessageSquare } from 'lucide-react';
import { authStorage } from '@/lib/auth';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface MarketplaceAlerts {
  total: number;
  newRfqs: number;
  newQuotes: number;
  pendingPayment: number;
  pendingActions: number;
  newMessages: number;
}

/* ------------------------------------------------------------------ */
/*  Composant                                                           */
/* ------------------------------------------------------------------ */

export function MarketplaceBell() {
  const [alerts, setAlerts] = useState<MarketplaceAlerts | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const token = authStorage.getAccessToken();
      if (!token) return;
      const res = await fetch('/api/v1/dashboard/marketplace-alerts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      setAlerts(json.data ?? json);
    } catch (err) {
      // Polling silencieux : pas de toast pour éviter le spam toutes les 2min.
      // eslint-disable-next-line no-console
      console.warn('[marketplace-bell] fetch échec', err);
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
        aria-label={`Marketplace${hasAlerts ? ` — ${count} notification${count > 1 ? 's' : ''}` : ''}`}
        data-testid="marketplace-bell-btn"
      >
        <Store className="h-5 w-5" />
        {hasAlerts && (
          <span
            className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white leading-none"
            data-testid="marketplace-bell-badge"
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <span className="text-sm font-semibold text-gray-700">Marketplace</span>
            {hasAlerts && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-600">
                {count} notification{count > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="divide-y divide-gray-50">
            {!alerts || !hasAlerts ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-gray-400">
                <Store className="h-8 w-8" />
                <p className="text-sm">Aucune notification marketplace</p>
                <p className="text-xs text-gray-300">Tout est à jour ✓</p>
              </div>
            ) : (
              <>
                {alerts.newRfqs > 0 && (
                  <AlertRow
                    href="/seller/quote-requests"
                    icon={FileText}
                    iconCls="text-indigo-500"
                    bgCls="bg-indigo-50"
                    label="Nouvelle(s) demande(s) de devis reçue(s)"
                    count={alerts.newRfqs}
                    onClick={() => setOpen(false)}
                  />
                )}
                {alerts.newMessages > 0 && (
                  <AlertRow
                    href="/seller/quote-requests"
                    icon={MessageSquare}
                    iconCls="text-teal-500"
                    bgCls="bg-teal-50"
                    label="Nouveau(x) message(s) reçu(s)"
                    count={alerts.newMessages}
                    onClick={() => setOpen(false)}
                  />
                )}
                {alerts.newQuotes > 0 && (
                  <AlertRow
                    href="/buyer/quote-requests"
                    icon={ShoppingCart}
                    iconCls="text-blue-500"
                    bgCls="bg-blue-50"
                    label="Devis disponible(s)"
                    count={alerts.newQuotes}
                    onClick={() => setOpen(false)}
                  />
                )}
                {alerts.pendingPayment > 0 && (
                  <AlertRow
                    href="/buyer/payments"
                    icon={Clock}
                    iconCls="text-amber-500"
                    bgCls="bg-amber-50"
                    label="Paiement(s) en attente"
                    count={alerts.pendingPayment}
                    onClick={() => setOpen(false)}
                  />
                )}
                {alerts.pendingActions > 0 && (
                  <AlertRow
                    href="/seller/quote-requests"
                    icon={FileText}
                    iconCls="text-orange-500"
                    bgCls="bg-orange-50"
                    label="Action(s) requise(s) sur devis"
                    count={alerts.pendingActions}
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
              href="/buyer/quote-requests"
              onClick={() => setOpen(false)}
              className="text-xs text-blue-600 hover:underline"
            >
              Mes demandes →
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
  onClick,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconCls: string;
  bgCls: string;
  label: string;
  count: number;
  onClick: () => void;
}) {
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
        <span className="text-xs text-gray-400">
          {count} élément{count > 1 ? 's' : ''}
        </span>
      </div>
      <span className="text-xs font-semibold text-gray-700 bg-gray-100 rounded-full px-2 py-0.5 flex-shrink-0">
        {count}
      </span>
    </Link>
  );
}
