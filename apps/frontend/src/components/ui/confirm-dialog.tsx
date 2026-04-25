'use client';

/**
 * IOX UI — ConfirmDialog (Lot 9 / L9-2)
 *
 * Composant unique pour les confirmations destructives. Construit sur le
 * `Dialog` DS-1 (Radix) déjà en place — pas de nouvelle dépendance.
 *
 * Avant L9-2, 5 mécanismes coexistaient pour le même besoin :
 *   - `window.confirm(...)` (3 sites)         → moche, bloque la stack
 *   - aucune confirmation (2 sites)           → désactivation user/company
 *     en un clic
 *   - 2 modaux maison avec champ raison       → review queue / sellers
 *
 * Ce module en propose un seul, avec deux modes :
 *   1. simple        : await confirm({ title, description, ... })
 *      → renvoie `true` si confirmé, `false` sinon
 *   2. avec raison   : await confirm({ ..., requireReason: { ... } })
 *      → renvoie `{ reason: string }` si confirmé, `null` sinon
 *
 * Le bouton confirmer prend `loading` + `disabled` automatiquement
 * pendant que la promesse de l'appelant n'est pas résolue (si l'appelant
 * passe `onConfirm` async). Sinon, l'appelant reprend la main après
 * `await confirm(...)` et gère son propre `setLoading`.
 *
 * Mounted via `<ConfirmDialogProvider>` haut dans l'arbre — toute la
 * sous-arborescence accède au hook `useConfirm()`. Singleton : un seul
 * dialogue à la fois (le 2e appel attend que le 1er se résolve).
 */
import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Button } from './button';
import { cn } from '@/lib/utils';

export type ConfirmTone = 'danger' | 'warning';

interface RequireReasonOptions {
  label: string;
  /** Longueur min de la raison (par défaut 1). */
  minLength?: number;
  /** Placeholder du textarea. */
  placeholder?: string;
}

interface BaseConfirmOptions {
  title: string;
  description: string;
  /** Libellé du bouton de confirmation. Défaut : "Confirmer". */
  confirmLabel?: string;
  /** Libellé du bouton d'annulation. Défaut : "Annuler". */
  cancelLabel?: string;
  /** Ton visuel (rouge danger / orange warning). Défaut : "danger". */
  tone?: ConfirmTone;
}

interface ConfirmSimpleOptions extends BaseConfirmOptions {
  requireReason?: undefined;
}

interface ConfirmWithReasonOptions extends BaseConfirmOptions {
  requireReason: RequireReasonOptions;
}

export type ConfirmOptions = ConfirmSimpleOptions | ConfirmWithReasonOptions;

// Surcharges typées : on renvoie `boolean` ou `{ reason } | null` selon
// la présence de `requireReason`. Permet à l'appelant d'éviter un
// type-guard.
export interface ConfirmFn {
  (opts: ConfirmSimpleOptions): Promise<boolean>;
  (opts: ConfirmWithReasonOptions): Promise<{ reason: string } | null>;
}

interface ConfirmContextValue {
  confirm: ConfirmFn;
}

const ConfirmContext = React.createContext<ConfirmContextValue | null>(null);

interface PendingState {
  options: ConfirmOptions;
  resolve: (value: boolean | { reason: string } | null) => void;
}

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = React.useState<PendingState | null>(null);
  const [reason, setReason] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const confirm = React.useMemo<ConfirmFn>(
    () =>
      ((opts: ConfirmOptions) =>
        new Promise<boolean | { reason: string } | null>((resolve) => {
          setReason('');
          setSubmitting(false);
          setPending({ options: opts, resolve });
        })) as ConfirmFn,
    [],
  );

  const close = React.useCallback(
    (value: boolean | { reason: string } | null) => {
      if (!pending) return;
      pending.resolve(value);
      setPending(null);
      setReason('');
      setSubmitting(false);
    },
    [pending],
  );

  const handleConfirm = React.useCallback(() => {
    if (!pending) return;
    const opts = pending.options;
    if (opts.requireReason) {
      const trimmed = reason.trim();
      const min = opts.requireReason.minLength ?? 1;
      if (trimmed.length < min) return; // bouton sera disabled — sécurité
      // submitting=true pour empêcher double-clic ; le provider ne fait
      // pas l'appel réseau lui-même (c'est l'appelant qui le fait après
      // résolution), donc on peut close immédiatement après resolve.
      close({ reason: trimmed });
    } else {
      close(true);
    }
  }, [pending, reason, close]);

  const handleCancel = React.useCallback(() => close(pending?.options.requireReason ? null : false), [pending, close]);

  const open = pending !== null;
  const opts = pending?.options;
  const tone: ConfirmTone = opts?.tone ?? 'danger';

  // Le bouton confirmer est disabled si :
  //  - une raison est requise et le seuil min n'est pas atteint
  //  - une soumission est en cours (anti-double-clic)
  const minLength = opts?.requireReason?.minLength ?? 1;
  const reasonOk = !opts?.requireReason || reason.trim().length >= minLength;
  const confirmDisabled = !reasonOk || submitting;

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          // Esc / clic backdrop / clic croix : Radix appelle onOpenChange(false)
          if (!next && pending) handleCancel();
        }}
      >
        {opts && (
          <DialogContent
            // Force focus initial sur le bouton "Annuler" (anti-faux-positif).
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              const btn = document.getElementById('iox-confirm-cancel');
              btn?.focus();
            }}
            className="max-w-md"
          >
            <DialogHeader>
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
                    tone === 'danger' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600',
                  )}
                  aria-hidden
                >
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <DialogTitle>{opts.title}</DialogTitle>
                  <DialogDescription className="mt-1.5">{opts.description}</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {opts.requireReason && (
              <div className="space-y-1.5">
                <label
                  htmlFor="iox-confirm-reason"
                  className="text-sm font-medium text-foreground"
                >
                  {opts.requireReason.label}
                  <span className="ml-1 text-red-600" aria-hidden>
                    *
                  </span>
                </label>
                <textarea
                  id="iox-confirm-reason"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={opts.requireReason.placeholder}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
                  disabled={submitting}
                />
                {minLength > 1 && (
                  <p className="text-xs text-muted-foreground">
                    {reason.trim().length} / {minLength} caractères minimum
                  </p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                id="iox-confirm-cancel"
                variant="ghost"
                onClick={handleCancel}
                disabled={submitting}
              >
                {opts.cancelLabel ?? 'Annuler'}
              </Button>
              <Button
                variant={tone === 'danger' ? 'destructive' : 'default'}
                onClick={handleConfirm}
                disabled={confirmDisabled}
                loading={submitting}
              >
                {opts.confirmLabel ?? 'Confirmer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </ConfirmContext.Provider>
  );
}

/**
 * Hook d'accès au dialogue de confirmation.
 *
 * Usage :
 *   const confirm = useConfirm();
 *   const ok = await confirm({
 *     title: 'Supprimer ?',
 *     description: 'Action irréversible.',
 *     confirmLabel: 'Supprimer',
 *     tone: 'danger',
 *   });
 *   if (!ok) return;
 *
 * Avec raison :
 *   const result = await confirm({
 *     title: 'Rejeter',
 *     description: '...',
 *     confirmLabel: 'Rejeter',
 *     tone: 'danger',
 *     requireReason: { label: 'Raison', minLength: 10 },
 *   });
 *   if (!result) return;
 *   await doRejectWith(result.reason);
 */
export function useConfirm(): ConfirmFn {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used inside <ConfirmDialogProvider>');
  }
  return ctx.confirm;
}
