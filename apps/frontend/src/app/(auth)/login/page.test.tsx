import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/navigation — le composant utilise useRouter + useSearchParams
// (pour lire ?redirect=… passé par le CTA public "Demander un devis").
const pushMock = vi.fn();
let searchParamsImpl = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  useSearchParams: () => searchParamsImpl,
}));

import LoginPage from './page';
import { AuthProvider } from '@/contexts/auth.context';

function renderLogin() {
  return render(
    <AuthProvider>
      <LoginPage />
    </AuthProvider>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    searchParamsImpl = new URLSearchParams();
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('affiche le titre IOX et le formulaire', () => {
    renderLogin();
    expect(screen.getByRole('heading', { name: 'IOX' })).toBeInTheDocument();
    expect(screen.getByLabelText('Adresse e-mail')).toBeInTheDocument();
    expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument();
  });

  it('authentifie et redirige vers /dashboard en cas de succès', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            accessToken: 'tok',
            refreshToken: 'ref',
            expiresIn: 900,
            user: { id: '1', email: 'u@x.fr', firstName: 'U', lastName: 'X', role: 'ADMIN' },
          },
          timestamp: new Date().toISOString(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    renderLogin();
    await userEvent.type(screen.getByLabelText('Adresse e-mail'), 'u@x.fr');
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /Se connecter/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/dashboard'));
    expect(localStorage.getItem('iox_access_token')).toBe('tok');
  });

  it("affiche le message d'erreur si identifiants invalides", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Identifiants incorrects' },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    renderLogin();
    await userEvent.type(screen.getByLabelText('Adresse e-mail'), 'u@x.fr');
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'bad');
    await userEvent.click(screen.getByRole('button', { name: /Se connecter/i }));

    expect(await screen.findByText('Identifiants incorrects')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('après succès, redirige vers ?redirect=… quand fourni (URL interne)', async () => {
    searchParamsImpl = new URLSearchParams({ redirect: '/quote-requests/new?offerId=abc' });
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            accessToken: 'tok',
            refreshToken: 'ref',
            expiresIn: 900,
            user: {
              id: '1',
              email: 'b@x.fr',
              firstName: 'B',
              lastName: 'Y',
              role: 'MARKETPLACE_BUYER',
            },
          },
          timestamp: new Date().toISOString(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    renderLogin();
    await userEvent.type(screen.getByLabelText('Adresse e-mail'), 'b@x.fr');
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /Se connecter/i }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/quote-requests/new?offerId=abc'));
  });

  it('après succès, ignore un redirect protocol-relative (anti open-redirect)', async () => {
    searchParamsImpl = new URLSearchParams({ redirect: '//evil.example.com/phish' });
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            accessToken: 'tok',
            refreshToken: 'ref',
            expiresIn: 900,
            user: {
              id: '1',
              email: 'b@x.fr',
              firstName: 'B',
              lastName: 'Y',
              role: 'MARKETPLACE_BUYER',
            },
          },
          timestamp: new Date().toISOString(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    renderLogin();
    await userEvent.type(screen.getByLabelText('Adresse e-mail'), 'b@x.fr');
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /Se connecter/i }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/dashboard'));
  });
});
