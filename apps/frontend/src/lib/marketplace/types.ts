// Types de consommation du catalogue marketplace — miroir de la réponse backend.

export type PriceMode = 'FIXED' | 'QUOTE_ONLY' | 'FROM_PRICE';
export type ReadinessStatus =
  | 'NOT_ELIGIBLE'
  | 'INTERNAL_ONLY'
  | 'PENDING_DOCUMENTS'
  | 'PENDING_QUALITY_REVIEW'
  | 'EXPORT_READY'
  | 'EXPORT_READY_WITH_CONDITIONS';

export interface CatalogCard {
  offerId: string;
  offerTitle: string;
  productSlug: string;
  commercialName: string;
  subtitle: string | null;
  category: { id: string; slug: string; nameFr: string; nameEn: string | null } | null;
  origin: { country: string; region: string | null };
  varietySpecies: string | null;
  productionMethod: string | null;
  packagingDescription: string | null;
  defaultUnit: string | null;
  minimumOrderQuantity: number | null;
  primaryImage: {
    id: string;
    publicUrl: string | null;
    altTextFr: string | null;
    altTextEn: string | null;
  } | null;
  seller: {
    id: string;
    slug: string;
    publicDisplayName: string;
    country: string;
    region: string | null;
  };
  priceMode: PriceMode;
  unitPrice: number | null;
  currency: string | null;
  moq: number | null;
  onQuote: boolean;
  availableQuantity: number | null;
  leadTimeDays: number | null;
  incoterm: string | null;
  exportReadinessStatus: ReadinessStatus;
  publishedAt: string | null;
}

export interface CatalogResponse {
  data: CatalogCard[];
  meta: { total: number; page: number; limit: number; totalPages: number };
  facets: {
    readiness: Array<{ value: ReadinessStatus; count: number }>;
    priceMode: Array<{ value: PriceMode; count: number }>;
  };
}

export interface ProductOffer {
  id: string;
  title: string;
  shortDescription: string | null;
  priceMode: PriceMode;
  unitPrice: number | null;
  currency: string | null;
  moq: number | null;
  availableQuantity: number | null;
  availabilityStart: string | null;
  availabilityEnd: string | null;
  leadTimeDays: number | null;
  incoterm: string | null;
  departureLocation: string | null;
  exportReadinessStatus: ReadinessStatus;
  publishedAt: string | null;
  isPrimaryOffer: boolean;
}

// FP-1 — Saisonnalité produit. Mois calendaires en code court anglais,
// alignés sur l'enum Prisma `SeasonalityMonth`.
export type SeasonalityMonth =
  | 'JAN'
  | 'FEB'
  | 'MAR'
  | 'APR'
  | 'MAY'
  | 'JUN'
  | 'JUL'
  | 'AUG'
  | 'SEP'
  | 'OCT'
  | 'NOV'
  | 'DEC';

// FP-2 — Certifications structurées projetées par le backend public.
// Aligné sur l'enum Prisma `CertificationType` ; étendre ici si l'enum
// backend évolue.
export type CertificationType =
  | 'BIO_EU'
  | 'BIO_USDA'
  | 'ECOCERT'
  | 'FAIRTRADE'
  | 'RAINFOREST_ALLIANCE'
  | 'HACCP'
  | 'ISO_22000'
  | 'ISO_9001'
  | 'GLOBALGAP'
  | 'BRC'
  | 'IFS'
  | 'KOSHER'
  | 'HALAL'
  | 'OTHER';

export type CertificationScope = 'SELLER_PROFILE' | 'MARKETPLACE_PRODUCT';

export interface Certification {
  id: string;
  relatedType: CertificationScope;
  relatedId: string;
  type: CertificationType;
  code: string | null;
  issuingBody: string | null;
  issuedAt: string | null;
  validFrom: string | null;
  validUntil: string | null;
  documentMediaId: string | null;
}

export interface ProductDetail {
  id: string;
  slug: string;
  commercialName: string;
  regulatoryName: string | null;
  subtitle: string | null;
  originCountry: string;
  originRegion: string | null;
  // FP-6 — origine fine projetée publiquement (tous optionnels). Decimal
  // est sérialisé en string par Prisma → on accepte les deux côté lecture.
  originLocality: string | null;
  altitudeMeters: number | null;
  gpsLat: string | number | null;
  gpsLng: string | number | null;
  varietySpecies: string | null;
  productionMethod: string | null;
  descriptionShort: string | null;
  descriptionLong: string | null;
  usageTips: string | null;
  packagingDescription: string | null;
  storageConditions: string | null;
  shelfLifeInfo: string | null;
  allergenInfo: string | null;
  defaultUnit: string | null;
  minimumOrderQuantity: number | null;
  // FP-1 — saisonnalité projetée par le backend public.
  harvestMonths: SeasonalityMonth[];
  availabilityMonths: SeasonalityMonth[];
  isYearRound: boolean;
  exportReadinessStatus: ReadinessStatus;
  category: { id: string; slug: string; nameFr: string; nameEn: string | null } | null;
  seller: {
    id: string;
    slug: string;
    publicDisplayName: string;
    country: string;
    region: string | null;
    cityOrZone: string | null;
    descriptionShort: string | null;
    supportedIncoterms: unknown;
    destinationsServed: unknown;
    averageLeadTimeDays: number | null;
  };
  primaryImage: { id: string; role: string; publicUrl: string | null; altTextFr: string | null };
  gallery: Array<{ id: string; role: string; publicUrl: string | null; altTextFr: string | null }>;
  offers: ProductOffer[];
  documents: Array<{
    id: string;
    documentType: string;
    title: string;
    validFrom: string | null;
    validUntil: string | null;
  }>;
  // FP-2 — agrégat certifications publiques (produit + vendeur).
  certifications: Certification[];
}

export interface SellerPublic {
  id: string;
  slug: string;
  publicDisplayName: string;
  country: string;
  region: string | null;
  cityOrZone: string | null;
  descriptionShort: string | null;
  descriptionLong: string | null;
  story: string | null;
  languages: unknown;
  supportedIncoterms: unknown;
  destinationsServed: unknown;
  averageLeadTimeDays: number | null;
  website: string | null;
  logo: { id: string; role: string; publicUrl: string | null } | null;
  banner: { id: string; role: string; publicUrl: string | null } | null;
  products: Array<{
    id: string;
    slug: string;
    commercialName: string;
    subtitle: string | null;
    originCountry: string;
    originRegion: string | null;
    exportReadinessStatus: ReadinessStatus;
    primaryImage: { id: string; publicUrl: string | null; altTextFr: string | null } | null;
  }>;
  // FP-2 — certifications publiques du vendeur (scope SELLER_PROFILE).
  certifications: Certification[];
}
