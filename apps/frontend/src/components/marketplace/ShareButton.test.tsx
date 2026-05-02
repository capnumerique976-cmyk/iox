import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareButton } from './ShareButton';

describe('ShareButton', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Remove navigator.share if present
    Object.defineProperty(navigator, 'share', { value: undefined, writable: true, configurable: true });
  });

  it('renders "Partager" text by default', () => {
    render(<ShareButton title="Vanille Bourbon" />);
    expect(screen.getByText('Partager')).toBeInTheDocument();
  });

  it('copies to clipboard and shows "Lien copié" feedback when navigator.share is unavailable', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    render(<ShareButton title="Vanille Bourbon" />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Lien copié')).toBeInTheDocument();
    });
    expect(writeTextMock).toHaveBeenCalled();
  });

  it('uses navigator.share when available', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      value: shareMock,
      writable: true,
      configurable: true,
    });

    render(<ShareButton title="Mon produit" />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(shareMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Mon produit' }),
      );
    });
  });

  it('falls back to clipboard when navigator.share throws', async () => {
    const shareMock = vi.fn().mockRejectedValue(new Error('user cancelled'));
    Object.defineProperty(navigator, 'share', {
      value: shareMock,
      writable: true,
      configurable: true,
    });
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    render(<ShareButton title="Ylang" />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalled();
    });
  });
});
