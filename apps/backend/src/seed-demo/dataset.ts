/**
 * SEED-DEMO — données déclaratives.
 *
 * Toutes les clés naturelles préfixées `demo-` (slugs, codes Company,
 * codes Product, codes Beneficiary) afin de permettre un cleanup ciblé.
 *
 * Aucune donnée sensible : descriptions volontairement crédibles mais
 * fictives, pas de vrais SIRETs, pas de vrais emails (sauf le compte
 * smoke-seller hors-dataset).
 */
import {
  CertificationType,
  MarketplacePriceMode,
  ProductQualityAttribute,
  SeasonalityMonth,
} from '@prisma/client';
import { Prisma } from '@prisma/client';

export const smokeSellerEmail = 'smoke-seller@iox.mch';

interface DemoSeller {
  slug: string;
  companyCode: string;
  beneficiaryCode: string;
  companyName: string;
  publicDisplayName: string;
  descriptionShort: string;
  descriptionLong: string;
  country: string;
  region: string | null;
  cityOrZone: string | null;
  sector: string;
  supportedIncoterms: string[];
  destinationsServed: string[];
  averageLeadTimeDays: number;
  isFeatured: boolean;
  approvedAt: Date;
  // Identifiants stables pour les futurs medias publics (UUID v4 fixes).
  // Pas de fichier S3 derrière — `SellerCard` les utilise comme indicateurs
  // binaires (présent/absent) tant que la résolution publique signée n'est
  // pas exposée.
  logoMediaId: string;
  bannerMediaId: string;
}

interface DemoProduct {
  slug: string;
  productCode: string;
  beneficiaryCode: string;
  sellerSlug: string;
  category: string;
  commercialName: string;
  subtitle: string;
  originCountry: string;
  originRegion: string;
  originLocality: string;
  altitudeMeters: number;
  gpsLat: Prisma.Decimal;
  gpsLng: Prisma.Decimal;
  varietySpecies: string;
  productionMethod: string;
  descriptionShort: string;
  descriptionLong: string;
  packagingDescription: string;
  defaultUnit: string;
  minimumOrderQuantity: Prisma.Decimal;
  harvestMonths: SeasonalityMonth[];
  availabilityMonths: SeasonalityMonth[];
  isYearRound: boolean;
  publishedAt: Date;
  // SEED-DEMO-FIX-2 — FP-7 (qualité structurée).
  qualityAttributes: ProductQualityAttribute[];
  // SEED-DEMO-FIX-2 — FP-8 (logistique structurée).
  packagingFormats: string[];
  temperatureRequirements: string;
  grossWeight: Prisma.Decimal;
  netWeight: Prisma.Decimal;
  palletization: string;
  // SEED-DEMO-FIX-2 — FP-5 (volumes & capacités).
  annualProductionCapacity: Prisma.Decimal;
  capacityUnit: string;
  availableQuantity: Prisma.Decimal;
  availableQuantityUnit: string;
  restockFrequency: string;
  offer: {
    priceMode: MarketplacePriceMode;
    unitPrice: Prisma.Decimal | null;
    moq: Prisma.Decimal;
    availableQuantity: Prisma.Decimal;
    leadTimeDays: number;
    incoterm: string;
    destinationMarketsJson: string[];
  };
}

interface DemoCertification {
  scope: 'SELLER_PROFILE' | 'MARKETPLACE_PRODUCT';
  relatedSlug: string; // slug du seller ou du produit
  type: CertificationType;
  code: string;
  issuingBody: string;
  validFrom: Date;
  validUntil: Date;
}

// SEED-DEMO-FIX-3 — Documents PUBLIC attachés à un produit demo.
interface DemoPublicDocument {
  /** Slug du MarketplaceProduct cible. */
  productSlug: string;
  /** Code naturel idempotent du Document MCH (lookup `where: { code: ... }`). */
  documentCode: string;
  documentName: string;
  documentType: 'TECHNICAL_DATA_SHEET' | 'PHYTOSANITARY_CERTIFICATE';
  marketplaceTitle: string;
  storageKey: string; // chemin MinIO factice
  fileSize: number; // octets factices
}

// SEED-DEMO-FIX-3 — Demande de devis demo (idempotence via productSlug).
interface DemoQuoteRequest {
  /** Identifiant naturel pour idempotence (`productSlug` + ordre seedAt). */
  seedKey: string;
  buyerEmail: 'smoke-buyer@iox.mch';
  /** Slug du MarketplaceProduct dont l'offre principale est ciblée. */
  productSlug: string;
  requestedQuantity: string;
  requestedUnit: string;
  deliveryCountry: string;
  status: 'NEW' | 'QUALIFIED' | 'QUOTED';
  initialMessage: string;
  /** Réplique du seller (ajoutée comme `QuoteRequestMessage`). */
  sellerReply: string;
}

const D = (v: string) => new Prisma.Decimal(v);
const T = (iso: string) => new Date(iso);

const APPROVED_AT = T('2026-04-01T08:00:00.000Z');
const PUBLISHED_AT = T('2026-04-15T08:00:00.000Z');
const VALID_FROM = T('2025-01-01T00:00:00.000Z');
const VALID_UNTIL = T('2027-12-31T00:00:00.000Z');

export const SMOKE_BUYER_EMAIL = 'smoke-buyer@iox.mch';
export const SMOKE_BUYER_COMPANY_CODE = 'DEMO-BUYER-001';

