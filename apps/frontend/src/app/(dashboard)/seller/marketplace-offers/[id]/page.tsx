'use client';

// MP-OFFER-VIEW (LOT 1) + MP-OFFER-EDIT-1 (LOT 2 mandat 14) — Détail seller
// d'une offre marketplace, avec mode édition champs sûrs et action submit.
//
// Mode lecture par défaut. Bouton "Éditer" → mode édition (inputs sur les
// champs autorisés cf. UpdateMarketplaceOfferInput). PATCH par diff
// minimal. Bouton "Soumettre à validation" si publicationStatus ∈
// {DRAFT, REJECTED}. Banner re-revue si édition sur APPROVED/PUBLISHED.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Info,
  Loader2,
  Package,
  Pencil,
  Save,
  Send,
  Truck,
  X,
} from 'lucide-react';
import { ApiError } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import {
  marketplaceOffersApi,
  type MarketplaceOfferDetail,
  type MarketplacePriceMode,
  type UpdateMarketplaceOfferInput,
} from '@/lib/marketplace-offers';
import { PageHeader } from '@/components/ui/page-header';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string; status?: number }
  | { kind: 'ready'; offer: MarketplaceOfferDetail };

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
  IN_REVIEW: 'bg-amber-50 text-amber-800 border-amber-200',
  APPROVED: 'bg-sky-50 text-sky-800 border-sky-200',
  PUBLISHED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-800 border-red-200',
  SUSPENDED: 'bg-orange-50 text-orange-800 border-orange-200',
  ARCHIVED: 'bg-gray-50 text-gray-500 border-gray-200',
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Brouillon',
  IN_REVIEW: 'En revue',
  APPROVED: 'Approuvée',
  PUBLISHED: 'Publiée',
  REJECTED: 'Rejetée',
  SUSPENDED: 'Suspendue',
  ARCHIVED: 'Archivée',
};

interface FormState {
  title: string;
  shortDescription: string;
  priceMode: MarketplacePriceMode;
  unitPrice: string;
  currency: string;
  moq: string;
  availableQuantity: string;
  availabilityStart: string;
  availabilityEnd: string;
  leadTimeDays: string;
  incoterm: string;
  departureLocation: string;
}

const EMPTY_FORM: FormState = {
  title: '',
  shortDescription: '',
  priceMode: 'FIXED',
  unitPrice: '',
  currency: '',
  moq: '',
  availableQuantity: '',
  availabilityStart: '',
  availabilityEnd: '',
  leadTimeDays: '',
  incoterm: '',
  departureLocation: '',
};

function fmtNum(v: string | number | null | undefined): string {
  if (v == null) return '—';
  const n = typeof v === 'string' ? Number(v) : v;
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('fr-FR');
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleString('fr-FR');
  } catch {
    return s;
  }
}

function fmtDestinations(d: MarketplaceOfferDetail['destinationMarketsJson']): string {
  if (!d) return '—';
  if (Array.isArray(d)) return d.map(String).join(', ') || '—';
  if (typeof d === 'object') {
    const keys = Object.keys(d);
    if (keys.length === 0) return '—';
    return keys.map((k) => `${k}: ${String((d as Record<string, unknown>)[k])}`).join(', ');
  }
  return String(d);
}

function fromOffer(o: MarketplaceOfferDetail): FormState {
  const num = (v: string | number | null | undefined): string => {
    if (v == null || v === '') return '';
    return String(v);
  };
  return {
    title: o.title ?? '',
    shortDescription: o.shortDescription ?? '',
    priceMode: o.priceMode,
    unitPrice: num(o.unitPrice),
    currency: o.currency ?? '',
    moq: num(o.moq),
    availableQuantity: num(o.availableQuantity),
    availabilityStart: o.availabilityStart ? o.availabilityStart.slice(0, 10) : '',
    availabilityEnd: o.availabilityEnd ? o.availabilityEnd.slice(0, 10) : '',
    leadTimeDays: o.leadTimeDays != null ? String(o.leadTimeDays) : '',
    incoterm: o.incoterm ?? '',
    departureLocation: o.departureLocation ?? '',
  };
}

