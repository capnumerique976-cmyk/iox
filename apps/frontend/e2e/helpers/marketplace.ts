import { Page, Route } from '@playwright/test';
import { FAKE_TOKENS, wrap } from './auth';

/**
 * Helpers E2E marketplace.
 *
 * Stratégie :
 *  - on n'instancie pas un vrai backend ; tous les /api/v1/* sont mockés via page.route()
 *  - on expose un "state" mutable (queue, médias, RFQ) que chaque spec peut faire évoluer
 *    pour simuler reject → resubmit, approve → disparition, etc.
 *  - les rôles sont paramétrables via loginAsRole() pour tester buyer/seller/admin.
 *
 * LIMITATION : les pages publiques marketplace (/marketplace, /marketplace/products/[slug],
 * /marketplace/sellers/[slug]) sont SSR et font fetch() côté Node → non interceptables par
 * Playwright. Les vérifications de visibilité publique sont donc faites au niveau des
 * appels d'API (catalog, detail) mockés, pas au niveau du rendu SSR.
 */

export interface MarketplaceUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'QUALITY_MANAGER' | 'MARKETPLACE_SELLER' | 'MARKETPLACE_BUYER' | 'COORDINATOR';
}

export const ADMIN_USER: MarketplaceUser = {
  id: 'user-admin-1',
  email: 'admin@iox.mch',
  firstName: 'Admin',
  lastName: 'IOX',
  role: 'ADMIN',
};

export const BUYER_USER: MarketplaceUser = {
  id: 'user-buyer-1',
  email: 'buyer@export.io',
  firstName: 'Buyer',
  lastName: 'Tester',
  role: 'MARKETPLACE_BUYER',
};

export const SELLER_USER: MarketplaceUser = {
  id: 'user-seller-1',
  email: 'seller@iox.mch',
  firstName: 'Seller',
  lastName: 'Tester',
  role: 'MARKETPLACE_SELLER',
};

/** Route stats du dashboard + endpoints inoffensifs — évite les crashs en arrivée sur /dashboard */
async function mockCommonDashboard(page: Page) {
  await page.route('**/api/v1/dashboard/stats', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        await wrap({
          beneficiaries: { total: 0, active: 0 },
          inboundBatches: { total: 0, received: 0, inControl: 0, accepted: 0, rejected: 0 },
          productBatches: {
            total: 0,
            created: 0,
            readyForValidation: 0,
            available: 0,
            reserved: 0,
            shipped: 0,
            blocked: 0,
            destroyed: 0,
            availableOrReserved: 0,
          },
          marketDecisions: {
            total: 0,
            compliant: 0,
            withReservations: 0,
            blocked: 0,
            complianceRate: 0,
          },
          labelValidations: { total: 0, valid: 0, invalid: 0, passRate: 0 },
          documents: { totalActive: 0 },
          products: { total: 0, compliant: 0, blocked: 0, draft: 0 },
        }),
      ),
    });
  });
  // Catch-all pour les autres endpoints dashboard/alerts/audit (sauf /stats déjà routé)
  await page.route(/\/api\/v1\/(dashboard\/(?!stats)|alerts|audit)[^/]*/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(await wrap([])),
    });
  });
}

/**
 * Mock /auth/login pour accepter un user donné + password "good-password".
 * On remplace FAKE_USER par le user du rôle voulu.
 */
export async function mockAuthAs(page: Page, user: MarketplaceUser) {
  await page.route('**/api/v1/auth/login', async (route) => {
    const body = route.request().postDataJSON() as { email: string; password: string };
    if (body.email === user.email && body.password === 'good-password') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(await wrap({ ...FAKE_TOKENS, user })),
      });
      return;
    }
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Identifiants incorrects' },
      }),
    });
  });
  await mockCommonDashboard(page);
}

