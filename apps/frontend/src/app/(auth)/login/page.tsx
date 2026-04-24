'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, Store, Mail, Lock, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/auth.context';
import { ApiError } from '@/lib/api';
import { Logo } from '@/components/brand/logo';

/**
 * Formulaire de login interne.
 *
 * Isolé dans un sous-composant pour pouvoir être enveloppé par un
 * `<Suspense>` au niveau de la page — `useSearchParams()` force Next.js 14
 * à mettre la page en CSR-bail ; sans Suspense, le build de prod échoue
 * (« useSearchParams() should be wrapped in a suspense boundary »).
 */
function LoginForm() {
  const { login } = useAuth();
  // `?redirect=/quote-requests/new?offerId=…` — utilisé notamment par le CTA
  // public "Demander un devis" pour ramener le buyer sur sa page après login.
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get('redirect') ?? undefined;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password, redirectTo);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Erreur de connexion au serveur');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
          Adresse e-mail
        </label>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 pl-9 text-sm shadow-premium-sm transition-all duration-fast ease-premium placeholder:text-gray-400 focus:border-premium-accent focus:outline-none focus:ring-2 focus:ring-premium-accent/20"
            placeholder="prenom.nom@mch.fr"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
          Mot de passe
        </label>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 pl-9 text-sm shadow-premium-sm transition-all duration-fast ease-premium placeholder:text-gray-400 focus:border-premium-accent focus:outline-none focus:ring-2 focus:ring-premium-accent/20"
          />
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
        >
          <span className="mt-0.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-500" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-lg bg-gradient-iox-primary px-4 py-2.5 text-sm font-semibold text-white shadow-premium-md shadow-glow-primary transition-all duration-base ease-premium hover:shadow-premium-lg focus:outline-none focus:ring-2 focus:ring-premium-accent/40 focus:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Connexion en cours...
          </>
        ) : (
          <>
            Se connecter
            <ArrowRight
              className="h-4 w-4 transition-transform duration-base group-hover:translate-x-0.5"
              aria-hidden
            />
          </>
        )}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-sky-50/50">
      {/* Halos décoratifs — non-interactifs */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-premium-accent/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-premium-primary/10 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Brand moment — logo officiel IOX */}
          <div className="mb-8 text-center">
            <h1 className="sr-only">IOX</h1>
            <div
              aria-hidden
              className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-premium-md ring-1 ring-gray-100"
            >
              <Logo variant="emblem" height={64} />
            </div>
            <p className="text-2xl font-bold tracking-tight text-gray-900">
              Indian Ocean <span className="text-gradient-iox-accent">Xchange</span>
            </p>
            <p className="mt-1.5 text-sm text-gray-500">Plateforme MCH — Mayotte Connect Hub</p>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-gray-200/80 bg-white/95 p-6 shadow-premium-lg backdrop-blur-sm sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Connexion</h2>
              <p className="mt-1 text-sm text-gray-500">Accédez à votre espace professionnel</p>
            </div>

            <Suspense fallback={<div className="h-[240px]" aria-hidden />}>
              <LoginForm />
            </Suspense>

            {/* Séparateur + CTA secondaire Marketplace */}
            <div className="my-6 flex items-center gap-3" aria-hidden>
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                ou
              </span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <Link
              href="/marketplace"
              className="group flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-premium-sm transition-all duration-base ease-premium hover:-translate-y-0.5 hover:border-premium-accent/40 hover:bg-premium-accent/5 hover:text-premium-accent hover:shadow-premium-md focus:outline-none focus:ring-2 focus:ring-premium-accent/40"
            >
              <Store className="h-4 w-4" aria-hidden />
              <span>Explorer la Marketplace</span>
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform duration-base group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </div>

          <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-gray-400">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Accès réservé aux utilisateurs autorisés du programme MCH
          </p>
        </div>
      </div>
    </div>
  );
}
