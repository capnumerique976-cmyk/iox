// MP-NOTIF-3 phase 2a — tests page /unsubscribe.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// MP-NOTIF-3 phase 2c — mock global fetch pour les tests de confirm.
const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ success: true }),
  });
  (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
});

const searchParamsMock = new Map<string, string>();
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (k: string) => searchParamsMock.get(k) ?? null,
  }),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import UnsubscribePage from './page';

describe('UnsubscribePage (MP-NOTIF-3 phase 2a)', () => {
  it('affiche état "lien invalide" sans token', async () => {
    searchParamsMock.clear();
    render(<UnsubscribePage />);
    expect(await screen.findByText(/Lien de désinscription invalide/i)).toBeInTheDocument();
  });

  it('affiche le formulaire de confirmation avec un token valide et l\'email', async () => {
    searchParamsMock.clear();
    searchParamsMock.set('token', 'abcdefghij1234');
    searchParamsMock.set('email', 'buyer@ex.com');
    render(<UnsubscribePage />);
    expect(await screen.findByText(/buyer@ex.com/)).toBeInTheDocument();
    expect(screen.getByText('Me désinscrire')).toBeInTheDocument();
  });

  it('confirme la désinscription après clic et affiche état succès', async () => {
    searchParamsMock.clear();
    searchParamsMock.set('token', 'abcdefghij1234');
    searchParamsMock.set('email', 'buyer@ex.com');
    render(<UnsubscribePage />);
    const btn = await screen.findByText('Me désinscrire');
    fireEvent.click(btn);
    await waitFor(() =>
      expect(screen.getByText(/Désinscription confirmée/i)).toBeInTheDocument(),
    );
    expect(
      screen.getByText(/L'adresse buyer@ex\.com ne recevra plus/i),
    ).toBeInTheDocument();
  });

  it('lien Annuler renvoie vers la home', async () => {
    searchParamsMock.clear();
    searchParamsMock.set('token', 'abcdefghij1234');
    render(<UnsubscribePage />);
    const cancel = (await screen.findByText('Annuler')) as HTMLAnchorElement;
    expect(cancel.getAttribute('href')).toBe('/');
  });

  it('mention contact support dans le bloc invalide', async () => {
    searchParamsMock.clear();
    searchParamsMock.set('token', 'short');
    render(<UnsubscribePage />);
    expect(await screen.findByText(/support@iox\.example/)).toBeInTheDocument();
  });

  // MP-NOTIF-3 phase 2c — backend wired
  it('confirm appelle GET /api/v1/notif-email/unsubscribe avec token', async () => {
    searchParamsMock.clear();
    searchParamsMock.set('token', 'abcdefghij1234');
    render(<UnsubscribePage />);
    fireEvent.click(await screen.findByText('Me désinscrire'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toContain(
      '/api/v1/notif-email/unsubscribe?token=abcdefghij1234',
    );
  });

  it('400 backend → état invalid', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { code: 'BAD_REQUEST', message: 'jwt malformed' } }),
    });
    searchParamsMock.clear();
    searchParamsMock.set('token', 'abcdefghij1234');
    render(<UnsubscribePage />);
    fireEvent.click(await screen.findByText('Me désinscrire'));
    await waitFor(() =>
      expect(screen.getByText(/Lien de désinscription invalide/i)).toBeInTheDocument(),
    );
  });

  it('500 backend → état error avec message', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: { message: 'internal' } }),
    });
    searchParamsMock.clear();
    searchParamsMock.set('token', 'abcdefghij1234');
    render(<UnsubscribePage />);
    fireEvent.click(await screen.findByText('Me désinscrire'));
    await waitFor(() => expect(screen.getByText('internal')).toBeInTheDocument());
  });
});
