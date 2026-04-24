import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams(),
}));

import NewProductBatchPage from './page';

function jsonOk(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('NewProductBatchPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    localStorage.setItem('iox_access_token', 'tok');
    const fetchMock = vi.fn((url: string | URL) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u.startsWith('/api/v1/products'))
        return Promise.resolve(
          jsonOk({
            success: true,
            data: { data: [{ id: 'p1', code: 'PROD-1', name: 'Miel', status: 'COMPLIANT' }] },
          }),
        );
      if (u.startsWith('/api/v1/transformation-operations'))
        return Promise.resolve(jsonOk({ success: true, data: { data: [] } }));
      return Promise.resolve(jsonOk({ success: true, data: { id: 'pb-1' } }, 201));
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('rend le titre Créer un lot fini', async () => {
    render(<NewProductBatchPage />);
    expect(screen.getByRole('heading', { name: /Créer un lot fini/i })).toBeInTheDocument();
    // options produit chargées
    await waitFor(() => expect(screen.getByRole('option', { name: /PROD-1/ })).toBeInTheDocument());
  });

  it('valide côté client : quantité manquante empêche la soumission', async () => {
    render(<NewProductBatchPage />);
    await waitFor(() => expect(screen.getByRole('option', { name: /PROD-1/ })).toBeInTheDocument());

    // Ne sélectionne pas de produit ni quantité → clic doit déclencher validation
    await userEvent.click(screen.getByRole('button', { name: /Créer le lot/i }));

    expect(await screen.findByText(/Sélectionnez un produit/i)).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('POST /product-batches valide et redirige sur /product-batches/:id', async () => {
    render(<NewProductBatchPage />);
    await waitFor(() => expect(screen.getByRole('option', { name: /PROD-1/ })).toBeInTheDocument());

    const productSelect = screen.getAllByRole('combobox')[0];
    await userEvent.selectOptions(productSelect, 'p1');

    const quantityInput = screen.getByPlaceholderText('350');
    await userEvent.type(quantityInput, '12');

    await userEvent.click(screen.getByRole('button', { name: /Créer le lot/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/product-batches/pb-1'));
  });
});
