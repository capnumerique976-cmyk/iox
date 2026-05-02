import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { CatalogCard } from '@/lib/marketplace/types';

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/marketplace/favorites', () => ({
  useFavorites: () => ({
    has: () => false,
    toggle: vi.fn(),
    hydrated: true,
    items: [],
    count: 0,
    remove: vi.fn(),
  }),
}));

import { ProductCard } from './ProductCard';

function makeCard(overrides?: Partial<CatalogCard>): CatalogCard {
  return {
    offerId: 'offer-1',
    offerTitle: 'Offre principale',
    productSlug: 'vanille-bourbon',
    commercialName: 'Vanille Bourbon',
    subtitle: 'Qualité premium',
    category: { id: 'cat-1', slug: 'epices', nameFr: 'Épices', nameEn: 'Spices' },
    origin: { country: 'Comores', region: 'Anjouan' },
    varietySpecies: null,
    productionMethod: null,
    packagingDescription: 'Sachet sous vide 1kg',
    defaultUnit: 'kg',
    minimumOrderQuantity: 10,
    primaryImage: null,
    seller: {
      id: 's-1',
      slug: 'coop-anjouan',
      publicDisplayName: 'Coop Anjouan',
      country: 'KM',
      region: null,
    },
    priceMode: 'FIXED',
    unitPrice: 250,
    currency: 'EUR',
    moq: 10,
    onQuote: false,
    availableQuantity: 500,
    leadTimeDays: 14,
    incoterm: 'FOB',
    exportReadinessStatus: 'EXPORT_READY',
    publishedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('ProductCard', () => {
  it('renders the commercial name and seller name', () => {
    render(<ProductCard card={makeCard()} />);
    expect(screen.getByText('Vanille Bourbon')).toBeInTheDocument();
    expect(screen.getByText('Coop Anjouan')).toBeInTheDocument();
  });

  it('links to the product detail page using productSlug', () => {
    render(<ProductCard card={makeCard()} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/marketplace/products/vanille-bourbon');
  });

  it('renders category badge when category is present', () => {
    render(<ProductCard card={makeCard()} />);
    expect(screen.getByText('Épices')).toBeInTheDocument();
  });

  it('displays "Pas d\'image" placeholder when no primaryImage', () => {
    render(<ProductCard card={makeCard({ primaryImage: null })} />);
    expect(screen.getByText("Pas d'image")).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<ProductCard card={makeCard({ subtitle: 'Qualité premium' })} />);
    expect(screen.getByText('Qualité premium')).toBeInTheDocument();
  });

  it('renders origin with country and region', () => {
    render(<ProductCard card={makeCard()} />);
    // Origin line contains "Coop Anjouan · Comores / Anjouan"
    expect(screen.getByText(/Comores \/ Anjouan/)).toBeInTheDocument();
  });

  it('renders MOQ and packaging info', () => {
    render(<ProductCard card={makeCard()} />);
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Sachet sous vide 1kg')).toBeInTheDocument();
  });
});
