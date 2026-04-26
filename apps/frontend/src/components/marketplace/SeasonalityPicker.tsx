// FP-4 — Saisie de la saisonnalité produit côté seller.
// Composant contrôlé : reçoit l'état complet et un callback `onChange`,
// ne maintient AUCUN état interne (la page parente gère le dirty/diff).
//
// Trois entrées modifiables :
//   - `availabilityMonths` (mois de disponibilité commerciale)
//   - `harvestMonths` (mois de récolte)
//   - `isYearRound` (drapeau « toute l'année »)
//
// Conventions UX :
//   - Cocher « Toute l'année » désactive la grille mois (visuellement et
//     fonctionnellement) mais on n'efface PAS les valeurs locales : ainsi,
//     décocher restitue le calendrier précédent. La normalisation finale
//     (vidage de availabilityMonths quand isYearRound=true) est faite côté
//     backend (cf. `normalizeSeasonalityInput`), on n'en fait pas double-emploi.
//   - Pour chaque mois, deux pastilles indépendantes : « D » (disponible) et
//     « R » (récolte). Un mois peut être l'un, l'autre, les deux, ou ni l'un
//     ni l'autre.
//   - Les listes sont systématiquement renvoyées dans l'ordre canonique
//     JAN → DEC pour minimiser les diffs cosmétiques avec ce que le backend
//     renvoie.
//
// Accessibilité : chaque toggle expose `aria-pressed` et un `aria-label`
// explicite (ex. « Mars : disponibilité commerciale »).
'use client';

import type { SeasonalityMonth } from '@/lib/marketplace/types';

const MONTHS: { code: SeasonalityMonth; labelFr: string; longFr: string }[] = [
  { code: 'JAN', labelFr: 'Jan.', longFr: 'janvier' },
  { code: 'FEB', labelFr: 'Fév.', longFr: 'février' },
  { code: 'MAR', labelFr: 'Mars', longFr: 'mars' },
  { code: 'APR', labelFr: 'Avr.', longFr: 'avril' },
  { code: 'MAY', labelFr: 'Mai', longFr: 'mai' },
  { code: 'JUN', labelFr: 'Juin', longFr: 'juin' },
  { code: 'JUL', labelFr: 'Juil.', longFr: 'juillet' },
  { code: 'AUG', labelFr: 'Août', longFr: 'août' },
  { code: 'SEP', labelFr: 'Sept.', longFr: 'septembre' },
  { code: 'OCT', labelFr: 'Oct.', longFr: 'octobre' },
  { code: 'NOV', labelFr: 'Nov.', longFr: 'novembre' },
  { code: 'DEC', labelFr: 'Déc.', longFr: 'décembre' },
];

const MONTH_ORDER: SeasonalityMonth[] = MONTHS.map((m) => m.code);

export interface SeasonalityPickerValue {
  availabilityMonths: SeasonalityMonth[];
  harvestMonths: SeasonalityMonth[];
  isYearRound: boolean;
}

export interface SeasonalityPickerProps {
  value: SeasonalityPickerValue;
  onChange: (next: SeasonalityPickerValue) => void;
  /** Désactive toute interaction (ex. pendant un PATCH en cours). */
  disabled?: boolean;
  /** Optionnel : message d'erreur (validation client) à afficher sous la grille. */
  errorMessage?: string;
}

function sortMonths(list: SeasonalityMonth[]): SeasonalityMonth[] {
  const set = new Set(list);
  return MONTH_ORDER.filter((m) => set.has(m));
}

function toggleMonth(
  current: SeasonalityMonth[],
  month: SeasonalityMonth,
): SeasonalityMonth[] {
  const set = new Set(current);
  if (set.has(month)) set.delete(month);
  else set.add(month);
  return sortMonths(Array.from(set));
}

