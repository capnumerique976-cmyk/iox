/**
 * SSR mock backend for Playwright — reproduces the public marketplace-catalog
 * endpoints so Next.js SSR pages (/marketplace/*) can render real HTML under E2E.
 *
 * The Next dev webServer is launched with BACKEND_INTERNAL_URL=http://127.0.0.1:3199,
 * so that the Next rewrite `/api/v1/:path* -> <BACKEND_INTERNAL_URL>/api/v1/:path*`
 * reaches this process. SSR calls read from the in-memory `state` below.
 *
 * Control plane (used by specs to seed / reset / introspect):
 *   POST /__e2e/reset          — wipes the state
 *   POST /__e2e/seed           — replaces the state with the JSON body
 *   POST /__e2e/patch          — shallow-merge patch into the state
 *   GET  /__e2e/state          — returns the current state (for assertions)
 *
 * Visibility rules mirror the backend (marketplace-catalog.service.ts):
 *   - products: only offers with isPublished=true AND publishedAt<=now are exposed
 *   - media : only MediaAsset with moderationStatus=APPROVED appear in gallery
 *   - documents: PUBLIC + VERIFIED + (no validUntil OR validUntil>now)
 *   - seller suspended → products masked
 *   - product/offer archived/suspended → masked
 */

import http from 'node:http';

const PORT = Number(process.env.SSR_MOCK_PORT ?? 3199);

/** In-memory state (single instance — Playwright workers=1) */
const state = freshState();

function freshState() {
  return {
    sellers: /** @type {Record<string, any>} */ ({}),
    products: /** @type {Record<string, any>} */ ({}),
    offers: /** @type {Record<string, any>} */ ({}),
    medias: /** @type {Record<string, any>} */ ({}),
    marketplaceDocuments: /** @type {Record<string, any>} */ ({}),
    sourceDocuments: /** @type {Record<string, any>} */ ({}),
  };
}

/* -------------------------------------------------------------
 * Visibility projections
 * ------------------------------------------------------------- */
const now = () => new Date();

function isOfferPublic(o) {
  if (!o) return false;
  if (o.status && ['ARCHIVED', 'SUSPENDED', 'DRAFT'].includes(o.status)) return false;
  if (!o.isPublished) return false;
  if (o.publishedAt && new Date(o.publishedAt) > now()) return false;
  return true;
}
function isProductPublic(p) {
  if (!p) return false;
  if (p.status && ['ARCHIVED', 'DRAFT', 'SUSPENDED'].includes(p.status)) return false;
  // Has at least one public offer
  const offers = Object.values(state.offers).filter(
    (o) => o.productId === p.id && isOfferPublic(o),
  );
  if (offers.length === 0) return false;
  // Seller not suspended
  const seller = state.sellers[p.sellerId];
  if (!seller) return false;
  if (seller.status && ['SUSPENDED', 'ARCHIVED'].includes(seller.status)) return false;
  return true;
}
function isMediaPublic(m) {
  if (!m) return false;
  return m.moderationStatus === 'APPROVED';
}
function isDocumentPublic(d) {
  if (!d) return false;
  if (d.visibility !== 'PUBLIC') return false;
  if (d.verificationStatus !== 'VERIFIED') return false;
  if (d.validUntil && new Date(d.validUntil) <= now()) return false;
  return true;
}

/* -------------------------------------------------------------
 * Shape projections (match src/lib/marketplace/types.ts)
 * ------------------------------------------------------------- */
function projectSellerPublicLite(seller) {
  return {
    id: seller.id,
    slug: seller.slug,
    publicDisplayName: seller.publicDisplayName,
    country: seller.country,
    region: seller.region ?? null,
    cityOrZone: seller.cityOrZone ?? null,
    descriptionShort: seller.descriptionShort ?? null,
    supportedIncoterms: seller.supportedIncoterms ?? [],
    destinationsServed: seller.destinationsServed ?? [],
    averageLeadTimeDays: seller.averageLeadTimeDays ?? null,
  };
}

function projectPrimaryImage(productId) {
  const m = Object.values(state.medias).find(
    (x) =>
      x.relatedType === 'MARKETPLACE_PRODUCT' &&
      x.relatedId === productId &&
      x.role === 'MAIN' &&
      isMediaPublic(x),
  );
  if (!m) return null;
  return {
    id: m.id,
    role: m.role,
    publicUrl: m.publicUrl ?? `/__e2e_stub_media__/${m.id}.png`,
    altTextFr: m.altTextFr ?? null,
  };
}

function projectGallery(productId) {
  return Object.values(state.medias)
    .filter(
      (m) =>
        m.relatedType === 'MARKETPLACE_PRODUCT' &&
        m.relatedId === productId &&
        m.role !== 'MAIN' &&
        isMediaPublic(m),
    )
    .map((m) => ({
      id: m.id,
      role: m.role,
      publicUrl: m.publicUrl ?? `/__e2e_stub_media__/${m.id}.png`,
      altTextFr: m.altTextFr ?? null,
    }));
}

