'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  FileText,
  ClipboardList,
  Plus,
  ChevronRight,
  CheckCircle2,
  Clock,
  X,
  Edit2,
  Save,
  Pencil,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth.context';
import { authStorage } from '@/lib/auth';
import { BeneficiaryStatus, AccompanimentActionStatus, MaturityLevel, UserRole } from '@iox/shared';
import { DocumentsPanel } from '@/components/documents/documents-panel';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface BeneficiaryDetail {
  id: string;
  code: string;
  name: string;
  type: string;
  status: BeneficiaryStatus;
  sector: string | null;
  city: string | null;
  address: string | null;
  postalCode: string | null;
  email: string | null;
  phone: string | null;
  siret: string | null;
  legalStatus: string | null;
  employeeCount: number | null;
  certifications: string[];
  capacityDescription: string | null;
  description: string | null;
  createdAt: string;
  referent: { id: string; firstName: string; lastName: string; email: string } | null;
  diagnostic: DiagnosticData | null;
  actions: Action[];
  _count: { products: number; actions: number; documents: number };
}

interface DiagnosticData {
  maturityLevel: MaturityLevel | null;
  constraints: string | null;
  needs: string | null;
  objectives: string | null;
  risks: string | null;
  priorities: string | null;
  notes: string | null;
  conductedAt: string | null;
}

interface Action {
  id: string;
  title: string;
  description?: string | null;
  actionType: string;
  status: AccompanimentActionStatus;
  dueDate: string | null;
  completedAt: string | null;
  notes: string | null;
}

/* ------------------------------------------------------------------ */
/*  Constantes                                                          */
/* ------------------------------------------------------------------ */

const STATUS_CLS: Record<BeneficiaryStatus, string> = {
  [BeneficiaryStatus.DRAFT]: 'bg-gray-100 text-gray-600',
  [BeneficiaryStatus.QUALIFIED]: 'bg-blue-100 text-blue-700',
  [BeneficiaryStatus.IN_PROGRESS]: 'bg-green-100 text-green-700',
  [BeneficiaryStatus.SUSPENDED]: 'bg-yellow-100 text-yellow-700',
  [BeneficiaryStatus.EXITED]: 'bg-red-100 text-red-600',
};
const STATUS_LABEL: Record<BeneficiaryStatus, string> = {
  [BeneficiaryStatus.DRAFT]: 'Brouillon',
  [BeneficiaryStatus.QUALIFIED]: 'Qualifié',
  [BeneficiaryStatus.IN_PROGRESS]: 'En cours',
  [BeneficiaryStatus.SUSPENDED]: 'Suspendu',
  [BeneficiaryStatus.EXITED]: 'Sorti',
};

const MATURITY_CLS: Record<MaturityLevel, string> = {
  [MaturityLevel.LOW]: 'bg-red-100 text-red-700',
  [MaturityLevel.MEDIUM]: 'bg-yellow-100 text-yellow-700',
  [MaturityLevel.HIGH]: 'bg-green-100 text-green-700',
};
const MATURITY_LABEL: Record<MaturityLevel, string> = {
  [MaturityLevel.LOW]: 'Faible',
  [MaturityLevel.MEDIUM]: 'Moyen',
  [MaturityLevel.HIGH]: 'Fort',
};

