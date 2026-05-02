import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Search, MessageSquare, Handshake, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export const metadata: Metadata = {
  title: 'Comment ça marche — IOX Marketplace',
  description:
    'Découvrez comment IOX simplifie la mise en relation B2B entre acheteurs et producteurs certifiés de l\'océan Indien.',
};

const STEP_ICONS = [Search, MessageSquare, Handshake, ShieldCheck] as const;
const STEP_KEYS = ['discover', 'request', 'negotiate', 'transact'] as const;
const STEP_COLORS = [
  'from-[#00D4FF] to-[#00A3CC]',
  'from-[#7B61FF] to-[#5B3FD9]',
  'from-[#00F5A0] to-[#00C97D]',
  'from-[#FFB800] to-[#E5A500]',
] as const;

/**
 * QW-7 — Page statique "Comment ça marche" pour éduquer les buyers B2B.
 * 4 étapes visuelles + section "Pourquoi IOX" avec valeurs de confiance.
 */
export default async function HowItWorksPage() {
  const t = await getTranslations('howItWorks');
  const tNav = await getTranslations('nav');
  const tCommon = await getTranslations('common');

  return (
    <div className="mx-auto max-w-4xl space-y-12 px-4 py-8">
      {/* Breadcrumb */}
      <nav aria-label={tCommon('breadcrumb.label')} className="flex items-center gap-1.5 text-xs text-white/50">
        <Link href="/marketplace" className="transition-colors hover:text-[#00D4FF]">
          {tNav('catalog')}
        </Link>
        <ChevronRight className="h-3 w-3 text-white/20" aria-hidden />
        <span className="font-medium text-white/80">{tNav('howItWorks')}</span>
      </nav>

      {/* Hero */}
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          <span className="iox-text-gradient-neon">{t('title')}</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-white/60 sm:text-lg">
          {t('subtitle')}
        </p>
      </header>

      {/* Steps */}
      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {STEP_KEYS.map((key, i) => {
          const Icon = STEP_ICONS[i];
          return (
            <article
              key={key}
              className="iox-glass group relative overflow-hidden rounded-2xl p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow-cyan-sm"
            >
              {/* Step number */}
              <div className="absolute right-4 top-4 text-4xl font-black text-white/5">
                {i + 1}
              </div>
              <div
                className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${STEP_COLORS[i]} shadow-lg`}
              >
                <Icon className="h-6 w-6 text-white" aria-hidden />
              </div>
              <h2 className="text-lg font-semibold text-white">
                {t(`steps.${key}.title`)}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                {t(`steps.${key}.description`)}
              </p>
            </article>
          );
        })}
      </section>

      {/* Trust / Why IOX */}
      <section className="iox-glass-strong rounded-2xl p-6 sm:p-8">
        <h2 className="mb-6 text-center text-xl font-bold text-white">
          {t('trustTitle')}
        </h2>
        <ul className="space-y-4">
          {(['traceability', 'compliance', 'support'] as const).map((item) => (
            <li key={item} className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#00F5A0]" aria-hidden />
              <span className="text-sm text-white/80 sm:text-base">
                {t(`trustItems.${item}`)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <div className="text-center">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#7B61FF] px-6 py-3 text-sm font-semibold text-white shadow-glow-cyan-sm transition-all hover:-translate-y-0.5 hover:shadow-glow-cyan"
        >
          {t('cta')}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
