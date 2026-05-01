import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PriceTag } from './PriceTag';

describe('PriceTag', () => {
  it('displays "Sur devis" when priceMode is QUOTE_ONLY', () => {
    render(<PriceTag offer={{ priceMode: 'QUOTE_ONLY', unitPrice: null, currency: null }} />);
    expect(screen.getByText('Sur devis')).toBeInTheDocument();
  });

  it('displays "Sur devis" when unitPrice is null regardless of priceMode', () => {
    render(<PriceTag offer={{ priceMode: 'FIXED', unitPrice: null, currency: 'EUR' }} />);
    expect(screen.getByText('Sur devis')).toBeInTheDocument();
  });

  it('displays formatted FIXED price with currency', () => {
    render(<PriceTag offer={{ priceMode: 'FIXED', unitPrice: 12.5, currency: 'EUR' }} />);
    const el = screen.getByText(/12,50/);
    expect(el).toBeInTheDocument();
    expect(el.textContent).toContain('EUR');
    // Should NOT have prefix for FIXED
    expect(el.textContent).not.toContain('À partir de');
  });

  it('displays "À partir de" prefix for FROM_PRICE mode', () => {
    render(<PriceTag offer={{ priceMode: 'FROM_PRICE', unitPrice: 99.99, currency: 'USD' }} />);
    const el = screen.getByText(/À partir de/);
    expect(el).toBeInTheDocument();
    expect(el.textContent).toContain('USD');
  });

  it('defaults currency to EUR when currency is null', () => {
    render(<PriceTag offer={{ priceMode: 'FIXED', unitPrice: 5, currency: null }} />);
    const el = screen.getByText(/5,00/);
    expect(el.textContent).toContain('EUR');
  });
});
