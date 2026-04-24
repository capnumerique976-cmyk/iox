import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

import NewBeneficiaryPage from './page';

describe('NewBeneficiaryPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    localStorage.setItem('iox_access_token', 'tok');
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('rend le formulaire avec le titre et le bouton de création', () => {
    render(<NewBeneficiaryPage />);
    expect(screen.getByRole('heading', { name: /Nouveau bénéficiaire/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Créer le bénéficiaire/i })).toBeInTheDocument();
  });

  it('POST /beneficiaries puis redirige sur le détail', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: { id: 'ben-1', code: 'BEN-0001' } }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    render(<NewBeneficiaryPage />);
    await userEvent.type(screen.getByPlaceholderText('Coopérative Mahoraise Bio'), 'Coop Test');
    await userEvent.click(screen.getByRole('button', { name: /Créer le bénéficiaire/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/beneficiaries/ben-1'));
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe('/api/v1/beneficiaries');
    const init = call[1] as RequestInit;
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string);
    expect(body.name).toBe('Coop Test');
    expect(body.type).toBe('entreprise');
  });

  it("affiche l'erreur backend et ne redirige pas", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Nom déjà utilisé' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    render(<NewBeneficiaryPage />);
    await userEvent.type(screen.getByPlaceholderText('Coopérative Mahoraise Bio'), 'Coop X');
    await userEvent.click(screen.getByRole('button', { name: /Créer le bénéficiaire/i }));

    expect(await screen.findByText('Nom déjà utilisé')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
