// FP-1 — couverture du composant lecture seule SeasonalityCalendar.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SeasonalityCalendar } from './SeasonalityCalendar';

describe('SeasonalityCalendar (FP-1)', () => {
  it('ne rend rien si tout est vide et !isYearRound', () => {
    const { container } = render(
      <SeasonalityCalendar
        availabilityMonths={[]}
        harvestMonths={[]}
        isYearRound={false}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("affiche les 12 mois en 'disponible' quand isYearRound=true", () => {
    render(
      <SeasonalityCalendar
        availabilityMonths={[]}
        harvestMonths={[]}
        isYearRound={true}
      />,
    );
    // Récupère toutes les cellules JAN..DEC : toutes doivent être "available".
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    for (const m of months) {
      const cell = screen.getByTestId(`season-cell-${m}`);
      expect(cell.getAttribute('data-available')).toBe('true');
      expect(cell.getAttribute('data-harvest')).toBe('false');
    }
    // Le badge "Toute l'année" est visible (au moins une occurrence — sr-only + badge).
    expect(screen.getAllByText(/Toute l'année/i).length).toBeGreaterThan(0);
  });

  it('marque les mois de récolte comme "harvest" et "available"', () => {
    render(
      <SeasonalityCalendar
        availabilityMonths={['JUL', 'AUG', 'SEP']}
        harvestMonths={['JUL', 'AUG']}
        isYearRound={false}
      />,
    );
    const jul = screen.getByTestId('season-cell-JUL');
    expect(jul.getAttribute('data-harvest')).toBe('true');
    expect(jul.getAttribute('data-available')).toBe('true');

    const sep = screen.getByTestId('season-cell-SEP');
    expect(sep.getAttribute('data-harvest')).toBe('false');
    expect(sep.getAttribute('data-available')).toBe('true');

    const jan = screen.getByTestId('season-cell-JAN');
    expect(jan.getAttribute('data-available')).toBe('false');
    expect(jan.getAttribute('data-harvest')).toBe('false');
  });

  it("expose un résumé accessible (sr-only) avec les mois en français", () => {
    render(
      <SeasonalityCalendar
        availabilityMonths={['JUL', 'AUG']}
        harvestMonths={[]}
        isYearRound={false}
      />,
    );
    expect(screen.getByText(/Disponible : juillet, août/i)).toBeInTheDocument();
  });

  it("ariaLabel personnalisé est appliqué au groupe", () => {
    render(
      <SeasonalityCalendar
        availabilityMonths={['JAN']}
        harvestMonths={[]}
        isYearRound={false}
        ariaLabel="Saisonnalité de la Vanille de Mayotte"
      />,
    );
    const group = screen.getByRole('group', {
      name: /Saisonnalité de la Vanille de Mayotte/i,
    });
    expect(group).toBeInTheDocument();
  });
});
