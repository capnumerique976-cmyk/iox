import { Page, Route } from '@playwright/test';
import { wrap } from './auth';
import { ADMIN_USER } from './marketplace';

/**
 * Helpers E2E marketplace-documents.
 *
 * State machine mutable qui simule le backend NestJS pour les scénarios P12 :
 *   - CRUD marketplace-documents (panel vendeur)
 *   - verify / reject (admin review-queue) avec convergence sur la queue
 *   - listage des Document sources disponibles
 *   - buyer-view / public filtering (PUBLIC + VERIFIED + non expiré)
 *
 * Choix de design :
 *   - Le panel vendeur utilise `api.get/post/...` → toutes les réponses sont
 *     encapsulées `{success, data, timestamp}`.
 *   - L'admin review-queue utilise `fetch` brut et lit `json.data` → on renvoie
 *     `{data, meta}` SANS enveloppe quand la requête vient de l'admin
 *     (détection : pas de paramètre `entityId`).
 *   - La convergence queue ↔ marketplaceDocument est exactement celle du
 *     backend (verify → VERIFIED + queue APPROVED ; reject → REJECTED +
 *     queue REJECTED ; update d'un VERIFIED → rebascule PENDING + nouvel item).
 */

export type Visibility = 'PRIVATE' | 'BUYER_ON_REQUEST' | 'PUBLIC';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
export type RelatedType =
  | 'SELLER_PROFILE'
  | 'MARKETPLACE_PRODUCT'
  | 'MARKETPLACE_OFFER'
  | 'PRODUCT_BATCH';

export interface MarketplaceDocumentMock {
  id: string;
  relatedType: RelatedType;
  relatedId: string;
  documentId: string;
  documentType: string;
  title: string;
  visibility: Visibility;
  verificationStatus: VerificationStatus;
  validFrom: string | null;
  validUntil: string | null;
  createdAt: string;
  updatedAt: string;
  document: {
    id: string;
    name: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
    storageKey: string;
    status: string;
    expiresAt: string | null;
  };
}

export interface SourceDocumentMock {
  id: string;
  name: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  linkedEntityType: string;
  linkedEntityId: string;
  status: 'ACTIVE' | 'SUPERSEDED';
  /** Source non supprimée même si le marketplaceDocument est détaché */
  deleted: boolean;
}

export interface DocQueueItem {
  id: string;
  entityType: RelatedType;
  entityId: string; // = marketplaceDocument.id
  reviewType: 'PUBLICATION' | 'MEDIA' | 'DOCUMENT';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewReason: string | null;
  reviewedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedByUser: { id: string; email: string; firstName: string; lastName: string } | null;
}

export interface DocumentsState {
  docs: Record<string, MarketplaceDocumentMock>;
  sources: Record<string, SourceDocumentMock>;
  queue: DocQueueItem[];
  nextId: number;
  nextQueueId: number;
  /** Mutations observables — utiles pour les assertions finales. */
  createCalls: Array<{ id: string; payload: Record<string, unknown> }>;
  updateCalls: Array<{ id: string; payload: Record<string, unknown> }>;
  deleteCalls: string[];
  verifyCalls: string[];
  rejectCalls: Array<{ id: string; reason: string }>;
}

export function makeDocumentsState(): DocumentsState {
  return {
    docs: {},
    sources: {},
    queue: [],
    nextId: 1,
    nextQueueId: 1,
    createCalls: [],
    updateCalls: [],
    deleteCalls: [],
    verifyCalls: [],
    rejectCalls: [],
  };
}

export function makeSourceDocument(
  overrides: Partial<SourceDocumentMock> = {},
): SourceDocumentMock {
  const now = new Date().toISOString();
  return {
    id: overrides.id ?? `doc-src-${Math.random().toString(36).slice(2, 8)}`,
    name: overrides.name ?? 'Certificat Ecocert 2026',
    originalFilename: overrides.originalFilename ?? 'ecocert-2026.pdf',
    mimeType: overrides.mimeType ?? 'application/pdf',
    sizeBytes: overrides.sizeBytes ?? 124_000,
    createdAt: overrides.createdAt ?? now,
    linkedEntityType: overrides.linkedEntityType ?? 'SELLER_PROFILE',
    linkedEntityId: overrides.linkedEntityId ?? 'seller-profile-1',
    status: overrides.status ?? 'ACTIVE',
    deleted: overrides.deleted ?? false,
  };
}