function projectDocuments(productId) {
  return Object.values(state.marketplaceDocuments)
    .filter(
      (d) =>
        d.relatedType === 'MARKETPLACE_PRODUCT' && d.relatedId === productId && isDocumentPublic(d),
    )
    .map((d) => ({
      id: d.id,
      documentType: d.documentType,
      title: d.title,
      validFrom: d.validFrom ?? null,
      validUntil: d.validUntil ?? null,
    }));
}

function projectOfferCard(offer, product, seller) {
  return {
    offerId: offer.id,
    offerTitle: offer.title,
    productSlug: product.slug,
    commercialName: product.commercialName,
    subtitle: product.subtitle ?? null,
    category: product.category ?? null,
    origin: { country: product.originCountry, region: product.originRegion ?? null },
    varietySpecies: product.varietySpecies ?? null,
    productionMethod: product.productionMethod ?? null,
    packagingDescription: product.packagingDescription ?? null,
    defaultUnit: product.defaultUnit ?? null,
    minimumOrderQuantity: product.minimumOrderQuantity ?? null,
    primaryImage: projectPrimaryImage(product.id),
    seller: {
      id: seller.id,
      slug: seller.slug,
      publicDisplayName: seller.publicDisplayName,
      country: seller.country,
      region: seller.region ?? null,
    },
    priceMode: offer.priceMode,
    unitPrice: offer.unitPrice ?? null,
    currency: offer.currency ?? null,
    moq: offer.moq ?? null,
    onQuote: offer.priceMode === 'QUOTE_ONLY',
    availableQuantity: offer.availableQuantity ?? null,
    leadTimeDays: offer.leadTimeDays ?? null,
    incoterm: offer.incoterm ?? null,
    exportReadinessStatus: product.exportReadinessStatus ?? 'EXPORT_READY',
    publishedAt: offer.publishedAt ?? null,
  };
}

function projectProductDetail(product) {
  const seller = state.sellers[product.sellerId];
  const offers = Object.values(state.offers)
    .filter((o) => o.productId === product.id && isOfferPublic(o))
    .map((o) => ({
      id: o.id,
      title: o.title,
      shortDescription: o.shortDescription ?? null,
      priceMode: o.priceMode,
      unitPrice: o.unitPrice ?? null,
      currency: o.currency ?? null,
      moq: o.moq ?? null,
      availableQuantity: o.availableQuantity ?? null,
      availabilityStart: o.availabilityStart ?? null,
      availabilityEnd: o.availabilityEnd ?? null,
      leadTimeDays: o.leadTimeDays ?? null,
      incoterm: o.incoterm ?? null,
      departureLocation: o.departureLocation ?? null,
      exportReadinessStatus: product.exportReadinessStatus ?? 'EXPORT_READY',
      publishedAt: o.publishedAt ?? null,
      isPrimaryOffer: !!o.isPrimaryOffer,
    }));

  return {
    id: product.id,
    slug: product.slug,
    commercialName: product.commercialName,
    regulatoryName: product.regulatoryName ?? null,
    subtitle: product.subtitle ?? null,
    originCountry: product.originCountry,
    originRegion: product.originRegion ?? null,
    varietySpecies: product.varietySpecies ?? null,
    productionMethod: product.productionMethod ?? null,
    descriptionShort: product.descriptionShort ?? null,
    descriptionLong: product.descriptionLong ?? null,
    usageTips: product.usageTips ?? null,
    packagingDescription: product.packagingDescription ?? null,
    storageConditions: product.storageConditions ?? null,
    shelfLifeInfo: product.shelfLifeInfo ?? null,
    allergenInfo: product.allergenInfo ?? null,
    defaultUnit: product.defaultUnit ?? null,
    minimumOrderQuantity: product.minimumOrderQuantity ?? null,
    exportReadinessStatus: product.exportReadinessStatus ?? 'EXPORT_READY',
    category: product.category ?? null,
    seller: projectSellerPublicLite(seller),
    primaryImage: projectPrimaryImage(product.id) ?? {
      id: 'none',
      role: 'MAIN',
      publicUrl: null,
      altTextFr: null,
    },
    gallery: projectGallery(product.id),
    offers,
    documents: projectDocuments(product.id),
  };
}

/* -------------------------------------------------------------
 * HTTP helpers
 * ------------------------------------------------------------- */
