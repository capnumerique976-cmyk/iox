// MP-CATEGORY-1 — Tests page admin catégories.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const listTreeMock = vi.fn();
const createMock = vi.fn();
const updateMock = vi.fn();
const removeMock = vi.fn();

vi.mock('@/lib/marketplace-categories', async () => {
  const actual = await vi.importActual<typeof import('@/lib/marketplace-categories')>(
    '@/lib/marketplace-categories',
  );
  return {
    ...actual,
    adminCategoriesApi: {
      listTree: (...args: unknown[]) => listTreeMock(...args),
      create: (...args: unknown[]) => createMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
      remove: (...args: unknown[]) => removeMock(...args),
    },
  };
});

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth');
  return {
    ...actual,
    authStorage: { ...actual.authStorage, getAccessToken: () => 'tok' },
  };
});

import AdminCategoriesPage from './page';

const sampleTree = [
  {
    id: 'root1',
    slug: 'epices',
    nameFr: 'Épices',
    nameEn: 'Spices',
    description: null,
    parentId: null,
    sortOrder: 0,
    isActive: true,
    productsCount: 5,
    children: [
      {
        id: 'child1',
        slug: 'vanille',
        nameFr: 'Vanille',
        nameEn: 'Vanilla',
        description: null,
        parentId: 'root1',
        sortOrder: 0,
        isActive: true,
        productsCount: 3,
        children: [],
        createdAt: '2026-04-30T08:00:00Z',
        updatedAt: '2026-04-30T08:00:00Z',
      },
    ],
    createdAt: '2026-04-30T08:00:00Z',
    updatedAt: '2026-04-30T08:00:00Z',
  },
];

describe('AdminCategoriesPage (MP-CATEGORY-1)', () => {
  beforeEach(() => {
    listTreeMock.mockReset();
    createMock.mockReset();
    updateMock.mockReset();
    removeMock.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  it('rend tree avec parent + child', async () => {
    listTreeMock.mockResolvedValue(sampleTree);
    render(<AdminCategoriesPage />);
    await waitFor(() => {
      expect(screen.getByTestId('admin-categories-tree')).toBeInTheDocument();
      expect(screen.getByTestId('admin-category-row-epices')).toBeInTheDocument();
      expect(screen.getByTestId('admin-category-row-vanille')).toBeInTheDocument();
    });
  });

  it('empty state si tree vide', async () => {
    listTreeMock.mockResolvedValue([]);
    render(<AdminCategoriesPage />);
    await waitFor(() => {
      expect(screen.getByTestId('admin-categories-empty')).toBeInTheDocument();
    });
  });

  it('toggle includeInactive → re-call API avec true', async () => {
    listTreeMock.mockResolvedValue([]);
    const user = userEvent.setup();
    render(<AdminCategoriesPage />);
    await waitFor(() => expect(listTreeMock).toHaveBeenCalled());
    await user.click(screen.getByTestId('admin-categories-include-inactive'));
    await waitFor(() => {
      const lastCall = listTreeMock.mock.calls.at(-1);
      expect(lastCall?.[0]).toBe(true);
    });
  });

  it('click "Ajouter" → ouvre modal create', async () => {
    listTreeMock.mockResolvedValue([]);
    const user = userEvent.setup();
    render(<AdminCategoriesPage />);
    await waitFor(() => expect(screen.getByTestId('admin-categories-create')).toBeInTheDocument());
    await user.click(screen.getByTestId('admin-categories-create'));
    expect(screen.getByTestId('admin-category-modal')).toBeInTheDocument();
    expect(screen.getByTestId('admin-category-modal-slug')).toBeInTheDocument();
  });

  it('click edit → ouvre modal edit (slug masqué)', async () => {
    listTreeMock.mockResolvedValue(sampleTree);
    const user = userEvent.setup();
    render(<AdminCategoriesPage />);
    await waitFor(() => expect(screen.getByTestId('admin-category-epices-edit')).toBeInTheDocument());
    await user.click(screen.getByTestId('admin-category-epices-edit'));
    expect(screen.getByTestId('admin-category-modal')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-category-modal-slug')).not.toBeInTheDocument();
  });

  it('create flow : remplit form + submit → API call', async () => {
    listTreeMock.mockResolvedValue([]);
    createMock.mockResolvedValue({ id: 'new1', slug: 'new', nameFr: 'New', nameEn: 'New' });
    const user = userEvent.setup();
    render(<AdminCategoriesPage />);
    await waitFor(() => expect(screen.getByTestId('admin-categories-create')).toBeInTheDocument());

    await user.click(screen.getByTestId('admin-categories-create'));
    await user.type(screen.getByTestId('admin-category-modal-slug'), 'epices');
    await user.type(screen.getByTestId('admin-category-modal-namefr'), 'Épices');
    await user.type(screen.getByTestId('admin-category-modal-nameen'), 'Spices');
    await user.click(screen.getByTestId('admin-category-modal-save'));

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'epices',
          nameFr: 'Épices',
          nameEn: 'Spices',
        }),
        'tok',
      );
    });
  });
});
