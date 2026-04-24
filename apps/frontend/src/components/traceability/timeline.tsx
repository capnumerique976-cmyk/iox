'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Package,
  ArrowRight,
  CheckCircle2,
  XCircle,
  FileText,
  ShieldCheck,
  Upload,
  Eye,
  RefreshCw,
  Truck,
  Factory,
} from 'lucide-react';
import { authStorage } from '@/lib/auth';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface TimelineEvent {
  id: string;
  type: string;
  date: string;
  title: string;
  detail?: string;
  actor?: string;
  icon: string;
  variant: 'default' | 'success' | 'warning' | 'error' | 'info';
}

interface TraceChain {
  inboundBatch: {
    id: string;
    code: string;
    status: string;
    quantity: number;
    unit: string;
    supplier: { name: string };
    product: { name: string };
  } | null;
  transformationOp: {
    id: string;
    code: string;
    name: string;
    yieldRate?: number;
  } | null;
  productBatch: {
    id: string;
    code: string;
    status: string;
    quantity: number;
    unit: string;
  };
  product: { id: string; code: string; name: string; status: string };
  latestLabelValidation?: { isValid: boolean; validatedAt?: string } | null;
  activeMarketDecision?: { decision: string; decidedAt?: string } | null;
  counts: { documents: number; labelValidations: number; marketReleaseDecisions: number };
}

/* ------------------------------------------------------------------ */
/*  Icon & style helpers                                                */
/* ------------------------------------------------------------------ */

const ICON_MAP: Record<string, React.ElementType> = {
  package: Package,
  status: RefreshCw,
  'file-text': FileText,
  shield: ShieldCheck,
  upload: Upload,
  eye: Eye,
};

const VARIANT_CLS: Record<string, string> = {
  default: 'bg-gray-100 text-gray-600',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
};

const VARIANT_DOT: Record<string, string> = {
  default: 'bg-gray-300',
  success: 'bg-green-500',
  warning: 'bg-yellow-400',
  error: 'bg-red-500',
  info: 'bg-blue-500',
};

const DECISION_LABEL: Record<string, string> = {
  COMPLIANT: '✅ Conforme',
  COMPLIANT_WITH_RESERVATIONS: '⚠️ Conforme avec réserves',
  NON_COMPLIANT: '🚫 Non conforme',
};

/* ------------------------------------------------------------------ */
/*  TraceabilityPanel — onglet principal                               */
/* ------------------------------------------------------------------ */

