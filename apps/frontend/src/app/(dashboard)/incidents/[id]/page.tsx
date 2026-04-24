'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  ChevronRight,
  Edit2,
  Save,
  X,
  Pencil,
} from 'lucide-react';
import { IncidentStatus, IncidentSeverity, UserRole } from '@iox/shared';
import { useAuth } from '@/contexts/auth.context';
import { authStorage } from '@/lib/auth';
import { DocumentsPanel } from '@/components/documents/documents-panel';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface Incident {
  id: string;
  code: string;
  title: string;
  description: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  incidentDate: string;
  resolvedAt?: string;
  resolution?: string;
  actionsTaken?: string;
  linkedEntityType?: string;
  linkedEntityId?: string;
  createdAt: string;
  updatedAt: string;
  _count: { documents: number };
}

/* ------------------------------------------------------------------ */
/*  Constantes                                                          */
/* ------------------------------------------------------------------ */

const SEVERITY_CLS: Record<IncidentSeverity, string> = {
  [IncidentSeverity.MINOR]: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  [IncidentSeverity.MAJOR]: 'bg-orange-100 text-orange-700 border-orange-200',
  [IncidentSeverity.CRITICAL]: 'bg-red-100 text-red-700 border-red-200',
};
const SEVERITY_LABEL: Record<IncidentSeverity, string> = {
  [IncidentSeverity.MINOR]: 'Mineur',
  [IncidentSeverity.MAJOR]: 'Majeur',
  [IncidentSeverity.CRITICAL]: 'Critique',
};
const STATUS_CLS: Record<IncidentStatus, string> = {
  [IncidentStatus.OPEN]: 'bg-red-100 text-red-700',
  [IncidentStatus.ANALYZING]: 'bg-orange-100 text-orange-700',
  [IncidentStatus.ACTION_IN_PROGRESS]: 'bg-yellow-100 text-yellow-700',
  [IncidentStatus.CONTROLLED]: 'bg-blue-100 text-blue-700',
  [IncidentStatus.CLOSED]: 'bg-gray-100 text-gray-500',
};
const STATUS_LABEL: Record<IncidentStatus, string> = {
  [IncidentStatus.OPEN]: 'Ouvert',
  [IncidentStatus.ANALYZING]: 'En analyse',
  [IncidentStatus.ACTION_IN_PROGRESS]: 'Action en cours',
  [IncidentStatus.CONTROLLED]: 'Maîtrisé',
  [IncidentStatus.CLOSED]: 'Clôturé',
};
const NEXT_STATUS: Record<
  IncidentStatus,
  { value: IncidentStatus; label: string; color: string }[]
> = {
  [IncidentStatus.OPEN]: [
    {
      value: IncidentStatus.ANALYZING,
      label: 'Passer en analyse',
      color: 'bg-orange-600 hover:bg-orange-700',
    },
  ],
  [IncidentStatus.ANALYZING]: [
    {
      value: IncidentStatus.ACTION_IN_PROGRESS,
      label: 'Lancer les actions',
      color: 'bg-yellow-600 hover:bg-yellow-700',
    },
    {
      value: IncidentStatus.CONTROLLED,
      label: 'Déclarer maîtrisé',
      color: 'bg-blue-600 hover:bg-blue-700',
    },
  ],
  [IncidentStatus.ACTION_IN_PROGRESS]: [
    {
      value: IncidentStatus.CONTROLLED,
      label: 'Déclarer maîtrisé',
      color: 'bg-blue-600 hover:bg-blue-700',
    },
  ],
  [IncidentStatus.CONTROLLED]: [
    { value: IncidentStatus.CLOSED, label: 'Clôturer', color: 'bg-gray-600 hover:bg-gray-700' },
    {
      value: IncidentStatus.ACTION_IN_PROGRESS,
      label: 'Reprendre les actions',
      color: 'bg-yellow-600 hover:bg-yellow-700',
    },
  ],
  [IncidentStatus.CLOSED]: [],
};

const CAN_EDIT = [
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.QUALITY_MANAGER,
  UserRole.SUPPLY_MANAGER,
];

/* ------------------------------------------------------------------ */
/*  Row helpers                                                         */
/* ------------------------------------------------------------------ */

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-4 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500 flex-shrink-0 w-36">{label}</span>
      <span className="text-sm text-gray-900 text-right">{children}</span>
    </div>
  );
}