export function makeMarketplaceDocument(
  state: DocumentsState,
  overrides: Partial<MarketplaceDocumentMock> & { documentId: string },
): MarketplaceDocumentMock {
  const source = state.sources[overrides.documentId];
  if (!source) {
    throw new Error(
      `makeMarketplaceDocument: source Document ${overrides.documentId} absent du state.sources — appelez state.sources[id] = makeSourceDocument(...) d'abord.`,
    );
  }
  const id = overrides.id ?? `md-${state.nextId++}`;
  const now = new Date().toISOString();
  const doc: MarketplaceDocumentMock = {
    id,
    relatedType: overrides.relatedType ?? 'SELLER_PROFILE',
    relatedId: overrides.relatedId ?? 'seller-profile-1',
    documentId: source.id,
    documentType: overrides.documentType ?? 'CERT_BIO',
    title: overrides.title ?? source.name,
    visibility: overrides.visibility ?? 'PRIVATE',
    verificationStatus: overrides.verificationStatus ?? 'PENDING',
    validFrom: overrides.validFrom ?? null,
    validUntil: overrides.validUntil ?? null,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    document: {
      id: source.id,
      name: source.name,
      originalFilename: source.originalFilename,
      mimeType: source.mimeType,
      sizeBytes: source.sizeBytes,
      storageKey: `seller/docs/${source.originalFilename}`,
      status: source.status,
      expiresAt: null,
    },
  };
  state.docs[id] = doc;
  return doc;
}

export function enqueueDocumentReview(state: DocumentsState, docId: string): DocQueueItem {
  const doc = state.docs[docId];
  if (!doc) throw new Error(`enqueueDocumentReview: doc ${docId} absent`);
  const now = new Date().toISOString();
  const item: DocQueueItem = {
    id: `doc-queue-${state.nextQueueId++}`,
    entityType: doc.relatedType,
    entityId: docId,
    reviewType: 'DOCUMENT',
    status: 'PENDING',
    reviewReason: null,
    reviewedByUserId: null,
    createdAt: now,
    updatedAt: now,
    reviewedByUser: null,
  };
  state.queue.push(item);
  return item;
}

function isExpired(validUntil: string | null): boolean {
  if (!validUntil) return false;
  return new Date(validUntil).getTime() <= Date.now();
}

function resolvePendingForDocument(
  state: DocumentsState,
  docId: string,
  next: 'APPROVED' | 'REJECTED',
  reason: string | null,
) {
  const pending = state.queue.find(
    (q) => q.entityId === docId && q.reviewType === 'DOCUMENT' && q.status === 'PENDING',
  );
  if (!pending) return;
  pending.status = next;
  pending.reviewReason = reason;
  pending.reviewedByUserId = ADMIN_USER.id;
  pending.reviewedByUser = {
    id: ADMIN_USER.id,
    email: ADMIN_USER.email,
    firstName: ADMIN_USER.firstName,
    lastName: ADMIN_USER.lastName,
  };
  pending.updatedAt = new Date().toISOString();
}

/**
 * Monte toutes les routes /marketplace/documents + /marketplace/review-queue
 * (volet DOCUMENT) + /documents (sources) autour d'un `state` mutable.
 *
 * Les specs peuvent muter `state` entre deux navigations pour simuler la
 * progression du cycle (create → verify → update → delete).
 */
