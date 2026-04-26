'use client';

// MP-EDIT-PRODUCT.1 — Détail + édition seller d'un produit marketplace.
//
// Pattern miroir de /seller/profile/edit/page.tsx :
//   - client component, controlled state, dirty via comparaison de form ↔ initial
//   - buildPayload n'envoie que le diff
//   - validation client miroir DTO backend (max length, pair GPS, bornes)
//
// Périmètre strict : seuls les "champs sûrs" sont exposés (cf.
// UpdateMarketplaceProductInput dans @/lib/marketplace-products). slug,
// categoryId, mainMediaId, publicationStatus, MOQ, défaultUnit, nutrition,
// saisonnalité ne sont PAS éditables ici — affichés en lecture seule pour
// ceux qui ont du sens (statut, saisonnalité avec lien vers /seasonality,
// MOQ/unit).
//
// Banner « re-revue » si publicationStatus ∈ {APPROVED, PUBLISHED} ET dirty
// — modifier ces champs côté backend déclenche le passage IN_REVIEW.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Archive,
  ArrowLeft,
  AlertCircle,
  Award,
  Calendar,
  CheckCircle2,
  Info,
  Loader2,
  Save,
  Send,
} from 'lucide-react';
import { ApiError } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import {
  marketplaceProductsApi,
  type SellerMarketplaceProduct,
  type UpdateMarketplaceProductInput,
} from '@/lib/marketplace-products';
import { PageHeader } from '@/components/ui/page-header';
import { useConfirm } from '@/components/ui/confirm-dialog';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string; status?: number }
  | { kind: 'ready'; product: SellerMarketplaceProduct };

interface FormState {
  // Identité
  commercialName: string;
  regulatoryName: string;
  subtitle: string;
  // Origine
  originCountry: string;
  originRegion: string;
  originLocality: string;
  altitudeMeters: string; // input contrôlé
  gpsLat: string;
  gpsLng: string;
  // Variétés
  varietySpecies: string;
  productionMethod: string;
  // Descriptions
  descriptionShort: string;
  descriptionLong: string;
  usageTips: string;
  // Conservation
  packagingDescription: string;
  storageConditions: string;
  shelfLifeInfo: string;
  allergenInfo: string;
}

const EMPTY: FormState = {
  commercialName: '',
  regulatoryName: '',
  subtitle: '',
  originCountry: '',
  originRegion: '',
  originLocality: '',
  altitudeMeters: '',
  gpsLat: '',
  gpsLng: '',
  varietySpecies: '',
  productionMethod: '',
  descriptionShort: '',
  descriptionLong: '',
  usageTips: '',
  packagingDescription: '',
  storageConditions: '',
  shelfLifeInfo: '',
  allergenInfo: '',
};

function gpsToString(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '';
  return String(v);
}

function fromProduct(p: SellerMarketplaceProduct): FormState {
  return {
    commercialName: p.commercialName ?? '',
    regulatoryName: p.regulatoryName ?? '',
    subtitle: p.subtitle ?? '',
    originCountry: p.originCountry ?? '',
    originRegion: p.originRegion ?? '',
    originLocality: p.originLocality ?? '',
    altitudeMeters:
      p.altitudeMeters != null && Number.isFinite(p.altitudeMeters)
        ? String(p.altitudeMeters)
        : '',
    gpsLat: gpsToString(p.gpsLat),
    gpsLng: gpsToString(p.gpsLng),
    varietySpecies: p.varietySpecies ?? '',
    productionMethod: p.productionMethod ?? '',
    descriptionShort: p.descriptionShort ?? '',
    descriptionLong: p.descriptionLong ?? '',
    usageTips: p.usageTips ?? '',
    packagingDescription: p.packagingDescription ?? '',
    storageConditions: p.storageConditions ?? '',
    shelfLifeInfo: p.shelfLifeInfo ?? '',
    allergenInfo: p.allergenInfo ?? '',
  };
}

/**
 * Construit le payload PATCH en n'envoyant QUE les champs modifiés.
 * Les nombres vides (`''`) ne sont pas envoyés.
 */
