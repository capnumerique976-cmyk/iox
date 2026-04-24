'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  Store,
  Mail,
  Lock,
  Loader2,
  ShieldCheck,
  Sparkles,
  Zap,
  Globe2,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth.context';
import { ApiError } from '@/lib/api';
import { Logo } from '@/components/brand/logo';

/**
 * Login — version dark-premium (DS Neon, inspirée du template Figma HTML).
 *
 * Split-screen : formulaire à gauche (glass card sur fond dark), panneau
 * branding à droite (gradient + halos cyan/violet) — masqué sur mobile.
 * La logique auth est strictement inchangée (useAuth, redirect param, etc.).
 */
function LoginForm() {
  const { login } = useAuth();
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
      if (err instanceof ApiError) setError(err.message);
      else setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-white/80">
          Adresse e-mail
        </label>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
            aria-hidden
          />
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="iox-neon-input w-full rounded-xl px-3.5 py-3 pl-10 text-sm"
            placeholder="prenom.nom@mch.fr"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-white/80">
          Mot de passe
        </label>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
            aria-hidden
          />
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="iox-neon-input w-full rounded-xl px-3.5 py-3 pl-10 text-sm"
          />
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-[#ff4757]/40 bg-[#ff4757]/10 px-3.5 py-2.5 text-sm text-[#ffb4bb]"
        >
          <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#ff4757]" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-iox-neon px-4 py-3 text-sm font-semibold text-white shadow-glow-cyan transition-all duration-base ease-premium hover:shadow-glow-cyan-lg hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/60 focus:ring-offset-2 focus:ring-offset-[#0A0E1A] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
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
    <div className="iox-neon-root relative min-h-screen overflow-hidden">
      {/* Halos décoratifs — cyan + violet, non-interactifs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="iox-halo -top-32 -left-32 h-[480px] w-[480px] bg-[#00D4FF]" />
        <span className="iox-halo top-1/3 -right-32 h-[520px] w-[520px] bg-[#7B61FF]" />
        <span className="iox-halo -bottom-40 left-1/4 h-[420px] w-[420px] bg-[#00F5A0]/70" />
      </div>

      <div className="relative grid min-h-screen lg:grid-cols-2">
        {/* ─── Colonne gauche : formulaire ────────────────────────── */}
        <div className="flex items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-md">
            {/* Brand moment */}
            <div className="mb-8 text-center">
              <h1 className="sr-only">IOX</h1>
              <div
                aria-hidden
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-iox-neon shadow-glow-cyan"
              >
                <Logo variant="emblem" height={44} />
              </div>
              <p className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Bienvenue sur <span className="iox-text-gradient-neon">IOX</span>
              </p>
              <p className="mt-2 text-sm text-white/60">
                Plateforme MCH — Mayotte Connect Hub
              </p>
            </div>

            {/* Card glass */}
            <div className="iox-glass rounded-2xl p-6 shadow-2xl shadow-black/40 sm:p-8">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white">Connexion</h2>
                <p className="mt-1 text-sm text-white/50">
                  Accédez à votre espace professionnel
                </p>
              </div>

              <Suspense fallback={<div className="h-[260px]" aria-hidden />}>
                <LoginForm />
              </Suspense>

              {/* Séparateur + CTA secondaire Marketplace */}
              <div className="my-6 flex items-center gap-3" aria-hidden>
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[11px] font-medium uppercase tracking-wider text-white/40">
                  ou
                </span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <Link
                href="/marketplace"
                className="group flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 transition-all duration-base ease-premium hover:-translate-y-0.5 hover:border-[#00D4FF]/50 hover:bg-[#00D4FF]/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/50"
              >
                <Store className="h-4 w-4" aria-hidden />
                <span>Explorer la Marketplace</span>
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform duration-base group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </div>

            <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-white/40">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Accès réservé aux utilisateurs autorisés du programme MCH
            </p>
          </div>
        </div>

        {/* ─── Colonne droite : panneau branding (lg+) ─────────────── */}
        <div className="relative hidden lg:flex">
          <div className="absolute inset-0 bg-gradient-iox-night" />
          <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-10 py-16 text-center">
            <div className="iox-glass mb-8 inline-flex items-center gap-2 rounded-full border-white/10 px-4 py-2 text-xs font-medium text-white/70">
              <Sparkles className="h-3.5 w-3.5 text-[#00D4FF]" aria-hidden />
              Marketplace premium · océan Indien
            </div>
            <h2 className="max-w-lg text-4xl font-bold leading-tight text-white xl:text-5xl">
              La marketplace
              <br />
              <span className="iox-text-gradient-neon">premium</span>
              <br />
              pour l&apos;océan Indien
            </h2>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-white/60">
              Traçabilité bout-en-bout, documents vérifiés, conformité export validée.
              Connectez-vous pour accéder à votre espace opérationnel.
            </p>

            <div className="mt-12 grid w-full max-w-md grid-cols-3 gap-4">
              <FeatureTile
                icon={<ShieldCheck className="h-5 w-5 text-[#00F5A0]" aria-hidden />}
                label="Conformité"
                value="100%"
              />
              <FeatureTile
                icon={<Zap className="h-5 w-5 text-[#00D4FF]" aria-hidden />}
                label="Traçabilité"
                value="Temps réel"
              />
              <FeatureTile
                icon={<Globe2 className="h-5 w-5 text-[#7B61FF]" aria-hidden />}
                label="Export"
                value="Multi-pays"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="iox-glass rounded-2xl px-3 py-4">
      <div className="mb-2 flex items-center justify-center">{icon}</div>
      <p className="text-xs uppercase tracking-wider text-white/40">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