export async function mockMarketplaceDocumentsRoutes(page: Page, state: DocumentsState) {
  /* ------------------------------------------------------------------
   * Sources (Document de base) — utilisé par le CreateForm du panel
   * ------------------------------------------------------------------ */
  await page.route(/\/api\/v1\/documents(\?.*)?$/, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    const url = new URL(route.request().url());
    // Ne pas intercepter /marketplace/documents par erreur
    if (url.pathname.startsWith('/api/v1/marketplace/')) return route.fallback();

    const linkedEntityType = url.searchParams.get('linkedEntityType');
    const linkedEntityId = url.searchParams.get('linkedEntityId');
    const statusFilter = url.searchParams.get('status');

    const filtered = Object.values(state.sources).filter((s) => {
      if (s.deleted) return false;
      if (statusFilter && s.status !== statusFilter) return false;
      if (linkedEntityType && s.linkedEntityType !== linkedEntityType) return false;
      if (linkedEntityId && s.linkedEntityId !== linkedEntityId) return false;
      return true;
    });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        await wrap({
          data: filtered,
          meta: {
            total: filtered.length,
            page: 1,
            limit: 100,
            totalPages: 1,
          },
        }),
      ),
    });
  });

  /* ------------------------------------------------------------------
   * Marketplace documents — LIST
   * ------------------------------------------------------------------ */
  await page.route(/\/api\/v1\/marketplace\/documents(\?.*)?$/, async (route) => {
    if (route.request().method() === 'GET') {
      const url = new URL(route.request().url());
      const relatedType = url.searchParams.get('relatedType');
      const relatedId = url.searchParams.get('relatedId');
      const limit = Number(url.searchParams.get('limit') ?? '50');

      const filtered = Object.values(state.docs).filter((d) => {
        if (relatedType && d.relatedType !== relatedType) return false;
        if (relatedId && d.relatedId !== relatedId) return false;
        return true;
      });

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          await wrap({
            data: filtered,
            meta: {
              total: filtered.length,
              page: 1,
              limit,
              totalPages: 1,
            },
          }),
        ),
      });
      return;
    }

    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as {
        relatedType: RelatedType;
        relatedId: string;
        documentId: string;
        documentType: string;
        title: string;
        visibility?: Visibility;
        validFrom?: string;
        validUntil?: string;
      };

      if (!state.sources[body.documentId] || state.sources[body.documentId].deleted) {
        return route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { code: 'DOCUMENT_NOT_FOUND', message: 'Document source introuvable' },
          }),
        });
      }

      const doc = makeMarketplaceDocument(state, {
        relatedType: body.relatedType,
        relatedId: body.relatedId,
        documentId: body.documentId,
        documentType: body.documentType,
        title: body.title,
        visibility: body.visibility ?? 'PRIVATE',
        validFrom: body.validFrom ?? null,
        validUntil: body.validUntil ?? null,
        verificationStatus: 'PENDING',
      });
      enqueueDocumentReview(state, doc.id);
      state.createCalls.push({ id: doc.id, payload: body });

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(await wrap(doc)),
      });
      return;
    }

    return route.fallback();
  });

  /* ------------------------------------------------------------------
   * Marketplace documents — GET / PATCH / DELETE / verify / reject / url
   * ------------------------------------------------------------------ */
  await page.route(
    /\/api\/v1\/marketplace\/documents\/([^/?#]+)(\/[^?#]*)?(\?.*)?$/,
    async (route: Route) => {
      const pathname = new URL(route.request().url()).pathname;
      const match = pathname.match(/\/marketplace\/documents\/([^/]+)(?:\/([^/]+))?$/);
      if (!match) return route.fallback();
      const [, id, action] = match;
      const method = route.request().method();
      const doc = state.docs[id];

      // URL signée (seller/staff)
      if (action === 'url' && method === 'GET') {
        if (!doc) return route.fulfill({ status: 404, body: '{}' });
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(
            await wrap({
              id,
              url: `/__e2e_stub_document__/${id}.pdf`,
              expiresIn: 600,
            }),
          ),
        });
        return;
      }

      // public-url / buyer-view handled elsewhere — fallback to keep helper focused.

      // Verify (admin/QM) — POST
      if (action === 'verify' && method === 'POST') {
        if (!doc) return route.fulfill({ status: 404, body: '{}' });
        doc.verificationStatus = 'VERIFIED';
        doc.updatedAt = new Date().toISOString();
        resolvePendingForDocument(state, id, 'APPROVED', null);
        state.verifyCalls.push(id);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(await wrap(doc)),
        });
        return;
      }

      // Reject — POST
      if (action === 'reject' && method === 'POST') {
        if (!doc) return route.fulfill({ status: 404, body: '{}' });
        const body = route.request().postDataJSON() as { reason?: string } | undefined;
        if (!body?.reason || body.reason.trim().length < 3) {
          return route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { code: 'VALIDATION', message: 'Motif requis (3 caractères minimum)' },
            }),
          });
        }
        doc.verificationStatus = 'REJECTED';
        doc.updatedAt = new Date().toISOString();
        resolvePendingForDocument(state, id, 'REJECTED', body.reason);
        state.rejectCalls.push({ id, reason: body.reason });
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(await wrap(doc)),
        });
        return;
      }

      // GET :id
      if (!action && method === 'GET') {
        if (!doc) return route.fulfill({ status: 404, body: '{}' });
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(await wrap(doc)),
        });
        return;
      }

      // PATCH :id — update (rebascule PENDING si visibility/type/expiration changent sur un VERIFIED)
      if (!action && method === 'PATCH') {
        if (!doc) return route.fulfill({ status: 404, body: '{}' });
        const body = route.request().postDataJSON() as {
          title?: string;
          documentType?: string;
          visibility?: Visibility;
          validFrom?: string;
          validUntil?: string;
        };
        const wasVerified = doc.verificationStatus === 'VERIFIED';
        const triggersRequeue =
          (body.visibility !== undefined && body.visibility !== doc.visibility) ||
          (body.documentType !== undefined && body.documentType !== doc.documentType) ||
          (body.validUntil !== undefined && (body.validUntil || null) !== doc.validUntil);

        if (body.title !== undefined) doc.title = body.title;
        if (body.documentType !== undefined) doc.documentType = body.documentType;
        if (body.visibility !== undefined) doc.visibility = body.visibility;
        if (body.validFrom !== undefined) doc.validFrom = body.validFrom || null;
        if (body.validUntil !== undefined) doc.validUntil = body.validUntil || null;
        doc.updatedAt = new Date().toISOString();

        if (wasVerified && triggersRequeue) {
          doc.verificationStatus = 'PENDING';
          enqueueDocumentReview(state, id);
        }

        state.updateCalls.push({ id, payload: body });
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(await wrap(doc)),
        });
        return;
      }

      // DELETE :id — détache seulement le marketplace-document
      if (!action && method === 'DELETE') {
        if (!doc) return route.fulfill({ status: 404, body: '{}' });
        resolvePendingForDocument(state, id, 'APPROVED', null); // convergence souple
        delete state.docs[id];
        state.deleteCalls.push(id);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(await wrap({ id, deleted: true })),
        });
        return;
      }

      return route.fallback();
    },
  );

  /* ------------------------------------------------------------------
   * Review queue — volet DOCUMENT (seller + admin)
   *
   * - Seller panel : `?reviewType=DOCUMENT&entityId=<md-id>&limit=5`
   *   → api.get → réponse enveloppée { data, meta }.
   * - Admin list   : `?page=1&limit=20&status=PENDING&reviewType=DOCUMENT?`
   *   → fetch brut → on renvoie { data, meta } nu.
   * - Admin stats  : `/marketplace/review-queue/stats/pending` nu.
   * ------------------------------------------------------------------ */
  await page.route(/\/api\/v1\/marketplace\/review-queue\/stats\/pending$/, async (route) => {
    const pending = state.queue.filter((q) => q.status === 'PENDING');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        total: pending.length,
        byType: {
          publication: pending.filter((q) => q.reviewType === 'PUBLICATION').length,
          media: pending.filter((q) => q.reviewType === 'MEDIA').length,
          document: pending.filter((q) => q.reviewType === 'DOCUMENT').length,
        },
      }),
    });
  });

  await page.route(/\/api\/v1\/marketplace\/review-queue(\?.*)?$/, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    const url = new URL(route.request().url());
    const statusF = url.searchParams.get('status');
    const typeF = url.searchParams.get('reviewType');
    const entityId = url.searchParams.get('entityId');
    const page_ = Number(url.searchParams.get('page') ?? '1');
    const limit = Number(url.searchParams.get('limit') ?? '20');

    let filtered = state.queue.slice();
    if (statusF) filtered = filtered.filter((q) => q.status === statusF);
    if (typeF) filtered = filtered.filter((q) => q.reviewType === typeF);
    if (entityId) filtered = filtered.filter((q) => q.entityId === entityId);
    // Tri desc par createdAt (le panel veut le dernier item en [0])
    filtered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const data = filtered.slice((page_ - 1) * limit, page_ * limit);

    const payload = { data, meta: { total, page: page_, limit, totalPages } };
    // entityId présent = requête du seller panel (api.get → envelope)
    // sinon = admin fetch brut (raw)
    const body = entityId ? JSON.stringify(await wrap(payload)) : JSON.stringify(payload);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body,
    });
  });

  /* ------------------------------------------------------------------
   * Stub pour les téléchargements de documents (open_blank)
   * ------------------------------------------------------------------ */
  await page.route(/\/__e2e_stub_document__\/.*/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/pdf',
      body: Buffer.from('%PDF-1.4 stub'),
    });
  });
}

/* --------------------------------------------------------------------
 *  Vue publique / buyer — on teste au niveau API puisque les pages
 *  /marketplace/* sont SSR et font fetch côté Node (non interceptables).
 *
 *  La règle backend reproduite ici :
 *    - PUBLIC + VERIFIED + non expiré → visible public ET buyer
 *    - BUYER_ON_REQUEST + non expiré → visible buyer (pas download public)
 *    - PRIVATE → jamais exposé
 *    - Tout expiré → exclus des vues publique & buyer
 * ------------------------------------------------------------------ */
export function projectPublic(state: DocumentsState): MarketplaceDocumentMock[] {
  return Object.values(state.docs).filter(
    (d) =>
      d.visibility === 'PUBLIC' && d.verificationStatus === 'VERIFIED' && !isExpired(d.validUntil),
  );
}

export function projectBuyerView(state: DocumentsState): MarketplaceDocumentMock[] {
  return Object.values(state.docs).filter(
    (d) =>
      (d.visibility === 'PUBLIC' || d.visibility === 'BUYER_ON_REQUEST') &&
      d.verificationStatus === 'VERIFIED' &&
      !isExpired(d.validUntil),
  );
}
