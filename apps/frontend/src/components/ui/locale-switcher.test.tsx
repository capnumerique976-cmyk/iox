// I18N-1 phase 1 — tests LocaleSwitcher.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const useLocaleMock = vi.fn();
const useTranslationsMock = vi.fn((_namespace?: string) => (key: string) => key);
const refreshMock = vi.fn();

vi.mock('next-intl', () => ({
  useLocale: () => useLocaleMock(),
  useTranslations: (namespace?: string) => useTranslationsMock(namespace),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

import { LocaleSwitcher } from './locale-switcher';

describe('LocaleSwitcher (I18N-1 phase 1)', () => {
  beforeEach(() => {
    useLocaleMock.mockReset();
    refreshMock.mockReset();
    document.cookie = '';
  });

  it('rend les boutons FR + EN avec FR actif par défaut', () => {
    useLocaleMock.mockReturnValue('fr');
    render(<LocaleSwitcher />);
    const fr = screen.getByTestId('locale-switch-fr');
    const en = screen.getByTestId('locale-switch-en');
    expect(fr).toHaveAttribute('aria-pressed', 'true');
    expect(en).toHaveAttribute('aria-pressed', 'false');
  });

  it('clic sur EN set cookie + appelle router.refresh', () => {
    useLocaleMock.mockReturnValue('fr');
    render(<LocaleSwitcher />);
    fireEvent.click(screen.getByTestId('locale-switch-en'));
    expect(document.cookie).toContain('NEXT_LOCALE=en');
    expect(refreshMock).toHaveBeenCalled();
  });

  it("clic sur la locale active n'a aucun effet", () => {
    useLocaleMock.mockReturnValue('fr');
    render(<LocaleSwitcher />);
    fireEvent.click(screen.getByTestId('locale-switch-fr'));
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