export async function loginAsRole(
  page: Page,
  user: MarketplaceUser,
  opts?: { redirect?: string; expectUrl?: RegExp },
) {
  const qs = opts?.redirect ? `?redirect=${encodeURIComponent(opts.redirect)}` : '';
  await page.goto(`/login${qs}`, { timeout: 90_000 });
  // Laisse React hydrater avant de manipuler le formulaire contrôlé.
  await page.getByLabel('Adresse e-mail').waitFor({ state: 'visible', timeout: 30_000 });
  await page.getByLabel('Adresse e-mail').fill(user.email);
  await page.getByLabel('Mot de passe').fill('good-password');
  await Promise.all([
    page.waitForResponse('**/api/v1/auth/login', { timeout: 60_000 }),
    page.getByRole('button', { name: /Se connecter/i }).click(),
  ]);
  await page.waitForURL(opts?.expectUrl ?? /\/dashboard$/, { timeout: 60_000 });
}

/**
 * Warmup des routes Next.js dev pour éviter les timeouts lors de la 1ʳᵉ compilation.
 * À appeler en test.beforeAll d'un describe qui cible des pages exotiques.
 */
export async function warmupRoutes(page: Page, paths: string[]) {
  for (const p of paths) {
    await page.goto(p, { waitUntil: 'domcontentloaded', timeout: 120_000 }).catch(() => {});
  }
}

/* ------------------------------------------------------------------ */
/*  Review queue + media assets — state machine mockée                  */
/* ------------------------------------------------------------------ */

export interface QueueItem {
  id: string;
  entityType: 'SELLER_PROFILE' | 'MARKETPLACE_PRODUCT' | 'MARKETPLACE_OFFER';
  entityId: string;
  reviewType: 'PUBLICATION' | 'MEDIA' | 'DOCUMENT';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewReason: string | null;
  reviewedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedByUser: { id: string; email: string; firstName: string; lastName: string } | null;
}

export interface MediaAssetMock {
  id: string;
  relatedType: 'SELLER_PROFILE' | 'MARKETPLACE_PRODUCT' | 'MARKETPLACE_OFFER';
  relatedId: string;
  mimeType: string;
  role: string;
  altTextFr: string | null;
  moderationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  storageKey: string;
}

export interface ReviewQueueState {
  items: QueueItem[];
  medias: Record<string, MediaAssetMock>;
  /** Signed URLs simulées */
  mediaUrl: (id: string) => string;
  /** Mutations observées — utile pour vérifications post-action */
  approveCalls: Array<{ type: 'MEDIA' | 'OTHER'; target: string }>;
  rejectCalls: Array<{ type: 'MEDIA' | 'OTHER'; target: string; reason: string }>;
}

export function makeReviewQueueState(): ReviewQueueState {
  return {
    items: [],
    medias: {},
    // URL relative à l'origine pour éviter les contraintes next/image remotePatterns.
    mediaUrl: (id: string) => `/__e2e_stub_media__/${id}.png?sig=abc`,
    approveCalls: [],
    rejectCalls: [],
  };
}

/**
 * Monte les routes /marketplace/review-queue + /media-assets autour d'un state partagé.
 * Le state est mutable — chaque spec peut empiler/enlever des items entre deux reloads.
 */