export const DEMO_DATASET: {
  sellers: DemoSeller[];
  products: DemoProduct[];
  certifications: DemoCertification[];
  publicDocuments: DemoPublicDocument[];
  quoteRequests: DemoQuoteRequest[];
} = {
  sellers: [
    {
      slug: 'demo-coop-vanille',
      companyCode: 'DEMO-SUP-001',
      beneficiaryCode: 'DEMO-BEN-001',
      companyName: 'Coopérative Vanille de Mayotte',
      publicDisplayName: 'Coopérative Vanille de Mayotte',
      descriptionShort:
        'Coopérative de planteurs de vanille bourbon, Mamoudzou. Récolte mature, séchage traditionnel.',
      descriptionLong:
        "Implantée à Mamoudzou depuis 2018, la coopérative regroupe 14 planteurs engagés sur la qualité du grain et la traçabilité. Vanille bourbon noire récoltée à pleine maturité, séchée selon le procédé traditionnel mahorais. Capacité d'export annuelle : 800 kg.",
      country: 'YT',
      region: 'Grande-Terre',
      cityOrZone: 'Mamoudzou',
      sector: 'épice',
      supportedIncoterms: ['FOB', 'CIF', 'EXW'],
      destinationsServed: ['FR', 'BE', 'CH', 'DE'],
      averageLeadTimeDays: 21,
      isFeatured: true,
      approvedAt: APPROVED_AT,
      logoMediaId: '11111111-1111-4111-8111-111111111101',
      bannerMediaId: '11111111-1111-4111-8111-111111111102',
    },
    {
      slug: 'demo-pecheurs-mayotte',
      companyCode: 'DEMO-SUP-002',
      beneficiaryCode: 'DEMO-BEN-002',
      companyName: "Pêcheurs de l'Océan Indien",
      publicDisplayName: "Pêcheurs de l'Océan Indien",
      descriptionShort:
        'Coopérative de pêche artisanale autour de Petite-Terre. Filière thon et poisson blanc, congélation rapide.',
      descriptionLong:
        "12 bateaux de pêche artisanale opérant autour de Petite-Terre. Spécialité thon (jaune et albacore), poissons blancs nobles. Chaîne du froid maîtrisée — congélation rapide à -40°C dès le débarquement, conditionnement IQF pour l'export.",
      country: 'YT',
      region: 'Petite-Terre',
      cityOrZone: 'Dzaoudzi',
      sector: 'pêche',
      supportedIncoterms: ['FOB', 'CIF', 'CFR'],
      destinationsServed: ['FR', 'RE', 'IT', 'ES'],
      averageLeadTimeDays: 14,
      isFeatured: true,
      approvedAt: APPROVED_AT,
      logoMediaId: '22222222-2222-4222-8222-222222222201',
      bannerMediaId: '22222222-2222-4222-8222-222222222202',
    },
    {
      slug: 'demo-ylang-bandrele',
      companyCode: 'DEMO-SUP-003',
      beneficiaryCode: 'DEMO-BEN-003',
      companyName: "Distillerie d'Ylang Bandrélé",
      publicDisplayName: "Distillerie d'Ylang Bandrélé",
      descriptionShort:
        "Distillation artisanale d'ylang-ylang sur la côte sud, huile essentielle qualité 'Extra'.",
      descriptionLong:
        "Distillerie familiale fondée en 1992 à Bandrélé. Production d'huile essentielle d'ylang-ylang en 5 fractions (Extra, 1ère, 2ème, 3ème, Complète) selon la méthode traditionnelle de distillation à la vapeur. Approvisionnement direct des cueilleuses partenaires sur 18 hectares de plantations.",
      country: 'YT',
      region: 'Grande-Terre Sud',
      cityOrZone: 'Bandrélé',
      sector: 'arôme',
      supportedIncoterms: ['EXW', 'FOB'],
      destinationsServed: ['FR', 'CH', 'US'],
      averageLeadTimeDays: 30,
      isFeatured: false,
      approvedAt: APPROVED_AT,
      logoMediaId: '33333333-3333-4333-8333-333333333301',
      bannerMediaId: '33333333-3333-4333-8333-333333333302',
    },
    {
      slug: 'demo-fruits-tsingoni',
      companyCode: 'DEMO-SUP-004',
      beneficiaryCode: 'DEMO-BEN-004',
      companyName: 'Producteurs de Tsingoni',
      publicDisplayName: 'Producteurs de Tsingoni',
      descriptionShort:
        "Groupement de maraîchers et arboriculteurs (mangue, jacque, fruit de la passion).",
      descriptionLong:
        "Groupement de 22 producteurs sur les communes de Tsingoni et Combani. Filières mangue (variété Maya, José), jacque, fruit de la passion. Calibrage et conditionnement sur place. Certification Bio EU en cours sur 6 hectares.",
      country: 'YT',
      region: 'Centre',
      cityOrZone: 'Tsingoni',
      sector: 'fruit',
      supportedIncoterms: ['EXW', 'FCA'],
      destinationsServed: ['FR', 'RE'],
      averageLeadTimeDays: 10,
      isFeatured: false,
      approvedAt: APPROVED_AT,
      logoMediaId: '44444444-4444-4444-8444-444444444401',
      bannerMediaId: '44444444-4444-4444-8444-444444444402',
    },
    // ── BÊTA-PRIVÉE-PREP — 5 nouveaux sellers MCH ──────────────────────
    {
      slug: 'demo-vanille-mch',
      companyCode: 'DEMO-SUP-006',
      beneficiaryCode: 'DEMO-BEN-006',
      companyName: 'Coopérative Vanille Mahoraise',
      publicDisplayName: 'Vanille de Mayotte MCH',
      descriptionShort:
        'Producteur de vanille bourbon de terroir, plantation familiale à Sada.',
      descriptionLong:
        "Coopérative familiale de 8 planteurs établie à Sada depuis 2019. Vanille bourbon noire cultivée sous couvert forestier, pollinisation manuelle, séchage lent au soleil pendant 6 mois. Traçabilité parcellaire complète. Production artisanale limitée, qualité supérieure orientée export.",
      country: 'YT',
      region: 'Grande-Terre',
      cityOrZone: 'Sada',
      sector: 'épice',
      supportedIncoterms: ['FOB', 'EXW'],
      destinationsServed: ['FR', 'BE', 'CH'],
      averageLeadTimeDays: 18,
      isFeatured: true,
      approvedAt: APPROVED_AT,
      logoMediaId: '66666666-6666-4666-8666-666666666601',
      bannerMediaId: '66666666-6666-4666-8666-666666666602',
    },
    {
      slug: 'demo-ylang-mch',
      companyCode: 'DEMO-SUP-007',
      beneficiaryCode: 'DEMO-BEN-007',
      companyName: "Distillerie Ylang-Ylang Maoré",
      publicDisplayName: 'Ylang Maoré Distillation',
      descriptionShort:
        "Distillation artisanale d'ylang-ylang, fraction Extra et huile complète, côte nord-est.",
      descriptionLong:
        "Distillerie artisanale fondée en 2015 à Mtsamboro. Approvisionnement direct auprès de 12 cueilleuses partenaires sur 10 hectares de plantations d'ylang-ylang. Distillation à la vapeur d'eau dans des alambics en inox. Huile essentielle certifiée bio, traçabilité du cueillage au flacon.",
      country: 'YT',
      region: 'Grande-Terre Nord',
      cityOrZone: 'Mtsamboro',
      sector: 'arôme',
      supportedIncoterms: ['EXW', 'FOB'],
      destinationsServed: ['FR', 'CH', 'DE'],
      averageLeadTimeDays: 25,
      isFeatured: false,
      approvedAt: APPROVED_AT,
      logoMediaId: '77777777-7777-4777-8777-777777777701',
      bannerMediaId: '77777777-7777-4777-8777-777777777702',
    },
    {
      slug: 'demo-mangues-mch',
      companyCode: 'DEMO-SUP-008',
      beneficiaryCode: 'DEMO-BEN-008',
      companyName: 'Producteur Mangues Tropicales',
      publicDisplayName: 'Mangues Tropicales Mayotte',
      descriptionShort:
        'Séchage solaire de mangues Kent, production familiale à Chiconi.',
      descriptionLong:
        "Exploitation familiale spécialisée dans le séchage solaire de mangues variété Kent. Récolte manuelle à maturité optimale, tranchage et séchage dans un séchoir solaire hybride conçu localement. Sans sucre ajouté, sans conservateur. Capacité : 3 tonnes de fruits séchés par saison.",
      country: 'YT',
      region: 'Centre',
      cityOrZone: 'Chiconi',
      sector: 'fruit',
      supportedIncoterms: ['EXW', 'FCA'],
      destinationsServed: ['FR', 'RE', 'BE'],
      averageLeadTimeDays: 12,
      isFeatured: true,
      approvedAt: APPROVED_AT,
      logoMediaId: '88888888-8888-4888-8888-888888888801',
      bannerMediaId: '88888888-8888-4888-8888-888888888802',
    },
    {
      slug: 'demo-cafe-mch',
      companyCode: 'DEMO-SUP-009',
      beneficiaryCode: 'DEMO-BEN-009',
      companyName: 'Torréfaction Mahoraise',
      publicDisplayName: 'Café Mahoré Artisanal',
      descriptionShort:
        'Torréfaction artisanale de café vert de terroir mahorais, micro-lot.',
      descriptionLong:
        "Micro-torréfacteur basé à Dembéni, spécialisé dans le café vert cultivé sur les pentes du Mont Bénara (400-600m). Variété Robusta sélectionnée, cueillette cerise, séchage sur lit africain. Torréfaction au feu de bois en petits lots (< 20 kg). Profil tasse : corps plein, notes de cacao et épices.",
      country: 'YT',
      region: 'Centre',
      cityOrZone: 'Dembéni',
      sector: 'boisson',
      supportedIncoterms: ['EXW', 'FOB'],
      destinationsServed: ['FR', 'BE'],
      averageLeadTimeDays: 15,
      isFeatured: false,
      approvedAt: APPROVED_AT,
      logoMediaId: '99999999-9999-4999-8999-999999999901',
      bannerMediaId: '99999999-9999-4999-8999-999999999902',
    },
    {
      slug: 'demo-miel-mch',
      companyCode: 'DEMO-SUP-010',
      beneficiaryCode: 'DEMO-BEN-010',
      companyName: 'Miellerie des Comores',
      publicDisplayName: 'Miel des Comores Bio',
      descriptionShort:
        'Apiculteur bio, miel de litchi et miel toutes fleurs, ruchers itinérants.',
      descriptionLong:
        "Apiculteur installé à Kani-Kéli avec 45 ruches Dadant, ruchers itinérants suivant les floraisons de litchi (juillet-septembre) et les floraisons sauvages. Récolte à froid, filtration simple, mise en pot artisanale. Miel non chauffé, cristallisation naturelle. Certification bio en cours (Ecocert).",
      country: 'YT',
      region: 'Grande-Terre Sud',
      cityOrZone: 'Kani-Kéli',
      sector: 'apiculture',
      supportedIncoterms: ['EXW', 'FOB'],
      destinationsServed: ['FR', 'RE', 'CH'],
      averageLeadTimeDays: 14,
      isFeatured: true,
      approvedAt: APPROVED_AT,
      logoMediaId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa001',
      bannerMediaId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa002',
    },
  ],

  products: [
    {
      slug: 'demo-vanille-bourbon-grade-a',
      productCode: 'DEMO-PRD-001',
      beneficiaryCode: 'DEMO-BEN-001',
      sellerSlug: 'demo-coop-vanille',
      category: 'épice',
      commercialName: 'Vanille Bourbon de Mayotte — Grade A',
      subtitle: 'Gousses noires, 16-18 cm, taux de vanilline ≥ 1,8%',
      originCountry: 'YT',
      originRegion: 'Grande-Terre',
      originLocality: 'Combani',
      altitudeMeters: 180,
      gpsLat: D('-12.79'),
      gpsLng: D('45.13'),
      varietySpecies: 'Vanilla planifolia',
      productionMethod: 'Traditionnel — séchage solaire',
      descriptionShort:
        'Gousses calibrées 16-18 cm, taux de vanilline ≥ 1,8%, séchage 6 mois.',
      descriptionLong:
        'Vanille bourbon de Mayotte cultivée sous ombrage. Récolte manuelle à pleine maturité (gousses jaunes), échaudage 3 minutes à 65°C, étuvage 24h, séchage solaire 4-6 semaines puis affinage 4-6 mois. Grade A : gousses noires brillantes, souples, charnues, 16-18 cm. Conditionnement sous vide ou pochette papier kraft.',
      packagingDescription: 'Pochette de 250g (≈ 30 gousses) — sous vide alimentaire',
      defaultUnit: 'kg',
      minimumOrderQuantity: D('1.000'),
      harvestMonths: ['JUL', 'AUG', 'SEP'],
      availabilityMonths: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
      isYearRound: true,
      publishedAt: PUBLISHED_AT,
      qualityAttributes: [
        ProductQualityAttribute.ORGANIC,
        ProductQualityAttribute.FAIR_TRADE,
        ProductQualityAttribute.HAND_HARVESTED,
        ProductQualityAttribute.TRADITIONAL,
      ],
      packagingFormats: ['250g vacuum', '500g vacuum', 'carton 1kg'],
      temperatureRequirements: 'Cool 4-15°C, dry',
      grossWeight: D('0.280'),
      netWeight: D('0.250'),
      palletization: 'Carton 12 unités, palette 80 cartons',
      annualProductionCapacity: D('800.000'),
      capacityUnit: 'kg/an',
      availableQuantity: D('120.000'),
      availableQuantityUnit: 'kg',
      restockFrequency: 'seasonal',
      offer: {
        priceMode: MarketplacePriceMode.FIXED,
        unitPrice: D('420.00'),
        moq: D('1.000'),
        availableQuantity: D('120.000'),
        leadTimeDays: 14,
        incoterm: 'FOB',
        destinationMarketsJson: ['FR', 'BE', 'CH'],
      },
    },
    {
      slug: 'demo-vanille-poudre',
      productCode: 'DEMO-PRD-002',
      beneficiaryCode: 'DEMO-BEN-001',
      sellerSlug: 'demo-coop-vanille',
      category: 'épice',
      commercialName: 'Poudre de Vanille pure 100%',
      subtitle: 'Gousses moulues entières, sans additif',
      originCountry: 'YT',
      originRegion: 'Grande-Terre',
      originLocality: 'Combani',
      altitudeMeters: 180,
      gpsLat: D('-12.79'),
      gpsLng: D('45.13'),
      varietySpecies: 'Vanilla planifolia',
      productionMethod: 'Mouture cryogénique',
      descriptionShort: 'Poudre fine issue de gousses entières mahoraises moulues à froid.',
      descriptionLong:
        "Mouture cryogénique des gousses entières (gousse + graines) issues de notre Grade A. Taux de vanilline préservé. Idéal pâtisserie professionnelle, glaces, chocolats. Pas d'additif, pas de support, 100% vanille.",
      packagingDescription: 'Sachet aluminium 100g, conditionnement carton x12',
      defaultUnit: 'kg',
      minimumOrderQuantity: D('0.500'),
      harvestMonths: ['JUL', 'AUG', 'SEP'],
      availabilityMonths: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
      isYearRound: true,
      publishedAt: PUBLISHED_AT,
      qualityAttributes: [
        ProductQualityAttribute.ORGANIC,
        ProductQualityAttribute.FAIR_TRADE,
        ProductQualityAttribute.SMALL_BATCH,
      ],
      packagingFormats: ['100g aluminium pouch', 'carton x12'],
      temperatureRequirements: 'Cool 4-15°C, dry',
      grossWeight: D('0.115'),
      netWeight: D('0.100'),
      palletization: 'Carton 12 sachets, palette 100 cartons',
      annualProductionCapacity: D('200.000'),
      capacityUnit: 'kg/an',
      availableQuantity: D('45.000'),
      availableQuantityUnit: 'kg',
      restockFrequency: 'seasonal',
      offer: {
        priceMode: MarketplacePriceMode.FROM_PRICE,
        unitPrice: D('780.00'),
        moq: D('0.500'),
        availableQuantity: D('45.000'),
        leadTimeDays: 21,
        incoterm: 'CIF',
        destinationMarketsJson: ['FR', 'BE', 'DE'],
      },
    },
    {
      slug: 'demo-thon-jaune-iqf',
      productCode: 'DEMO-PRD-003',
      beneficiaryCode: 'DEMO-BEN-002',
      sellerSlug: 'demo-pecheurs-mayotte',
      category: 'pêche',
      commercialName: 'Filets de Thon Jaune IQF',
      subtitle: 'Pavé de thon jaune, congélation rapide à -40°C',
      originCountry: 'YT',
      originRegion: 'ZEE Mayotte',
      originLocality: 'Banc du Geyser',
      altitudeMeters: 0,
      gpsLat: D('-12.36'),
      gpsLng: D('46.42'),
      varietySpecies: 'Thunnus albacares',
      productionMethod: 'Pêche à la ligne — IQF débarquement',
      descriptionShort:
        'Filets de thon jaune (Thunnus albacares) congelés IQF, calibre 200-400g.',
      descriptionLong:
        "Thon jaune pêché à la ligne dans la ZEE de Mayotte. Filetage et congélation IQF dès le débarquement (chaîne du froid intégrale, < 4h). Calibre 200-400g, glaçage 4%. Convient sashimi, plancha, conserve. Lots traçables jusqu'à l'embarcation.",
      packagingDescription: 'Carton 5 kg — sachets sous vide individuels',
      defaultUnit: 'kg',
      minimumOrderQuantity: D('25.000'),
      harvestMonths: ['MAR', 'APR', 'MAY', 'JUN', 'JUL', 'OCT', 'NOV'],
      availabilityMonths: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
      isYearRound: true,
      publishedAt: PUBLISHED_AT,
      qualityAttributes: [
        ProductQualityAttribute.WILD_HARVESTED,
        ProductQualityAttribute.RAW,
      ],
      packagingFormats: ['filet 1kg vacuum', 'carton 5kg vacuum'],
      temperatureRequirements: 'Frozen ≤ -18°C',
      grossWeight: D('5.300'),
      netWeight: D('5.000'),
      palletization: 'Carton 5kg, palette 200 cartons (1 tonne)',
      annualProductionCapacity: D('45000.000'),
      capacityUnit: 'kg/an',
      availableQuantity: D('800.000'),
      availableQuantityUnit: 'kg',
      restockFrequency: 'weekly',
      offer: {
        priceMode: MarketplacePriceMode.FIXED,
        unitPrice: D('14.50'),
        moq: D('25.000'),
        availableQuantity: D('800.000'),
        leadTimeDays: 7,
        incoterm: 'CIF',
        destinationMarketsJson: ['FR', 'RE', 'IT'],
      },
    },
    {
      slug: 'demo-thon-conserve-huile',
      productCode: 'DEMO-PRD-004',
      beneficiaryCode: 'DEMO-BEN-002',
      sellerSlug: 'demo-pecheurs-mayotte',
      category: 'conserve',
      commercialName: "Conserve de Thon à l'huile d'olive",
      subtitle: 'Boîte 200g — thon jaune mahorais',
      originCountry: 'YT',
      originRegion: 'ZEE Mayotte',
      originLocality: 'Banc du Geyser',
      altitudeMeters: 0,
      gpsLat: D('-12.36'),
      gpsLng: D('46.42'),
      varietySpecies: 'Thunnus albacares',
      productionMethod: 'Conservation appertisée',
      descriptionShort:
        "Émincés de thon jaune mahorais cuits, conservés à l'huile d'olive vierge.",
      descriptionLong:
        "Thon jaune sourcé sur nos lots IQF, cuit à la vapeur puis conditionné en boîte 200g (poids net égoutté 140g). Huile d'olive vierge espagnole, sel marin de Guérande. Stérilisation 121°C 70 min. DLUO 4 ans.",
      packagingDescription: 'Carton 24 boîtes 200g — palettisation 64 cartons',
      defaultUnit: 'unité',
      minimumOrderQuantity: D('120.000'),
      harvestMonths: [],
      availabilityMonths: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
      isYearRound: true,
      publishedAt: PUBLISHED_AT,
      qualityAttributes: [
        ProductQualityAttribute.WILD_HARVESTED,
        ProductQualityAttribute.TRADITIONAL,
      ],
      packagingFormats: ['boîte 200g', 'carton 24 unités'],
      temperatureRequirements: 'Ambient',
      grossWeight: D('5.400'),
      netWeight: D('4.800'),
      palletization: 'Carton 24 boîtes, palette 64 cartons',
      annualProductionCapacity: D('60000.000'),
      capacityUnit: 'unités/an',
      availableQuantity: D('5400.000'),
      availableQuantityUnit: 'unités',
      restockFrequency: 'monthly',
      offer: {
        priceMode: MarketplacePriceMode.FROM_PRICE,
        unitPrice: D('3.20'),
        moq: D('120.000'),
        availableQuantity: D('5400.000'),
        leadTimeDays: 28,
        incoterm: 'FOB',
        destinationMarketsJson: ['FR', 'BE', 'ES'],
      },
    },
    {
      slug: 'demo-ylang-extra',
      productCode: 'DEMO-PRD-005',
      beneficiaryCode: 'DEMO-BEN-003',
      sellerSlug: 'demo-ylang-bandrele',
      category: 'arôme',
      commercialName: "Huile Essentielle d'Ylang-Ylang Extra",
      subtitle: '1ère fraction, distillation 1h',
      originCountry: 'YT',
      originRegion: 'Grande-Terre Sud',
      originLocality: 'Bandrélé',
      altitudeMeters: 80,
      gpsLat: D('-12.91'),
      gpsLng: D('45.19'),
      varietySpecies: 'Cananga odorata',
      productionMethod: 'Distillation à la vapeur d’eau',
      descriptionShort:
        'Première fraction (Extra) — note de tête florale, fruitée, légèrement épicée.',
      descriptionLong:
        "Issue de la 1ère heure de distillation des fleurs cueillies à l'aube (rendement < 0,5%). Profil olfactif : note de tête florale très intense, presque fruitée (jasmin, narcisse, banane mûre). Qualité parfumerie haut de gamme. Conditionnement en flacons ambre étain.",
      packagingDescription: 'Flacon ambré étain 100mL ou 1L (sur demande)',
      defaultUnit: 'kg',
      minimumOrderQuantity: D('0.500'),
      harvestMonths: ['SEP', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB'],
      availabilityMonths: ['NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR'],
      isYearRound: false,
      publishedAt: PUBLISHED_AT,
      qualityAttributes: [
        ProductQualityAttribute.HANDMADE,
        ProductQualityAttribute.ARTISANAL,
        ProductQualityAttribute.COLD_PRESSED,
        ProductQualityAttribute.SMALL_BATCH,
      ],
      packagingFormats: ['100mL flacon ambré étain', '1L bidon inox'],
      temperatureRequirements: 'Cool 4-20°C, dark',
      grossWeight: D('0.200'),
      netWeight: D('0.100'),
      palletization: 'Carton 24 flacons 100mL, palette 60 cartons',
      annualProductionCapacity: D('45.000'),
      capacityUnit: 'kg/an',
      availableQuantity: D('12.000'),
      availableQuantityUnit: 'kg',
      restockFrequency: 'monthly',
      offer: {
        priceMode: MarketplacePriceMode.QUOTE_ONLY,
        unitPrice: null,
        moq: D('0.500'),
        availableQuantity: D('12.000'),
        leadTimeDays: 35,
        incoterm: 'EXW',
        destinationMarketsJson: ['FR', 'CH'],
      },
    },
    {
      slug: 'demo-ylang-complete',
      productCode: 'DEMO-PRD-006',
      beneficiaryCode: 'DEMO-BEN-003',
      sellerSlug: 'demo-ylang-bandrele',
      category: 'arôme',
      commercialName: "Huile Essentielle d'Ylang-Ylang Complète",
      subtitle: 'Toutes fractions — distillation 18h',
      originCountry: 'YT',
      originRegion: 'Grande-Terre Sud',
      originLocality: 'Bandrélé',
      altitudeMeters: 80,
      gpsLat: D('-12.91'),
      gpsLng: D('45.19'),
      varietySpecies: 'Cananga odorata',
      productionMethod: 'Distillation à la vapeur d’eau',
      descriptionShort:
        'Distillation longue (18h) — toutes fractions confondues, profil rond.',
      descriptionLong:
        "Distillation complète de 18 heures regroupant toutes les fractions (Extra, 1ère, 2ème, 3ème). Note plus boisée, structurée, équilibrée. Référence parfumerie classique et aromathérapie. Lots tracés au cueillage.",
      packagingDescription: 'Bidon inox 5kg ou 25kg',
      defaultUnit: 'kg',
      minimumOrderQuantity: D('5.000'),
      harvestMonths: ['SEP', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB'],
      availabilityMonths: ['NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR'],
      isYearRound: false,
      publishedAt: PUBLISHED_AT,
      qualityAttributes: [
        ProductQualityAttribute.HANDMADE,
        ProductQualityAttribute.ARTISANAL,
        ProductQualityAttribute.TRADITIONAL,
      ],
      packagingFormats: ['5kg bidon inox', '25kg bidon inox'],
      temperatureRequirements: 'Cool 4-20°C, dark',
      grossWeight: D('5.400'),
      netWeight: D('5.000'),
      palletization: 'Bidon 5kg, palette 32 bidons (1 tonne)',
      annualProductionCapacity: D('320.000'),
      capacityUnit: 'kg/an',
      availableQuantity: D('80.000'),
      availableQuantityUnit: 'kg',
      restockFrequency: 'monthly',
      offer: {
        priceMode: MarketplacePriceMode.FIXED,
        unitPrice: D('165.00'),
        moq: D('5.000'),
        availableQuantity: D('80.000'),
        leadTimeDays: 30,
        incoterm: 'FOB',
        destinationMarketsJson: ['FR', 'CH', 'US'],
      },
    },
    {
      slug: 'demo-mangue-maya',
      productCode: 'DEMO-PRD-007',
      beneficiaryCode: 'DEMO-BEN-004',
      sellerSlug: 'demo-fruits-tsingoni',
      category: 'fruit',
      commercialName: 'Mangue Maya de Tsingoni',
      subtitle: 'Variété Maya, calibre 400-600g',
      originCountry: 'YT',
      originRegion: 'Centre',
      originLocality: 'Tsingoni',
      altitudeMeters: 90,
      gpsLat: D('-12.78'),
      gpsLng: D('45.10'),
      varietySpecies: 'Mangifera indica',
      productionMethod: 'Verger raisonné',
      descriptionShort:
        'Mangue Maya à chair orange, peu fibreuse, calibre 400-600g.',
      descriptionLong:
        "Variété Maya cultivée sur les vergers de Tsingoni. Récolte au stade pré-mûr pour transit aérien (calibre 400-600g, brix > 14). Conditionnement plateau alvéolé 4 kg. Pré-refroidissement avant expédition.",
      packagingDescription: 'Plateau 4 kg, palettisation 200 plateaux',
      defaultUnit: 'kg',
      minimumOrderQuantity: D('40.000'),
      harvestMonths: ['NOV', 'DEC', 'JAN', 'FEB'],
      availabilityMonths: ['NOV', 'DEC', 'JAN', 'FEB'],
      isYearRound: false,
      publishedAt: PUBLISHED_AT,
      qualityAttributes: [
        ProductQualityAttribute.ORGANIC,
        ProductQualityAttribute.HAND_HARVESTED,
        ProductQualityAttribute.SMALL_BATCH,
      ],
      packagingFormats: ['plateau 4kg', 'carton 10kg'],
      temperatureRequirements: 'Cool 8-12°C',
      grossWeight: D('4.200'),
      netWeight: D('4.000'),
      palletization: 'Plateau alvéolé 4kg, palette 200 plateaux',
      annualProductionCapacity: D('25000.000'),
      capacityUnit: 'kg/an',
      availableQuantity: D('1200.000'),
      availableQuantityUnit: 'kg',
      restockFrequency: 'seasonal',
      offer: {
        priceMode: MarketplacePriceMode.FROM_PRICE,
        unitPrice: D('5.80'),
        moq: D('40.000'),
        availableQuantity: D('1200.000'),
        leadTimeDays: 5,
        incoterm: 'FCA',
        destinationMarketsJson: ['FR', 'RE'],
      },
    },
    {
      slug: 'demo-fruit-passion',
      productCode: 'DEMO-PRD-008',
      beneficiaryCode: 'DEMO-BEN-004',
      sellerSlug: 'demo-fruits-tsingoni',
      category: 'fruit',
      commercialName: 'Fruit de la Passion violet',
      subtitle: 'Passiflora edulis — calibre 60-90g',
      originCountry: 'YT',
      originRegion: 'Centre',
      originLocality: 'Combani',
      altitudeMeters: 150,
      gpsLat: D('-12.79'),
      gpsLng: D('45.13'),
      varietySpecies: 'Passiflora edulis',
      productionMethod: 'Treille raisonnée',
      descriptionShort: 'Maracuja violet, pulpe acidulée parfumée, calibre 60-90g.',
      descriptionLong:
        "Fruit de la passion violet (Passiflora edulis var. edulis) cultivé sur treille à Combani. Récolte à pleine maturité (chute), calibrage manuel, brix > 13. Pulpe orange acidulée. Idéal pour pâtisserie, mixologie, cuisine.",
      packagingDescription: 'Cagette plastique 4 kg réutilisable',
      defaultUnit: 'kg',
      minimumOrderQuantity: D('20.000'),
      harvestMonths: ['MAR', 'APR', 'MAY', 'OCT', 'NOV'],
      availabilityMonths: ['MAR', 'APR', 'MAY', 'OCT', 'NOV'],
      isYearRound: false,
      publishedAt: PUBLISHED_AT,
      qualityAttributes: [
        ProductQualityAttribute.ORGANIC,
        ProductQualityAttribute.HAND_HARVESTED,
      ],
      packagingFormats: ['cagette 4kg réutilisable', 'carton 8kg'],
      temperatureRequirements: 'Cool 8-12°C',
      grossWeight: D('4.300'),
      netWeight: D('4.000'),
      palletization: 'Cagette 4kg, palette 180 cagettes',
      annualProductionCapacity: D('6000.000'),
      capacityUnit: 'kg/an',
      availableQuantity: D('300.000'),
      availableQuantityUnit: 'kg',
      restockFrequency: 'seasonal',
      offer: {
        priceMode: MarketplacePriceMode.QUOTE_ONLY,
        unitPrice: null,
        moq: D('20.000'),
        availableQuantity: D('300.000'),
        leadTimeDays: 7,
        incoterm: 'EXW',
        destinationMarketsJson: ['FR', 'RE'],
      },
    },
    // ── BÊTA-PRIVÉE-PREP — 5 nouveaux produits MCH ─────────────────────
    {
      slug: 'demo-vanille-bourbon-mch',
      productCode: 'DEMO-PRD-009',
      beneficiaryCode: 'DEMO-BEN-006',
      sellerSlug: 'demo-vanille-mch',
      category: 'épice',
      commercialName: 'Vanille Bourbon de Mayotte — Terroir Sada',
      subtitle: 'Gousses noires artisanales, 14-17 cm, vanilline > 1,6%',
      originCountry: 'YT',
      originRegion: 'Grande-Terre',
      originLocality: 'Sada',
      altitudeMeters: 120,
      gpsLat: D('-12.85'),
      gpsLng: D('45.10'),
      varietySpecies: 'Vanilla planifolia',
      productionMethod: 'Traditionnel — séchage solaire lent',
      descriptionShort:
        'Gousses noires calibrées 14-17 cm, vanilline > 1,6%, séchage solaire 6 mois.',
      descriptionLong:
        "Vanille bourbon cultivée sous couvert de bananiers à Sada. Pollinisation manuelle, récolte à pleine maturité, échaudage traditionnel et séchage solaire lent (6 mois minimum). Gousses noires souples et parfumées, conditionnement sous vide artisanal. Traçabilité parcellaire du planteur au lot.",
      packagingDescription: 'Pochette kraft 200g sous vide — carton 6 pochettes',
      defaultUnit: 'kg',
      minimumOrderQuantity: D('0.500'),
      harvestMonths: ['JUL', 'AUG', 'SEP'],
      availabilityMonths: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
      isYearRound: true,
      publishedAt: PUBLISHED_AT,
      qualityAttributes: [
        ProductQualityAttribute.ORGANIC,
        ProductQualityAttribute.HAND_HARVESTED,
        ProductQualityAttribute.TRADITIONAL,
        ProductQualityAttribute.SMALL_BATCH,
      ],
      packagingFormats: ['200g vacuum kraft', '500g vacuum', 'carton 1.2kg'],
      temperatureRequirements: 'Cool 4-15°C, dry',
      grossWeight: D('0.230'),
      netWeight: D('0.200'),
      palletization: 'Carton 6 pochettes, palette 60 cartons',
      annualProductionCapacity: D('400.000'),
      capacityUnit: 'kg/an',
      availableQuantity: D('65.000'),
      availableQuantityUnit: 'kg',
      restockFrequency: 'seasonal',
      offer: {
        priceMode: MarketplacePriceMode.FIXED,
        unitPrice: D('450.00'),
        moq: D('0.500'),
        availableQuantity: D('65.000'),
        leadTimeDays: 14,
        incoterm: 'FOB',
        destinationMarketsJson: ['FR', 'BE', 'CH'],
      },
    },
    {
      slug: 'demo-ylang-he-mch',
      productCode: 'DEMO-PRD-010',
      beneficiaryCode: 'DEMO-BEN-007',
      sellerSlug: 'demo-ylang-mch',
      category: 'arôme',
      commercialName: "Huile Essentielle d'Ylang-Ylang — Bio Maoré",
      subtitle: 'Fraction Extra, distillation vapeur, certifiée bio',
      originCountry: 'YT',
      originRegion: 'Grande-Terre Nord',
      originLocality: 'Mtsamboro',
      altitudeMeters: 60,
      gpsLat: D('-12.68'),
      gpsLng: D('45.07'),
      varietySpecies: 'Cananga odorata',
      productionMethod: "Distillation à la vapeur d'eau — bio",
      descriptionShort:
        "Huile essentielle d'ylang-ylang fraction Extra, bio, note florale intense.",
      descriptionLong:
        "Première fraction de distillation (1h) des fleurs cueillies à l'aube sur les plantations certifiées bio de Mtsamboro. Rendement < 0,4%. Note de tête florale puissante (jasmin, banane mûre, narcisse). Qualité parfumerie haut de gamme et aromathérapie. Flacons ambrés étain, lots traçés au cueillage.",
      packagingDescription: 'Flacon ambré 50mL ou 100mL — coffret bois 6 flacons',
      defaultUnit: 'kg',
      minimumOrderQuantity: D('0.250'),
      harvestMonths: ['SEP', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB'],
      availabilityMonths: ['NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR'],
      isYearRound: false,
      publishedAt: PUBLISHED_AT,
      qualityAttributes: [
        ProductQualityAttribute.ORGANIC,
        ProductQualityAttribute.HANDMADE,
        ProductQualityAttribute.ARTISANAL,
        ProductQualityAttribute.SMALL_BATCH,
      ],
      packagingFormats: ['50mL flacon ambré', '100mL flacon ambré', 'coffret bois 6x100mL'],
      temperatureRequirements: 'Cool 4-20°C, dark',
      grossWeight: D('0.120'),
      netWeight: D('0.050'),
      palletization: 'Coffret 6 flacons, palette 120 coffrets',
      annualProductionCapacity: D('25.000'),
      capacityUnit: 'kg/an',
      availableQuantity: D('8.000'),
      availableQuantityUnit: 'kg',
      restockFrequency: 'monthly',
      offer: {
        priceMode: MarketplacePriceMode.QUOTE_ONLY,
        unitPrice: null,
        moq: D('0.250'),
        availableQuantity: D('8.000'),
        leadTimeDays: 30,
        incoterm: 'EXW',
        destinationMarketsJson: ['FR', 'CH', 'DE'],
      },
    },
    {
      slug: 'demo-mangues-kent-sechees',
      productCode: 'DEMO-PRD-011',
      beneficiaryCode: 'DEMO-BEN-008',
      sellerSlug: 'demo-mangues-mch',
      category: 'fruit',
      commercialName: 'Mangues Kent Séchées — Sans sucre ajouté',
      subtitle: 'Tranches séchées au soleil, sans conservateur',
      originCountry: 'YT',
      originRegion: 'Centre',
      originLocality: 'Chiconi',
      altitudeMeters: 100,
      gpsLat: D('-12.80'),
      gpsLng: D('45.09'),
      varietySpecies: 'Mangifera indica cv. Kent',
      productionMethod: 'Séchage solaire hybride',
      descriptionShort:
        'Tranches de mangue Kent séchées au soleil, sans sucre, sans conservateur.',
      descriptionLong:
        "Mangues variété Kent récoltées à pleine maturité, tranchées à la main et séchées dans un séchoir solaire hybride (solaire + appoint bois) pendant 48h. Aucun sucre ajouté, aucun conservateur. Texture moelleuse, goût intense. Conditionnement sous atmosphère protectrice pour durée de vie 12 mois.",
      packagingDescription: 'Sachet doypack 150g — carton 24 sachets',
      defaultUnit: 'kg',
      minimumOrderQuantity: D('5.000'),
      harvestMonths: ['NOV', 'DEC', 'JAN', 'FEB'],
      availabilityMonths: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
      isYearRound: true,
      publishedAt: PUBLISHED_AT,
      qualityAttributes: [
        ProductQualityAttribute.ORGANIC,
        ProductQualityAttribute.HAND_HARVESTED,
        ProductQualityAttribute.ARTISANAL,
        ProductQualityAttribute.SMALL_BATCH,
      ],
      packagingFormats: ['150g doypack', 'carton 24x150g (3.6kg)'],
      temperatureRequirements: 'Ambient, dry',
      grossWeight: D('3.800'),
      netWeight: D('3.600'),
      palletization: 'Carton 24 doypacks, palette 80 cartons',
      annualProductionCapacity: D('3000.000'),
      capacityUnit: 'kg/an',
      availableQuantity: D('500.000'),
      availableQuantityUnit: 'kg',
      restockFrequency: 'seasonal',
      offer: {
        priceMode: MarketplacePriceMode.FIXED,
        unitPrice: D('28.00'),
        moq: D('5.000'),
        availableQuantity: D('500.000'),
        leadTimeDays: 10,
        incoterm: 'FCA',
        destinationMarketsJson: ['FR', 'RE', 'BE'],
      },
    },
    {
      slug: 'demo-cafe-vert-mayotte',
      productCode: 'DEMO-PRD-012',
      beneficiaryCode: 'DEMO-BEN-009',
      sellerSlug: 'demo-cafe-mch',
      category: 'boisson',
      commercialName: 'Café Vert Mayotte — Terroir Bénara',
      subtitle: 'Robusta sélectionné, cueillette cerise, séchage lit africain',
      originCountry: 'YT',
      originRegion: 'Centre',
      originLocality: 'Dembéni',
      altitudeMeters: 480,
      gpsLat: D('-12.83'),
      gpsLng: D('45.16'),
      varietySpecies: 'Coffea canephora',
      productionMethod: 'Cueillette cerise, séchage sur lit africain',
      descriptionShort:
        'Café vert robusta de terroir, cueillette cerise, séchage sur lit africain.',
      descriptionLong:
        "Robusta sélectionné cultivé sur les pentes du Mont Bénara (400-600m d'altitude). Cueillette cerise exclusive (fruits à pleine maturité), dépulpage mécanique puis séchage sur lits africains surélevés pendant 15-20 jours. Grains verts triés à la main. Profil cupping : corps plein, notes de cacao, épices douces, faible acidité.",
      packagingDescription: 'Sac jute GrainPro 25 kg — échantillon 500g sur demande',
      defaultUnit: 'kg',
      minimumOrderQuantity: D('25.000'),
      harvestMonths: ['JUN', 'JUL', 'AUG', 'SEP'],
      availabilityMonths: ['AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB'],
      isYearRound: false,
      publishedAt: PUBLISHED_AT,
      qualityAttributes: [
        ProductQualityAttribute.HAND_HARVESTED,
        ProductQualityAttribute.TRADITIONAL,
        ProductQualityAttribute.ARTISANAL,
        ProductQualityAttribute.SMALL_BATCH,
      ],
      packagingFormats: ['25kg sac jute GrainPro', '500g échantillon'],
      temperatureRequirements: 'Ambient, dry, < 25°C',
      grossWeight: D('25.500'),
      netWeight: D('25.000'),
      palletization: 'Sac 25kg, palette 40 sacs (1 tonne)',
      annualProductionCapacity: D('2000.000'),
      capacityUnit: 'kg/an',
      availableQuantity: D('350.000'),
      availableQuantityUnit: 'kg',
      restockFrequency: 'seasonal',
      offer: {
        priceMode: MarketplacePriceMode.FROM_PRICE,
        unitPrice: D('8.50'),
        moq: D('25.000'),
        availableQuantity: D('350.000'),
        leadTimeDays: 12,
        incoterm: 'FOB',
        destinationMarketsJson: ['FR', 'BE'],
      },
    },
    {
      slug: 'demo-miel-litchi-comores',
      productCode: 'DEMO-PRD-013',
      beneficiaryCode: 'DEMO-BEN-010',
      sellerSlug: 'demo-miel-mch',
      category: 'apiculture',
      commercialName: 'Miel de Litchi des Comores — Bio',
      subtitle: 'Miel monofloral, récolte à froid, non chauffé',
      originCountry: 'YT',
      originRegion: 'Grande-Terre Sud',
      originLocality: 'Kani-Kéli',
      altitudeMeters: 40,
      gpsLat: D('-12.95'),
      gpsLng: D('45.12'),
      varietySpecies: 'Apis mellifera unicolor',
      productionMethod: 'Apiculture bio, récolte à froid',
      descriptionShort:
        'Miel monofloral de litchi, récolte à froid, cristallisation naturelle.',
      descriptionLong:
        "Miel monofloral issu de la floraison des litchis (juillet-septembre) sur les ruchers itinérants de Kani-Kéli. Récolte à froid (extraction centrifuge à température ambiante), filtration simple sur tamis inox, mise en pot à la main. Non chauffé, cristallisation naturelle. Goût floral délicat, notes fruitées de litchi. Certification bio en cours.",
      packagingDescription: 'Pot verre 350g ou 500g — carton 12 pots',
      defaultUnit: 'kg',
      minimumOrderQuantity: D('5.000'),
      harvestMonths: ['JUL', 'AUG', 'SEP'],
      availabilityMonths: ['SEP', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR'],
      isYearRound: false,
      publishedAt: PUBLISHED_AT,
      qualityAttributes: [
        ProductQualityAttribute.ORGANIC,
        ProductQualityAttribute.RAW,
        ProductQualityAttribute.HAND_HARVESTED,
        ProductQualityAttribute.ARTISANAL,
      ],
      packagingFormats: ['350g pot verre', '500g pot verre', 'carton 12 pots'],
      temperatureRequirements: 'Ambient, < 25°C, dark',
      grossWeight: D('6.500'),
      netWeight: D('6.000'),
      palletization: 'Carton 12 pots, palette 60 cartons',
      annualProductionCapacity: D('1500.000'),
      capacityUnit: 'kg/an',
      availableQuantity: D('200.000'),
      availableQuantityUnit: 'kg',
      restockFrequency: 'seasonal',
      offer: {
        priceMode: MarketplacePriceMode.FIXED,
        unitPrice: D('22.00'),
        moq: D('5.000'),
        availableQuantity: D('200.000'),
        leadTimeDays: 10,
        incoterm: 'FOB',
        destinationMarketsJson: ['FR', 'RE', 'CH'],
      },
    },
  ],

  certifications: [
    // Seller-level
    {
      scope: 'SELLER_PROFILE',
      relatedSlug: 'demo-coop-vanille',
      type: CertificationType.BIO_EU,
      code: 'FR-BIO-01-DEMO-001',
      issuingBody: 'Ecocert France',
      validFrom: VALID_FROM,
      validUntil: VALID_UNTIL,
    },
    {
      scope: 'SELLER_PROFILE',
      relatedSlug: 'demo-pecheurs-mayotte',
      type: CertificationType.HACCP,
      code: 'HACCP-DEMO-FISH-001',
      issuingBody: 'Bureau Veritas',
      validFrom: VALID_FROM,
      validUntil: VALID_UNTIL,
    },
    {
      scope: 'SELLER_PROFILE',
      relatedSlug: 'demo-ylang-bandrele',
      type: CertificationType.ECOCERT,
      code: 'ECO-DEMO-YLANG-001',
      issuingBody: 'Ecocert France',
      validFrom: VALID_FROM,
      validUntil: VALID_UNTIL,
    },
    // Product-level
    {
      scope: 'MARKETPLACE_PRODUCT',
      relatedSlug: 'demo-vanille-bourbon-grade-a',
      type: CertificationType.FAIRTRADE,
      code: 'FT-DEMO-VAN-001',
      issuingBody: 'Fairtrade International',
      validFrom: VALID_FROM,
      validUntil: VALID_UNTIL,
    },
    {
      scope: 'MARKETPLACE_PRODUCT',
      relatedSlug: 'demo-thon-conserve-huile',
      type: CertificationType.ISO_22000,
      code: 'ISO22-DEMO-CAN-001',
      issuingBody: 'AFNOR Certification',
      validFrom: VALID_FROM,
      validUntil: VALID_UNTIL,
    },
    {
      scope: 'MARKETPLACE_PRODUCT',
      relatedSlug: 'demo-mangue-maya',
      type: CertificationType.GLOBALGAP,
      code: 'GGAP-DEMO-MAY-001',
      issuingBody: 'GLOBALG.A.P.',
      validFrom: VALID_FROM,
      validUntil: VALID_UNTIL,
    },
  ],

  // SEED-DEMO-FIX-3 — 4 documents PUBLIC (1 par seller principal) pour
  // que le filtre catalog `?hasPublicDocs=true` retourne 4.
  publicDocuments: [
    {
      productSlug: 'demo-vanille-bourbon-grade-a',
      documentCode: 'DEMO-DOC-001',
      documentName: 'fiche-technique-vanille-bourbon.pdf',
      documentType: 'TECHNICAL_DATA_SHEET',
      marketplaceTitle: 'Fiche technique — Vanille Bourbon Grade A',
      storageKey: 'demo/marketplace-documents/fiche-technique-vanille-bourbon.pdf',
      fileSize: 124567,
    },
    {
      productSlug: 'demo-thon-jaune-iqf',
      documentCode: 'DEMO-DOC-002',
      documentName: 'certificat-sanitaire-thon-jaune.pdf',
      documentType: 'PHYTOSANITARY_CERTIFICATE',
      marketplaceTitle: 'Certificat sanitaire — Thon jaune IQF',
      storageKey: 'demo/marketplace-documents/certificat-sanitaire-thon-jaune.pdf',
      fileSize: 98421,
    },
    {
      productSlug: 'demo-ylang-extra',
      documentCode: 'DEMO-DOC-003',
      documentName: 'fiche-technique-ylang-extra.pdf',
      documentType: 'TECHNICAL_DATA_SHEET',
      marketplaceTitle: 'Fiche technique — Ylang-Ylang Extra',
      storageKey: 'demo/marketplace-documents/fiche-technique-ylang-extra.pdf',
      fileSize: 156789,
    },
    {
      productSlug: 'demo-mangue-maya',
      documentCode: 'DEMO-DOC-004',
      documentName: 'certificat-phytosanitaire-mangue-maya.pdf',
      documentType: 'PHYTOSANITARY_CERTIFICATE',
      marketplaceTitle: 'Certificat phytosanitaire — Mangue Maya',
      storageKey: 'demo/marketplace-documents/certificat-phytosanitaire-mangue-maya.pdf',
      fileSize: 87654,
    },
  ],

  // SEED-DEMO-FIX-3 — 2 RFQ entre smoke-buyer et 2 sellers, avec une
  // réplique seller chacune (4 messages au total).
  quoteRequests: [
    {
      seedKey: 'rfq-vanille-poudre-init',
      buyerEmail: 'smoke-buyer@iox.mch',
      productSlug: 'demo-vanille-poudre',
      requestedQuantity: '10',
      requestedUnit: 'kg',
      deliveryCountry: 'FR',
      status: 'NEW',
      initialMessage:
        "Bonjour, intéressé par 10 kg pour début juin. Possibilité d'envoi échantillon ?",
      sellerReply:
        'Bonjour, merci pour votre intérêt. Échantillon possible 250g. Je vous fais un devis ferme dans la journée.',
    },
    {
      seedKey: 'rfq-mangue-maya-quoted',
      buyerEmail: 'smoke-buyer@iox.mch',
      productSlug: 'demo-mangue-maya',
      requestedQuantity: '500',
      requestedUnit: 'kg',
      deliveryCountry: 'FR',
      status: 'QUOTED',
      initialMessage: 'Demande de devis pour 500 kg, livraison Marseille fin mai.',
      sellerReply: 'Devis 1850 EUR/tonne CIF Marseille, MOQ 500kg respecté. Validité 30j.',
    },
  ],
};
