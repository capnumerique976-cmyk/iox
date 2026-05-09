'use client';

/**
 * NextActionCard — prominent CTA card showing the single next step.
 *
 * Designed for non-tech users: big button, clear language, no jargon.
 * Shows only when there IS a next action (journey not complete).
 */

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

interface NextActionCardProps {
  label: string;
  href: string;
  /** Optional subtitle explaining why this step matters. */
  subtitle?: string;
}

export function NextActionCard({ label, href, subtitle }: NextActionCardProps) {
  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-xl border border-[#00D4FF]/20 bg-gradient-to-br from-[#00D4FF]/10 via-[#7B61FF]/5 to-transparent p-6 shadow-[0_0_20px_rgba(0,212,255,0.08)] transition-all hover:border-[#00D4FF]/40 hover:shadow-[0_0_30px_rgba(0,212,255,0.15)]"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#00D4FF]/15 ring-1 ring-[#00D4FF]/25">
          <Sparkles className="h-6 w-6 text-[#00D4FF]" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-[#00D4FF]/80">
            Prochaine étape
          </p>
          <p className="mt-0.5 text-lg font-semibold text-white">
            {label}
          </p>
          {subtitle && (
            <p className="mt-1 text-sm text-white/50">{subtitle}</p>
          )}
        </div>
        <ArrowRight
          className="h-5 w-5 flex-shrink-0 text-[#00D4FF] transition-transform group-hover:translate-x-1"
          aria-hidden
        />
      </div>
    </Link>
  );
}
