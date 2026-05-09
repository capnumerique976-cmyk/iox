import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JourneyProgress } from './journey-progress';
import type { JourneyStep } from '@/hooks/use-user-journey';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const STEPS: JourneyStep[] = [
  { id: 'profile', label: 'Profil', completed: true, current: false, href: '/seller/profile/edit' },
  { id: 'products', label: 'Produits', completed: false, current: true, href: '/seller/marketplace-products' },
  { id: 'publish', label: 'Publication', completed: false, current: false, href: '/seller/marketplace-products/publish' },
];

describe('JourneyProgress', () => {
  it('renders the completion percentage text', () => {
    render(<JourneyProgress steps={STEPS} completionPercentage={67} />);
    expect(screen.getByText('67 %')).toBeInTheDocument();
  });

  it('renders all step labels', () => {
    render(<JourneyProgress steps={STEPS} completionPercentage={33} />);
    expect(screen.getByText('Profil')).toBeInTheDocument();
    expect(screen.getByText('Produits')).toBeInTheDocument();
    expect(screen.getByText('Publication')).toBeInTheDocument();
  });

  it('applies line-through class to completed steps', () => {
    render(<JourneyProgress steps={STEPS} completionPercentage={33} />);
    const completedLabel = screen.getByText('Profil');
    expect(completedLabel).toHaveClass('line-through');
  });

  it('renders current step as a link with the correct href', () => {
    render(<JourneyProgress steps={STEPS} completionPercentage={33} />);
    const link = screen.getByRole('link', { name: /Produits/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/seller/marketplace-products');
  });

  it('renders upcoming step as plain text with white/30 color class', () => {
    render(<JourneyProgress steps={STEPS} completionPercentage={33} />);
    const upcomingLabel = screen.getByText('Publication');
    expect(upcomingLabel.tagName).toBe('SPAN');
    expect(upcomingLabel).toHaveClass('text-white/30');
  });

  it('sets progress bar width matching the percentage', () => {
    const { container } = render(<JourneyProgress steps={STEPS} completionPercentage={67} />);
    const progressBar = container.querySelector('[style]');
    expect(progressBar).toHaveStyle({ width: '67%' });
  });
});
