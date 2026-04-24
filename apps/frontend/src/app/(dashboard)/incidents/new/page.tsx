'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { IncidentSeverity, EntityType } from '@iox/shared';
import { authStorage } from '@/lib/auth';

const SEVERITY_OPTIONS = [
  {
    value: IncidentSeverity.MINOR,
    label: 'Mineur — Impact limité, aucun risque sanitaire immédiat',
  },
  {
    value: IncidentSeverity.MAJOR,
    label: 'Majeur — Impact significatif, action corrective requise',
  },
  {
    value: IncidentSeverity.CRITICAL,
    label: 'Critique — Risque sanitaire ou légal, action immédiate',
  },
];

const ENTITY_OPTIONS = [
  { value: '', label: 'Aucune entité liée' },
  { value: EntityType.PRODUCT_BATCH, label: 'Lot fini' },
  { value: EntityType.INBOUND_BATCH, label: 'Lot entrant' },
  { value: EntityType.PRODUCT, label: 'Produit' },
  { value: EntityType.BENEFICIARY, label: 'Bénéficiaire' },
  { value: EntityType.SUPPLY_CONTRACT, label: "Contrat d'approvisionnement" },
];

export default function NewIncidentPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    title: '',
    description: '',
    severity: IncidentSeverity.MINOR as string,
    incidentDate: new Date().toISOString().slice(0, 10),
    linkedEntityType: '' as string,
    linkedEntityId: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set =
    (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const body: Record<string, unknown> = {
      title: form.title,
      description: form.description,
      severity: form.severity,
      incidentDate: form.incidentDate,
    };
    if (form.linkedEntityType) body.linkedEntityType = form.linkedEntityType;
    if (form.linkedEntityId) body.linkedEntityId = form.linkedEntityId;

    try {
      const token = authStorage.getAccessToken();
      const res = await fetch('/api/v1/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const j = await res.json();
        throw new Error(Array.isArray(j.message) ? j.message.join(', ') : (j.message ?? 'Erreur'));
      }

      const json = await res.json();
      const id = json.data?.id ?? json.id;
      router.push(`/incidents/${id}`);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/incidents" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Déclarer un incident</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Toute non-conformité doit être déclarée et tracée.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Titre */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Informations générales</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
            <input
              type="text"
              value={form.title}
              onChange={set('title')}
              required
              placeholder="Ex : Contamination détectée — Lot PB-2024-0042"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description * <span className="text-xs text-gray-400">(min. 10 caractères)</span>
            </label>
            <textarea
              value={form.description}
              onChange={set('description')}
              required
              rows={4}
              placeholder="Décrivez précisément l'incident : nature, circonstances, impact potentiel…"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de l'incident *
              </label>
              <input
                type="date"
                value={form.incidentDate}
                onChange={set('incidentDate')}
                required
                max={new Date().toISOString().slice(0, 10)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sévérité *</label>
              <select
                value={form.severity}
                onChange={set('severity')}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {SEVERITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Entité liée */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">
            Entité concernée <span className="text-xs font-normal text-gray-400">(optionnel)</span>
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type d'entité</label>
              <select
                value={form.linkedEntityType}
                onChange={set('linkedEntityType')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {ENTITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID ou code de l'entité
              </label>
              <input
                type="text"
                value={form.linkedEntityId}
                onChange={set('linkedEntityId')}
                disabled={!form.linkedEntityType}
                placeholder={form.linkedEntityType ? 'Ex : PB-2024-0042' : '—'}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Alerte sévérité critique */}
        {form.severity === IncidentSeverity.CRITICAL && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Incident critique</p>
              <p className="text-xs text-red-600 mt-0.5">
                Un incident critique nécessite une action immédiate. Assurez-vous que les parties
                prenantes concernées sont notifiées.
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/incidents"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? 'Déclaration…' : "Déclarer l'incident"}
          </button>
        </div>
      </form>
    </div>
  );
}
