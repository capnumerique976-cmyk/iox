'use client';

// MP-CATEGORY-1 — Page admin gestion catégories marketplace.
//
// Tree view (parent → children) avec actions : créer, éditer, désactiver.
// Soft delete : si products attachés OU children, isActive=false (banner UI).

import { useCallback, useEffect, useState } from 'react';
import {
  ChevronRight,
  Edit3,
  FolderTree,
  Loader2,
  Plus,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { authStorage } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import {
  adminCategoriesApi,
  type CategoryNode,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from '@/lib/marketplace-categories';

type ModalState =
  | { kind: 'closed' }
  | { kind: 'create'; parentId: string | null }
  | { kind: 'edit'; node: CategoryNode };

export default function AdminMarketplaceCategoriesPage() {
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [modal, setModal] = useState<ModalState>({ kind: 'closed' });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = authStorage.getAccessToken() ?? '';
      const res = await adminCategoriesApi.listTree(includeInactive, token);
      setTree(res);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Erreur de chargement';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (node: CategoryNode) => {
    const msg =
      node.productsCount > 0 || node.children.length > 0
        ? `${node.nameFr} a ${node.productsCount} produit(s) et ${node.children.length} sous-catégorie(s) — sera désactivée. Confirmer ?`
        : `Supprimer définitivement "${node.nameFr}" ?`;
    if (!window.confirm(msg)) return;
    try {
      const token = authStorage.getAccessToken() ?? '';
      await adminCategoriesApi.remove(node.id, token);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur suppression');
    }
  };

  return (
    <div className="space-y-6 p-6" data-testid="admin-categories-page">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <FolderTree className="h-6 w-6" />
            Catégories marketplace
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Arborescence parent / enfants. Modifier libellés FR/EN, ordre d&apos;affichage,
            statut actif. Suppression intelligente (soft si products/children attachés).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal({ kind: 'create', parentId: null })}
          className="inline-flex items-center gap-1 rounded-md bg-premium-accent px-3 py-2 text-sm font-semibold text-white shadow-premium-sm hover:bg-premium-primary"
          data-testid="admin-categories-create"
        >
          <Plus className="h-4 w-4" />
          Ajouter une catégorie
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <label className="inline-flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            data-testid="admin-categories-include-inactive"
          />
          Afficher les catégories inactives
        </label>
      </div>

      {error && (
        <p
          role="alert"
          data-testid="admin-categories-error"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800"
        >
          <AlertCircle className="mr-1 inline h-3 w-3" />
          {error}
        </p>
      )}

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-gray-600" data-testid="admin-categories-loading">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement…
        </p>
      ) : tree.length === 0 ? (
        <p
          data-testid="admin-categories-empty"
          className="rounded-md border border-gray-200 bg-white p-6 text-center text-sm text-gray-500"
        >
          Aucune catégorie. Cliquez sur &quot;Ajouter une catégorie&quot; pour commencer.
        </p>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white" data-testid="admin-categories-tree">
          {tree.map((node) => (
            <CategoryRow
              key={node.id}
              node={node}
              depth={0}
              onCreateChild={(parentId) => setModal({ kind: 'create', parentId })}
              onEdit={(n) => setModal({ kind: 'edit', node: n })}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {modal.kind !== 'closed' && (
        <CategoryFormModal
          state={modal}
          onClose={() => setModal({ kind: 'closed' })}
          onSaved={async () => {
            setModal({ kind: 'closed' });
            await load();
          }}
        />
      )}
    </div>
  );
}

interface CategoryRowProps {
  node: CategoryNode;
  depth: number;
  onCreateChild: (parentId: string) => void;
  onEdit: (node: CategoryNode) => void;
  onDelete: (node: CategoryNode) => void;
}

function CategoryRow({ node, depth, onCreateChild, onEdit, onDelete }: CategoryRowProps) {
  return (
    <>
      <div
        className={`flex items-center gap-2 border-b border-gray-100 px-3 py-2 hover:bg-gray-50 ${
          !node.isActive ? 'opacity-50' : ''
        }`}
        style={{ paddingLeft: `${12 + depth * 24}px` }}
        data-testid={`admin-category-row-${node.slug}`}
      >
        <ChevronRight className={`h-3 w-3 text-gray-400 ${node.children.length === 0 ? 'invisible' : ''}`} />
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-gray-900">{node.nameFr}</span>
            <span className="text-xs text-gray-500">/ {node.nameEn ?? '—'}</span>
            <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500">
              {node.slug}
            </span>
            {!node.isActive && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                Inactif
              </span>
            )}
            <span className="text-[10px] text-gray-400">
              {node.productsCount} produit{node.productsCount > 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onCreateChild(node.id)}
          className="rounded p-1 text-gray-500 hover:bg-gray-200"
          title="Ajouter sous-catégorie"
          data-testid={`admin-category-${node.slug}-add-child`}
        >
          <Plus className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => onEdit(node)}
          className="rounded p-1 text-gray-500 hover:bg-gray-200"
          title="Modifier"
          data-testid={`admin-category-${node.slug}-edit`}
        >
          <Edit3 className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(node)}
          className="rounded p-1 text-red-500 hover:bg-red-50"
          title="Supprimer"
          data-testid={`admin-category-${node.slug}-delete`}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      {node.children.map((child) => (
        <CategoryRow
          key={child.id}
          node={child}
          depth={depth + 1}
          onCreateChild={onCreateChild}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}

interface FormModalProps {
  state: { kind: 'create'; parentId: string | null } | { kind: 'edit'; node: CategoryNode };
  onClose: () => void;
  onSaved: () => Promise<void>;
}

function CategoryFormModal({ state, onClose, onSaved }: FormModalProps) {
  const isEdit = state.kind === 'edit';
  const initial = isEdit ? state.node : null;

  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [nameFr, setNameFr] = useState(initial?.nameFr ?? '');
  const [nameEn, setNameEn] = useState(initial?.nameEn ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setBusy(true);
    setError(null);
    try {
      const token = authStorage.getAccessToken() ?? '';
      if (state.kind === 'create') {
        const input: CreateCategoryInput = {
          slug,
          nameFr,
          nameEn,
          ...(description ? { description } : {}),
          ...(state.parentId ? { parentId: state.parentId } : {}),
          sortOrder: parseInt(sortOrder, 10) || 0,
          isActive,
        };
        await adminCategoriesApi.create(input, token);
      } else {
        const input: UpdateCategoryInput = {
          nameFr,
          nameEn,
          description: description || undefined,
          sortOrder: parseInt(sortOrder, 10) || 0,
          isActive,
        };
        await adminCategoriesApi.update(state.node.id, input, token);
      }
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur sauvegarde');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      data-testid="admin-category-modal"
    >
      <div className="w-full max-w-md space-y-3 rounded-lg bg-white p-5 shadow-xl">
        <h2 className="text-lg font-semibold">
          {isEdit ? `Modifier ${initial?.nameFr}` : 'Nouvelle catégorie'}
        </h2>

        {error && (
          <p
            role="alert"
            data-testid="admin-category-modal-error"
            className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800"
          >
            {error}
          </p>
        )}

        {!isEdit && (
          <div>
            <label className="block text-xs font-medium text-gray-700">Slug *</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="epices"
              className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm font-mono"
              data-testid="admin-category-modal-slug"
            />
            <p className="mt-1 text-[10px] text-gray-500">lowercase + tirets uniquement</p>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-700">Nom FR *</label>
          <input
            type="text"
            value={nameFr}
            onChange={(e) => setNameFr(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm"
            data-testid="admin-category-modal-namefr"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700">Nom EN *</label>
          <input
            type="text"
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm"
            data-testid="admin-category-modal-nameen"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm"
            data-testid="admin-category-modal-desc"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700">Ordre tri</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              min="0"
              className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm"
              data-testid="admin-category-modal-sort"
            />
          </div>
          <label className="mt-5 inline-flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              data-testid="admin-category-modal-active"
            />
            Actif
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            data-testid="admin-category-modal-cancel"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy || !nameFr || !nameEn || (!isEdit && !slug)}
            className="inline-flex items-center gap-1 rounded-md bg-premium-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-premium-primary disabled:opacity-50"
            data-testid="admin-category-modal-save"
          >
            {busy && <Loader2 className="h-3 w-3 animate-spin" />}
            {isEdit ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}