function buildPayload(initial: FormState, current: FormState): UpdateMarketplaceOfferInput {
  const out: UpdateMarketplaceOfferInput = {};
  const sChanged = (k: keyof FormState) => initial[k] !== current[k];
  if (sChanged('title')) out.title = current.title.trim();
  if (sChanged('shortDescription')) out.shortDescription = current.shortDescription;
  if (sChanged('priceMode')) out.priceMode = current.priceMode;
  if (sChanged('unitPrice') && current.unitPrice !== '') out.unitPrice = Number(current.unitPrice);
  if (sChanged('currency') && current.currency !== '')
    out.currency = current.currency.trim().toUpperCase();
  if (sChanged('moq') && current.moq !== '') out.moq = Number(current.moq);
  if (sChanged('availableQuantity') && current.availableQuantity !== '')
    out.availableQuantity = Number(current.availableQuantity);
  if (sChanged('availabilityStart') && current.availabilityStart !== '')
    out.availabilityStart = current.availabilityStart;
  if (sChanged('availabilityEnd') && current.availabilityEnd !== '')
    out.availabilityEnd = current.availabilityEnd;
  if (sChanged('leadTimeDays') && current.leadTimeDays !== '')
    out.leadTimeDays = Number(current.leadTimeDays);
  if (sChanged('incoterm')) out.incoterm = current.incoterm;
  if (sChanged('departureLocation')) out.departureLocation = current.departureLocation;
  return out;
}

function validateClient(form: FormState): string | null {
  if (form.title.trim().length < 2) return 'Le titre doit contenir au moins 2 caractères.';
  if (form.unitPrice && Number.isNaN(Number(form.unitPrice)))
    return 'Le prix unitaire doit être numérique.';
  if (form.moq && Number.isNaN(Number(form.moq))) return 'Le MOQ doit être numérique.';
  if (form.availableQuantity && Number.isNaN(Number(form.availableQuantity)))
    return 'La quantité disponible doit être numérique.';
  if (form.leadTimeDays && Number.isNaN(Number(form.leadTimeDays)))
    return 'Le délai (jours) doit être numérique.';
  return null;
}

interface RowProps {
  label: string;
  value: React.ReactNode;
}
function Row({ label, value }: RowProps) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-gray-100 py-2 last:border-b-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900">{value ?? '—'}</dd>
    </div>
  );
}

interface SectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  testid?: string;
}
function Section({ title, icon, children, testid }: SectionProps) {
  return (
    <section
      data-testid={testid}
      className="rounded-xl border border-gray-200 bg-white p-5 shadow-premium-sm"
    >
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

const inputCls =
  'block w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-premium-accent focus:outline-none focus:ring-1 focus:ring-premium-accent';
const selectCls = inputCls;

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-700">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-gray-400">{hint}</span> : null}
    </label>
  );
}

export default function SellerMarketplaceOfferDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';

  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [initial, setInitial] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setState({ kind: 'loading' });
    try {
      const token = authStorage.getAccessToken() ?? '';
      const offer = await marketplaceOffersApi.getById(id, token);
      setState({ kind: 'ready', offer });
      const f = fromOffer(offer);
      setForm(f);
      setInitial(f);
    } catch (err) {
      if (err instanceof ApiError) {
        setState({ kind: 'error', message: err.message, status: err.status });
      } else {
        const message = err instanceof Error ? err.message : 'Offre indisponible';
        setState({ kind: 'error', message });
      }
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const set =
    <K extends keyof FormState>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      setSubmitError(null);
      setValidationError(null);
    };

  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initial),
    [form, initial],
  );

  const offer = state.kind === 'ready' ? state.offer : null;
  const status = offer?.publicationStatus ?? 'DRAFT';
  const isReReviewState = status === 'APPROVED' || status === 'PUBLISHED';
  const canSubmitForReview = status === 'DRAFT' || status === 'REJECTED';

  async function onSave() {
    if (!offer) return;
    const clientError = validateClient(form);
    if (clientError) {
      setValidationError(clientError);
      return;
    }
    const payload = buildPayload(initial, form);
    if (Object.keys(payload).length === 0) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setSubmitError(null);
    try {
      const token = authStorage.getAccessToken() ?? '';
      const updated = await marketplaceOffersApi.update(offer.id, payload, token);
      setState({ kind: 'ready', offer: updated });
      const f = fromOffer(updated);
      setForm(f);
      setInitial(f);
      setEditing(false);
    } catch (err) {
      if (err instanceof ApiError) {
        const details = err.details as unknown;
        if (Array.isArray(details) && details.length > 0) {
          setSubmitError(details.map((d) => String(d)).join(' · '));
        } else {
          setSubmitError(err.message);
        }
      } else if (err instanceof Error) {
        setSubmitError(err.message);
      } else {
        setSubmitError('Échec de la mise à jour');
      }
    } finally {
      setSaving(false);
    }
  }

  async function onSubmitForReview() {
    if (!offer) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const token = authStorage.getAccessToken() ?? '';
      const updated = await marketplaceOffersApi.submit(offer.id, token);
      setState({ kind: 'ready', offer: updated });
      const f = fromOffer(updated);
      setForm(f);
      setInitial(f);
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.message);
      } else if (err instanceof Error) {
        setSubmitError(err.message);
      } else {
        setSubmitError('Soumission impossible');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (state.kind === 'loading') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement de l’offre…
      </div>
    );
  }

  if (state.kind === 'error') {
    const isForbidden = state.status === 403;
    const isNotFound = state.status === 404;
    return (
      <div className="space-y-4">
        <PageHeader
          title="Offre marketplace"
          actions={
            <Link
              href="/seller/marketplace-offers"
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft className="h-3 w-3" /> Mes offres
            </Link>
          }
        />
        <div
          role="alert"
          data-testid="offer-error-banner"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-medium">{state.message}</p>
            {isForbidden ? (
              <p className="mt-1 text-xs text-red-700" data-testid="hint-403">
                Vous n’êtes pas propriétaire de cette offre.
              </p>
            ) : null}
            {isNotFound ? (
              <p className="mt-1 text-xs text-red-700" data-testid="hint-404">
                Cette offre n’existe plus ou a été archivée.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const o = state.offer;
  const statusClass = STATUS_BADGE[o.publicationStatus] ?? STATUS_BADGE.DRAFT;
  const statusLabel = STATUS_LABEL[o.publicationStatus] ?? o.publicationStatus;

  return (
    <div className="space-y-5">
      <PageHeader
        title={o.title}
        subtitle={
          o.marketplaceProduct?.commercialName
            ? `Offre rattachée à ${o.marketplaceProduct.commercialName}`
            : 'Offre marketplace'
        }
        actions={
          <div className="flex items-center gap-2">
            {!editing ? (
              <button
                type="button"
                data-testid="btn-edit-offer"
                onClick={() => {
                  setEditing(true);
                  setSubmitError(null);
                  setValidationError(null);
                }}
                className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
              >
                <Pencil className="h-3 w-3" /> Éditer
              </button>
            ) : (
              <button
                type="button"
                data-testid="btn-cancel-edit"
                onClick={() => {
                  setForm(initial);
                  setEditing(false);
                  setValidationError(null);
                  setSubmitError(null);
                }}
                className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
              >
                <X className="h-3 w-3" /> Annuler
              </button>
            )}
            {o.marketplaceProductId ? (
              <Link
                href={`/seller/marketplace-products/${o.marketplaceProductId}`}
                data-testid="offer-link-product"
                className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
              >
                <Package className="h-3 w-3" /> Produit parent
              </Link>
            ) : null}
            <Link
              href="/seller/marketplace-offers"
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft className="h-3 w-3" /> Mes offres
            </Link>
          </div>
        }
      />

      <div
        data-testid="offer-status-banner"
        className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm ${statusClass}`}
      >
        {o.publicationStatus === 'PUBLISHED' ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <Info className="h-4 w-4" />
        )}
        <span className="font-semibold uppercase tracking-wider">{statusLabel}</span>
      </div>

      {editing && isReReviewState && dirty && (
        <div
          data-testid="review-warning"
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
        >
          <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
          <p>
            Cette offre est <strong>{statusLabel}</strong> — la sauvegarde
            déclenchera une nouvelle revue staff (passage en{' '}
            <strong>IN_REVIEW</strong>).
          </p>
        </div>
      )}

      <Section title="Identité" testid="offer-section-identity">
        {editing ? (
          <div className="space-y-3">
            <Field label="Titre">
              <input
                type="text"
                value={form.title}
                onChange={set('title')}
                minLength={2}
                maxLength={255}
                className={inputCls}
                data-testid="field-title"
              />
            </Field>
            <Field label="Description courte">
              <textarea
                rows={3}
                value={form.shortDescription}
                onChange={set('shortDescription')}
                className={inputCls}
                data-testid="field-shortDescription"
              />
            </Field>
          </div>
        ) : (
          <dl>
            <Row label="Titre" value={o.title} />
            <Row label="Description courte" value={o.shortDescription ?? '—'} />
          </dl>
        )}
      </Section>

      <Section
        title="Produit lié"
        testid="offer-section-product"
        icon={<Package className="h-4 w-4 text-gray-400" />}
      >
        <dl>
          <Row
            label="Produit marketplace"
            value={
              o.marketplaceProduct ? (
                <Link
                  href={`/seller/marketplace-products/${o.marketplaceProductId}`}
                  className="text-premium-accent underline-offset-2 hover:underline"
                >
                  {o.marketplaceProduct.commercialName}
                </Link>
              ) : (
                o.marketplaceProductId
              )
            }
          />
          <Row label="Slug produit" value={o.marketplaceProduct?.slug ?? '—'} />
          <Row label="Statut produit" value={o.marketplaceProduct?.publicationStatus ?? '—'} />
        </dl>
      </Section>

      <Section title="Prix" testid="offer-section-price">
        {editing ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Mode tarifaire">
              <select
                value={form.priceMode}
                onChange={set('priceMode')}
                className={selectCls}
                data-testid="field-priceMode"
              >
                <option value="FIXED">Prix fixe</option>
                <option value="FROM_PRICE">À partir de</option>
                <option value="QUOTE_ONLY">Sur devis uniquement</option>
              </select>
            </Field>
            <Field label="Devise">
              <input
                type="text"
                value={form.currency}
                onChange={set('currency')}
                maxLength={4}
                className={`${inputCls} uppercase`}
                data-testid="field-currency"
              />
            </Field>
            <Field label="Prix unitaire">
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.unitPrice}
                onChange={set('unitPrice')}
                className={inputCls}
                data-testid="field-unitPrice"
              />
            </Field>
            <Field label="MOQ">
              <input
                type="number"
                step="0.001"
                min="0"
                value={form.moq}
                onChange={set('moq')}
                className={inputCls}
                data-testid="field-moq"
              />
            </Field>
            <Field label="Quantité disponible">
              <input
                type="number"
                step="0.001"
                min="0"
                value={form.availableQuantity}
                onChange={set('availableQuantity')}
                className={inputCls}
                data-testid="field-availableQuantity"
              />
            </Field>
          </div>
        ) : (
          <dl>
            <Row label="Mode" value={o.priceMode} />
            <Row label="Prix unitaire" value={`${fmtNum(o.unitPrice)} ${o.currency ?? ''}`.trim()} />
            <Row label="Devise" value={o.currency ?? '—'} />
            <Row label="MOQ" value={fmtNum(o.moq)} />
            <Row label="Quantité disponible" value={fmtNum(o.availableQuantity)} />
          </dl>
        )}
      </Section>

      <Section title="Disponibilité" testid="offer-section-availability">
        {editing ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Début">
              <input
                type="date"
                value={form.availabilityStart}
                onChange={set('availabilityStart')}
                className={inputCls}
                data-testid="field-availabilityStart"
              />
            </Field>
            <Field label="Fin">
              <input
                type="date"
                value={form.availabilityEnd}
                onChange={set('availabilityEnd')}
                className={inputCls}
                data-testid="field-availabilityEnd"
              />
            </Field>
            <Field label="Délai (jours)">
              <input
                type="number"
                min="0"
                value={form.leadTimeDays}
                onChange={set('leadTimeDays')}
                className={inputCls}
                data-testid="field-leadTimeDays"
              />
            </Field>
          </div>
        ) : (
          <dl>
            <Row label="Début" value={fmtDate(o.availabilityStart)} />
            <Row label="Fin" value={fmtDate(o.availabilityEnd)} />
            <Row label="Délai (jours)" value={o.leadTimeDays ?? '—'} />
          </dl>
        )}
      </Section>

      <Section
        title="Logistique commerciale"
        testid="offer-section-logistics"
        icon={<Truck className="h-4 w-4 text-gray-400" />}
      >
        {editing ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Incoterm">
              <input
                type="text"
                value={form.incoterm}
                onChange={set('incoterm')}
                maxLength={20}
                className={inputCls}
                data-testid="field-incoterm"
              />
            </Field>
            <Field label="Lieu de départ">
              <input
                type="text"
                value={form.departureLocation}
                onChange={set('departureLocation')}
                className={inputCls}
                data-testid="field-departureLocation"
              />
            </Field>
          </div>
        ) : (
          <dl>
            <Row label="Incoterm" value={o.incoterm ?? '—'} />
            <Row label="Lieu de départ" value={o.departureLocation ?? '—'} />
            <Row label="Marchés destination" value={fmtDestinations(o.destinationMarketsJson)} />
          </dl>
        )}
      </Section>

      <Section title="Visibilité" testid="offer-section-visibility">
        <dl>
          <Row label="Scope" value={o.visibilityScope} />
        </dl>
      </Section>

      <Section title="Workflow" testid="offer-section-workflow">
        <dl>
          <Row label="Statut publication" value={o.publicationStatus} />
          <Row label="Statut export readiness" value={o.exportReadinessStatus} />
          <Row label="Featured rank" value={o.featuredRank ?? '—'} />
          <Row label="Soumis à revue" value={fmtDate(o.submittedAt)} />
          <Row label="Approuvée" value={fmtDate(o.approvedAt)} />
          <Row label="Publiée" value={fmtDate(o.publishedAt)} />
          <Row label="Suspendue" value={fmtDate(o.suspendedAt)} />
          <Row label="Mise à jour" value={fmtDate(o.updatedAt)} />
          {o.rejectionReason ? <Row label="Motif rejet" value={o.rejectionReason} /> : null}
        </dl>
      </Section>

      {validationError && (
        <div
          role="alert"
          data-testid="validation-error"
          className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
        >
          <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" />
          <p>{validationError}</p>
        </div>
      )}

      {submitError && (
        <div
          role="alert"
          data-testid="submit-error"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900"
        >
          <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" />
          <p>{submitError}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {editing && (
          <button
            type="button"
            onClick={onSave}
            disabled={!dirty || saving}
            data-testid="btn-save-offer"
            className="inline-flex items-center gap-1 rounded-md bg-premium-accent px-3 py-1.5 text-xs font-semibold text-white shadow-premium-sm transition hover:bg-premium-primary disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
          >
            {saving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Enregistrement…
              </>
            ) : (
              <>
                <Save className="h-3 w-3" /> Enregistrer
              </>
            )}
          </button>
        )}
        {!editing && canSubmitForReview && (
          <button
            type="button"
            onClick={onSubmitForReview}
            disabled={submitting}
            data-testid="btn-submit-review"
            className="inline-flex items-center gap-1 rounded-md bg-premium-primary px-3 py-1.5 text-xs font-semibold text-white shadow-premium-sm transition hover:bg-premium-accent disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Soumission…
              </>
            ) : (
              <>
                <Send className="h-3 w-3" /> Soumettre à validation
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