function buildPayload(
  initial: FormState,
  current: FormState,
): UpdateMarketplaceProductInput {
  const out: UpdateMarketplaceProductInput = {};
  const setStr = (k: keyof UpdateMarketplaceProductInput, v: string) => {
    (out as Record<string, unknown>)[k] = v;
  };
  if (current.commercialName !== initial.commercialName)
    setStr('commercialName', current.commercialName.trim());
  if (current.regulatoryName !== initial.regulatoryName)
    setStr('regulatoryName', current.regulatoryName.trim());
  if (current.subtitle !== initial.subtitle) setStr('subtitle', current.subtitle.trim());
  if (current.originCountry !== initial.originCountry)
    setStr('originCountry', current.originCountry.trim());
  if (current.originRegion !== initial.originRegion)
    setStr('originRegion', current.originRegion.trim());
  if (current.originLocality !== initial.originLocality)
    setStr('originLocality', current.originLocality.trim());
  if (current.varietySpecies !== initial.varietySpecies)
    setStr('varietySpecies', current.varietySpecies.trim());
  if (current.productionMethod !== initial.productionMethod)
    setStr('productionMethod', current.productionMethod.trim());
  if (current.descriptionShort !== initial.descriptionShort)
    setStr('descriptionShort', current.descriptionShort);
  if (current.descriptionLong !== initial.descriptionLong)
    setStr('descriptionLong', current.descriptionLong);
  if (current.usageTips !== initial.usageTips) setStr('usageTips', current.usageTips);
  if (current.packagingDescription !== initial.packagingDescription)
    setStr('packagingDescription', current.packagingDescription);
  if (current.storageConditions !== initial.storageConditions)
    setStr('storageConditions', current.storageConditions);
  if (current.shelfLifeInfo !== initial.shelfLifeInfo)
    setStr('shelfLifeInfo', current.shelfLifeInfo);
  if (current.allergenInfo !== initial.allergenInfo)
    setStr('allergenInfo', current.allergenInfo);

  if (current.altitudeMeters !== initial.altitudeMeters) {
    if (current.altitudeMeters.trim() === '') {
      // n'envoie rien : on ne supporte pas l'effacement explicite ici (DTO
      // accepte uniquement number, pas null).
    } else {
      const n = Number.parseInt(current.altitudeMeters, 10);
      if (Number.isFinite(n)) out.altitudeMeters = n;
    }
  }
  if (current.gpsLat !== initial.gpsLat && current.gpsLat.trim() !== '') {
    const n = Number.parseFloat(current.gpsLat);
    if (Number.isFinite(n)) out.gpsLat = n;
  }
  if (current.gpsLng !== initial.gpsLng && current.gpsLng.trim() !== '') {
    const n = Number.parseFloat(current.gpsLng);
    if (Number.isFinite(n)) out.gpsLng = n;
  }
  return out;
}

/**
 * Validation client miroir DTO backend.
 * Renvoie un message d'erreur ou null.
 */