function send(res, status, body, contentType = 'application/json') {
  res.writeHead(status, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}
function ok(res, data) {
  send(res, 200, { success: true, data, timestamp: new Date().toISOString() });
}
function notFound(res) {
  send(res, 404, { success: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
}
async function readBody(req) {
  return new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', (c) => {
      buf += c;
    });
    req.on('end', () => {
      try {
        resolve(buf ? JSON.parse(buf) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

/* -------------------------------------------------------------
 * Router
 * ------------------------------------------------------------- */
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    const { pathname } = url;
    const method = req.method || 'GET';

    // CORS preflight
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      });
      res.end();
      return;
    }

    /* Control plane */
    if (pathname === '/__e2e/reset' && method === 'POST') {
      Object.assign(state, freshState());
      ok(res, { reset: true });
      return;
    }
    if (pathname === '/__e2e/seed' && method === 'POST') {
      const body = await readBody(req);
      for (const k of Object.keys(state)) state[k] = {};
      if (body.sellers) for (const s of body.sellers) state.sellers[s.id] = s;
      if (body.products) for (const p of body.products) state.products[p.id] = p;
      if (body.offers) for (const o of body.offers) state.offers[o.id] = o;
      if (body.medias) for (const m of body.medias) state.medias[m.id] = m;
      if (body.marketplaceDocuments)
        for (const d of body.marketplaceDocuments) state.marketplaceDocuments[d.id] = d;
      if (body.sourceDocuments)
        for (const d of body.sourceDocuments) state.sourceDocuments[d.id] = d;
      ok(res, { seeded: true });
      return;
    }
    if (pathname === '/__e2e/patch' && method === 'POST') {
      const body = await readBody(req);
      for (const [collection, updates] of Object.entries(body)) {
        if (!state[collection]) state[collection] = {};
        for (const [id, upd] of Object.entries(updates ?? {})) {
          if (upd === null) {
            delete state[collection][id];
          } else {
            state[collection][id] = { ...state[collection][id], ...upd };
          }
        }
      }
      ok(res, { patched: true });
      return;
    }
    if (pathname === '/__e2e/state' && method === 'GET') {
      ok(res, state);
      return;
    }

    /* Public marketplace catalog */
    if (pathname === '/api/v1/marketplace/catalog' && method === 'GET') {
      const cards = [];
      for (const product of Object.values(state.products)) {
        if (!isProductPublic(product)) continue;
        const seller = state.sellers[product.sellerId];
        const primary =
          Object.values(state.offers).find(
            (o) => o.productId === product.id && o.isPrimaryOffer && isOfferPublic(o),
          ) ??
          Object.values(state.offers).find((o) => o.productId === product.id && isOfferPublic(o));
        if (!primary) continue;
        cards.push(projectOfferCard(primary, product, seller));
      }
      ok(res, {
        data: cards,
        meta: { total: cards.length, page: 1, limit: cards.length, totalPages: 1 },
        facets: { readiness: [], priceMode: [] },
      });
      return;
    }

    const productSlugMatch = pathname.match(/^\/api\/v1\/marketplace\/catalog\/products\/([^/]+)$/);
    if (productSlugMatch && method === 'GET') {
      const slug = decodeURIComponent(productSlugMatch[1]);
      const product = Object.values(state.products).find((p) => p.slug === slug);
      if (!product || !isProductPublic(product)) return notFound(res);
      ok(res, projectProductDetail(product));
      return;
    }

    const sellerSlugMatch = pathname.match(/^\/api\/v1\/marketplace\/catalog\/sellers\/([^/]+)$/);
    if (sellerSlugMatch && method === 'GET') {
      const slug = decodeURIComponent(sellerSlugMatch[1]);
      const seller = Object.values(state.sellers).find((s) => s.slug === slug);
      if (!seller) return notFound(res);
      if (seller.status && ['SUSPENDED', 'ARCHIVED'].includes(seller.status)) return notFound(res);
      const products = Object.values(state.products)
        .filter((p) => p.sellerId === seller.id && isProductPublic(p))
        .map((p) => ({
          id: p.id,
          slug: p.slug,
          commercialName: p.commercialName,
          subtitle: p.subtitle ?? null,
          originCountry: p.originCountry,
          originRegion: p.originRegion ?? null,
          exportReadinessStatus: p.exportReadinessStatus ?? 'EXPORT_READY',
          primaryImage: projectPrimaryImage(p.id),
        }));
      ok(res, {
        ...projectSellerPublicLite(seller),
        descriptionLong: seller.descriptionLong ?? null,
        story: seller.story ?? null,
        languages: seller.languages ?? [],
        website: seller.website ?? null,
        logo: null,
        banner: null,
        products,
      });
      return;
    }

    // Catch-all: respond 404 JSON (avoid Next throwing on HTML parse)
    notFound(res);
  } catch (err) {
    send(res, 500, { error: String(err) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  // Playwright webServer waits for this port to be listening.
  // eslint-disable-next-line no-console
  console.log(`[ssr-mock] listening on http://127.0.0.1:${PORT}`);
});