export async function mockReviewQueueRoutes(page: Page, state: ReviewQueueState) {
  // LIST
  await page.route(/\/api\/v1\/marketplace\/review-queue(\?.*)?$/, async (route) => {
    const url = new URL(route.request().url());
    const statusFilter = url.searchParams.get('status');
    const typeFilter = url.searchParams.get('reviewType');
    const page_ = Number(url.searchParams.get('page') ?? '1');
    const limit = Number(url.searchParams.get('limit') ?? '20');

    let filtered = state.items.slice();
    if (statusFilter) filtered = filtered.filter((i) => i.status === statusFilter);
    if (typeFilter) filtered = filtered.filter((i) => i.reviewType === typeFilter);

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const data = filtered.slice((page_ - 1) * limit, page_ * limit);

    // Le vrai backend (NestJS ResponseInterceptor) enveloppe TOUTES les
    // réponses dans { success, data, timestamp }. La page admin
    // /admin/review-queue (commit 297017b) lit explicitement json.data.data +
    // json.data.meta. Le helper doit donc wrapper, sinon `setItems([])` est
    // appelé par défaut → le tableau affiche "Aucun item" alors que la
    // queue contient des items, et l'assertion `toContainText('DOCUMENT')`
    // échoue. (Idem pour marketplace-documents.ts:533 — fix coordonné.)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        await wrap({ data, meta: { total, page: page_, limit, totalPages } }),
      ),
    });
  });

  // STATS
  await page.route('**/api/v1/marketplace/review-queue/stats/pending', async (route) => {
    const pending = state.items.filter((i) => i.status === 'PENDING');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        total: pending.length,
        byType: {
          publication: pending.filter((i) => i.reviewType === 'PUBLICATION').length,
          media: pending.filter((i) => i.reviewType === 'MEDIA').length,
          document: pending.filter((i) => i.reviewType === 'DOCUMENT').length,
        },
      }),
    });
  });

  // APPROVE / REJECT via queue (PUBLICATION / DOCUMENT)
  await page.route(
    /\/api\/v1\/marketplace\/review-queue\/([^/]+)\/(approve|reject)$/,
    async (route) => {
      const match = route
        .request()
        .url()
        .match(/\/review-queue\/([^/?#]+)\/(approve|reject)/);
      if (!match) return route.fulfill({ status: 400, body: '{}' });
      const [, qid, action] = match;
      const body = route.request().postDataJSON() as { reason?: string } | undefined;
      const item = state.items.find((i) => i.id === qid);
      if (!item) return route.fulfill({ status: 404, body: '{}' });

      if (action === 'approve') {
        item.status = 'APPROVED';
        item.reviewReason = null;
        state.approveCalls.push({ type: 'OTHER', target: qid });
      } else {
        if (!body?.reason || body.reason.trim().length < 3) {
          return route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Motif requis' }),
          });
        }
        item.status = 'REJECTED';
        item.reviewReason = body.reason;
        state.rejectCalls.push({ type: 'OTHER', target: qid, reason: body.reason });
      }
      item.reviewedByUserId = ADMIN_USER.id;
      item.reviewedByUser = {
        id: ADMIN_USER.id,
        email: ADMIN_USER.email,
        firstName: ADMIN_USER.firstName,
        lastName: ADMIN_USER.lastName,
      };
      item.updatedAt = new Date().toISOString();

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(item),
      });
    },
  );

  // MEDIA ASSET detail + signed URL (pour preview admin)
  await page.route(/\/api\/v1\/media-assets\/([^/?#]+)$/, async (route: Route) => {
    const id = route
      .request()
      .url()
      .match(/media-assets\/([^/?#]+)$/)?.[1];
    if (!id || !state.medias[id]) return route.fulfill({ status: 404, body: '{}' });
    if (route.request().method() !== 'GET') return route.fallback();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(state.medias[id]),
    });
  });

  await page.route(/\/api\/v1\/media-assets\/([^/?#]+)\/url$/, async (route) => {
    const id = route
      .request()
      .url()
      .match(/media-assets\/([^/?#]+)\/url/)?.[1];
    if (!id || !state.medias[id]) return route.fulfill({ status: 404, body: '{}' });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ url: state.mediaUrl(id) }),
    });
  });

  // APPROVE / REJECT MEDIA (PATCH)
  await page.route(/\/api\/v1\/media-assets\/([^/?#]+)\/(approve|reject)$/, async (route) => {
    if (route.request().method() !== 'PATCH') return route.fallback();
    const match = route
      .request()
      .url()
      .match(/media-assets\/([^/?#]+)\/(approve|reject)/);
    if (!match) return route.fulfill({ status: 400, body: '{}' });
    const [, mediaId, action] = match;
    const media = state.medias[mediaId];
    if (!media) return route.fulfill({ status: 404, body: '{}' });

    if (action === 'approve') {
      media.moderationStatus = 'APPROVED';
      // Auto-résolution de la queue associée (resolvePendingForEntity côté backend)
      const pending = state.items.find(
        (i) => i.entityId === mediaId && i.reviewType === 'MEDIA' && i.status === 'PENDING',
      );
      if (pending) {
        pending.status = 'APPROVED';
        pending.reviewedByUserId = ADMIN_USER.id;
        pending.reviewedByUser = {
          id: ADMIN_USER.id,
          email: ADMIN_USER.email,
          firstName: ADMIN_USER.firstName,
          lastName: ADMIN_USER.lastName,
        };
        pending.updatedAt = new Date().toISOString();
      }
      state.approveCalls.push({ type: 'MEDIA', target: mediaId });
    } else {
      const body = route.request().postDataJSON() as { reason?: string } | undefined;
      if (!body?.reason || body.reason.trim().length < 3) {
        return route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Motif requis (3 caractères minimum)' }),
        });
      }
      media.moderationStatus = 'REJECTED';
      const pending = state.items.find(
        (i) => i.entityId === mediaId && i.reviewType === 'MEDIA' && i.status === 'PENDING',
      );
      if (pending) {
        pending.status = 'REJECTED';
        pending.reviewReason = body.reason;
        pending.reviewedByUserId = ADMIN_USER.id;
        pending.reviewedByUser = {
          id: ADMIN_USER.id,
          email: ADMIN_USER.email,
          firstName: ADMIN_USER.firstName,
          lastName: ADMIN_USER.lastName,
        };
        pending.updatedAt = new Date().toISOString();
      }
      state.rejectCalls.push({ type: 'MEDIA', target: mediaId, reason: body.reason });
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(media),
    });
  });

  // Stub images de preview — URL relative same-origin pour éviter les contraintes next/image.
  await page.route(/\/__e2e_stub_media__\/.*/, async (route) => {
    // PNG 1x1 transparent
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    await route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: Buffer.from(pngBase64, 'base64'),
    });
  });
}

