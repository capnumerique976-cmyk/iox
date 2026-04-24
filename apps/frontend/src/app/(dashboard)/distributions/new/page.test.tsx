import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

import NewDistributionPage from './page';

function jsonOk(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('NewDistributionPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    localStorage.setItem('iox_access_token', 'tok');
    const fetchMock = vi.fn((url: string | URL) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u.startsWith('/api/v1/beneficiaries'))
        return Promise.resolve(
          jsonOk({
            success: true,
            data: { data: [{ id: 'b1', code: 'BEN-1', name: 'Coop A' }] },
          }),
        );
      if (u.startsWith('/api/v1/product-batches'))
        return Promise.resolve(
          jsonOk({
            success: true,
            data: {
              data: [
                {
                  id: 'pb1',
                  code: 'PB-1',
                  status: 'AVAILABLE',
                  quantity: 100,
                  unit: 'kg',
                  product: { name: 'Miel' },
                },
              ],
            },
          }),
        );
      if (u === '/api/v1/distributions')
        return Promise.resolve(jsonOk({ success: true, data: { id: 'd-1' } }, 201));
      return Promise.resolve(jsonOk({ success: true, data: {} }));
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('rend le titre et charge les options', async () => {
    render(<NewDistributionPage />);
    expect(screen.getByRole('heading', { name: /Nouvelle distribution/i })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('option', { name: /Coop A/i })).toBeInTheDocument(),
    );
  });

  it('bloque la soumission sans bénéficiaire ni lots', () => {
    render(<NewDistributionPage />);
    const submit = screen.getByRole('button', { name: /Créer la distribution/i });
    expect(submit).toBeDisabled();
  });

  it('ajoute un lot, POST /distributions puis redirige', async () => {
    render(<NewDistributionPage />);
    await waitFor(() =>
      expect(screen.getByRole('option', { name: /Coop A/i })).toBeInTheDocument(),
    );

    await userEvent.selectOptions(screen.getAllByRole('combobox')[0], 'b1');

    // Ajoute le seul lot disponible via son bouton
    const addBtn = screen.getByRole('button', { name: /PB-1/i });
    await userEvent.click(addBtn);

    const submit = screen.getByRole('button', { name: /Créer la distribution/i });
    await waitFor(() => expect(submit).not.toBeDisabled());
    await userEvent.click(submit);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/distributions/d-1'));
  });
});
