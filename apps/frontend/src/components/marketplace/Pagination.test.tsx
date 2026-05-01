import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { Pagination } from './Pagination';

describe('Pagination', () => {
  it('returns null when totalPages is 1', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} basePath="/marketplace" searchParams={{}} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders page indicator showing current page and total', () => {
    render(
      <Pagination currentPage={2} totalPages={5} basePath="/marketplace" searchParams={{}} />,
    );
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText(/\/ 5/)).toBeInTheDocument();
  });

  it('disables previous link on first page and enables next', () => {
    render(
      <Pagination currentPage={1} totalPages={3} basePath="/marketplace" searchParams={{}} />,
    );
    const prevLink = screen.getByText('Précédent').closest('a');
    const nextLink = screen.getByText('Suivant').closest('a');
    expect(prevLink).toHaveAttribute('aria-disabled', 'true');
    expect(nextLink).toHaveAttribute('aria-disabled', 'false');
  });

  it('disables next link on last page and enables previous', () => {
    render(
      <Pagination currentPage={3} totalPages={3} basePath="/marketplace" searchParams={{}} />,
    );
    const prevLink = screen.getByText('Précédent').closest('a');
    const nextLink = screen.getByText('Suivant').closest('a');
    expect(prevLink).toHaveAttribute('aria-disabled', 'false');
    expect(nextLink).toHaveAttribute('aria-disabled', 'true');
  });

  it('builds correct href preserving existing search params', () => {
    render(
      <Pagination
        currentPage={2}
        totalPages={4}
        basePath="/marketplace"
        searchParams={{ categorySlug: 'epices', q: 'vanille' }}
      />,
    );
    const nextLink = screen.getByText('Suivant').closest('a');
    expect(nextLink).toHaveAttribute('href', expect.stringContaining('page=3'));
    expect(nextLink).toHaveAttribute('href', expect.stringContaining('categorySlug=epices'));
    expect(nextLink).toHaveAttribute('href', expect.stringContaining('q=vanille'));
  });

  it('omits page param when navigating to page 1', () => {
    render(
      <Pagination currentPage={2} totalPages={4} basePath="/marketplace" searchParams={{}} />,
    );
    const prevLink = screen.getByText('Précédent').closest('a');
    expect(prevLink?.getAttribute('href')).toBe('/marketplace');
  });
});