/* ------------------------------------------------------------------ */
/*  Quote requests — state machine                                      */
/* ------------------------------------------------------------------ */

export interface QuoteRequestMock {
  id: string;
  status: 'NEW' | 'QUALIFIED' | 'QUOTED' | 'NEGOTIATING' | 'WON' | 'LOST' | 'CANCELLED';
  requestedQuantity: number | null;
  requestedUnit: string | null;
  deliveryCountry: string | null;
  targetMarket: string | null;
  message: string | null;
  assignedToUserId: string | null;
  createdAt: string;
  updatedAt: string;
  marketplaceOffer: {
    id: string;
    title: string;
    priceMode: string;
    unitPrice: number | null;
    currency: string | null;
    moq: number | null;
    incoterm: string | null;
    leadTimeDays: number | null;
    departureLocation: string | null;
    sellerProfile: { id: string; slug: string; publicDisplayName: string } | null;
    marketplaceProduct: { id: string; slug: string; commercialName: string } | null;
  };
  buyerCompany: { id: string; code: string; name: string; country: string | null } | null;
  buyerUser: { id: string; firstName: string; lastName: string; email: string } | null;
  assignedToUser: null;
  _count: { messages: number };
}

export interface QuoteRequestMessageMock {
  id: string;
  message: string;
  isInternalNote: boolean;
  createdAt: string;
  authorUser: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

export interface RfqState {
  requests: QuoteRequestMock[];
  messages: Record<string, QuoteRequestMessageMock[]>;
  createCalls: Array<{ offerId: string; buyerCompanyId: string; message?: string }>;
}

export function makeRfqState(): RfqState {
  return { requests: [], messages: {}, createCalls: [] };
}

export async function mockRfqRoutes(page: Page, state: RfqState, actor: MarketplaceUser) {
  // Companies list (pour new RFQ) — page utilise api.get qui unwrap .data, donc on enveloppe.
  await page.route(/\/api\/v1\/companies(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        await wrap({
          data: [
            { id: 'company-buyer-1', code: 'BUY-01', name: 'Export Alpha', country: 'FR' },
            { id: 'company-buyer-2', code: 'BUY-02', name: 'Export Beta', country: 'DE' },
          ],
          meta: { total: 2, page: 1, limit: 200, totalPages: 1 },
        }),
      ),
    });
  });

  // LIST RFQ
  await page.route(/\/api\/v1\/marketplace\/quote-requests(\?.*)?$/, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    const url = new URL(route.request().url());
    // Si URL contient un path /xxx/messages ou similaire → fallback
    if (
      /quote-requests\/[^/?#]+(\/|$)/.test(url.pathname) &&
      url.pathname !== '/api/v1/marketplace/quote-requests'
    ) {
      return route.fallback();
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        await wrap({
          data: state.requests,
          meta: { total: state.requests.length, page: 1, limit: 20, totalPages: 1 },
        }),
      ),
    });
  });

  // CREATE RFQ
  await page.route('**/api/v1/marketplace/quote-requests', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    const body = route.request().postDataJSON() as {
      marketplaceOfferId: string;
      buyerCompanyId: string;
      requestedQuantity?: number;
      requestedUnit?: string;
      deliveryCountry?: string;
      targetMarket?: string;
      message?: string;
    };
    state.createCalls.push({
      offerId: body.marketplaceOfferId,
      buyerCompanyId: body.buyerCompanyId,
      message: body.message,
    });
    const id = `rfq-${state.requests.length + 1}`;
    const now = new Date().toISOString();
    const rfq: QuoteRequestMock = {
      id,
      status: 'NEW',
      requestedQuantity: body.requestedQuantity ?? null,
      requestedUnit: body.requestedUnit ?? null,
      deliveryCountry: body.deliveryCountry ?? null,
      targetMarket: body.targetMarket ?? null,
      message: body.message ?? null,
      assignedToUserId: null,
      createdAt: now,
      updatedAt: now,
      marketplaceOffer: {
        id: body.marketplaceOfferId,
        title: 'Huile essentielle Ylang-Ylang 1L',
        priceMode: 'ON_QUOTE',
        unitPrice: null,
        currency: 'EUR',
        moq: 10,
        incoterm: 'FOB',
        leadTimeDays: 21,
        departureLocation: 'Mamoudzou',
        sellerProfile: {
          id: 'seller-1',
          slug: 'maison-ylang',
          publicDisplayName: 'Maison Ylang',
        },
        marketplaceProduct: {
          id: 'mp-prod-1',
          slug: 'huile-ylang-ylang-bio',
          commercialName: 'Huile Ylang-Ylang Bio',
        },
      },
      buyerCompany: {
        id: body.buyerCompanyId,
        code: 'BUY-01',
        name: 'Export Alpha',
        country: 'FR',
      },
      buyerUser: {
        id: actor.id,
        firstName: actor.firstName,
        lastName: actor.lastName,
        email: actor.email,
      },
      assignedToUser: null,
      _count: { messages: 0 },
    };
    state.requests.push(rfq);
    state.messages[id] = [];
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify(await wrap(rfq)),
    });
  });

  // GET RFQ
  await page.route(/\/api\/v1\/marketplace\/quote-requests\/([^/?#]+)$/, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    const id = route
      .request()
      .url()
      .match(/quote-requests\/([^/?#]+)$/)?.[1];
    const rfq = id ? state.requests.find((r) => r.id === id) : null;
    if (!rfq) return route.fulfill({ status: 404, body: '{}' });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(await wrap(rfq)),
    });
  });

  // PATCH status
  await page.route(/\/api\/v1\/marketplace\/quote-requests\/([^/?#]+)\/status$/, async (route) => {
    if (route.request().method() !== 'PATCH') return route.fallback();
    const id = route
      .request()
      .url()
      .match(/quote-requests\/([^/?#]+)\/status/)?.[1];
    const rfq = id ? state.requests.find((r) => r.id === id) : null;
    if (!rfq) return route.fulfill({ status: 404, body: '{}' });
    const body = route.request().postDataJSON() as { status: QuoteRequestMock['status'] };
    rfq.status = body.status;
    rfq.updatedAt = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(await wrap(rfq)),
    });
  });

  // MESSAGES list/create
  await page.route(
    /\/api\/v1\/marketplace\/quote-requests\/([^/?#]+)\/messages$/,
    async (route) => {
      const id = route
        .request()
        .url()
        .match(/quote-requests\/([^/?#]+)\/messages/)?.[1];
      if (!id || !state.requests.find((r) => r.id === id)) {
        return route.fulfill({ status: 404, body: '{}' });
      }
      state.messages[id] = state.messages[id] ?? [];

      if (route.request().method() === 'GET') {
        // Buyer ne voit pas les notes internes
        const visible =
          actor.role === 'MARKETPLACE_BUYER'
            ? state.messages[id].filter((m) => !m.isInternalNote)
            : state.messages[id];
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(await wrap(visible)),
        });
        return;
      }

      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON() as {
          message: string;
          isInternalNote?: boolean;
        };
        // Buyer ne peut pas créer de note interne
        if (body.isInternalNote && actor.role === 'MARKETPLACE_BUYER') {
          return route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Rôle non autorisé' }),
          });
        }
        const msg: QuoteRequestMessageMock = {
          id: `msg-${state.messages[id].length + 1}`,
          message: body.message,
          isInternalNote: !!body.isInternalNote,
          createdAt: new Date().toISOString(),
          authorUser: {
            id: actor.id,
            firstName: actor.firstName,
            lastName: actor.lastName,
            email: actor.email,
            role: actor.role,
          },
        };
        state.messages[id].push(msg);
        state.requests.find((r) => r.id === id)!._count.messages += 1;
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(await wrap(msg)),
        });
        return;
      }
      await route.fallback();
    },
  );
}

/* ------------------------------------------------------------------ */
/*  Factories                                                           */
/* ------------------------------------------------------------------ */

export function makeMediaAsset(overrides: Partial<MediaAssetMock> = {}): MediaAssetMock {
  return {
    id: overrides.id ?? `media-${Math.random().toString(36).slice(2, 10)}`,
    relatedType: overrides.relatedType ?? 'MARKETPLACE_PRODUCT',
    relatedId: overrides.relatedId ?? 'mp-prod-1',
    mimeType: overrides.mimeType ?? 'image/jpeg',
    role: overrides.role ?? 'MAIN',
    altTextFr: overrides.altTextFr ?? 'Image produit',
    moderationStatus: overrides.moderationStatus ?? 'PENDING',
    storageKey: overrides.storageKey ?? 'seller/product/x.jpg',
  };
}

export function makeQueueItem(overrides: Partial<QueueItem> = {}): QueueItem {
  const now = new Date().toISOString();
  return {
    id: overrides.id ?? `queue-${Math.random().toString(36).slice(2, 10)}`,
    entityType: overrides.entityType ?? 'MARKETPLACE_PRODUCT',
    entityId: overrides.entityId ?? 'mp-prod-1',
    reviewType: overrides.reviewType ?? 'MEDIA',
    status: overrides.status ?? 'PENDING',
    reviewReason: overrides.reviewReason ?? null,
    reviewedByUserId: overrides.reviewedByUserId ?? null,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    reviewedByUser: overrides.reviewedByUser ?? null,
  };
}
