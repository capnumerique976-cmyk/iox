// MP-FILTERS-1 + I18N-8 — couverture du composant CatalogFilters.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import path from 'path';
import fs from 'fs';

const pushMock = vi.fn();
let searchParamsImpl = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => searchParamsImpl,
  usePathname: () => '/marketplace',
}));

// I18N-8 — mock next-intl useTranslations avec fr.json réel.
const frMessages = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../../messages/fr.json'), 'utf-8'),
);

function resolveKey(obj: Record<string, unknown>, keyPath: string): string {
  const parts = keyPath.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return keyPath;
    }
  }
  return typeof current === 'string' ? current : keyPath;
}

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => {
    const t = (key: string) => resolveKey(frMessages, `${namespace}.${key}`);
    return t;
  },
}));

import { CatalogFilters } from './CatalogFilters';

describe('CatalogFilters (MP-FILTERS-1 + I18N-8)', () => {
  beforeEach(() => {
    pushMock.mockReset();
    searchParamsImpl = new URLSearchParams();
  });

  it('hydrate les 7 nouveaux contrôles depuis searchParams', () => {
    searchParamsImpl = new URLSearchParams(
      'categorySlug=epices&originRegion=Mamoudzou&productionMethod=bio' +
        '&hasPublicDocs=true&seasonalityMonth=JUN&qualityAttribute=ORGANIC' +
        '&temperatureRequirements=Frozen',
    );
    render(<CatalogFilters />);
    expect(
      (screen.getByTestId('catalog-filter-categorySlug') as HTMLInputElement).value,
    ).toBe('epices');
    expect(
      (screen.getByTestId('catalog-filter-originRegion') as HTMLInputElement).value,
    ).toBe('Mamoudzou');
    expect(
      (screen.getByTestId('catalog-filter-productionMethod') as HTMLInputElement).value,
    ).toBe('bio');
    expect(
      (screen.getByTestId('catalog-filter-hasPublicDocs') as HTMLInputElement).checked,
    ).toBe(true);
    expect(
      (screen.getByTestId('catalog-filter-seasonalityMonth') as HTMLSelectElement).value,
    ).toBe('JUN');
    expect(
      (screen.getByTestId('catalog-filter-qualityAttribute') as HTMLSelectElement).value,
    ).toBe('ORGANIC');
    expect(
      (screen.getByTestId('catalog-filter-temperatureRequirements') as HTMLInputElement).value,
    ).toBe('Frozen');
  });

  it('pousse une URL contenant les 7 paramètres à la soumission', () => {
    render(<CatalogFilters />);
    fireEvent.change(screen.getByTestId('catalog-filter-categorySlug'), {
      target: { value: 'cafe' },
    });
    fireEvent.change(screen.getByTestId('catalog-filter-originRegion'), {
      target: { value: 'Bandrele' },
    });
    fireEvent.change(screen.getByTestId('catalog-filter-productionMethod'), {
      target: { value: 'agroforesterie' },
    });
    fireEvent.click(screen.getByTestId('catalog-filter-hasPublicDocs'));
    fireEvent.change(screen.getByTestId('catalog-filter-seasonalityMonth'), {
      target: { value: 'MAR' },
    });
    fireEvent.change(screen.getByTestId('catalog-filter-qualityAttribute'), {
      target: { value: 'VEGAN' },
    });
    fireEvent.change(screen.getByTestId('catalog-filter-temperatureRequirements'), {
      target: { value: 'ambiant' },
    });
    fireEvent.submit(screen.getByTestId('catalog-filters'));
    expect(pushMock).toHaveBeenCalledTimes(1);
    const url = pushMock.mock.calls[0][0] as string;
    expect(url).toContain('categorySlug=cafe');
    expect(url).toContain('originRegion=Bandrele');
    expect(url).toContain('productionMethod=agroforesterie');
    expect(url).toContain('hasPublicDocs=true');
    expect(url).toContain('seasonalityMonth=MAR');
    expect(url).toContain('qualityAttribute=VEGAN');
    expect(url).toContain('temperatureRequirements=ambiant');
  });

  it('expose les 18 valeurs FP-7 dans le select qualityAttribute', () => {
    render(<CatalogFilters />);
    const select = screen.getByTestId('catalog-filter-qualityAttribute') as HTMLSelectElement;
    // 18 enum values + 1 placeholder vide
    expect(select.options.length).toBe(19);
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toContain('ORGANIC');
    expect(values).toContain('NON_GMO');
    expect(values).toContain('FAIR_TRADE');
    expect(values).toContain('OTHER');
  });

  it('expose les 12 mois dans le select seasonalityMonth + option vide', () => {
    render(<CatalogFilters />);
    const select = screen.getByTestId('catalog-filter-seasonalityMonth') as HTMLSelectElement;
    expect(select.options.length).toBe(13);
    expect(select.options[0].value).toBe('');
    expect(select.options[6].value).toBe('JUN');
  });

  it('reset vide les 7 nouveaux champs et navigue vers la pathname nue', () => {
    searchParamsImpl = new URLSearchParams('qualityAttribute=ORGANIC&hasPublicDocs=true');
    render(<CatalogFilters />);
    fireEvent.click(screen.getByTestId('catalog-filters-reset'));
    expect(pushMock).toHaveBeenCalledWith('/marketplace');
  });

  it('lowercase le slug catégorie à la saisie', () => {
    render(<CatalogFilters />);
    const input = screen.getByTestId('catalog-filter-categorySlug') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'EPICES' } });
    expect(input.value).toBe('epices');
  });
});
