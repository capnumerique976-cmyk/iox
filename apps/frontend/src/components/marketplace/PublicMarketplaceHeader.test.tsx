import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import path from 'path';
import fs from 'fs';

vi.mock('next/navigation', () => ({
  usePathname: () => '/marketplace',
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// Mock LangSwitcher to avoid its own useLang dependency
vi.mock('./LangSwitcher', () => ({
  LangSwitcher: () => <div data-testid="lang-switcher">FR | EN</div>,
}));

// Mock Logo to avoid img issues
vi.mock('@/components/brand/logo', () => ({
  Logo: ({ 'aria-label': ariaLabel }: { 'aria-label'?: string }) => (
    <span data-testid="logo">{ariaLabel ?? 'IOX'}</span>
  ),
}));

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

import { PublicMarketplaceHeader } from './PublicMarketplaceHeader';

describe('PublicMarketplaceHeader', () => {
  it('renders navigation links with translated labels', () => {
    render(<PublicMarketplaceHeader />);
    expect(screen.getByText('Catalogue')).toBeInTheDocument();
    expect(screen.getByText('Producteurs')).toBeInTheDocument();
    expect(screen.getByText('Favoris')).toBeInTheDocument();
    expect(screen.getByText('Espace pro')).toBeInTheDocument();
  });

  it('renders the categories link pointing to /marketplace/categories', () => {
    render(<PublicMarketplaceHeader />);
    const catLink = screen.getByTestId('nav-categories');
    expect(catLink).toHaveAttribute('href', '/marketplace/categories');
  });

  it('renders the sellers link pointing to /marketplace/sellers', () => {
    render(<PublicMarketplaceHeader />);
    const sellersLink = screen.getByTestId('nav-sellers');
    expect(sellersLink).toHaveAttribute('href', '/marketplace/sellers');
  });

  it('renders the login link pointing to /login', () => {
    render(<PublicMarketplaceHeader />);
    const loginLink = screen.getByText('Espace pro').closest('a');
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('renders the LangSwitcher component', () => {
    render(<PublicMarketplaceHeader />);
    expect(screen.getByTestId('lang-switcher')).toBeInTheDocument();
  });
});
