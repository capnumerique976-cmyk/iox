// FP-1 — Calendrier saisonnalité, lecture seule.
// Affiche une bande 12 mois mettant en évidence (a) la disponibilité commerciale
// et (b) les mois de récolte. Aucun état, aucun clic — usage public côté fiche
// produit (`/marketplace/products/[slug]`).
//
// Hypothèses :
//   - `availabilityMonths` et `harvestMonths` reçus normalisés/triés par le backend
//   - si `isYearRound = true`, la disponibilité affiche les 12 mois pleins
//   - si rien n'est renseigné et !isYearRound, le composant ne rend rien
//     (no-op silencieux pour préserver l'esthétique de la fiche)

import type { SeasonalityMonth } from '@/lib/marketplace/types';

const MONTHS: { code: SeasonalityMonth; labelFr: string }[] = [
  { code: 'JAN', labelFr: 'Jan.' },
  { code: 'FEB', labelFr: 'Fév.' },
  { code: 'MAR', labelFr: 'Mars' },
  { code: 'APR', labelFr: 'Avr.' },
  { code: 'MAY', labelFr: 'Mai' },
  { code: 'JUN', labelFr: 'Juin' },
  { code: 'JUL', labelFr: 'Juil.' },
  { code: 'AUG', labelFr: 'Août' },
  { code: 'SEP', labelFr: 'Sept.' },
  { code: 'OCT', labelFr: 'Oct.' },
  { code: 'NOV', labelFr: 'Nov.' },
  { code: 'DEC', labelFr: 'Déc.' },
];

const FULL_MONTH_NAMES_FR: Record<SeasonalityMonth, string> = {
  JAN: 'janvier',
  FEB: 'février',
  MAR: 'mars',
  APR: 'avril',
  MAY: 'mai',
  JUN: 'juin',
  JUL: 'juillet',
  AUG: 'août',
  SEP: 'septembre',
  OCT: 'octobre',
  NOV: 'novembre',
  DEC: 'décembre',
};

export interface SeasonalityCalendarProps {
  availabilityMonths: SeasonalityMonth[];
  harvestMonths: SeasonalityMonth[];
  isYearRound: boolean;
  /** Optionnel : surcharge l'intitulé d'a11y (utile si plusieurs instances). */
  ariaLabel?: string;
}

export function SeasonalityCalendar({
  availabilityMonths,
  harvestMonths,
  isYearRound,
  ariaLabel,
}: SeasonalityCalendarProps) {
  const noDataAtAll =
    !isYearRound && availabilityMonths.length === 0 && harvestMonths.length === 0;
  if (noDataAtAll) return null;

  const availableSet = new Set<SeasonalityMonth>(
    isYearRound ? MONTHS.map((m) => m.code) : availabilityMonths,
  );
  const harvestSet = new Set<SeasonalityMonth>(harvestMonths);

  const summary = isYearRound
    ? "Disponible toute l'année"
    : `Disponible : ${availabilityMonths.map((m) => FULL_MONTH_NAMES_FR[m]).join(', ') || 'non précisé'}`;

  return (
    <div
      className="iox-glass relative overflow-hidden rounded-2xl p-5"
      data-testid="seasonality-calendar"
      role="group"
      aria-label={ariaLabel ?? 'Saisonnalité du produit'}
    >
      <span
        aria-hidden
        className="absolute left-0 top-5 bottom-5 w-1 rounded-r-full bg-gradient-iox-neon"
      />
      <div className="pl-3">
        <h2 className="mb-3 text-sm font-semibold text-white">Saisonnalité</h2>
        <p className="sr-only">{summary}</p>

        <div className="grid grid-cols-12 gap-1" role="list">
          {MONTHS.map((m) => {
            const isAvailable = availableSet.has(m.code);
            const isHarvest = harvestSet.has(m.code);
            const status = isHarvest
              ? 'récolte et disponibilité'
              : isAvailable
                ? 'disponibilité commerciale'
                : 'hors période';
            return (
              <div
                key={m.code}
                role="listitem"
                aria-label={`${FULL_MONTH_NAMES_FR[m.code]} : ${status}`}
                data-testid={`season-cell-${m.code}`}
                data-available={isAvailable ? 'true' : 'false'}
                data-harvest={isHarvest ? 'true' : 'false'}
                className={[
                  'flex flex-col items-center justify-center rounded-md py-1.5 text-[10px] font-medium border',
                  isHarvest
                    ? 'border-[#00D4FF]/60 bg-[#00D4FF]/20 text-white shadow-glow-cyan-sm'
                    : isAvailable
                      ? 'border-white/20 bg-white/10 text-white/85'
                      : 'border-white/5 bg-white/[0.03] text-white/35',
                ].join(' ')}
              >
                <span className="uppercase">{m.labelFr}</span>
              </div>
            );
          })}
        </div>

        <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-white/60">
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-sm border border-[#00D4FF]/60 bg-[#00D4FF]/20"
            />
            Récolte
          </li>
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-sm border border-white/20 bg-white/10"
            />
            Disponible
          </li>
          {isYearRound && (
            <li className="ml-auto rounded-full border border-[#00D4FF]/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#00D4FF]">
              Toute l&apos;année
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
