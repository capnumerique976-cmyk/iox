'use client';

/**
 * IOX — MobileProgressiveMenu (M117)
 *
 * Navigation mobile à 2 niveaux :
 *
 *   Niveau 1 — Liste des modules métier
 *   ┌─────────────────────────────────┐
 *   │ [icône] Accueil         (1) >  │
 *   │ [icône] Référentiel     (4) >  │
 *   │ [icône] Production      (2) >  │
 *   │ ...                            │
 *   └─────────────────────────────────┘
 *
 *   Niveau 2 — Sous-menus du module sélectionné
 *   ┌─────────────────────────────────┐
 *   │ < Retour   Production           │
 *   ├─────────────────────────────────┤
 *   │ [icône] Mes produits            │
 *   │ [icône] Ajouter un produit      │
 *   └─────────────────────────────────┘
 *
 * Comportement :
 *   - Ouverture du drawer : auto-détecte le module actif via pathname
 *   - Si pathname correspond à un item → affiche directement le Niveau 2
 *   - Sinon → Niveau 1 (liste modules)
 *   - Bouton "Retour" → revient au Niveau 1
 *   - Clic sur un lien → ferme le drawer et navigue
 *   - Page active mise en évidence (ring cyan + bg)
 */
import Link from 'next/link';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getBusinessModuleForPath,
  getActiveItemHref,
  type MobileMenuSection,
  type MobileMenuItem,
} from './mobile-menu-config';

/* ------------------------------------------------------------------ */
/*  Niveau 1 — Carte module                                            */
/* ------------------------------------------------------------------ */

interface ModuleCardProps {
  section: MobileMenuSection;
  isActive: boolean;
  onSelect: (id: string) => void;
}

function ModuleCard({ section, isActive, onSelect }: ModuleCardProps) {
  const Icon = section.icon;
  const enabledCount = section.items.filter((i) => !i.disabled).length;

  return (
    <button
      type="button"
      onClick={() => onSelect(section.id)}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-colors',
        isActive
          ? 'bg-[#00D4FF]/10 ring-1 ring-inset ring-[#00D4FF]/20'
          : 'hover:bg-white/5',
      )}
    >
      <div
        className={cn(
          'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg',
          isActive ? 'bg-[#00D4FF]/20' : 'bg-white/8',
        )}
      >
        <Icon
          className={cn('h-4.5 w-4.5', isActive ? 'text-[#00D4FF]' : 'text-white/60')}
          aria-hidden
        />
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-semibold leading-snug',
            isActive ? 'text-[#00D4FF]' : 'text-white/90',
          )}
        >
          {section.label}
        </p>
        {section.description && (
          <p className="mt-0.5 truncate text-xs text-white/35 leading-snug">
            {section.description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className={cn(
            'text-xs font-medium tabular-nums rounded-full px-1.5 py-0.5',
            isActive ? 'bg-[#00D4FF]/20 text-[#00D4FF]' : 'bg-white/10 text-white/40',
          )}
        >
          {enabledCount}
        </span>
        <ChevronRight
          className={cn('h-4 w-4', isActive ? 'text-[#00D4FF]/60' : 'text-white/25')}
          aria-hidden
        />
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Niveau 2 — Item de sous-menu                                       */
/* ------------------------------------------------------------------ */

interface SubItemProps {
  item: MobileMenuItem;
  /** Href de l'item actif (longest match wins) — seul cet item affiche le point bleu. */
  activeItemHref: string | null;
  onNavigate: () => void;
}

function SubItem({ item, activeItemHref, onNavigate }: SubItemProps) {
  const ItemIcon = item.icon;
  const active = !item.disabled && item.href === activeItemHref;

  if (item.disabled) {
    return (
      <div
        className="flex items-start gap-3 rounded-xl px-4 py-3 text-white/25 cursor-not-allowed"
        title={item.disabledNote}
      >
        <ItemIcon className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-medium leading-snug">{item.label}</p>
          {item.disabledNote && (
            <p className="text-xs text-white/20 leading-snug mt-0.5">{item.disabledNote}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        'flex items-start gap-3 rounded-xl px-4 py-3 transition-colors',
        active
          ? 'bg-[#00D4FF]/10 ring-1 ring-inset ring-[#00D4FF]/20'
          : 'hover:bg-white/5',
      )}
    >
      <ItemIcon
        className={cn(
          'mt-0.5 h-4 w-4 flex-shrink-0',
          active ? 'text-[#00D4FF]' : 'text-white/40',
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-sm font-medium leading-snug',
            active ? 'text-[#00D4FF]' : 'text-white/80',
          )}
        >
          {item.label}
        </p>
        {item.description && (
          <p className="text-xs text-white/35 leading-snug mt-0.5">{item.description}</p>
        )}
      </div>
      {active && (
        <div className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#00D4FF]" aria-hidden />
      )}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Composant principal                                                 */
/* ------------------------------------------------------------------ */

export interface MobileProgressiveMenuProps {
  sections: MobileMenuSection[];
  pathname: string;
  selectedModule: string | null;
  onSelectModule: (id: string | null) => void;
  onClose: () => void;
}

export function MobileProgressiveMenu({
  sections,
  pathname,
  selectedModule,
  onSelectModule,
  onClose,
}: MobileProgressiveMenuProps) {
  // Longest match wins : seul le module dont l'item est le plus spécifique est actif.
  const activeModuleId = getBusinessModuleForPath(pathname, sections);

  /* ── Niveau 2 : sous-menus du module sélectionné ─────────────── */
  if (selectedModule !== null) {
    const section = sections.find((s) => s.id === selectedModule);
    if (!section) return null;
    const Icon = section.icon;

    // Longest match wins parmi les items du module — un seul point bleu à la fois.
    const activeItemHref = getActiveItemHref(pathname, section.items);

    return (
      <div className="flex flex-col h-full">
        {/* En-tête du module */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8">
          <button
            type="button"
            onClick={() => onSelectModule(null)}
            className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-white/8 transition-colors text-white/60 hover:text-white flex-shrink-0"
            aria-label="Retour aux modules"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="h-4 w-4 flex-shrink-0 text-white/50" aria-hidden />
            <span className="text-sm font-semibold text-white truncate">{section.label}</span>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {section.items.map((item) => (
            <SubItem
              key={item.id}
              item={item}
              activeItemHref={activeItemHref}
              onNavigate={onClose}
            />
          ))}
        </div>
      </div>
    );
  }

  /* ── Niveau 1 : liste des modules ────────────────────────────── */
  return (
    <div className="py-2 px-2 space-y-0.5">
      {sections.map((section) => {
        const isActive = section.id === activeModuleId;
        return (
          <ModuleCard
            key={section.id}
            section={section}
            isActive={isActive}
            onSelect={onSelectModule}
          />
        );
      })}
    </div>
  );
}
