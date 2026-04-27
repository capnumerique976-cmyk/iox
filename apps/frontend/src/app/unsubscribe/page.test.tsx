// MP-NOTIF-3 phase 2a — tests page /unsubscribe.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

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
});
