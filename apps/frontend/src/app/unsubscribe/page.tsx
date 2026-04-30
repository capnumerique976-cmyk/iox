'use client';

// MP-NOTIF-3 phase 2a — Page publique de désinscription email.
//
// Cette page est volontairement frontend-pur dans cette phase : le
// backend `POST /notif-email/unsubscribe` (modèle Prisma `EmailUnsubscribe`)
// est porté par la branche `mp-notif-2-unsubscribe` (mandate 19) et
// arrivera après merge.
//
// **Contrat URL** : `/unsubscribe?token=<opaque>&email=<email>`
// - `token` : token signé porté dans l'URL des emails transactionnels
//   (header `List-Unsubscribe` + lien pied de page).
// - `email` : email destinataire, affiché à l'utilisateur en confirmation.
//
// Quand le backend sera mergé, on remplacera l'appel mock par
// `notifEmailApi.unsubscribe({ token })` (`POST /notif-email/unsubscribe`).
//
// La page tourne en client component pour pouvoir lire `useSearchParams`
// et offrir un feedback immédiat. Elle est accessible sans authentification.

import { Suspense, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

type State = 'idle' | 'loading' | 'success' | 'invalid' | 'error';

export default function UnsubscribePage() {
  // useSearchParams en App Router requiert une boundary Suspense pour SSR.
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Chargement…</div>}>
      <UnsubscribeInner />
    </Suspense>
  );
}

function UnsubscribeInner() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const email = params.get('email') ?? '';

  const [state, setState] = useState<State>('idle');
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const tokenValid = useMemo(() => token.trim().length > 8, [token]);

  const onConfirm = async () => {
    if (!tokenValid) {
      setState('invalid');
      return;
    }
    setState('loading');
    setErrMsg(null);
    try {
      // MP-NOTIF-3 phase 2c — appel backend réel après merge mandat 19.
      // Endpoint public `GET /api/v1/notif-email/unsubscribe?token=...`
      // valide le JWT signé puis upsert dans `email_unsubscribes`.
      // 400 = token invalide / expiré → état "invalid".
      // 200 = succès → état "success".
      const res = await fetch(
        `/api/v1/notif-email/unsubscribe?token=${encodeURIComponent(token)}`,
        { method: 'GET', headers: { Accept: 'application/json' } },
      );
      if (res.status === 400) {
        setState('invalid');
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        setErrMsg(body?.error?.message ?? `Erreur ${res.status}`);
        setState('error');
        return;
      }
      setState('success');
    } catch (e) {
      setErrMsg((e as Error).message);
      setState('error');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-16">
        <header className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/iox-emblem.svg" alt="IOX" className="h-8 w-8" />
          <span className="text-sm font-medium text-slate-700">
            IOX — Indian Ocean Xchange
          </span>
        </header>

        <h1 className="text-2xl font-bold text-slate-900">
          Désinscription des emails IOX
        </h1>

        {state === 'success' ? (
          <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
            <h2 className="text-base font-semibold text-emerald-900">
              Désinscription confirmée ✓
            </h2>
            <p className="mt-2 text-sm text-emerald-800">
              {email
                ? `L'adresse ${email} ne recevra plus d'emails transactionnels marketplace IOX.`
                : "Votre adresse ne recevra plus d'emails transactionnels marketplace IOX."}
            </p>
            <p className="mt-2 text-xs text-emerald-700/80">
              Vous recevrez encore les emails strictement nécessaires à un
              compte actif (sécurité, facturation), s&apos;ils s&apos;appliquent
              à votre situation.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block text-sm font-medium text-emerald-700 hover:text-emerald-900"
            >
              ← Retour à l&apos;accueil
            </Link>
          </section>
        ) : state === 'invalid' || (!tokenValid && state === 'idle') ? (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="text-base font-semibold text-amber-900">
              Lien de désinscription invalide ou expiré
            </h2>
            <p className="mt-2 text-sm text-amber-800">
              Le lien que vous avez suivi ne contient pas de jeton
              valide. Il a peut-être été tronqué par votre client mail ou
              expiré.
            </p>
            <p className="mt-3 text-sm text-amber-800">
              Pour vous désinscrire, répondez simplement à un email
              récent IOX en mentionnant{' '}
              <span className="font-mono">UNSUBSCRIBE</span> ou contactez
              le support : {' '}
              <a
                href="mailto:support@iox.example"
                className="font-medium underline"
              >
                support@iox.example
              </a>
              .
            </p>
          </section>
        ) : (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-700">
              Vous êtes sur le point de vous désinscrire des emails
              transactionnels marketplace IOX
              {email ? (
                <>
                  {' '}pour l&apos;adresse{' '}
                  <span className="font-medium text-slate-900">{email}</span>
                </>
              ) : null}
              .
            </p>
            <p className="mt-3 text-xs text-slate-500">
              Vous ne recevrez plus de notifications de nouvelles demandes
              de devis, de messages reçus, ni de relances. Vous pouvez à
              tout moment vous réinscrire depuis vos préférences de compte.
            </p>

            {errMsg && (
              <div role="alert" className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                {errMsg}
              </div>
            )}

            <div className="mt-5 flex items-center justify-between gap-3">
              <Link
                href="/"
                className="text-sm font-medium text-slate-600 hover:text-slate-800"
              >
                Annuler
              </Link>
              <button
                type="button"
                onClick={onConfirm}
                disabled={state === 'loading'}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {state === 'loading' ? 'Confirmation…' : 'Me désinscrire'}
              </button>
            </div>
          </section>
        )}

        <footer className="mt-4 text-xs text-slate-500">
          IOX — Plateforme B2B océan Indien.
          <br />
          Cette page est servie en HTTPS et traite votre demande sans cookie de tracking.
        </footer>
      </div>
    </main>
  );
}
