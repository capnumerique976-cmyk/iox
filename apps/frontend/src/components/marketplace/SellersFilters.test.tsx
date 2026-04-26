// MP-S-INDEX — couverture du composant SellersFilters (URL-state).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const pushMock = vi.fn();
let searchParamsImpl = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => searchParamsImpl,
  usePathname: () => '/marketplace/sellers',
}));

import { SellersFilters } from './SellersFilters';

describe('SellersFilters (MP-S-INDEX)', () => {
  beforeEach(() => {
    pushMock.mockReset();
    searchParamsImpl = new URLSearchParams();
  });

  it('hydrate les champs depuis searchParams et pousse une URL filtrée à la soumission', () => {
    searchParamsImpl = new URLSearchParams('q=coop&country=YT&featured=true&sort=name_asc');
    render(<SellersFilters />);
    expect((screen.getByLabelText('Rechercher') as HTMLInputElement).value).toBe('coop');
    expect((screen.getByLabelText('Pays') as HTMLInputElement).value).toBe('YT');
    expect((screen.getByTestId('sellers-filters-featured') as HTMLInputElement).checked).toBe(
      true,
    );
    fireEvent.submit(screen.getByTestId('sellers-filters'));
    expect(pushMock).toHaveBeenCalledTimes(1);
    const url = pushMock.mock.calls[0][0] as string;
    expect(url).toContain('q=coop');
    expect(url).toContain('country=YT');
    expect(url).toContain('featured=true');
    expect(url).toContain('sort=name_asc');
  });

  it("force le pays en majuscules à la saisie", () => {
    render(<SellersFilters />);
    const country = screen.getByLabelText('Pays') as HTMLInputElement;
    fireEvent.change(country, { target: { value: 'yt' } });
    expect(country.value).toBe('YT');
  });

  it('reset vide les champs et navigue vers la pathname nue', () => {
    searchParamsImpl = new URLSearchParams('q=coop&featured=true');
    render(<SellersFilters />);
    fireEvent.click(screen.getByText('Réinitialiser'));
    expect(pushMock).toHaveBeenCalledWith('/marketplace/sellers');
  });
});
