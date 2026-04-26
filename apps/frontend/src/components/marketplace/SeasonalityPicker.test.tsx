// FP-4 — couverture du composant éditable SeasonalityPicker.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SeasonalityPicker, type SeasonalityPickerValue } from './SeasonalityPicker';
import type { SeasonalityMonth } from '@/lib/marketplace/types';

function emptyValue(): SeasonalityPickerValue {
  return { availabilityMonths: [], harvestMonths: [], isYearRound: false };
}

describe('SeasonalityPicker (FP-4)', () => {
  it("rend les 12 mois et la case 'toute l'année'", () => {
    render(<SeasonalityPicker value={emptyValue()} onChange={() => {}} />);
    const months: SeasonalityMonth[] = [
      'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
      'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
    ];
    for (const m of months) {
      expect(screen.getByTestId(`picker-cell-${m}`)).toBeInTheDocument();
      expect(screen.getByTestId(`picker-avail-${m}`)).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByTestId(`picker-harvest-${m}`)).toHaveAttribute('aria-pressed', 'false');
    }
    expect(screen.getByTestId('picker-year-round')).not.toBeChecked();
  });

  it("toggle D ajoute le mois à availabilityMonths dans l'ordre canonique", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const value: SeasonalityPickerValue = {
      availabilityMonths: ['DEC'],
      harvestMonths: [],
      isYearRound: false,
    };
    render(<SeasonalityPicker value={value} onChange={onChange} />);
    await user.click(screen.getByTestId('picker-avail-MAR'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual({
      availabilityMonths: ['MAR', 'DEC'],
      harvestMonths: [],
      isYearRound: false,
    });
  });

  it('toggle R ajoute puis retire un mois de harvestMonths', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const value: SeasonalityPickerValue = {
      availabilityMonths: [],
      harvestMonths: ['JUL'],
      isYearRound: false,
    };
    render(<SeasonalityPicker value={value} onChange={onChange} />);
    // Toggle off JUL
    await user.click(screen.getByTestId('picker-harvest-JUL'));
    expect(onChange).toHaveBeenCalledWith({
      availabilityMonths: [],
      harvestMonths: [],
      isYearRound: false,
    });
  });

  it("cocher 'toute l'année' désactive les boutons D/R sans purger les valeurs locales", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const value: SeasonalityPickerValue = {
      availabilityMonths: ['SEP', 'OCT'],
      harvestMonths: ['SEP'],
      isYearRound: false,
    };
    const { rerender } = render(
      <SeasonalityPicker value={value} onChange={onChange} />,
    );
    await user.click(screen.getByTestId('picker-year-round'));
    expect(onChange).toHaveBeenCalledWith({ ...value, isYearRound: true });

    // Re-render avec isYearRound=true : les boutons doivent être désactivés
    rerender(
      <SeasonalityPicker value={{ ...value, isYearRound: true }} onChange={onChange} />,
    );
    expect(screen.getByTestId('picker-avail-SEP')).toBeDisabled();
    expect(screen.getByTestId('picker-harvest-SEP')).toBeDisabled();
    // Cliquer ne déclenche pas de onChange supplémentaire (disabled)
    onChange.mockClear();
    await user.click(screen.getByTestId('picker-avail-SEP'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("`disabled` global verrouille toute interaction (saisie en cours)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SeasonalityPicker value={emptyValue()} onChange={onChange} disabled />,
    );
    await user.click(screen.getByTestId('picker-avail-JAN'));
    await user.click(screen.getByTestId('picker-harvest-JAN'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('affiche un message d\'erreur transmis via `errorMessage`', () => {
    render(
      <SeasonalityPicker
        value={emptyValue()}
        onChange={() => {}}
        errorMessage="Au moins un mois requis"
      />,
    );
    expect(screen.getByTestId('picker-error')).toHaveTextContent('Au moins un mois requis');
  });
});