export function SeasonalityPicker({
  value,
  onChange,
  disabled = false,
  errorMessage,
}: SeasonalityPickerProps) {
  const { availabilityMonths, harvestMonths, isYearRound } = value;
  const monthsLocked = isYearRound || disabled;

  const setYearRound = (next: boolean) => {
    onChange({ ...value, isYearRound: next });
  };

  const toggleAvailability = (m: SeasonalityMonth) => {
    if (monthsLocked) return;
    onChange({ ...value, availabilityMonths: toggleMonth(availabilityMonths, m) });
  };

  const toggleHarvest = (m: SeasonalityMonth) => {
    if (monthsLocked) return;
    onChange({ ...value, harvestMonths: toggleMonth(harvestMonths, m) });
  };

  return (
    <div
      className="iox-glass relative overflow-hidden rounded-2xl p-5"
      data-testid="seasonality-picker"
      role="group"
      aria-label="Saisie de la saisonnalité du produit"
    >
      <span
        aria-hidden
        className="absolute left-0 top-5 bottom-5 w-1 rounded-r-full bg-gradient-iox-neon"
      />
      <div className="pl-3">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-white">Saisonnalité</h2>
          <label className="flex items-center gap-2 text-xs text-white/80">
            <input
              type="checkbox"
              data-testid="picker-year-round"
              checked={isYearRound}
              disabled={disabled}
              onChange={(e) => setYearRound(e.target.checked)}
              className="h-4 w-4 accent-[#00D4FF]"
            />
            Disponible toute l&apos;année
          </label>
        </div>

        <p className="mb-3 text-[11px] leading-snug text-white/55">
          Cliquez sur <strong className="text-white/80">D</strong> (disponibilité commerciale)
          ou <strong className="text-white/80">R</strong> (récolte) sous chaque mois. Un mois
          peut combiner les deux.
        </p>

        <div
          className="grid grid-cols-6 gap-2 sm:grid-cols-12"
          data-testid="picker-grid"
          aria-disabled={monthsLocked}
        >
          {MONTHS.map((m) => {
            const isAvailable = availabilityMonths.includes(m.code);
            const isHarvest = harvestMonths.includes(m.code);
            return (
              <div
                key={m.code}
                className={[
                  'flex flex-col items-center gap-1 rounded-md border px-1 py-1.5 text-[10px] font-medium',
                  monthsLocked
                    ? 'border-white/5 bg-white/[0.03] opacity-60'
                    : 'border-white/10 bg-white/5',
                ].join(' ')}
                data-testid={`picker-cell-${m.code}`}
              >
                <span className="uppercase text-white/85">{m.labelFr}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    data-testid={`picker-avail-${m.code}`}
                    aria-pressed={isAvailable}
                    aria-label={`${m.longFr} : disponibilité commerciale`}
                    disabled={monthsLocked}
                    onClick={() => toggleAvailability(m.code)}
                    className={[
                      'h-5 w-5 rounded text-[10px] font-semibold leading-none transition',
                      isAvailable
                        ? 'border border-white/30 bg-white/20 text-white'
                        : 'border border-white/10 bg-transparent text-white/45 hover:bg-white/10',
                      monthsLocked ? 'cursor-not-allowed' : 'cursor-pointer',
                    ].join(' ')}
                  >
                    D
                  </button>
                  <button
                    type="button"
                    data-testid={`picker-harvest-${m.code}`}
                    aria-pressed={isHarvest}
                    aria-label={`${m.longFr} : mois de récolte`}
                    disabled={monthsLocked}
                    onClick={() => toggleHarvest(m.code)}
                    className={[
                      'h-5 w-5 rounded text-[10px] font-semibold leading-none transition',
                      isHarvest
                        ? 'border border-[#00D4FF]/60 bg-[#00D4FF]/25 text-white shadow-glow-cyan-sm'
                        : 'border border-white/10 bg-transparent text-white/45 hover:bg-white/10',
                      monthsLocked ? 'cursor-not-allowed' : 'cursor-pointer',
                    ].join(' ')}
                  >
                    R
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {errorMessage && (
          <p
            className="mt-3 text-xs text-red-300"
            data-testid="picker-error"
            role="alert"
          >
            {errorMessage}
          </p>
        )}

        <ul className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-white/60">
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-flex h-3.5 w-3.5 items-center justify-center rounded border border-white/30 bg-white/20 text-[8px] font-semibold text-white"
            >
              D
            </span>
            Disponibilité commerciale
          </li>
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-flex h-3.5 w-3.5 items-center justify-center rounded border border-[#00D4FF]/60 bg-[#00D4FF]/25 text-[8px] font-semibold text-white"
            >
              R
            </span>
            Récolte
          </li>
        </ul>
      </div>
    </div>
  );
}