type Tab = 'info' | 'docs';

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('info');

  /* Edit mode */
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ resolution: '', actionsTaken: '' });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  /* Status transition */
  const [statusNotes, setStatusNotes] = useState('');
  const [transitioning, setTransitioning] = useState(false);
  const [transError, setTransError] = useState<string | null>(null);

  const fetchIncident = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/incidents/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Incident introuvable');
      const json = await res.json();
      const data = json.data ?? json;
      setIncident(data);
      setEditForm({ resolution: data.resolution ?? '', actionsTaken: data.actionsTaken ?? '' });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchIncident();
  }, [fetchIncident]);

  const saveEdit = async () => {
    setSaving(true);
    setEditError(null);
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/incidents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error('Erreur de sauvegarde');
      await fetchIncident();
      setEditing(false);
    } catch (err) {
      setEditError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleTransition = async (nextStatus: IncidentStatus) => {
    setTransitioning(true);
    setTransError(null);
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/incidents/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: nextStatus, notes: statusNotes || undefined }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.message ?? 'Erreur');
      }
      setStatusNotes('');
      await fetchIncident();
    } catch (err) {
      setTransError((err as Error).message);
    } finally {
      setTransitioning(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-500">Chargement…</div>
    );
  if (error || !incident)
    return (
      <div className="space-y-4">
        <Link
          href="/incidents"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>
        <div className="text-sm text-red-500">{error ?? 'Incident introuvable'}</div>
      </div>
    );

  const canEdit = user && CAN_EDIT.includes(user.role);
  const nextOptions = NEXT_STATUS[incident.status] ?? [];
  const isClosed = incident.status === IncidentStatus.CLOSED;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/incidents" className="text-gray-400 hover:text-gray-600 mt-1">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm text-gray-400">{incident.code}</span>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium border ${SEVERITY_CLS[incident.severity]}`}
            >
              {SEVERITY_LABEL[incident.severity]}
            </span>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLS[incident.status]}`}
            >
              {STATUS_LABEL[incident.status]}
            </span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mt-1">{incident.title}</h1>
        </div>
        {canEdit && !isClosed && (
          <Link
            href={`/incidents/${id}/edit`}
            className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Pencil className="h-3.5 w-3.5" /> Modifier
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-0.5 w-fit">
        {[
          { key: 'info' as Tab, label: 'Informations', icon: AlertTriangle },
          {
            key: 'docs' as Tab,
            label: `Documents${incident._count.documents > 0 ? ` (${incident._count.documents})` : ''}`,
            icon: FileText,
          },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === key ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* ---- TAB: Info ---- */}
      {tab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-5">
            {/* Description */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Description</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{incident.description}</p>
            </div>

            {/* Résolution & actions */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-700">
                  Résolution & actions correctives
                </h2>
                {canEdit && !isClosed && !editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Modifier
                  </button>
                )}
              </div>

              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Résolution
                    </label>
                    <textarea
                      value={editForm.resolution}
                      onChange={(e) => setEditForm((p) => ({ ...p, resolution: e.target.value }))}
                      rows={3}
                      placeholder="Décrivez la résolution apportée…"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Actions prises
                    </label>
                    <textarea
                      value={editForm.actionsTaken}
                      onChange={(e) => setEditForm((p) => ({ ...p, actionsTaken: e.target.value }))}
                      rows={3}
                      placeholder="Listez les actions correctives mises en place…"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  {editError && <p className="text-xs text-red-500">{editError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Save className="h-3.5 w-3.5" /> {saving ? 'Sauvegarde…' : 'Sauvegarder'}
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false);
                        setEditError(null);
                        setEditForm({
                          resolution: incident.resolution ?? '',
                          actionsTaken: incident.actionsTaken ?? '',
                        });
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <X className="h-3.5 w-3.5" /> Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Résolution
                    </p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {incident.resolution || (
                        <span className="text-gray-400 italic">Non renseignée</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Actions prises
                    </p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {incident.actionsTaken || (
                        <span className="text-gray-400 italic">Non renseignées</span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Transitions */}
            {canEdit && nextOptions.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Avancer le statut</h2>
                <div className="space-y-3">
                  <textarea
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    rows={2}
                    placeholder="Notes optionnelles pour ce changement de statut…"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  {transError && <p className="text-xs text-red-500">{transError}</p>}
                  <div className="flex flex-wrap gap-2">
                    {nextOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleTransition(opt.value)}
                        disabled={transitioning}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${opt.color}`}
                      >
                        <ChevronRight className="h-4 w-4" />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {isClosed && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-700">Incident clôturé</p>
                  {incident.resolvedAt && (
                    <p className="text-xs text-green-600 mt-0.5">
                      Résolu le {new Date(incident.resolvedAt).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Détails</h2>
              <div className="divide-y divide-gray-50">
                <DetailRow label="Code">{incident.code}</DetailRow>
                <DetailRow label="Sévérité">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_CLS[incident.severity]}`}
                  >
                    {SEVERITY_LABEL[incident.severity]}
                  </span>
                </DetailRow>
                <DetailRow label="Statut">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLS[incident.status]}`}
                  >
                    {STATUS_LABEL[incident.status]}
                  </span>
                </DetailRow>
                <DetailRow label="Date incident">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    {new Date(incident.incidentDate).toLocaleDateString('fr-FR')}
                  </span>
                </DetailRow>
                {incident.resolvedAt && (
                  <DetailRow label="Résolu le">
                    {new Date(incident.resolvedAt).toLocaleDateString('fr-FR')}
                  </DetailRow>
                )}
                <DetailRow label="Créé le">
                  {new Date(incident.createdAt).toLocaleDateString('fr-FR')}
                </DetailRow>
              </div>
            </div>

            {(incident.linkedEntityType || incident.linkedEntityId) && (
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Entité concernée</h2>
                <p className="text-xs text-gray-500">{incident.linkedEntityType}</p>
                <p className="text-sm font-mono text-gray-800 mt-0.5">{incident.linkedEntityId}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- TAB: Documents ---- */}
      {tab === 'docs' && (
        <DocumentsPanel linkedEntityType="INCIDENT" linkedEntityId={incident.id} />
      )}
    </div>
  );
}