function validateClient(form: FormState): string | null {
  if (form.commercialName.trim().length < 2)
    return 'Le nom commercial doit contenir au moins 2 caractères.';
  if (form.commercialName.length > 255)
    return 'Le nom commercial est limité à 255 caractères.';
  if (form.regulatoryName.length > 255)
    return 'Le nom réglementaire est limité à 255 caractères.';
  if (form.subtitle.length > 255) return 'Le sous-titre est limité à 255 caractères.';
  if (form.originCountry.trim().length === 0) return 'Le pays d’origine est requis.';
  if (form.originCountry.length > 100)
    return 'Le code pays est limité à 100 caractères.';
  if (form.originRegion.length > 100)
    return 'La région est limitée à 100 caractères.';
  if (form.originLocality.length > 160)
    return 'La localité est limitée à 160 caractères.';

  if (form.altitudeMeters.trim() !== '') {
    const n = Number.parseInt(form.altitudeMeters, 10);
    if (!Number.isFinite(n) || n < 0 || n > 9000)
      return 'L’altitude doit être un entier entre 0 et 9000 m.';
  }

  const latStr = form.gpsLat.trim();
  const lngStr = form.gpsLng.trim();
  // Pair GPS imposée backend : les deux ou aucun.
  if ((latStr === '') !== (lngStr === '')) {
    return 'Latitude et longitude GPS doivent être fournies ensemble (ou laissées vides toutes les deux).';
  }
  if (latStr !== '') {
    const lat = Number.parseFloat(latStr);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90)
      return 'La latitude doit être un nombre entre -90 et 90.';
  }
  if (lngStr !== '') {
    const lng = Number.parseFloat(lngStr);
    if (!Number.isFinite(lng) || lng < -180 || lng > 180)
      return 'La longitude doit être un nombre entre -180 et 180.';
  }
  return null;
}

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
  IN_REVIEW: 'bg-amber-50 text-amber-800 border-amber-200',
  APPROVED: 'bg-sky-50 text-sky-800 border-sky-200',
  PUBLISHED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-800 border-red-200',
  SUSPENDED: 'bg-orange-50 text-orange-800 border-orange-200',
  ARCHIVED: 'bg-gray-50 text-gray-500 border-gray-200',
};

