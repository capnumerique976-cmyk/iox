'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, AlertCircle, Save } from 'lucide-react';
import { authStorage } from '@/lib/auth';

const BENEFICIARY_TYPES = ['entreprise', 'artisan', 'producteur', 'groupement', 'transformateur'];
const SECTORS = [
  'maraîchage',
  'pêche',
  'élevage',
  'artisanat alimentaire',
  'artisanat non-alimentaire',
  'transformation',
  'autre',
];

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function EditBeneficiaryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [users, setUsers] = useState<User[]>([]);

  const [form, setForm] = useState({
    name: '',
    type: 'entreprise',
    sector: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    siret: '',
    legalStatus: '',
    establishedAt: '',
    employeeCount: '',
    certifications: '', // comma-separated
    capacityDescription: '',
    description: '',
    referentId: '',
  });

  /* ── Chargements initiaux ─────────────────────────────────────────── */

  useEffect(() => {
    const token = authStorage.getAccessToken();

    Promise.all([
      fetch(`/api/v1/beneficiaries/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then(
        (r) => r.json(),
      ),
      fetch('/api/v1/users?limit=100', { headers: { Authorization: `Bearer ${token}` } }).then(
        (r) => r.json(),
      ),
    ])
      .then(([benJson, usersJson]) => {
        const b = benJson.data ?? benJson;
        setCode(b.code ?? '');
        setForm({
          name: b.name ?? '',
          type: b.type ?? 'entreprise',
          sector: b.sector ?? '',
          email: b.email ?? '',
          phone: b.phone ?? '',
          address: b.address ?? '',
          city: b.city ?? '',
          postalCode: b.postalCode ?? '',
          siret: b.siret ?? '',
          legalStatus: b.legalStatus ?? '',
          establishedAt: b.establishedAt ? b.establishedAt.slice(0, 10) : '',
          employeeCount: b.employeeCount != null ? String(b.employeeCount) : '',
          certifications: (b.certifications ?? []).join(', '),
          capacityDescription: b.capacityDescription ?? '',
          description: b.description ?? '',
          referentId: b.referent?.id ?? '',
        });
        const uData = usersJson.data?.data ?? usersJson.data ?? usersJson;
        setUsers(Array.isArray(uData) ? uData : []);
      })
      .catch(() => setError('Impossible de charger les données'))
      .finally(() => setLoading(false));
  }, [id]);

  /* ── Helpers ────────────────────────────────────────────────────── */

  const set =
    (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  /* ── Soumission ─────────────────────────────────────────────────── */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const body: Record<string, unknown> = {};

    if (form.name) body.name = form.name;
    if (form.type) body.type = form.type;
    body.sector = form.sector || null;
    body.email = form.email || null;
    body.phone = form.phone || null;
    body.address = form.address || null;
    body.city = form.city || null;
    body.postalCode = form.postalCode || null;
    body.siret = form.siret || null;
    body.legalStatus = form.legalStatus || null;
    body.description = form.description || null;
    body.capacityDescription = form.capacityDescription || null;
    body.referentId = form.referentId || null;

    if (form.establishedAt) body.establishedAt = form.establishedAt;
    else body.establishedAt = null;

    if (form.employeeCount !== '') {
      const n = parseInt(form.employeeCount, 10);
      if (!isNaN(n) && n >= 0) body.employeeCount = n;
    } else {
      body.employeeCount = null;
    }

    body.certifications = form.certifications
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);

    try {
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/beneficiaries/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message);
      }
      router.push(`/beneficiaries/${id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  /* ── Rendu ──────────────────────────────────────────────────────── */

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">Chargement…</div>
    );

  return (
    <div className="max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-gray-500">
        <Link href="/beneficiaries" className="hover:text-blue-600 flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Bénéficiaires
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/beneficiaries/${id}`} className="hover:text-blue-600 font-mono">
          {code}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-gray-700">Modifier</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Modifier le bénéficiaire</h1>
        <p className="text-sm text-gray-500 mt-1 font-mono">{code}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1 — Identité */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
            Identité
          </h2>
          <div className="grid grid-cols-2 gap-5">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
              <input
                required
                value={form.name}
                onChange={set('name')}
                placeholder="Coopérative Mahoraise Bio"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select
                required
                value={form.type}
                onChange={set('type')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {BENEFICIARY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filière</label>
              <select
                value={form.sector}
                onChange={set('sector')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">— Aucune —</option>
                {SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SIRET</label>
              <input
                value={form.siret}
                onChange={set('siret')}
                placeholder="000 000 000 00000"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Forme juridique
              </label>
              <input
                value={form.legalStatus}
                onChange={set('legalStatus')}
                placeholder="SAS, SARL, auto-entrepreneur…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de création
              </label>
              <input
                type="date"
                value={form.establishedAt}
                onChange={set('establishedAt')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Effectif</label>
              <input
                type="number"
                value={form.employeeCount}
                onChange={set('employeeCount')}
                min={0}
                placeholder="Nombre de personnes"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Certifications
                <span className="ml-1 font-normal text-gray-400">(séparées par des virgules)</span>
              </label>
              <input
                value={form.certifications}
                onChange={set('certifications')}
                placeholder="ISO 22000, BIO, Halal…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </section>

        {/* Section 2 — Coordonnées */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
            Coordonnées
          </h2>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={set('phone')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <input
                value={form.address}
                onChange={set('address')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
              <input
                value={form.city}
                onChange={set('city')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
              <input
                value={form.postalCode}
                onChange={set('postalCode')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </section>

        {/* Section 3 — Suivi & capacité */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
            Suivi &amp; capacité
          </h2>
          <div className="space-y-4">
            {users.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Référent</label>
                <select
                  value={form.referentId}
                  onChange={set('referentId')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">— Aucun référent —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacité de production
              </label>
              <textarea
                value={form.capacityDescription}
                onChange={set('capacityDescription')}
                rows={3}
                placeholder="Décrivez les capacités de production, de stockage, de transformation…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={set('description')}
                rows={4}
                placeholder="Description générale du bénéficiaire…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>
        </section>

        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pb-6">
          <Link
            href={`/beneficiaries/${id}`}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </button>
        </div>
      </form>
    </div>
  );
}
