'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Favoris marketplace — stockage client-only (localStorage).
 *
 * Pas de persistence serveur : le but est d'offrir au visiteur anonyme
 * ou connecté un rappel local des produits qui l'intéressent, sans
 * dépendance backend. Si demain on veut les lier au compte buyer, on
 * migrera vers une table avec export de cette clé comme seed.
 */

const STORAGE_KEY = 'iox:marketplace:favorites:v1';

export interface FavoriteItem {
  productSlug: string;
  commercialName: string;
  addedAt: string;
}

function readFavorites(): FavoriteItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is FavoriteItem =>
        x && typeof x.productSlug === 'string' && typeof x.commercialName === 'string',
    );
  } catch {
    return [];
  }
}

function writeFavorites(list: FavoriteItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('iox:favorites:changed'));
  } catch {
    /* quota ou private mode : on n'échoue pas l'UI */
  }
}

export function useFavorites() {
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(readFavorites());
    setHydrated(true);
    const refresh = () => setItems(readFavorites());
    window.addEventListener('iox:favorites:changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('iox:favorites:changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const has = useCallback(
    (productSlug: string) => items.some((f) => f.productSlug === productSlug),
    [items],
  );

  const toggle = useCallback((entry: Omit<FavoriteItem, 'addedAt'>) => {
    const current = readFavorites();
    const exists = current.some((f) => f.productSlug === entry.productSlug);
    const next = exists
      ? current.filter((f) => f.productSlug !== entry.productSlug)
      : [...current, { ...entry, addedAt: new Date().toISOString() }];
    writeFavorites(next);
    setItems(next);
    return !exists;
  }, []);

  const remove = useCallback((productSlug: string) => {
    const next = readFavorites().filter((f) => f.productSlug !== productSlug);
    writeFavorites(next);
    setItems(next);
  }, []);

  return { items, has, toggle, remove, hydrated, count: items.length };
}