export default function SellerMarketplaceProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const confirm = useConfirm();
  const id = params?.id ?? '';

  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [initial, setInitial] = useState<FormState>(EMPTY);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [workflowBusy, setWorkflowBusy] = useState<null | 'submit' | 'archive'>(null);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [workflowSuccess, setWorkflowSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    setSubmitError(null);
    setValidationError(null);
    setSuccess(false);
    try {
      const token = authStorage.getAccessToken() ?? '';
      const product = await marketplaceProductsApi.getById(id, token);
      const next = fromProduct(product);
      setInitial(next);
      setForm(next);
      setState({ kind: 'ready', product });
    } catch (err) {
      const status = err instanceof ApiError ? err.status : undefined;
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Produit indisponible';
      setState({ kind: 'error', message, status });
    }
  }, [id]);

  useEffect(() => {
    if (id) load();
  }, [id, load]);

  const dirty = useMemo(
    () => JSON.stringify(initial) !== JSON.stringify(form),
    [initial, form],
  );

  const set =
    <K extends keyof FormState>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      setSuccess(false);
      setSubmitError(null);
      setValidationError(null);
    };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    const clientError = validateClient(form);
    if (clientError) {
      setValidationError(clientError);
      return;
    }
    const payload = buildPayload(initial, form);
    if (Object.keys(payload).length === 0) return;
    setSaving(true);
    setSubmitError(null);
    setValidationError(null);
    setSuccess(false);
    try {
      const token = authStorage.getAccessToken() ?? '';
      const updated = await marketplaceProductsApi.update(id, payload, token);
      const next = fromProduct(updated);
      setInitial(next);
      setForm(next);
      setState({ kind: 'ready', product: updated });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3500);
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

  /** Réutilisable pour submit + archive : extrait le message d'erreur API. */
  function pickErrorMessage(err: unknown, fallback: string): string {
    if (err instanceof ApiError) return err.message || fallback;
    if (err instanceof Error) return err.message || fallback;
    return fallback;
  }

  async function onWorkflowSubmit() {
    if (state.kind !== 'ready') return;
    const ok = await confirm({
      title: 'Soumettre à la revue qualité ?',
      description:
        'Le produit passera en statut IN_REVIEW. Vous ne pourrez plus le modifier tant que la revue n’est pas terminée.',
      confirmLabel: 'Soumettre',
      cancelLabel: 'Annuler',
      tone: 'warning',
    });
    if (!ok) return;
    setWorkflowBusy('submit');
    setWorkflowError(null);
    setWorkflowSuccess(null);
    try {
      const token = authStorage.getAccessToken() ?? '';
      const updated = await marketplaceProductsApi.submit(id, token);
      const next = fromProduct(updated);
      setInitial(next);
      setForm(next);
      setState({ kind: 'ready', product: updated });
      setWorkflowSuccess('Produit soumis à la revue qualité.');
      setTimeout(() => setWorkflowSuccess(null), 3500);
    } catch (err) {
      setWorkflowError(pickErrorMessage(err, 'Échec de la soumission'));
    } finally {
      setWorkflowBusy(null);
    }
  }

  async function onWorkflowArchive() {
    if (state.kind !== 'ready') return;
    const ok = await confirm({
      title: 'Archiver ce produit ?',
      description:
        'Le produit sera retiré de votre tableau de bord et n’apparaîtra plus dans la marketplace. Cette action est destructive.',
      confirmLabel: 'Archiver',
      cancelLabel: 'Annuler',
      tone: 'danger',
    });
    if (!ok) return;
    setWorkflowBusy('archive');
    setWorkflowError(null);
    setWorkflowSuccess(null);
    try {
      const token = authStorage.getAccessToken() ?? '';
      await marketplaceProductsApi.archive(id, token);
      router.push('/seller/marketplace-products');
    } catch (err) {
      setWorkflowError(pickErrorMessage(err, 'Échec de l’archivage'));
      setWorkflowBusy(null);
    }
  }

  if (state.kind === 'loading') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement du produit…
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="space-y-3">
        <PageHeader title="Détail produit marketplace" />
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-medium">{state.message}</p>
            {state.status === 403 && (
              <p className="mt-1 text-xs" data-testid="hint-403">
                Ce produit n’est pas rattaché à votre profil vendeur.
              </p>
            )}
            {state.status === 404 && (
              <p className="mt-1 text-xs" data-testid="hint-404">
                Produit introuvable ou supprimé.
              </p>
            )}
          </div>
        </div>
        <Link
          href="/seller/marketplace-products"
          className="inline-flex items-center gap-1 text-xs text-gray-600 hover:underline"
        >
          <ArrowLeft className="h-3 w-3" /> Retour à mes produits
        </Link>
      </div>
    );
  }

  const product = state.product;
  const willTriggerReview =
    product.publicationStatus === 'APPROVED' || product.publicationStatus === 'PUBLISHED';
  const canSubmitWorkflow =
    product.publicationStatus === 'DRAFT' || product.publicationStatus === 'REJECTED';
  const canArchiveWorkflow = product.publicationStatus !== 'ARCHIVED';

  return (
    <div className="space-y-5">
      <PageHeader
        title={product.commercialName}
        subtitle={product.subtitle ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            {canSubmitWorkflow && (
              <button
                type="button"
                onClick={onWorkflowSubmit}
                disabled={workflowBusy !== null}
                data-testid="action-submit"
                className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {workflowBusy === 'submit' ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
                Soumettre à validation
              </button>
            )}
            {canArchiveWorkflow && (
              <button
                type="button"
                onClick={onWorkflowArchive}
                disabled={workflowBusy !== null}
                data-testid="action-archive"
                className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {workflowBusy === 'archive' ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Archive className="h-3 w-3" />
                )}
                Archiver
              </button>
            )}
            <Link
              href={`/seller/marketplace-products/${product.id}/seasonality`}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
              data-testid="link-seasonality"
            >
              <Calendar className="h-3 w-3" /> Saisonnalité
            </Link>
            <Link
              href={`/seller/marketplace-products/${product.id}/certifications`}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
              data-testid="link-certifications"
            >
              <Award className="h-3 w-3" /> Certifications
            </Link>
            <Link
              href="/seller/marketplace-products"
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft className="h-3 w-3" /> Mes produits
            </Link>
          </div>
        }
      />

      {/* Bandeau de statut */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className="text-gray-500">Statut publication :</span>
        <span
          data-testid="status-badge"
          className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
            STATUS_BADGE[product.publicationStatus] ?? STATUS_BADGE.DRAFT
          }`}
        >
          {product.publicationStatus}
        </span>
        <span className="text-gray-400">·</span>
        <span className="text-gray-400">Slug : {product.slug}</span>
      </div>

      {workflowError && (
        <div
          role="alert"
          data-testid="workflow-error"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{workflowError}</span>
        </div>
      )}
      {workflowSuccess && (
        <div
          role="status"
          data-testid="workflow-success"
          className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"
        >
          <CheckCircle2 className="h-4 w-4" /> {workflowSuccess}
        </div>
      )}

      {willTriggerReview && dirty && (
        <div
          data-testid="review-warning"
          className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
        >
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>
            Ce produit est <strong>{product.publicationStatus}</strong>. Modifier ce
            produit déclenchera une nouvelle <strong>revue qualité</strong> — la
            publication peut être suspendue le temps de la revue.
          </p>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Section title="Identité publique">
          <Field label="Nom commercial" required>
            <input
              type="text"
              value={form.commercialName}
              onChange={set('commercialName')}
              minLength={2}
              maxLength={255}
              required
              className={inputCls}
              data-testid="field-commercialName"
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Nom réglementaire" hint="Dénomination légale (optionnelle)">
              <input
                type="text"
                value={form.regulatoryName}
                onChange={set('regulatoryName')}
                maxLength={255}
                className={inputCls}
                data-testid="field-regulatoryName"
              />
            </Field>
            <Field label="Sous-titre" hint="Accroche commerciale (optionnelle)">
              <input
                type="text"
                value={form.subtitle}
                onChange={set('subtitle')}
                maxLength={255}
                className={inputCls}
                data-testid="field-subtitle"
              />
            </Field>
          </div>
        </Section>

        <Section title="Origine">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Pays" required hint="Code ISO recommandé (YT, FR, …)">
              <input
                type="text"
                value={form.originCountry}
                onChange={set('originCountry')}
                maxLength={100}
                required
                className={inputCls}
                data-testid="field-originCountry"
              />
            </Field>
            <Field label="Région">
              <input
                type="text"
                value={form.originRegion}
                onChange={set('originRegion')}
                maxLength={100}
                className={inputCls}
                data-testid="field-originRegion"
              />
            </Field>
            <Field label="Localité / lieu-dit" hint="FP-6 — précision village">
              <input
                type="text"
                value={form.originLocality}
                onChange={set('originLocality')}
                maxLength={160}
                className={inputCls}
                data-testid="field-originLocality"
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Altitude (m)" hint="Entier 0–9000">
              <input
                type="number"
                min={0}
                max={9000}
                step={1}
                value={form.altitudeMeters}
                onChange={set('altitudeMeters')}
                className={inputCls}
                data-testid="field-altitudeMeters"
              />
            </Field>
            <Field label="GPS latitude" hint="-90 à 90 — pair avec longitude">
              <input
                type="number"
                step="any"
                min={-90}
                max={90}
                value={form.gpsLat}
                onChange={set('gpsLat')}
                className={inputCls}
                data-testid="field-gpsLat"
              />
            </Field>
            <Field label="GPS longitude" hint="-180 à 180 — pair avec latitude">
              <input
                type="number"
                step="any"
                min={-180}
                max={180}
                value={form.gpsLng}
                onChange={set('gpsLng')}
                className={inputCls}
                data-testid="field-gpsLng"
              />
            </Field>
          </div>
        </Section>

        <Section title="Variétés et méthode">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Variété / espèce">
              <input
                type="text"
                value={form.varietySpecies}
                onChange={set('varietySpecies')}
                className={inputCls}
                data-testid="field-varietySpecies"
              />
            </Field>
            <Field label="Méthode de production">
              <input
                type="text"
                value={form.productionMethod}
                onChange={set('productionMethod')}
                className={inputCls}
                data-testid="field-productionMethod"
              />
            </Field>
          </div>
        </Section>

        <Section title="Descriptions">
          <Field label="Description courte" hint={`${form.descriptionShort.length} caractères`}>
            <textarea
              value={form.descriptionShort}
              onChange={set('descriptionShort')}
              rows={2}
              className={textareaCls}
              data-testid="field-descriptionShort"
            />
          </Field>
          <Field label="Description détaillée" hint={`${form.descriptionLong.length} caractères`}>
            <textarea
              value={form.descriptionLong}
              onChange={set('descriptionLong')}
              rows={6}
              className={textareaCls}
              data-testid="field-descriptionLong"
            />
          </Field>
          <Field label="Conseils d’usage">
            <textarea
              value={form.usageTips}
              onChange={set('usageTips')}
              rows={3}
              className={textareaCls}
              data-testid="field-usageTips"
            />
          </Field>
        </Section>

        <Section title="Conservation et conditionnement">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Conditionnement">
              <textarea
                value={form.packagingDescription}
                onChange={set('packagingDescription')}
                rows={2}
                className={textareaCls}
                data-testid="field-packagingDescription"
              />
            </Field>
            <Field label="Conditions de conservation">
              <textarea
                value={form.storageConditions}
                onChange={set('storageConditions')}
                rows={2}
                className={textareaCls}
                data-testid="field-storageConditions"
              />
            </Field>
            <Field label="Durée de conservation (DLUO/DLC)">
              <textarea
                value={form.shelfLifeInfo}
                onChange={set('shelfLifeInfo')}
                rows={2}
                className={textareaCls}
                data-testid="field-shelfLifeInfo"
              />
            </Field>
            <Field label="Allergènes">
              <textarea
                value={form.allergenInfo}
                onChange={set('allergenInfo')}
                rows={2}
                className={textareaCls}
                data-testid="field-allergenInfo"
              />
            </Field>
          </div>
        </Section>

        <Section title="Lecture seule (édition réservée à d’autres écrans)">
          <div className="grid grid-cols-1 gap-3 text-xs text-gray-600 md:grid-cols-2">
            <div>
              <span className="block font-medium text-gray-700">Saisonnalité</span>
              <span data-testid="readonly-seasonality">
                {product.isYearRound
                  ? 'Toute l’année'
                  : `Récolte : ${(product.harvestMonths ?? []).join(', ') || '—'} · Disponibilité : ${
                      (product.availabilityMonths ?? []).join(', ') || '—'
                    }`}
              </span>
              <Link
                href={`/seller/marketplace-products/${product.id}/seasonality`}
                className="ml-1 text-premium-accent hover:underline"
              >
                modifier
              </Link>
            </div>
            <div>
              <span className="block font-medium text-gray-700">MOQ / unité</span>
              <span data-testid="readonly-moq">
                {product.minimumOrderQuantity != null
                  ? `${product.minimumOrderQuantity} ${product.defaultUnit ?? ''}`.trim()
                  : '—'}
              </span>
            </div>
          </div>
        </Section>

        {validationError && (
          <div
            role="alert"
            data-testid="validation-error"
            className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{validationError}</span>
          </div>
        )}
        {submitError && (
          <div
            role="alert"
            data-testid="submit-error"
            className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{submitError}</span>
          </div>
        )}
        {success && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"
          >
            <CheckCircle2 className="h-4 w-4" /> Produit mis à jour avec succès.
          </div>
        )}

        <div className="sticky bottom-2 flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white/95 p-3 shadow-premium-sm backdrop-blur">
          <p className="text-xs text-gray-500">
            {dirty ? 'Modifications non enregistrées.' : 'Aucune modification.'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setForm(initial);
                setSubmitError(null);
                setValidationError(null);
                setSuccess(false);
              }}
              disabled={!dirty || saving}
              className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Réinitialiser
            </button>
            <button
              type="submit"
              disabled={!dirty || saving}
              data-testid="submit-product"
              className="inline-flex items-center gap-2 rounded-md bg-premium-accent px-3 py-1.5 text-xs font-semibold text-white shadow-premium-sm transition-all duration-fast ease-premium hover:bg-premium-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

/* ─── UI helpers ──────────────────────────────────────────────────────────── */

const inputCls =
  'w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-premium-sm focus:border-premium-accent focus:outline-none focus:ring-1 focus:ring-premium-accent/40';
const textareaCls = `${inputCls} font-normal leading-relaxed`;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-gray-200/70 bg-white p-4 shadow-premium-sm">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-gray-400">{hint}</span>}
    </label>
  );
}