const ACTION_STATUS_CLS: Record<AccompanimentActionStatus, string> = {
  [AccompanimentActionStatus.PLANNED]: 'bg-gray-100 text-gray-600',
  [AccompanimentActionStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-700',
  [AccompanimentActionStatus.COMPLETED]: 'bg-green-100 text-green-700',
  [AccompanimentActionStatus.CANCELLED]: 'bg-red-100 text-red-400',
};
const ACTION_STATUS_LABEL: Record<AccompanimentActionStatus, string> = {
  [AccompanimentActionStatus.PLANNED]: 'Planifiée',
  [AccompanimentActionStatus.IN_PROGRESS]: 'En cours',
  [AccompanimentActionStatus.COMPLETED]: 'Terminée',
  [AccompanimentActionStatus.CANCELLED]: 'Annulée',
};

const ACTION_TYPE_LABEL: Record<string, string> = {
  formation: 'Formation',
  diagnostic: 'Diagnostic terrain',
  accompagnement: 'Accompagnement',
  certification: 'Certification',
  autre: 'Autre',
};

const NEXT_STATUS: Partial<Record<BeneficiaryStatus, BeneficiaryStatus[]>> = {
  [BeneficiaryStatus.DRAFT]: [BeneficiaryStatus.QUALIFIED],
  [BeneficiaryStatus.QUALIFIED]: [BeneficiaryStatus.IN_PROGRESS],
  [BeneficiaryStatus.IN_PROGRESS]: [BeneficiaryStatus.SUSPENDED, BeneficiaryStatus.EXITED],
  [BeneficiaryStatus.SUSPENDED]: [BeneficiaryStatus.IN_PROGRESS, BeneficiaryStatus.EXITED],
};

const CAN_EDIT = [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.BENEFICIARY_MANAGER];

type Tab = 'info' | 'diagnostic' | 'actions' | 'docs';

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-900">{value ?? <span className="text-gray-300">—</span>}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function BeneficiaryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [ben, setBen] = useState<BeneficiaryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('info');

  const canEdit = user && CAN_EDIT.includes(user.role);

  /* ---- fetch ---- */
  const fetchBen = useCallback(async () => {
    setLoading(true);
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/beneficiaries/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Introuvable');
      const json = await res.json();
      setBen(json.data ?? json);
    } catch {
      setError('Bénéficiaire introuvable');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBen();
  }, [fetchBen]);

  if (loading) return <div className="text-sm text-gray-400 py-10 text-center">Chargement…</div>;
  if (error || !ben)
    return <div className="text-sm text-red-600 py-10 text-center">{error || 'Erreur'}</div>;

  const nextStatuses = NEXT_STATUS[ben.status] ?? [];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/beneficiaries" className="text-gray-400 hover:text-gray-600 mt-1">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono text-xs text-gray-400">{ben.code}</span>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLS[ben.status]}`}
            >
              {STATUS_LABEL[ben.status]}
            </span>
            <span className="text-xs text-gray-400">
              {ben.type}
              {ben.sector ? ` · ${ben.sector}` : ''}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{ben.name}</h1>
        </div>
        {canEdit && nextStatuses.length > 0 && (
          <StatusTransitionMenu
            current={ben.status}
            nexts={nextStatuses}
            beneficiaryId={id}
            onDone={fetchBen}
          />
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Produits référencés', value: ben._count.products, icon: Users },
          { label: "Actions d'accom.", value: ben._count.actions, icon: ClipboardList },
          { label: 'Documents', value: ben._count.documents, icon: FileText },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 flex items-center gap-3"
          >
            <div className="rounded-lg p-2 bg-gray-100">
              <Icon className="h-4 w-4 text-gray-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-xl font-bold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div className="flex gap-0.5 rounded-lg border border-gray-200 bg-white p-0.5 w-fit">
        {[
          { key: 'info' as Tab, label: 'Informations' },
          { key: 'diagnostic' as Tab, label: `Diagnostic${ben.diagnostic ? ' ✓' : ''}` },
          { key: 'actions' as Tab, label: `Accompagnement (${ben._count.actions})` },
          { key: 'docs' as Tab, label: `Documents (${ben._count.documents})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === key ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TAB: Informations */}
      {tab === 'info' && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          {canEdit && (
            <div className="flex justify-end">
              <Link
                href={`/beneficiaries/${id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" /> Modifier
              </Link>
            </div>
          )}
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <Field label="Nom légal" value={ben.name} />
            <Field label="Type" value={ben.type} />
            <Field label="Secteur" value={ben.sector} />
            <Field label="Email" value={ben.email} />
            <Field label="Téléphone" value={ben.phone} />
            <Field
              label="Ville"
              value={[ben.address, ben.postalCode, ben.city].filter(Boolean).join(', ') || null}
            />
            <Field label="SIRET" value={ben.siret} />
            <Field label="Statut juridique" value={ben.legalStatus} />
            <Field
              label="Effectif"
              value={ben.employeeCount != null ? `${ben.employeeCount} personne(s)` : null}
            />
            <Field
              label="Référent"
              value={ben.referent ? `${ben.referent.firstName} ${ben.referent.lastName}` : null}
            />
            {ben.certifications.length > 0 && (
              <div className="col-span-2">
                <p className="text-xs text-gray-400 mb-1">Certifications</p>
                <div className="flex flex-wrap gap-1">
                  {ben.certifications.map((c) => (
                    <span
                      key={c}
                      className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {ben.description && (
              <div className="col-span-2">
                <p className="text-xs text-gray-400 mb-0.5">Description</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{ben.description}</p>
              </div>
            )}
            {ben.capacityDescription && (
              <div className="col-span-2">
                <p className="text-xs text-gray-400 mb-0.5">Capacité</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {ben.capacityDescription}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: Diagnostic */}
      {tab === 'diagnostic' && (
        <DiagnosticTab
          beneficiaryId={id}
          diagnostic={ben.diagnostic}
          canEdit={!!canEdit}
          onSaved={fetchBen}
        />
      )}

      {/* TAB: Actions d'accompagnement */}
      {tab === 'actions' && (
        <ActionsTab
          beneficiaryId={id}
          actions={ben.actions}
          canEdit={!!canEdit}
          onSaved={fetchBen}
        />
      )}

      {/* TAB: Documents */}
      {tab === 'docs' && <DocumentsPanel linkedEntityType="BENEFICIARY" linkedEntityId={id} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  StatusTransitionMenu                                               */
/* ------------------------------------------------------------------ */

function StatusTransitionMenu({
  current,
  nexts,
  beneficiaryId,
  onDone,
}: {
  current: BeneficiaryStatus;
  nexts: BeneficiaryStatus[];
  beneficiaryId: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [pick, setPick] = useState<BeneficiaryStatus | null>(null);
  const [transErr, setTransErr] = useState<string | null>(null);

  const handleTransition = async () => {
    if (!pick) return;
    setSaving(true);
    setTransErr(null);
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/beneficiaries/${beneficiaryId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: pick, reason: reason || undefined }),
      });
      if (!res.ok) {
        const j = await res.json();
        setTransErr(j.message ?? 'Erreur');
        return;
      }
      setOpen(false);
      setPick(null);
      setReason('');
      onDone();
    } catch (err) {
      setTransErr((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <ChevronRight className="h-4 w-4" /> Changer le statut
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3 w-72">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">Changer le statut</p>
        <button
          onClick={() => {
            setOpen(false);
            setPick(null);
          }}
        >
          <X className="h-4 w-4 text-gray-400" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {nexts.map((s) => (
          <button
            key={s}
            onClick={() => setPick(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-all ${
              pick === s
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>
      {pick && (
        <>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motif (optionnel)…"
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          {transErr && <p className="text-xs text-red-500">{transErr}</p>}
          <button
            onClick={handleTransition}
            disabled={saving}
            className="w-full rounded-lg bg-blue-600 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : `Passer en "${STATUS_LABEL[pick]}"`}
          </button>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DiagnosticTab                                                      */
/* ------------------------------------------------------------------ */

const DIAG_FIELDS: { key: keyof DiagnosticData; label: string; rows?: number }[] = [
  { key: 'constraints', label: 'Freins identifiés', rows: 3 },
  { key: 'needs', label: 'Besoins', rows: 3 },
  { key: 'objectives', label: 'Objectifs', rows: 3 },
  { key: 'risks', label: 'Risques', rows: 2 },
  { key: 'priorities', label: "Priorités d'action", rows: 2 },
  { key: 'notes', label: 'Notes', rows: 2 },
];

function DiagnosticTab({
  beneficiaryId,
  diagnostic,
  canEdit,
  onSaved,
}: {
  beneficiaryId: string;
  diagnostic: DiagnosticData | null;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(!diagnostic && canEdit);
  const [form, setForm] = useState<Record<string, string>>({
    maturityLevel: diagnostic?.maturityLevel ?? '',
    constraints: diagnostic?.constraints ?? '',
    needs: diagnostic?.needs ?? '',
    objectives: diagnostic?.objectives ?? '',
    risks: diagnostic?.risks ?? '',
    priorities: diagnostic?.priorities ?? '',
    notes: diagnostic?.notes ?? '',
    conductedAt: diagnostic?.conductedAt ? diagnostic.conductedAt.slice(0, 10) : '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set =
    (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    setErr('');
    try {
      const token = authStorage.getAccessToken();
      const body: Record<string, unknown> = {};
      if (form.maturityLevel) body.maturityLevel = form.maturityLevel;
      if (form.conductedAt) body.conductedAt = form.conductedAt;
      DIAG_FIELDS.forEach((f) => {
        if (form[f.key]) body[f.key] = form[f.key];
      });

      const res = await fetch(`/api/v1/beneficiaries/${beneficiaryId}/diagnostic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authStorage.getAccessToken()}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.message ?? 'Erreur');
      }
      setEditing(false);
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            {diagnostic ? 'Modifier le diagnostic' : 'Démarrer le diagnostic'}
          </h2>
          {diagnostic && (
            <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {err && <p className="text-xs text-red-600">{err}</p>}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Niveau de maturité
            </label>
            <select
              value={form.maturityLevel}
              onChange={set('maturityLevel')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Non évalué</option>
              {Object.values(MaturityLevel).map((m) => (
                <option key={m} value={m}>
                  {MATURITY_LABEL[m]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Date du diagnostic
            </label>
            <input
              type="date"
              value={form.conductedAt}
              onChange={set('conductedAt')}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {DIAG_FIELDS.map((f) => (
          <div key={f.key}>
            <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
            <textarea
              value={form[f.key]}
              onChange={set(f.key)}
              rows={f.rows ?? 2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        ))}

        <div className="flex gap-2 pt-2">
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" /> {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          {diagnostic && (
            <button
              onClick={() => setEditing(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!diagnostic) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white py-12 text-center">
        <ClipboardList className="h-8 w-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-400 mb-3">Aucun diagnostic enregistré</p>
        {canEdit && (
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Démarrer le diagnostic
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-700">Diagnostic initial</h2>
          {diagnostic.maturityLevel && (
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${MATURITY_CLS[diagnostic.maturityLevel]}`}
            >
              Maturité : {MATURITY_LABEL[diagnostic.maturityLevel]}
            </span>
          )}
          {diagnostic.conductedAt && (
            <span className="text-xs text-gray-400">
              Conduit le {new Date(diagnostic.conductedAt).toLocaleDateString('fr-FR')}
            </span>
          )}
        </div>
        {canEdit && (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            <Edit2 className="h-3.5 w-3.5" /> Modifier
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {DIAG_FIELDS.map(
          (f) =>
            diagnostic[f.key] && (
              <div key={f.key}>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                  {f.label}
                </p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {diagnostic[f.key] as string}
                </p>
              </div>
            ),
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ActionsTab                                                         */
/* ------------------------------------------------------------------ */

function ActionsTab({
  beneficiaryId,
  actions,
  canEdit,
  onSaved,
}: {
  beneficiaryId: string;
  actions: Action[];
  canEdit: boolean;
  onSaved: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    actionType: 'accompagnement',
    dueDate: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  /* Mise à jour statut d'une action */
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const set =
    (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const createAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr('');
    try {
      const token = authStorage.getAccessToken();
      const body: Record<string, unknown> = {
        title: form.title,
        actionType: form.actionType,
      };
      if (form.description) body.description = form.description;
      if (form.dueDate) body.dueDate = form.dueDate;
      if (form.notes) body.notes = form.notes;

      const res = await fetch(`/api/v1/beneficiaries/${beneficiaryId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.message ?? 'Erreur');
      }
      setShowForm(false);
      setForm({ title: '', description: '', actionType: 'accompagnement', dueDate: '', notes: '' });
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (actionId: string, status: AccompanimentActionStatus) => {
    setUpdatingId(actionId);
    try {
      const token = authStorage.getAccessToken();
      const data: Record<string, unknown> = { status };
      if (status === AccompanimentActionStatus.COMPLETED) {
        data.completedAt = new Date().toISOString();
      }
      const res = await fetch(`/api/v1/beneficiaries/${beneficiaryId}/actions/${actionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const j = await res.json();
        setErr(j.message ?? 'Erreur');
        return;
      }
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setUpdatingId(null);
    }
  };

  const grouped = {
    active: actions.filter((a) =>
      [AccompanimentActionStatus.IN_PROGRESS, AccompanimentActionStatus.PLANNED].includes(a.status),
    ),
    completed: actions.filter((a) => a.status === AccompanimentActionStatus.COMPLETED),
    cancelled: actions.filter((a) => a.status === AccompanimentActionStatus.CANCELLED),
  };

  return (
    <div className="space-y-4">
      {/* Header + bouton ajout */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {actions.length} action{actions.length > 1 ? 's' : ''} au total
        </p>
        {canEdit && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Nouvelle action
          </button>
        )}
      </div>

      {/* Formulaire de création */}
      {showForm && (
        <form
          onSubmit={createAction}
          className="rounded-xl border border-blue-200 bg-blue-50 p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-blue-800">Nouvelle action d'accompagnement</p>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-blue-400 hover:text-blue-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {err && <p className="text-xs text-red-600">{err}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <input
                type="text"
                value={form.title}
                onChange={set('title')}
                required
                placeholder="Titre de l'action *"
                className="w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <select
                value={form.actionType}
                onChange={set('actionType')}
                className="w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(ACTION_TYPE_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <input
                type="date"
                value={form.dueDate}
                onChange={set('dueDate')}
                className="w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Échéance"
                title="Échéance"
              />
            </div>
            <div className="col-span-2">
              <textarea
                value={form.description}
                onChange={set('description')}
                rows={2}
                placeholder="Description (optionnel)"
                className="w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" /> {saving ? 'Création…' : 'Créer'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Actions en cours / planifiées */}
      {grouped.active.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            En cours & planifiées
          </p>
          {grouped.active.map((a) => (
            <ActionCard
              key={a.id}
              action={a}
              canEdit={canEdit}
              onUpdateStatus={(s) => updateStatus(a.id, s)}
              updating={updatingId === a.id}
            />
          ))}
        </div>
      )}

      {/* Actions terminées */}
      {grouped.completed.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Terminées ({grouped.completed.length})
          </p>
          {grouped.completed.map((a) => (
            <ActionCard
              key={a.id}
              action={a}
              canEdit={canEdit}
              onUpdateStatus={(s) => updateStatus(a.id, s)}
              updating={updatingId === a.id}
            />
          ))}
        </div>
      )}

      {/* Actions annulées */}
      {grouped.cancelled.length > 0 && (
        <details className="group">
          <summary className="text-xs font-semibold text-gray-400 uppercase tracking-wide cursor-pointer">
            Annulées ({grouped.cancelled.length})
          </summary>
          <div className="mt-2 space-y-2">
            {grouped.cancelled.map((a) => (
              <ActionCard
                key={a.id}
                action={a}
                canEdit={false}
                onUpdateStatus={(s) => updateStatus(a.id, s)}
                updating={false}
              />
            ))}
          </div>
        </details>
      )}

      {actions.length === 0 && !showForm && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-12 text-center">
          <ClipboardList className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Aucune action d'accompagnement</p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ActionCard                                                         */
/* ------------------------------------------------------------------ */

function ActionCard({
  action,
  canEdit,
  onUpdateStatus,
  updating,
}: {
  action: Action;
  canEdit: boolean;
  onUpdateStatus: (s: AccompanimentActionStatus) => void;
  updating: boolean;
}) {
  const isActive = [
    AccompanimentActionStatus.PLANNED,
    AccompanimentActionStatus.IN_PROGRESS,
  ].includes(action.status);

  return (
    <div
      className={`rounded-xl border bg-white px-4 py-3 flex items-start gap-3 ${
        action.status === AccompanimentActionStatus.COMPLETED
          ? 'border-green-100 bg-green-50/30'
          : action.status === AccompanimentActionStatus.CANCELLED
            ? 'border-gray-100 opacity-60'
            : 'border-gray-200'
      }`}
    >
      {/* Icône statut */}
      <div className="flex-shrink-0 mt-0.5">
        {action.status === AccompanimentActionStatus.COMPLETED ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : action.status === AccompanimentActionStatus.IN_PROGRESS ? (
          <Clock className="h-4 w-4 text-blue-500" />
        ) : (
          <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
        )}
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">{action.title}</p>
            <p className="text-xs text-gray-400">
              {ACTION_TYPE_LABEL[action.actionType] ?? action.actionType}
              {action.dueDate &&
                ` · Échéance ${new Date(action.dueDate).toLocaleDateString('fr-FR')}`}
              {action.completedAt &&
                ` · Terminée le ${new Date(action.completedAt).toLocaleDateString('fr-FR')}`}
            </p>
          </div>
          <span
            className={`flex-shrink-0 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_STATUS_CLS[action.status]}`}
          >
            {ACTION_STATUS_LABEL[action.status]}
          </span>
        </div>
        {action.notes && <p className="text-xs text-gray-500 mt-1">{action.notes}</p>}

        {/* Actions rapides */}
        {canEdit && isActive && (
          <div className="flex gap-2 mt-2">
            {action.status === AccompanimentActionStatus.PLANNED && (
              <button
                onClick={() => onUpdateStatus(AccompanimentActionStatus.IN_PROGRESS)}
                disabled={updating}
                className="text-xs text-blue-600 hover:underline disabled:opacity-50"
              >
                Démarrer
              </button>
            )}
            {action.status !== AccompanimentActionStatus.COMPLETED && (
              <button
                onClick={() => onUpdateStatus(AccompanimentActionStatus.COMPLETED)}
                disabled={updating}
                className="text-xs text-green-600 hover:underline disabled:opacity-50"
              >
                Marquer terminée
              </button>
            )}
            <button
              onClick={() => onUpdateStatus(AccompanimentActionStatus.CANCELLED)}
              disabled={updating}
              className="text-xs text-red-400 hover:underline disabled:opacity-50"
            >
              Annuler
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
