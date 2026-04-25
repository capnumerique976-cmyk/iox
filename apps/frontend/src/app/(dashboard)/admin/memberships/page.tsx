'use client';

import { useCallback, useEffect, useState } from 'react';
import { authStorage } from '@/lib/auth';
import { api, ApiError } from '@/lib/api';
import {
  MembershipRow,
  OrphanSeller,
  MembershipsDiagnostic,
  listMemberships,
  listOrphanSellers,
  getMembershipsDiagnostic,
  createMembership,
  deleteMembership,
  setPrimaryMembership,
} from '@/lib/memberships';
import { AlertCircle, Link2, Plus, Search, Star, Trash2, UserPlus, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { notifyError, notifySuccess } from '@/lib/notify';

interface UserHit {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}
interface CompanyHit {
  id: string;
  code: string;
  name: string;
}

export default function MembershipsAdminPage() {
  const [rows, setRows] = useState<MembershipRow[]>([]);
  const [total, setTotal] = useState(0);
  const [orphans, setOrphans] = useState<OrphanSeller[]>([]);
  const [diag, setDiag] = useState<MembershipsDiagnostic | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [prefillUserId, setPrefillUserId] = useState<string | null>(null);
  const confirm = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = authStorage.getAccessToken() ?? '';
    try {
      const [list, orphanList, d] = await Promise.all([
        listMemberships(token, { limit: 50 }),
        listOrphanSellers(token),
        getMembershipsDiagnostic(token),
      ]);
      setRows(list.data);
      setTotal(list.meta.total);
      setOrphans(orphanList.data);
      setDiag(d);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      r.user.email.toLowerCase().includes(s) ||
      r.company.code.toLowerCase().includes(s) ||
      r.company.name.toLowerCase().includes(s)
    );
  });

  const remove = async (id: string) => {
    const ok = await confirm({
      title: 'Supprimer ce rattachement ?',
      description:
        "L'utilisateur perdra immédiatement l'accès à cette entreprise. Action irréversible — il faudra recréer le rattachement pour rétablir l'accès.",
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!ok) return;
    const token = authStorage.getAccessToken() ?? '';
    try {
      await deleteMembership(token, id);
      notifySuccess('Rattachement supprimé');
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Suppression impossible');
      notifyError(e, 'Action impossible');
    }
  };

  const promote = async (id: string) => {
    const token = authStorage.getAccessToken() ?? '';
    try {
      await setPrimaryMembership(token, id);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Action impossible');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Link2 className="h-5 w-5" aria-hidden />}
        title="Rattachements utilisateurs ↔ entreprises"
        subtitle={`${total} rattachement${total > 1 ? 's' : ''} · ownership marketplace V2`}
        actions={
          <button
            onClick={() => {
              setPrefillUserId(null);
              setShowCreate(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-iox-primary px-4 py-2 text-sm font-medium text-white shadow-premium-sm transition-all duration-fast ease-premium hover:shadow-premium-md active-press"
          >
            <Plus className="h-4 w-4" aria-hidden /> Nouveau membership
          </button>
        }
      />

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-600 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {error}
          </span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {diag && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="Sellers" value={diag.totalSellerUsers} />
          <Stat label="Avec membership" value={diag.sellersWithMembership} tone="green" />
          <Stat
            label="Sans membership"
            value={diag.sellersWithoutMembership}
            tone={diag.sellersWithoutMembership > 0 ? 'orange' : 'gray'}
          />
          <Stat label="Memberships total" value={diag.totalMemberships} />
          <Stat
            label="Sans sellerProfile"
            value={diag.membershipsWithoutSellerProfile}
            tone={diag.membershipsWithoutSellerProfile > 0 ? 'orange' : 'gray'}
          />
        </div>
      )}

      {/* Sellers orphelins */}
      <section className="rounded-lg border border-orange-200 bg-orange-50 p-4">
        <h2 className="text-sm font-semibold text-orange-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> Sellers sans rattachement ({orphans.length})
        </h2>
        <p className="text-xs text-orange-700 mt-1">
          Ces utilisateurs ont le rôle MARKETPLACE_SELLER mais aucun membership : leur périmètre
          ownership est vide.
        </p>
        {orphans.length === 0 ? (
          <p className="mt-3 text-sm text-orange-700">Aucun seller orphelin.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {orphans.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between bg-white rounded-md px-3 py-2 border border-orange-100"
              >
                <div className="text-sm">
                  <p className="font-medium text-gray-900">
                    {u.firstName} {u.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
                <button
                  onClick={() => {
                    setPrefillUserId(u.id);
                    setShowCreate(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-md bg-orange-600 text-white text-xs px-3 py-1.5 hover:bg-orange-700"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Rattacher
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par email / code entreprise…"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm shadow-premium-sm transition-all duration-fast ease-premium focus:border-premium-accent/40 focus:outline-none focus:ring-2 focus:ring-premium-accent/30"
          />
        </div>
      </div>

      {/* Table */}
      <div className="iox-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Entreprise</th>
              <th>SellerProfile</th>
              <th>Primary</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                  Chargement…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                  Aucun rattachement
                </td>
              </tr>
            ) : (
              filtered.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">
                      {m.user.firstName} {m.user.lastName}
                    </p>
                    <p className="text-xs text-gray-400">{m.user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{m.company.name}</p>
                    <p className="text-xs text-gray-400">{m.company.code}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {m.company.sellerProfile ? (
                      <>
                        <span className="font-medium text-gray-900">
                          {m.company.sellerProfile.publicDisplayName ?? '—'}
                        </span>
                        <span className="ml-2 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
                          {m.company.sellerProfile.status}
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {m.isPrimary ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 text-yellow-700 px-2 py-0.5 text-xs">
                        <Star className="h-3 w-3" /> Primary
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {!m.isPrimary && (
                        <button
                          onClick={() => promote(m.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-yellow-200 text-yellow-700 text-xs px-2 py-1 hover:bg-yellow-50"
                        >
                          <Star className="h-3 w-3" /> Primary
                        </button>
                      )}
                      <button
                        onClick={() => remove(m.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 text-red-600 text-xs px-2 py-1 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" /> Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateMembershipModal
          prefillUserId={prefillUserId}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = 'gray',
}: {
  label: string;
  value: number;
  tone?: 'gray' | 'green' | 'red' | 'orange';
}) {
  const tones: Record<string, string> = {
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
  };
  return (
    <div className={`rounded-lg border px-4 py-3 ${tones[tone]}`}>
      <p className="text-xs font-medium">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

/* ─── Modal de création ──────────────────────────────────────────────── */

function CreateMembershipModal({
  prefillUserId,
  onClose,
  onCreated,
}: {
  prefillUserId: string | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [userQuery, setUserQuery] = useState('');
  const [users, setUsers] = useState<UserHit[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserHit | null>(null);
  const [companyQuery, setCompanyQuery] = useState('');
  const [companies, setCompanies] = useState<CompanyHit[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyHit | null>(null);
  const [isPrimary, setIsPrimary] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!prefillUserId) return;
    const token = authStorage.getAccessToken() ?? '';
    api
      .get<UserHit>(`/users/${prefillUserId}`, token)
      .then((u) => setSelectedUser(u))
      .catch(() => undefined);
  }, [prefillUserId]);

  useEffect(() => {
    if (selectedUser || userQuery.trim().length < 2) {
      setUsers([]);
      return;
    }
    const token = authStorage.getAccessToken() ?? '';
    const t = setTimeout(async () => {
      try {
        const r = await api.get<{ data: UserHit[] }>(
          `/users?search=${encodeURIComponent(userQuery)}&limit=10`,
          token,
        );
        setUsers(r.data ?? []);
      } catch {
        setUsers([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [userQuery, selectedUser]);

  useEffect(() => {
    if (selectedCompany || companyQuery.trim().length < 2) {
      setCompanies([]);
      return;
    }
    const token = authStorage.getAccessToken() ?? '';
    const t = setTimeout(async () => {
      try {
        const r = await api.get<{ data: CompanyHit[] }>(
          `/companies?search=${encodeURIComponent(companyQuery)}&limit=10`,
          token,
        );
        setCompanies(r.data ?? []);
      } catch {
        setCompanies([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [companyQuery, selectedCompany]);

  const submit = async () => {
    if (!selectedUser || !selectedCompany) {
      setSubmitError('Sélectionnez un utilisateur et une entreprise.');
      return;
    }
    setLoading(true);
    setSubmitError(null);
    const token = authStorage.getAccessToken() ?? '';
    try {
      await createMembership(token, {
        userId: selectedUser.id,
        companyId: selectedCompany.id,
        isPrimary,
      });
      onCreated();
    } catch (e) {
      setSubmitError(e instanceof ApiError ? e.message : 'Création impossible');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Nouveau rattachement</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Utilisateur *</label>
          {selectedUser ? (
            <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
              <span className="text-sm">
                {selectedUser.firstName} {selectedUser.lastName} · {selectedUser.email}
              </span>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-premium-accent text-xs hover:underline"
              >
                Changer
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Rechercher (min. 2 caractères)…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-premium-accent/30"
              />
              {users.length > 0 && (
                <ul className="mt-1 max-h-40 overflow-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                  {users.map((u) => (
                    <li key={u.id}>
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        <p className="font-medium">
                          {u.firstName} {u.lastName}
                        </p>
                        <p className="text-xs text-gray-400">
                          {u.email} · {u.role}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Entreprise *</label>
          {selectedCompany ? (
            <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
              <span className="text-sm">
                {selectedCompany.code} · {selectedCompany.name}
              </span>
              <button
                onClick={() => setSelectedCompany(null)}
                className="text-premium-accent text-xs hover:underline"
              >
                Changer
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={companyQuery}
                onChange={(e) => setCompanyQuery(e.target.value)}
                placeholder="Rechercher (min. 2 caractères)…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-premium-accent/30"
              />
              {companies.length > 0 && (
                <ul className="mt-1 max-h-40 overflow-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                  {companies.map((c) => (
                    <li key={c.id}>
                      <button
                        onClick={() => setSelectedCompany(c)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.code}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
          />
          Marquer comme rattachement principal (primary)
        </label>

        {submitError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>{submitError}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            disabled={loading}
            onClick={submit}
            className="rounded-lg bg-gradient-iox-primary px-4 py-2 text-sm font-medium text-white shadow-premium-sm transition-all duration-fast ease-premium hover:shadow-premium-md active-press disabled:opacity-50"
          >
            {loading ? 'Création…' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}
