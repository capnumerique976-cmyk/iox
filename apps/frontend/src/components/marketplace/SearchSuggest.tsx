'use client';

// SEARCH-FULLTEXT — Composant d'autocomplétion pour le catalogue marketplace.
// Appelle GET /marketplace/catalog/suggest?q=... avec debounce 300ms.
// Supporte produits, vendeurs et catégories.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Package, Store, FolderTree } from 'lucide-react';

interface SuggestItem {
  type: 'product' | 'seller' | 'category';
  id: string;
  slug: string;
  label: string;
}

const ICON_MAP = {
  product: { icon: Package, color: 'text-[#00D4FF]', label: 'Produit' },
  seller: { icon: Store, color: 'text-[#00F5A0]', label: 'Vendeur' },
  category: { icon: FolderTree, color: 'text-[#7B61FF]', label: 'Catégorie' },
} as const;

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
  const [activeIndex, setActiveIndex] = useState(-1);
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
        setActiveIndex(-1);
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
    switch (item.type) {
      case 'product':
        router.push(`/marketplace/products/${item.slug}`);
        break;
      case 'seller':
        router.push(`/marketplace/sellers/${item.slug}`);
        break;
      case 'category':
        router.push(`/marketplace?categorySlug=${item.slug}`);
        break;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeIndex >= 0 && results[activeIndex]) {
      navigate(results[activeIndex]);
      return;
    }
    if (query.trim()) {
      setOpen(false);
      router.push(`/marketplace?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case 'Escape':
        setOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      <form onSubmit={handleSubmit} className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Rechercher un produit, un vendeur, une catégorie..."
          className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/40 backdrop-blur-sm focus:border-[#00D4FF]/50 focus:outline-none focus:ring-1 focus:ring-[#00D4FF]/30 transition-colors"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-activedescendant={activeIndex >= 0 ? `suggest-item-${activeIndex}` : undefined}
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-[#00D4FF]" />
        )}
      </form>

      {open && results.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1.5 w-full rounded-xl border border-white/15 bg-[#12161F]/95 shadow-2xl backdrop-blur-lg overflow-hidden"
        >
          {results.map((item, i) => {
            const { icon: Icon, color, label } = ICON_MAP[item.type];
            return (
              <li key={`${item.type}-${item.id}`} id={`suggest-item-${i}`} role="option" aria-selected={i === activeIndex}>
                <button
                  type="button"
                  onClick={() => navigate(item)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                    i === activeIndex
                      ? 'bg-[#00D4FF]/10 text-white'
                      : 'text-white/80 hover:bg-white/5'
                  }`}
                >
                  <Icon className={`h-4 w-4 flex-shrink-0 ${color}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.label}</p>
                    <p className="text-xs text-white/40">{label}</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
