// MP-MEDIA-1 LOT 1 — tests galerie publique + lightbox.
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PublicGalleryLightbox } from './PublicGalleryLightbox';

describe('PublicGalleryLightbox (MP-MEDIA-1 LOT 1)', () => {
  const images = [
    { id: 'm1', publicUrl: 'https://cdn/x/1.jpg', altTextFr: 'Photo 1' },
    { id: 'm2', publicUrl: 'https://cdn/x/2.jpg', altTextFr: null },
    { id: 'm3', publicUrl: null, altTextFr: null }, // filtré
  ];

  it('rend les thumbnails APPROVED + ignore publicUrl null', () => {
    render(<PublicGalleryLightbox images={images} productName="Vanille" />);
    expect(screen.getByTestId('public-gallery-grid')).toBeInTheDocument();
    expect(screen.getByTestId('public-gallery-thumb-0')).toBeInTheDocument();
    expect(screen.getByTestId('public-gallery-thumb-1')).toBeInTheDocument();
    // m3 (publicUrl null) filtré
    expect(screen.queryByTestId('public-gallery-thumb-2')).not.toBeInTheDocument();
  });

  it("clic sur thumbnail ouvre la lightbox + bouton fermer la ferme", () => {
    render(<PublicGalleryLightbox images={images} productName="Vanille" />);
    fireEvent.click(screen.getByTestId('public-gallery-thumb-0'));
    expect(screen.getByTestId('public-gallery-lightbox')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('public-gallery-close'));
    expect(screen.queryByTestId('public-gallery-lightbox')).not.toBeInTheDocument();
  });

  it('navigation prev/next dans lightbox', () => {
    render(<PublicGalleryLightbox images={images} productName="Vanille" />);
    fireEvent.click(screen.getByTestId('public-gallery-thumb-0'));
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('public-gallery-next'));
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    // wrap around : next sur dernière → revient à 1
    fireEvent.click(screen.getByTestId('public-gallery-next'));
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('si 0 image valide → composant ne rend rien', () => {
    const empty = [{ id: 'm1', publicUrl: null, altTextFr: null }];
    const { container } = render(
      <PublicGalleryLightbox images={empty} productName="Vanille" />,
    );
    // Le composant retourne null
    expect(container.querySelector('[data-testid="public-gallery-grid"]')).toBeNull();
  });
});
