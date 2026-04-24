'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth.context';
import { authStorage, ROLE_LABELS } from '@/lib/auth';
import { UserRole } from '@iox/shared';
import { Plus, Search, Edit2, X, AlertCircle, ShieldCheck, UserX, UserCheck } from 'lucide-react';
import { PaginationControls } from '@/components/ui/pagination-controls';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

const ROLE_CLS: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  COORDINATOR: 'bg-blue-100 text-blue-700',
  MARKET_VALIDATOR: 'bg-green-100 text-green-700',
  QUALITY_MANAGER: 'bg-yellow-100 text-yellow-700',
  SUPPLY_MANAGER: 'bg-orange-100 text-orange-700',
  LOGISTICS_MANAGER: 'bg-cyan-100 text-cyan-700',
  BENEFICIARY_MANAGER: 'bg-pink-100 text-pink-700',
  COMMERCIAL_MANAGER: 'bg-teal-100 text-teal-700',
  AUDITOR: 'bg-indigo-100 text-indigo-700',
  BENEFICIARY: 'bg-gray-100 text-gray-600',
  FUNDER: 'bg-lime-100 text-lime-700',
};

const ALL_ROLES = Object.values(UserRole);

/* ── Modal Créer ─────────────────────────────────────────────────────── */
function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: UserRole.COORDINATOR,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((p) => ({ ...p, [k]: e.target.value }));
    setErrors((p) => ({ ...p, [k]: '' }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = 'Requis';
    if (!form.lastName.trim()) errs.lastName = 'Requis';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = 'Email invalide';
    if (form.password.length < 8) errs.password = '8 caractères minimum';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setGlobalError(null);
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch('/api/v1/users', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message);
      }
      onCreated();
      onClose();
    } catch (err) {
      setGlobalError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Nouvel utilisateur</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prénom *" error={errors.firstName}>
              <input
                type="text"
                value={form.firstName}
                onChange={set('firstName')}
                placeholder="Ahmed"
                className={inputCls(!!errors.firstName)}
              />
            </Field>
            <Field label="Nom *" error={errors.lastName}>
              <input
                type="text"
                value={form.lastName}
                onChange={set('lastName')}
                placeholder="Martin"
                className={inputCls(!!errors.lastName)}
              />
            </Field>
          </div>
          <Field label="Email *" error={errors.email}>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="prenom.nom@mch.yt"
              className={inputCls(!!errors.email)}
            />
          </Field>
          <Field label="Mot de passe initial *" error={errors.password}>
            <input
              type="password"
              value={form.password}
              onChange={set('password')}
              placeholder="8 caractères minimum"
              className={inputCls(!!errors.password)}
            />
          </Field>
          <Field label="Rôle *">
            <select value={form.role} onChange={set('role')} className={inputCls(false)}>
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r] ?? r}
                </option>
              ))}
            </select>
          </Field>
          {globalError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{globalError}</p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-gradient-iox-primary px-4 py-2 text-sm font-medium text-white hover:shadow-premium-md disabled:opacity-50"
            >
              {loading ? 'Création…' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Modal Modifier ──────────────────────────────────────────────────── */
function EditUserModal({
  u,
  onClose,
  onSaved,
}: {
  u: User;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role,
    password: '',
  });
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setGlobalError(null);
    try {
      const token = authStorage.getAccessToken();
      const payload: Record<string, string> = {
        firstName: form.firstName,
        lastName: form.lastName,
        role: form.role,
      };
      if (form.password.trim()) payload.password = form.password;

      const res = await fetch(`/api/v1/users/${u.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message);
      }
      onSaved();
      onClose();
    } catch (err) {
      setGlobalError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Modifier l'utilisateur</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-gray-500">{u.email}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prénom">
              <input
                type="text"
                value={form.firstName}
                onChange={set('firstName')}
                className={inputCls(false)}
              />
            </Field>
            <Field label="Nom">
              <input
                type="text"
                value={form.lastName}
                onChange={set('lastName')}
                className={inputCls(false)}
              />
            </Field>
          </div>
          <Field label="Rôle">
            <select value={form.role} onChange={set('role')} className={inputCls(false)}>
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r] ?? r}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nouveau mot de passe" hint="Laisser vide pour ne pas changer">
            <input
              type="password"
              value={form.password}
              onChange={set('password')}
              placeholder="8 caractères minimum"
              className={inputCls(false)}
            />
          </Field>
          {globalError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{globalError}</p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-gradient-iox-primary px-4 py-2 text-sm font-medium text-white hover:shadow-premium-md disabled:opacity-50"
            >
              {loading ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Page principale ─────────────────────────────────────────────────── */
export default function UsersPage() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const loadUsers = useCallback(async (p = 1, q = '') => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (q) params.set('search', q);
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setUsers(json.data ?? []);
      setTotal(json.meta?.total ?? 0);
      setTotalPages(json.meta?.totalPages ?? 1);
    } catch {
      setError('Impossible de charger les utilisateurs');
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce : on relance la recherche 300ms après le dernier keystroke
  // pour éviter un round-trip par lettre tapée.
  useEffect(() => {
    const t = setTimeout(() => {
      loadUsers(page, search);
    }, 300);
    return () => clearTimeout(t);
  }, [loadUsers, page, search]);

  const toggleActive = async (u: User) => {
    setActionError(null);
    try {
      const token = authStorage.getAccessToken();
      const action = u.isActive ? 'deactivate' : 'activate';
      const res = await fetch(`/api/v1/users/${u.id}/${action}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setActionError('Action impossible');
        return;
      }
      loadUsers(page, search);
    } catch {
      setActionError('Action impossible');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-purple-500" /> Gestion des utilisateurs
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} utilisateur{total > 1 ? 's' : ''} enregistré{total > 1 ? 's' : ''}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-iox-primary px-4 py-2 text-sm font-medium text-white hover:shadow-premium-md"
          >
            <Plus className="h-4 w-4" /> Nouvel utilisateur
          </button>
        )}
      </div>

      {/* Erreur action */}
      {actionError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-600 flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (setPage(1), loadUsers(1, search))}
            placeholder="Rechercher par nom, email…"
            className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-premium-accent/30"
          />
        </div>
        <button
          onClick={() => {
            setPage(1);
            loadUsers(1, search);
          }}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Rechercher
        </button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      {/* Table */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Utilisateur</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Rôle</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Statut</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Dernière connexion</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Membre depuis</th>
              {isAdmin && (
                <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  Chargement…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  Aucun utilisateur
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 flex-shrink-0">
                        {u.firstName[0]}
                        {u.lastName[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {u.firstName} {u.lastName}
                        </p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                      {u.id === currentUser?.id && (
                        <span className="text-xs text-blue-500 font-medium">vous</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_CLS[u.role] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {u.isActive ? 'Actif' : 'Désactivé'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {u.lastLoginAt ? (
                      new Date(u.lastLoginAt).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    ) : (
                      <span className="text-gray-300">Jamais</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditUser(u)}
                          className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                        >
                          <Edit2 className="h-3 w-3" /> Modifier
                        </button>
                        {u.id !== currentUser?.id && (
                          <button
                            onClick={() => toggleActive(u)}
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${
                              u.isActive
                                ? 'border-red-200 text-red-600 hover:bg-red-50'
                                : 'border-green-200 text-green-600 hover:bg-green-50'
                            }`}
                          >
                            {u.isActive ? (
                              <>
                                <UserX className="h-3 w-3" /> Désactiver
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-3 w-3" /> Réactiver
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-100 empty:hidden">
          <PaginationControls
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            label={
              <>
                Page {page} sur {totalPages} · {total} utilisateurs
              </>
            }
          />
        </div>
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => loadUsers(1, search)}
        />
      )}
      {editUser && (
        <EditUserModal
          u={editUser}
          onClose={() => setEditUser(null)}
          onSaved={() => {
            loadUsers(page, search);
            setEditUser(null);
          }}
        />
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {hint && <span className="ml-1 text-xs font-normal text-gray-400">— {hint}</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-premium-accent/30 ${
    hasError ? 'border-red-400 bg-red-50' : 'border-gray-300'
  }`;
}
