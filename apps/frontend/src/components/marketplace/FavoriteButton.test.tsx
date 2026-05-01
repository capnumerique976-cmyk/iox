import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const hasMock = vi.fn(() => false);
const toggleMock = vi.fn();

vi.mock('@/lib/marketplace/favorites', () => ({
  useFavorites: () => ({
    has: hasMock,
    toggle: toggleMock,
    hydrated: true,
    items: [],
    count: 0,
    remove: vi.fn(),
  }),
}));

import { FavoriteButton } from './FavoriteButton';

describe('FavoriteButton', () => {
  beforeEach(() => {
    hasMock.mockReset().mockReturnValue(false);
    toggleMock.mockReset();
  });

  it('renders with aria-pressed=false when not a favorite (card variant)', () => {
    render(<FavoriteButton productSlug="vanille" commercialName="Vanille Bourbon" />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(btn).toHaveAttribute('aria-label', 'Ajouter aux favoris');
  });

  it('renders with aria-pressed=true when item is a favorite (card variant)', () => {
    hasMock.mockReturnValue(true);
    render(<FavoriteButton productSlug="vanille" commercialName="Vanille Bourbon" />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(btn).toHaveAttribute('aria-label', 'Retirer des favoris');
  });

  it('calls toggle with productSlug and commercialName on click', () => {
    render(<FavoriteButton productSlug="ylang" commercialName="Ylang-ylang" />);
    fireEvent.click(screen.getByRole('button'));
    expect(toggleMock).toHaveBeenCalledWith({
      productSlug: 'ylang',
      commercialName: 'Ylang-ylang',
    });
  });

  it('displays text labels in inline variant', () => {
    render(
      <FavoriteButton productSlug="girofle" commercialName="Clou de girofle" variant="inline" />,
    );
    expect(screen.getByText('Ajouter aux favoris')).toBeInTheDocument();
  });

  it('displays "Favori" text in inline variant when active', () => {
    hasMock.mockReturnValue(true);
    render(
      <FavoriteButton productSlug="girofle" commercialName="Clou de girofle" variant="inline" />,
    );
    expect(screen.getByText('Favori')).toBeInTheDocument();
  });
});
