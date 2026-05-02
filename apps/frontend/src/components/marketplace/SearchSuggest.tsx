'use client';

// SEARCH-FULLTEXT — Composant d'autocomplétion pour le catalogue marketplace.
// Appelle GET /marketplace/catalog/suggest?q=... avec debounce 300ms.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Package, Store } from 'lucide-react';

interface SuggestItem {
  type: 'product' | 'seller';
  id: string;
  slug: string;
  label: string;
}

function resolveApiBase(): string {
  const publicOverride = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
  if (publicOverride) return publicOverride;
  return '/api/v1';
}

export function SearchSuggest({ className }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SuggestItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (term: string) => {
    if (term.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const base = resolveApiBase();
      const res = await fetch(`${base}/marketplace/catalog/suggest?q=${encodeURIComponent(term)}`);
      if (res.ok) {
        const body = await res.json();
        const data: SuggestItem[] = body?.data ?? body ?? [];
        setResults(data);
        setOpen(data.length > 0);
      }
    } catch {
      // Silently ignore suggest errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, fetchSuggestions]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const navigate = (item: SuggestItem) => {
    setOpen(false);
    setQuery('');
    if (item.type === 'product') {
      router.push(`/marketplace/products/${item.slug}`);
    } else {
      router.push(`/marketplace/sellers/${item.slug}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setOpen(false);
      router.push(`/marketplace?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      <form onSubmit={handleSubmit} className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Rechercher un produit, un vendeur..."
          className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
        )}
      </form>

      {open && results.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden"
        >
          {results.map((item) => (
            <li key={`${item.type}-${item.id}`}>
              <button
                type="button"
                onClick={() => navigate(item)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors"
              >
                {item.type === 'product' ? (
                  <Package className="h-4 w-4 text-blue-500 flex-shrink-0" />
                ) : (
                  <Store className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-500">
                    {item.type === 'product' ? 'Produit' : 'Vendeur'}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
