// MP-CATEGORY-2 — Tests page publique catégories marketplace.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import path from 'path';
import fs from 'fs';

// Mock next-intl/server with real fr.json.
const frMessages = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../../../messages/fr.json'), 'utf-8'),
);

function resolveKey(obj: Record<string, unknown>, keyPath: string): string {
  const parts = keyPath.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return keyPath;
    }
  }
  if (typeof current !== 'string') return keyPath;
  return current;
}

function makeTFunc(namespace: string) {
  const t = (key: string, vars?: Record<string, unknown>) => {
    const raw = resolveKey(frMessages, `${namespace}.${key}`);
    if (!vars) return raw;
    // Simple ICU plural substitution for tests.
    let result = raw;
    for (const [k, v] of Object.entries(vars)) {
      result = result.replace(`{${k}}`, String(v));
    }
    // Handle plural: "{count, plural, =0 {X} one {Y} other {Z}}"
    const pluralMatch = result.match(/\{(\w+),\s*plural,\s*(.*)\}/s);
    if (pluralMatch) {
      const count = Number(vars[pluralMatch[1]] ?? 0);
      const body = pluralMatch[2];
      const exact = body.match(new RegExp(`=${count}\\s*\\{([^}]*)\\}`));
      if (exact) return exact[1].replace('#', String(count));
      if (count === 1) {
        const oneMatch = body.match(/one\s*\{([^}]*)\}/);
        if (oneMatch) return oneMatch[1].replace('#', String(count));
      }
      const otherMatch = body.match(/other\s*\{([^}]*)\}/);
      if (otherMatch) return otherMatch[1].replace('#', String(count));
    }
    return result;
  };
  return t;
}

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn((namespace: string) => Promise.resolve(makeTFunc(namespace))),
}));

const fetchTreeMock = vi.fn();
vi.mock('@/lib/marketplace/api', () => ({
  fetchCategoriesTree: (...args: unknown[]) => fetchTreeMock(...args),
}));

import CategoriesPage from './page';

const sampleTree = [
  {
    id: 'r1',
    parentId: null,
    nameFr: 'Épices',
    nameEn: 'Spices',
    slug: 'epices',
    description: 'Épices de Mayotte',
    sortOrder: 0,
    productsCount: 5,
    children: [
      {
        id: 'c1',
        parentId: 'r1',
        nameFr: 'Vanille',
        nameEn: 'Vanilla',
        slug: 'vanille',
        description: null,
        sortOrder: 0,
        productsCount: 3,
        children: [],
      },
    ],
  },
  {
    id: 'r2',
    parentId: null,
    nameFr: 'Fruits',
    nameEn: 'Fruits',
    slug: 'fruits',
    description: null,
    sortOrder: 1,
    productsCount: 0,
    children: [],
  },
];

describe('CategoriesPage (MP-CATEGORY-2)', () => {
  beforeEach(() => {
    fetchTreeMock.mockReset();
  });

  it('rend la grille avec catégories parent + sous-catégories', async () => {
    fetchTreeMock.mockResolvedValue(sampleTree);
    const page = await CategoriesPage();
    render(page);
    expect(screen.getByTestId('categories-grid')).toBeInTheDocument();
    expect(screen.getByTestId('category-card-epices')).toBeInTheDocument();
    expect(screen.getByTestId('category-card-fruits')).toBeInTheDocument();
    expect(screen.getByText('Vanille')).toBeInTheDocument();
  });

  it('affiche empty state si arbre vide', async () => {
    fetchTreeMock.mockResolvedValue([]);
    const page = await CategoriesPage();
    render(page);
    expect(screen.getByTestId('categories-empty')).toBeInTheDocument();
  });

  it('affiche erreur si fetch échoue', async () => {
    fetchTreeMock.mockRejectedValue(new Error('Network error'));
    const page = await CategoriesPage();
    render(page);
    // Should show error state
    expect(screen.getByText(/erreur/i)).toBeInTheDocument();
  });
});
