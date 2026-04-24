'use client';

/**
 * IOX UI — ErrorState
 *
 * Bloc d'erreur standard pour les chargements de données.
 * Affiche titre, message, requestId cliquable (pour copier),
 * et un bouton de retry optionnel.
 *
 * Utilisé en complément de <EmptyState> : EmptyState = "pas de données",
 * ErrorState = "une erreur est survenue".
 */
import * as React from 'react';
import { AlertTriangle, RefreshCw, Copy, Check } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  message?: string;
  /** Request ID pour corrélation support / logs. */
  requestId?: string;
  /** Code fonctionnel retourné par l'API (ex: FORBIDDEN, NOT_FOUND). */
  code?: string;
  /** Si fourni, affiche un bouton "Réessayer". */
  onRetry?: () => void;
  /** Variante compacte : utile dans les panneaux latéraux. */
  compact?: boolean;
}

export function ErrorState({
  title = 'Chargement interrompu',
  message = 'Les données n\u2019ont pas pu être récupérées. Réessayez ; si le problème persiste, signalez-le avec la référence ci-dessous.',
  requestId,
  code,
  onRetry,
  compact = false,
  className,
  ...props
}: ErrorStateProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = React.useCallback(() => {
    if (!requestId) return;
    void navigator.clipboard?.writeText(requestId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, [requestId]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'flex flex-col items-center justify-center text-center rounded-lg border border-red-200 bg-red-50',
        compact ? 'py-6 px-4 gap-2' : 'py-10 px-6 gap-3',
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-red-100 text-red-600',
          compact ? 'h-9 w-9' : 'h-12 w-12',
        )}
        aria-hidden
      >
        <AlertTriangle className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
      </div>
      <h3 className={cn('font-semibold text-red-900', compact ? 'text-sm' : 'text-base')}>
        {title}
      </h3>
      <p className={cn('max-w-md text-red-800', compact ? 'text-xs' : 'text-sm')}>{message}</p>
      {(code || requestId) && (
        <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono text-red-700">
          {code ? (
            <span className="px-2 py-0.5 rounded bg-red-100 border border-red-200">{code}</span>
          ) : null}
          {requestId ? (
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-red-200 hover:bg-red-100 transition-colors"
              title="Copier le Request ID pour le support"
            >
              <span className="text-red-700">#{requestId.slice(0, 8)}</span>
              {copied ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Copy className="h-3 w-3 text-red-500" />
              )}
            </button>
          ) : null}
        </div>
      )}
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Réessayer
        </Button>
      ) : null}
    </div>
  );
}
