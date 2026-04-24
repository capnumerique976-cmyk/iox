import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

import NewIncidentPage from './page';

describe('NewIncidentPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    localStorage.setItem('iox_access_token', 'tok');
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('rend le titre Déclarer un incident', () => {
    render(<NewIncidentPage />);
    expect(screen.getByRole('heading', { name: /Déclarer un incident/i })).toBeInTheDocument();
  });

  it('POST /incidents avec titre + description et redirige', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: { id: 'inc-9' } }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    render(<NewIncidentPage />);
    await userEvent.type(screen.getByPlaceholderText(/Contamination détectée/i), 'Test incident');
    await userEvent.type(
      screen.getByPlaceholderText(/Décrivez précisément/i),
      'Ceci est une description complète de plus de 10 caractères',
    );
    await userEvent.click(screen.getByRole('button', { name: /Déclarer l'incident/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/incidents/inc-9'));
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.title).toBe('Test incident');
    expect(body.description).toContain('description complète');
  });

  it('affiche un bandeau rouge quand sévérité = CRITICAL', async () => {
    render(<NewIncidentPage />);
    // 2 <select> visibles : sévérité (1er) + type d'entité (2e)
    const selects = screen.getAllByRole('combobox');
    const severity = selects.find((s) =>
      Array.from((s as HTMLSelectElement).options).some((o) => o.value === 'CRITICAL'),
    ) as HTMLSelectElement;
    await userEvent.selectOptions(severity, 'CRITICAL');
    // Le bandeau d'alerte contient un texte spécifique absent des options
    expect(screen.getByText(/nécessite une action immédiate/i)).toBeInTheDocument();
  });
});