export function TraceabilityPanel({ batchId }: { batchId: string }) {
  const [activeView, setActiveView] = useState<'timeline' | 'chain'>('chain');
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [chain, setChain] = useState<TraceChain | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = authStorage.getAccessToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [tlRes, chainRes] = await Promise.all([
        fetch(`/api/v1/traceability/batch/${batchId}/timeline`, { headers }),
        fetch(`/api/v1/traceability/batch/${batchId}/chain`, { headers }),
      ]);

      if (tlRes.ok) {
        const j = await tlRes.json();
        setTimeline(Array.isArray(j) ? j : (j.data ?? []));
      }
      if (chainRes.ok) {
        const j = await chainRes.json();
        setChain(j.data ?? j);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !chain) {
    return (
      <div className="py-12 text-center text-sm text-gray-500">Chargement de la traçabilité…</div>
    );
  }
  if (error) {
    return <div className="py-8 text-center text-sm text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg border border-gray-200 bg-white p-0.5 gap-0.5">
          {(['chain', 'timeline'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setActiveView(v)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                activeView === v
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {v === 'chain' ? '🔗 Chaîne de traçabilité' : '📋 Timeline des événements'}
            </button>
          ))}
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="ml-auto text-xs text-blue-600 hover:underline disabled:opacity-40"
        >
          {loading ? 'Actualisation…' : '↻ Actualiser'}
        </button>
      </div>

      {activeView === 'chain' && chain && <ChainView chain={chain} />}
      {activeView === 'timeline' && <TimelineView events={timeline} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ChainView — visualisation de la chaîne                            */
/* ------------------------------------------------------------------ */

function ChainView({ chain }: { chain: TraceChain }) {
  return (
    <div className="space-y-4">
      <div className="flex items-stretch gap-0 overflow-x-auto pb-2">
        {/* Nœud 1 — Lot entrant */}
        {chain.inboundBatch ? (
          <ChainNode
            icon={<Truck className="h-5 w-5" />}
            color="bg-orange-500"
            label="Lot entrant"
            lines={[
              chain.inboundBatch.code,
              `${chain.inboundBatch.quantity} ${chain.inboundBatch.unit}`,
              chain.inboundBatch.supplier.name,
            ]}
            badge={chain.inboundBatch.status}
            href={`/inbound-batches/${chain.inboundBatch.id}`}
          />
        ) : (
          <ChainNode
            icon={<Truck className="h-5 w-5" />}
            color="bg-gray-300"
            label="Lot entrant"
            lines={['Aucune transformation']}
            badge=""
          />
        )}

        <ChainArrow />

        {/* Nœud 2 — Transformation */}
        {chain.transformationOp ? (
          <ChainNode
            icon={<Factory className="h-5 w-5" />}
            color="bg-purple-500"
            label="Transformation"
            lines={[
              chain.transformationOp.code,
              chain.transformationOp.name,
              chain.transformationOp.yieldRate != null
                ? `Taux : ${chain.transformationOp.yieldRate} %`
                : 'Taux non renseigné',
            ]}
            badge=""
            href={`/transformation-operations/${chain.transformationOp.id}`}
          />
        ) : (
          <ChainNode
            icon={<Factory className="h-5 w-5" />}
            color="bg-gray-300"
            label="Transformation"
            lines={['Lot créé manuellement']}
            badge=""
          />
        )}

        <ChainArrow />

        {/* Nœud 3 — Lot fini */}
        <ChainNode
          icon={<Package className="h-5 w-5" />}
          color="bg-blue-500"
          label="Lot fini"
          lines={[
            chain.productBatch.code,
            `${chain.productBatch.quantity} ${chain.productBatch.unit}`,
          ]}
          badge={chain.productBatch.status}
          highlighted
        />

        <ChainArrow />

        {/* Nœud 4 — Produit */}
        <ChainNode
          icon={<Package className="h-5 w-5" />}
          color="bg-teal-500"
          label="Produit"
          lines={[chain.product.code, chain.product.name]}
          badge={chain.product.status}
          href={`/products/${chain.product.id}`}
        />
      </div>

      {/* Résumé état qualité */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 uppercase mb-2">Étiquetage</p>
          {chain.latestLabelValidation ? (
            <span
              className={`inline-flex items-center gap-1 text-sm font-medium ${
                chain.latestLabelValidation.isValid ? 'text-green-700' : 'text-red-600'
              }`}
            >
              {chain.latestLabelValidation.isValid ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Conforme
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" /> Non conforme
                </>
              )}
            </span>
          ) : (
            <span className="text-sm text-gray-400">Aucune validation</span>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 uppercase mb-2">Décision marché</p>
          {chain.activeMarketDecision ? (
            <span className="text-sm font-medium text-gray-800">
              {DECISION_LABEL[chain.activeMarketDecision.decision] ??
                chain.activeMarketDecision.decision}
            </span>
          ) : (
            <span className="text-sm text-gray-400">Aucune décision</span>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 uppercase mb-2">Documents</p>
          <span className="text-2xl font-bold text-gray-900">{chain.counts.documents}</span>
          <span className="text-xs text-gray-500 ml-1">fichier(s)</span>
        </div>
      </div>
    </div>
  );
}

function ChainNode({
  icon,
  color,
  label,
  lines,
  badge,
  href,
  highlighted = false,
}: {
  icon: React.ReactNode;
  color: string;
  label: string;
  lines: string[];
  badge: string;
  href?: string;
  highlighted?: boolean;
}) {
  const inner = (
    <div
      className={`min-w-[160px] rounded-xl border-2 p-4 transition-all ${
        highlighted
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className={`inline-flex rounded-lg p-2 mb-3 ${color}`}>
        <span className="text-white">{icon}</span>
      </div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      {lines.map((l, i) => (
        <p
          key={i}
          className={`text-sm ${i === 0 ? 'font-semibold text-gray-900 font-mono' : 'text-gray-500'}`}
        >
          {l}
        </p>
      ))}
      {badge && (
        <span className="mt-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          {badge}
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}

function ChainArrow() {
  return (
    <div className="flex items-center px-2 flex-shrink-0">
      <ArrowRight className="h-5 w-5 text-gray-300" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TimelineView — liste chronologique                                 */
/* ------------------------------------------------------------------ */

function TimelineView({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex flex-col items-center justify-center h-32 text-gray-400 gap-2">
          <Eye className="h-8 w-8" />
          <p className="text-sm">Aucun événement enregistré</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-700">{events.length} événement(s)</p>
      </div>
      <div className="relative px-5 py-4">
        {/* Ligne verticale */}
        <div className="absolute left-[2.35rem] top-0 bottom-0 w-px bg-gray-100" />

        <ol className="space-y-6">
          {events.map((ev, idx) => {
            const IconComp = ICON_MAP[ev.icon] ?? Eye;
            const isLast = idx === events.length - 1;

            return (
              <li key={ev.id} className="flex gap-4 relative">
                {/* Dot */}
                <div className="flex-shrink-0 flex flex-col items-center" style={{ width: 28 }}>
                  <span
                    className={`h-2.5 w-2.5 rounded-full border-2 border-white mt-1 flex-shrink-0 ${VARIANT_DOT[ev.variant]}`}
                  />
                  {!isLast && <div className="flex-1" />}
                </div>

                {/* Icon badge */}
                <div className={`flex-shrink-0 rounded-lg p-1.5 h-fit ${VARIANT_CLS[ev.variant]}`}>
                  <IconComp className="h-3.5 w-3.5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 leading-tight">{ev.title}</p>
                    <time className="flex-shrink-0 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(ev.date).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                  </div>
                  {ev.detail && (
                    <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{ev.detail}</p>
                  )}
                  {ev.actor && <p className="mt-0.5 text-xs text-gray-400">par {ev.actor}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
