/**
 * Tests ConfirmDialog (Lot 9 — L9-2).
 *
 * Couvre :
 *  1. Mode simple : confirmer renvoie true.
 *  2. Mode simple : annuler renvoie false.
 *  3. Mode requireReason : bouton confirmer disabled tant que minLength
 *     n'est pas atteint.
 *  4. Mode requireReason : confirmer renvoie { reason } trim.
 *  5. Mode requireReason : annuler renvoie null.
 *  6. Hook hors provider → throw explicite.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import * as React from 'react';
import { ConfirmDialogProvider, useConfirm, type ConfirmFn } from './confirm-dialog';

function Harness({
  onResult,
  trigger,
}: {
  onResult: (v: unknown) => void;
  trigger: (confirm: ConfirmFn) => Promise<unknown>;
}) {
  const confirm = useConfirm();
  return (
    <button
      type="button"
      onClick={async () => {
        const r = await trigger(confirm);
        onResult(r);
      }}
    >
      open
    </button>
  );
}

function setup(trigger: (confirm: ConfirmFn) => Promise<unknown>) {
  const result: { value: unknown } = { value: 'pending' };
  render(
    <ConfirmDialogProvider>
      <Harness trigger={trigger} onResult={(v) => (result.value = v)} />
    </ConfirmDialogProvider>,
  );
  return result;
}

describe('ConfirmDialog (L9-2)', () => {
  it('mode simple : confirmer renvoie true', async () => {
    const result = setup((confirm) =>
      confirm({ title: 'Supprimer ?', description: 'Action irréversible.' }),
    );
    fireEvent.click(screen.getByText('open'));
    expect(await screen.findByText('Supprimer ?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer' }));
    await waitFor(() => expect(result.value).toBe(true));
  });

  it('mode simple : annuler renvoie false', async () => {
    const result = setup((confirm) =>
      confirm({ title: 'Supprimer ?', description: 'Action irréversible.' }),
    );
    fireEvent.click(screen.getByText('open'));
    await screen.findByText('Supprimer ?');
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    await waitFor(() => expect(result.value).toBe(false));
  });

  it('mode requireReason : bouton disabled tant que minLength non atteint', async () => {
    setup((confirm) =>
      confirm({
        title: 'Rejeter',
        description: 'desc',
        confirmLabel: 'Rejeter',
        requireReason: { label: 'Motif', minLength: 10 },
      }),
    );
    fireEvent.click(screen.getByText('open'));
    await screen.findByText('Rejeter', { selector: 'h2, [id]' }).catch(() => null);
    const confirmBtn = screen.getByRole('button', { name: 'Rejeter' });
    expect(confirmBtn).toBeDisabled();
    const ta = screen.getByRole('textbox');
    fireEvent.change(ta, { target: { value: 'court' } });
    expect(confirmBtn).toBeDisabled();
    fireEvent.change(ta, { target: { value: 'motif assez long' } });
    expect(confirmBtn).not.toBeDisabled();
  });

  it('mode requireReason : confirmer renvoie { reason } trim', async () => {
    const result = setup((confirm) =>
      confirm({
        title: 'Rejeter',
        description: 'desc',
        confirmLabel: 'Rejeter',
        requireReason: { label: 'Motif', minLength: 5 },
      }),
    );
    fireEvent.click(screen.getByText('open'));
    await screen.findByRole('textbox');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  documents incomplets  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rejeter' }));
    await waitFor(() => expect(result.value).toEqual({ reason: 'documents incomplets' }));
  });

  it('mode requireReason : annuler renvoie null', async () => {
    const result = setup((confirm) =>
      confirm({
        title: 'Rejeter',
        description: 'desc',
        confirmLabel: 'Rejeter',
        requireReason: { label: 'Motif', minLength: 5 },
      }),
    );
    fireEvent.click(screen.getByText('open'));
    await screen.findByRole('textbox');
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    await waitFor(() => expect(result.value).toBeNull());
  });

  it('useConfirm hors provider → throw', () => {
    function Bad() {
      useConfirm();
      return null;
    }
    // React loggue l'erreur sur console.error : on le silence pour ce test.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let err: unknown = null;
    try {
      act(() => {
        render(<Bad />);
      });
    } catch (e) {
      err = e;
    }
    spy.mockRestore();
    expect(String(err)).toMatch(/ConfirmDialogProvider/);
  });
});
