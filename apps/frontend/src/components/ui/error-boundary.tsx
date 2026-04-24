'use client';

/**
 * IOX UI — ErrorBoundary
 *
 * Filet de sécurité React pour éviter l'écran blanc en cas d'exception
 * dans un sous-arbre. Affiche un fallback standard avec option de reset
 * + rechargement complet.
 *
 * Usage :
 *   <ErrorBoundary>
 *     <DashboardShell />
 *   </ErrorBoundary>
 *
 * Principes :
 * - N'attrape PAS les erreurs asynchrones (fetch, promises non awaited).
 *   Pour celles-là, on utilise <ErrorState> après un catch explicite.
 * - Log en console avec l'URL courante et un timestamp ISO pour faciliter
 *   la corrélation avec les logs backend (via requestId côté API).
 */
import * as React from 'react';
import { AlertOctagon, RefreshCw, Home } from 'lucide-react';
import { Button } from './button';

interface Props {
  children: React.ReactNode;
  /** Fallback custom. Si absent, affiche le fallback standard IOX. */
  fallback?: React.ReactNode;
  /** Callback pour envoyer l'erreur à un observability pipeline. */
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error(
      '[ErrorBoundary]',
      new Date().toISOString(),
      typeof window !== 'undefined' ? window.location.pathname : '(ssr)',
      error,
      info.componentStack,
    );
    this.props.onError?.(error, info);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-lg w-full rounded-xl border border-red-200 bg-white shadow-sm p-8 text-center">
            <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <AlertOctagon className="h-6 w-6" aria-hidden />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Cette section a rencontré une erreur
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Le reste de la plateforme reste accessible. Vous pouvez réessayer d&apos;afficher
              cette page, recharger complètement l&apos;application, ou retourner au tableau de
              bord.
            </p>
            <details className="mb-4 text-left text-xs text-gray-500 bg-gray-50 rounded border border-gray-200 p-3">
              <summary className="cursor-pointer font-medium text-gray-700">
                Détails techniques
              </summary>
              <pre className="mt-2 whitespace-pre-wrap break-all font-mono">
                {this.state.error.message}
              </pre>
            </details>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button variant="primary" size="sm" onClick={this.handleReset}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Réessayer
              </Button>
              <Button variant="outline" size="sm" onClick={this.handleReload}>
                Recharger la page
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <a href="/dashboard">
                  <Home className="h-3.5 w-3.5 mr-1.5" />
                  Tableau de bord
                </a>
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
