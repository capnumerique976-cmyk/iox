import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock CatalogFilters to avoid its deep dependency chain
vi.mock('./CatalogFilters', () => ({
  CatalogFilters: () => <div data-testid="catalog-filters-mock">Filters</div>,
}));

// Mock Sheet components to simplify rendering
vi.mock('@/components/ui/sheet', () => {
  const SheetContext = React.createContext<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }>({ open: false, onOpenChange: () => {} });

  function Sheet({
    open,
    onOpenChange,
    children,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    children: React.ReactNode;
  }) {
    return (
      <SheetContext.Provider value={{ open, onOpenChange }}>
        <div data-testid="sheet-root">{children}</div>
      </SheetContext.Provider>
    );
  }

  function SheetTrigger({
    asChild,
    children,
  }: {
    asChild?: boolean;
    children: React.ReactNode;
  }) {
    const ctx = React.useContext(SheetContext);
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<{ onClick: () => void }>, {
        onClick: () => ctx.onOpenChange(true),
      });
    }
    return <button onClick={() => ctx.onOpenChange(true)}>{children}</button>;
  }

  function SheetContent({
    children,
  }: {
    side?: string;
    className?: string;
    children: React.ReactNode;
  }) {
    const ctx = React.useContext(SheetContext);
    if (!ctx.open) return null;
    return <div data-testid="sheet-content">{children}</div>;
  }

  function SheetHeader({ children }: { children: React.ReactNode }) {
    return <div data-testid="sheet-header">{children}</div>;
  }

  function SheetTitle({ children }: { children: React.ReactNode }) {
    return <h2>{children}</h2>;
  }

  return { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle };
});

import { MobileFiltersTrigger } from './MobileFiltersTrigger';

describe('MobileFiltersTrigger', () => {
  it('renders the trigger button with correct text', () => {
    render(<MobileFiltersTrigger />);
    expect(screen.getByText('Filtrer & trier')).toBeInTheDocument();
  });

  it('has aria-label on the trigger button', () => {
    render(<MobileFiltersTrigger />);
    expect(screen.getByLabelText('Ouvrir les filtres')).toBeInTheDocument();
  });

  it('shows the sheet content with CatalogFilters when trigger is clicked', () => {
    render(<MobileFiltersTrigger />);
    expect(screen.queryByTestId('sheet-content')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Filtrer & trier'));

    expect(screen.getByTestId('sheet-content')).toBeInTheDocument();
    expect(screen.getByTestId('catalog-filters-mock')).toBeInTheDocument();
    expect(screen.getByText('Filtrer le catalogue')).toBeInTheDocument();
  });
});
