'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

export default function NewBeneficiaryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    description: '',
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''));
      const token = authStorage.getAccessToken();
      const res = await fetch('/api/v1/beneficiaries', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message);
      }
      const json = await res.json();
      const created = json.data ?? json;
      router.push(`/beneficiaries/${created.id}`);
    } catch (err) {
      setError((err as Error).message ?? 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link href="/beneficiaries" className="text-sm text-gray-400 hover:text-gray-600">
            ← Bénéficiaires
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Nouveau bénéficiaire</h1>
        <p className="text-sm text-gray-500 mt-1">
          Un code fonctionnel (BEN-XXXX) sera généré automatiquement.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-200 rounded-lg p-6 space-y-5"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="Coopérative Mahoraise Bio"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={form.type}
              onChange={(e) => set('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
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
              onChange={(e) => set('sector', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="">— Choisir —</option>
              {SECTORS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
            <input
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
            <input
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
            <input
              value={form.postalCode}
              onChange={(e) => set('postalCode', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SIRET</label>
            <input
              value={form.siret}
              onChange={(e) => set('siret', e.target.value)}
              placeholder="000 000 000 00000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Forme juridique</label>
            <input
              value={form.legalStatus}
              onChange={(e) => set('legalStatus', e.target.value)}
              placeholder="SAS, SARL, auto-entrepreneur..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>}

        <div className="flex gap-3 justify-end pt-2">
          <Link
            href="/beneficiaries"
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Création...' : 'Créer le bénéficiaire'}
          </button>
        </div>
      </form>
    </div>
  );
}
