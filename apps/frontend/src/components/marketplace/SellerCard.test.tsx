// MP-S-INDEX — couverture du composant SellerCard.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SellerCard } from './SellerCard';
import type { PublicSeller } from '@/lib/marketplace/types';

function makeSeller(overrides: Partial<PublicSeller> = {}): PublicSeller {
  return {
    id: 'sel_1',
    slug: 'mch-coop',
    publicDisplayName: 'Coopérative Mahoraise',
    country: 'YT',
    region: null,
    cityOrZone: null,
    descriptionShort: null,
    logoMediaId: null,
    bannerMediaId: null,
    averageLeadTimeDays: null,
    destinationsServed: null,
    supportedIncoterms: null,
    isFeatured: false,
    publishedProductsCount: 0,
    ...overrides,
  };
}

describe('SellerCard (MP-S-INDEX)', () => {
  it('rend le minimum (nom + pays + lien slug) sans champs optionnels', () => {
    render(<SellerCard seller={makeSeller()} />);
    const link = screen.getByTestId('seller-card-mch-coop');
    expect(link.getAttribute('href')).toBe('/marketplace/sellers/mch-coop');
    expect(screen.getByText('Coopérative Mahoraise')).toBeTruthy();
    expect(screen.getByText('YT')).toBeTruthy();
    // Pas de badge featured
    expect(screen.queryByTestId('seller-card-featured-badge')).toBeNull();
    // Compte zéro publié — singulier sans 's'
    expect(screen.getByText(/0 produit publié/)).toBeTruthy();
  });

  it("affiche le badge 'Vedette' quand isFeatured=true", () => {
    render(<SellerCard seller={makeSeller({ isFeatured: true })} />);
    expect(screen.getByTestId('seller-card-featured-badge')).toBeTruthy();
  });

  it('compose la ligne ville + région + pays et la description', () => {
    render(
      <SellerCard
        seller={makeSeller({
          cityOrZone: 'Mamoudzou',
          region: 'Grande-Terre',
          descriptionShort: 'Producteur engagé MCH.',
        })}
      />,
    );
    expect(screen.getByText('Mamoudzou, Grande-Terre · YT')).toBeTruthy();
    expect(screen.getByText('Producteur engagé MCH.')).toBeTruthy();
  });

  it('pluralise le compteur de produits et expose le premier incoterm', () => {
    render(
      <SellerCard
        seller={makeSeller({
          publishedProductsCount: 3,
          supportedIncoterms: ['FOB', 'CIF'],
        })}
      />,
    );
    expect(screen.getByText(/3 produits publiés/)).toBeTruthy();
    expect(screen.getByText('FOB')).toBeTruthy();
    // Le second incoterm n'est PAS affiché (carte = aperçu)
    expect(screen.queryByText('CIF')).toBeNull();
  });
});
