import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextActionCard } from './next-action-card';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

describe('NextActionCard', () => {
  it('renders the label text', () => {
    render(<NextActionCard label="Compléter votre profil" href="/seller/profile/edit" />);
    expect(screen.getByText('Compléter votre profil')).toBeInTheDocument();
  });

  it('renders "Prochaine étape" header', () => {
    render(<NextActionCard label="Ajouter un produit" href="/seller/products/new" />);
    expect(screen.getByText('Prochaine étape')).toBeInTheDocument();
  });

  it('links to the correct href', () => {
    render(<NextActionCard label="Ajouter un produit" href="/seller/products/new" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/seller/products/new');
  });

  it('renders subtitle when provided', () => {
    render(
      <NextActionCard
        label="Compléter votre profil"
        href="/seller/profile/edit"
        subtitle="Les acheteurs pourront voir votre exploitation."
      />,
    );
    expect(screen.getByText('Les acheteurs pourront voir votre exploitation.')).toBeInTheDocument();
  });

  it('does not render subtitle when omitted', () => {
    const { container } = render(
      <NextActionCard label="Compléter votre profil" href="/seller/profile/edit" />,
    );
    // The subtitle is rendered in a <p> with text-white/50; only 2 <p> should exist (header + label)
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs).toHaveLength(2);
  });
});
