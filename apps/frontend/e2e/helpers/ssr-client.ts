/**
 * Client HTTP léger vers le mock SSR backend (port 3199, voir ssr-mock-server.mjs).
 *
 * Les tests appellent ces helpers pour peupler l'état public (sellers / products
 * / offers / medias / marketplaceDocuments). Les pages Next.js /marketplace/*
 * rendent ensuite du vrai HTML basé sur ce state.
 */

const SSR_BASE = process.env.SSR_MOCK_BASE ?? 'http://127.0.0.1:3199';

async function send(path: string, init?: RequestInit) {
  const res = await fetch(`${SSR_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) throw new Error(`SSR mock ${path} -> ${res.status}`);
  const body = await res.json().catch(() => ({}));
  return body;
}

export interface SsrSeed {
  sellers?: Array<Record<string, unknown>>;
  products?: Array<Record<string, unknown>>;
  offers?: Array<Record<string, unknown>>;
  medias?: Array<Record<string, unknown>>;
  marketplaceDocuments?: Array<Record<string, unknown>>;
  sourceDocuments?: Array<Record<string, unknown>>;
}

export const ssrMock = {
  reset: () => send('/__e2e/reset', { method: 'POST' }),
  seed: (payload: SsrSeed) =>
    send('/__e2e/seed', { method: 'POST', body: JSON.stringify(payload) }),
  patch: (payload: Record<string, Record<string, Record<string, unknown> | null>>) =>
    send('/__e2e/patch', { method: 'POST', body: JSON.stringify(payload) }),
  state: () => send('/__e2e/state', { method: 'GET' }),
  /** Raccourcis sémantiques */
  approveMedia: (id: string) =>
    send('/__e2e/patch', {
      method: 'POST',
      body: JSON.stringify({ medias: { [id]: { moderationStatus: 'APPROVED' } } }),
    }),
  rejectMedia: (id: string) =>
    send('/__e2e/patch', {
      method: 'POST',
      body: JSON.stringify({ medias: { [id]: { moderationStatus: 'REJECTED' } } }),
    }),
  verifyDocument: (id: string) =>
    send('/__e2e/patch', {
      method: 'POST',
      body: JSON.stringify({
        marketplaceDocuments: { [id]: { verificationStatus: 'VERIFIED' } },
      }),
    }),
  rejectDocument: (id: string) =>
    send('/__e2e/patch', {
      method: 'POST',
      body: JSON.stringify({
        marketplaceDocuments: { [id]: { verificationStatus: 'REJECTED' } },
      }),
    }),
  suspendSeller: (id: string) =>
    send('/__e2e/patch', {
      method: 'POST',
      body: JSON.stringify({ sellers: { [id]: { status: 'SUSPENDED' } } }),
    }),
  suspendOffer: (id: string) =>
    send('/__e2e/patch', {
      method: 'POST',
      body: JSON.stringify({ offers: { [id]: { status: 'SUSPENDED' } } }),
    }),
};

/* ------------------------------------------------------------
 *  Fixtures communes — un seller + 1 product + 1 offer.
 *  Tous dans l'état `PENDING/DRAFT` par défaut : les scénarios
 *  basculent via ssrMock.patch(...) au fil du cycle.
 * ------------------------------------------------------------ */

export function makeDefaultFixture() {
  const seller = {
    id: 'seller-1',
    slug: 'maison-ylang',
    publicDisplayName: 'Maison Ylang',
    country: 'FR',
    region: 'Mayotte',
    cityOrZone: 'Mamoudzou',
    descriptionShort: "Distillerie artisanale d'Ylang-Ylang",
    descriptionLong: 'Producteur de Mayotte, distillation traditionnelle.',
    supportedIncoterms: ['FOB', 'CIF'],
    destinationsServed: ['FR', 'DE', 'US'],
    averageLeadTimeDays: 21,
    status: 'ACTIVE',
  };

  const product = {
    id: 'mp-prod-1',
    sellerId: seller.id,
    slug: 'huile-ylang-ylang-bio',
    commercialName: 'Huile essentielle Ylang-Ylang Bio',
    subtitle: '1re distillation, 100 mL',
    originCountry: 'FR',
    originRegion: 'Mayotte',
    varietySpecies: 'Cananga odorata',
    productionMethod: 'Distillation vapeur',
    descriptionShort: 'HE Ylang-Ylang 1re extraction',
    descriptionLong: 'Notes florales intenses, distillation traditionnelle.',
    packagingDescription: 'Flacon verre ambré 100 mL',
    defaultUnit: 'mL',
    minimumOrderQuantity: 50,
    exportReadinessStatus: 'EXPORT_READY',
    category: {
      id: 'cat-he',
      slug: 'huiles-essentielles',
      nameFr: 'Huiles essentielles',
      nameEn: null,
    },
    status: 'ACTIVE',
  };

  const offer = {
    id: 'offer-ylang-1',
    productId: product.id,
    sellerId: seller.id,
    title: 'HE Ylang-Ylang 1re — lot printemps',
    shortDescription: 'Lot de printemps 2026, 200 mL disponibles',
    priceMode: 'QUOTE_ONLY',
    unitPrice: null,
    currency: 'EUR',
    moq: 50,
    availableQuantity: 200,
    leadTimeDays: 21,
    incoterm: 'FOB',
    departureLocation: 'Mamoudzou',
    isPrimaryOffer: true,
    isPublished: false,
    publishedAt: null,
    status: 'DRAFT',
  };

  return { seller, product, offer };
}
