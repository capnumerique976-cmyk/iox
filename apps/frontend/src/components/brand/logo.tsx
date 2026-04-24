/**
 * IOX UI — Logo
 *
 * Composant unique pour afficher le logo officiel Indian Ocean Xchange
 * dans toutes ses variantes. Source : `apps/frontend/public/brand/*.svg`.
 *
 * Variantes :
 *   - `horizontal` : lockup emblème + wordmark (headers publics, topbar desktop, login hero).
 *   - `emblem`     : emblème seul en couleur (tile compacte, avatar app).
 *   - `emblem-on-dark` : emblème seul sur fond sombre (hero navy, header gradient).
 *
 * Utilisation :
 *   <Logo variant="horizontal" height={36} />
 *   <Logo variant="emblem" height={28} aria-label="IOX" />
 *   <Logo variant="emblem-on-dark" height={56} />
 *
 * Pourquoi `<img>` plutôt que `<Image>` (next/image) ?
 * Les SVG sont servis statiquement depuis `/brand/*.svg`. `<img>` suffit,
 * n'exige pas de `width`/`height` explicites à chaque usage, et ne traverse
 * pas le pipeline d'optimisation next/image (inutile pour des vecteurs).
 */
import { cn } from '@/lib/utils';

export type LogoVariant = 'horizontal' | 'emblem' | 'emblem-on-dark';

interface LogoProps {
  variant?: LogoVariant;
  /** Hauteur en pixels (largeur auto pour préserver le ratio). */
  height?: number;
  className?: string;
  /** Accessible name. Défaut : "IOX — Indian Ocean Xchange". */
  'aria-label'?: string;
}

const VARIANT_SRC: Record<LogoVariant, string> = {
  horizontal: '/brand/iox-logo.svg',
  emblem: '/brand/iox-emblem.svg',
  'emblem-on-dark': '/brand/iox-emblem-on-dark.svg',
};

export function Logo({
  variant = 'horizontal',
  height = 36,
  className,
  'aria-label': ariaLabel = 'IOX — Indian Ocean Xchange',
}: LogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={VARIANT_SRC[variant]}
      alt={ariaLabel}
      height={height}
      style={{ height: `${height}px`, width: 'auto' }}
      className={cn('select-none', className)}
      draggable={false}
    />
  );
}
