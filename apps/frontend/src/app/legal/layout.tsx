import Link from 'next/link';
import { Logo } from '@/components/brand/logo';

/**
 * Layout public — pages légales IOX
 *
 * Accessible sans authentification. Dark-premium cohérent avec le reste
 * de l'app (neon root). Pas de sidebar ni nav authentifié.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="iox-neon-root relative min-h-screen overflow-hidden bg-[#0A0E1A]">
      {/* skip link */}
      <a
        href="#legal-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-[#00D4FF] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#0A0E1A]"
      >
        Aller au contenu
      </a>

      {/* Header minimal */}
      <header className="relative z-10 border-b border-white/10 bg-[#0A0E1A]/80 px-4 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/marketplace" aria-label="Retour à la marketplace IOX">
            <Logo variant="horizontal" height={32} />
          </Link>
          <nav className="flex items-center gap-4 text-xs text-white/50">
            <Link href="/legal/terms" className="transition-colors hover:text-white">
              CGU
            </Link>
            <Link href="/legal/privacy" className="transition-colors hover:text-white">
              Confidentialité
            </Link>
            <Link href="/legal/mentions-legales" className="transition-colors hover:text-white">
              Mentions légales
            </Link>
          </nav>
        </div>
      </header>

      {/* Contenu */}
      <main id="legal-main" className="relative z-10 mx-auto max-w-4xl px-4 py-12 sm:px-6">
        {children}
      </main>

      {/* Footer minimal */}
      <footer className="relative z-10 mt-12 border-t border-white/10 py-8 text-center text-xs text-white/30">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          <Link href="/marketplace" className="transition-colors hover:text-white/60">
            Marketplace
          </Link>
          <Link href="/login" className="transition-colors hover:text-white/60">
            Connexion
          </Link>
          <Link href="/legal/terms" className="transition-colors hover:text-white/60">
            CGU
          </Link>
          <Link href="/legal/privacy" className="transition-colors hover:text-white/60">
            Politique de confidentialité
          </Link>
          <Link href="/legal/mentions-legales" className="transition-colors hover:text-white/60">
            Mentions légales
          </Link>
        </div>
        <p className="mt-4">© {new Date().getFullYear()} IOX — Indian Ocean Xchange. Tous droits réservés.</p>
      </footer>
    </div>
  );
}
