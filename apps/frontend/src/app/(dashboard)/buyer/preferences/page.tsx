'use client';

// BUYER-DASHBOARD-4 — Préférences notifications (user connecté).
//
// Lecture+mutation de l'EmailUnsubscribe pour l'email du user connecté
// (tiré du JWT côté backend). Toggles par type de notification.
// Distinct du `/unsubscribe?token=...` public (one-click via lien email).

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bell, BellOff } from 'lucide-react';
import { useAuth } from '@/contexts/auth.context';
import {
  myNotifPreferencesApi,
  EmailUnsubscribeType,
  MyPreferenceItem,
} from '@/lib/notif-email';
import { PageHeader } from '@/components/ui/page-header';

interface TypeSpec {
  type: EmailUnsubscribeType;
  label: string;
  description: string;
}

const TYPES: TypeSpec[] = [
  {
    type: 'RFQ_NOTIFICATIONS',
    label: 'Notifications RFQ',
    description:
      'Emails liés à vos demandes de devis : nouveaux messages, qualification, devis reçu, gagné, perdu.',
  },
  {
    type: 'TRANSACTIONAL',
    label: 'Emails transactionnels',
    description:
      'Confirmations de commande, factures, livraisons. Recommandé activé pour le suivi de vos commandes.',
  },
  {
    type: 'ALL',
    label: 'Désinscription totale',
    description:
      'Désactive TOUS les emails marketplace. Override les autres préférences. Vous pourrez toujours vous reconnecter à votre compte.',
  },
];

export default function BuyerPreferencesPage() {
  const { user, token } = useAuth();
  const [optedOut, setOptedOut] = useState<Set<EmailUnsubscribeType>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setErr(null);
    myNotifPreferencesApi
      .list(token)
      .then((items: MyPreferenceItem[]) => {
        setOptedOut(new Set(items.map((it) => it.unsubscribeType)));
      })
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (type: EmailUnsubscribeType) => {
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      if (optedOut.has(type)) {
        await myNotifPreferencesApi.remove(type, token);
      } else {
        await myNotifPreferencesApi.add(type, token);
      }
      // Optimistic update
      setOptedOut((prev) => {
        const next = new Set(prev);
        if (next.has(type)) next.delete(type);
        else next.add(type);
        return next;
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Échec mise à jour');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/buyer/profile"
        className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-800"
      >
        <ArrowLeft className="h-3 w-3" />
        Retour au profil
      </Link>

      <PageHeader
        icon={<Bell className="h-5 w-5" aria-hidden />}
        title="Préférences notifications"
        subtitle={user?.email ?? ''}
      />

      {err && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {err}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500">Chargement…</div>
      ) : (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <ul className="flex flex-col divide-y divide-gray-100">
            {TYPES.map((t) => {
              const isOptedOut = optedOut.has(t.type);
              const subscribed = !isOptedOut;
              return (
                <li
                  key={t.type}
                  data-testid={`pref-row-${t.type}`}
                  className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {subscribed ? (
                        <Bell className="h-4 w-4 text-emerald-600" aria-hidden />
                      ) : (
                        <BellOff className="h-4 w-4 text-gray-400" aria-hidden />
                      )}
                      <h3 className="text-sm font-semibold text-gray-900">{t.label}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          subscribed
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {subscribed ? 'Inscrit' : 'Désinscrit'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{t.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(t.type)}
                    disabled={busy}
                    data-testid={`btn-toggle-${t.type}`}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                      subscribed
                        ? 'border border-red-200 bg-white text-red-700 hover:bg-red-50'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {subscribed ? 'Me désinscrire' : 'Me réinscrire'}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="text-xs text-gray-400">
        Les emails strictement nécessaires (sécurité du compte, mots de passe oubliés) ne
        sont jamais désactivés.
      </p>
    </div>
  );
}
