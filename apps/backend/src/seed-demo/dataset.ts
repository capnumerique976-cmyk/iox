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

const D = (v: string) => new Prisma.Decimal(v);
const T = (iso: string) => new Date(iso);

const APPROVED_AT = T('2026-04-01T08:00:00.000Z');
const PUBLISHED_AT = T('2026-04-15T08:00:00.000Z');
const VALID_FROM = T('2025-01-01T00:00:00.000Z');
const VALID_UNTIL = T('2027-12-31T00:00:00.000Z');

export const DEMO_DATASET: {
  sellers: DemoSeller[];
  products: DemoProduct[];
  certifications: DemoCertification[];
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
};
