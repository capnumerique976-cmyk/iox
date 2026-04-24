'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, AlertCircle, Save } from 'lucide-react';
import { IncidentSeverity } from '@iox/shared';
import { authStorage } from '@/lib/auth';

const SEVERITY_OPTIONS = [
  {
    value: IncidentSeverity.MINOR,
    label: 'Mineur',
    desc: 'Impact limité, aucun risque sanitaire immédiat',
  },
  {
    value: IncidentSeverity.MAJOR,
    label: 'Majeur',
    desc: 'Impact significatif, action corrective requise',
  },
  {
    value: IncidentSeverity.CRITICAL,
    label: 'Critique',
    desc: 'Risque sanitaire ou légal, action immédiate',
  },
];

const SEVERITY_CLS: Record<string, string> = {
  [IncidentSeverity.MINOR]: 'border-yellow-300 bg-yellow-50 text-yellow-800',
  [IncidentSeverity.MAJOR]: 'border-orange-300 bg-orange-50 text-orange-800',
  [IncidentSeverity.CRITICAL]: 'border-red-300 bg-red-50 text-red-800',
};

export default function EditIncidentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    severity: IncidentSeverity.MINOR as string,
    incidentDate: '',
  });

  /* ── Chargement ──────────────────────────────────────────────────── */

  useEffect(() => {
    const token = authStorage.getAccessToken();
    fetch(`/api/v1/incidents/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((json) => {
        const inc = json.data ?? json;
        setCode(inc.code ?? '');
        setForm({
          title: inc.title ?? '',
          description: inc.description ?? '',
          severity: inc.severity ?? IncidentSeverity.MINOR,
          incidentDate: inc.incidentDate ? inc.incidentDate.slice(0, 10) : '',
        });
      })
      .catch(() => setError("Impossible de charger l'incident"))
      .finally(() => setLoading(false));
  }, [id]);

  /* ── Helpers ─────────────────────────────────────────────────────── */

  const set =
    (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  /* ── Soumission ──────────────────────────────────────────────────── */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Le titre est obligatoire');
      return;
    }
    if (!form.description.trim()) {
      setError('La description est obligatoire');
      return;
    }
    if (!form.incidentDate) {
      setError("La date de l'incident est obligatoire");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/incidents/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          severity: form.severity,
          incidentDate: form.incidentDate,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message);
      }
      router.push(`/incidents/${id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  /* ── Rendu ───────────────────────────────────────────────────────── */

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">Chargement…</div>
    );

  return (
    <div className="max-w-2xl space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-gray-500">
        <Link href="/incidents" className="hover:text-premium-accent flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Incidents
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/incidents/${id}`} className="hover:text-premium-accent font-mono">
          {code}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-gray-700">Modifier</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Modifier l'incident</h1>
        <p className="text-sm text-gray-500 mt-1 font-mono">{code}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-lg border border-gray-200 bg-white p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
            Informations générales
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
              <input
                required
                value={form.title}
                onChange={set('title')}
                maxLength={200}
                placeholder="Résumé concis de l'incident"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-premium-accent/30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <textarea
                required
                value={form.description}
                onChange={set('description')}
                rows={5}
                placeholder="Décrivez précisément l'incident, ses circonstances, les personnes impliquées…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-premium-accent/30 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de l'incident *
                </label>
                <input
                  type="date"
                  required
                  value={form.incidentDate}
                  onChange={set('incidentDate')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-premium-accent/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sévérité *</label>
              <div className="space-y-2">
                {SEVERITY_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 rounded-lg border-2 px-4 py-3 cursor-pointer transition-all ${
                      form.severity === opt.value
                        ? SEVERITY_CLS[opt.value]
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="severity"
                      value={opt.value}
                      checked={form.severity === opt.value}
                      onChange={set('severity')}
                      className="mt-0.5 flex-shrink-0"
                    />
                    <div>
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
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
            href={`/incidents/${id}`}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-iox-primary px-6 py-2 text-sm font-medium text-white hover:shadow-premium-md disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </button>
        </div>
      </form>
    </div>
  );
}
