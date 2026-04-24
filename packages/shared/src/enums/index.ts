// ─── RÔLES UTILISATEURS ────────────────────────────────────────────────────
export enum UserRole {
  ADMIN = 'ADMIN',
  COORDINATOR = 'COORDINATOR',
  BENEFICIARY_MANAGER = 'BENEFICIARY_MANAGER',
  SUPPLY_MANAGER = 'SUPPLY_MANAGER',
  QUALITY_MANAGER = 'QUALITY_MANAGER',
  MARKET_VALIDATOR = 'MARKET_VALIDATOR',
  LOGISTICS_MANAGER = 'LOGISTICS_MANAGER',
  COMMERCIAL_MANAGER = 'COMMERCIAL_MANAGER',
  BENEFICIARY = 'BENEFICIARY',
  FUNDER = 'FUNDER',
  AUDITOR = 'AUDITOR',
  MARKETPLACE_SELLER = 'MARKETPLACE_SELLER',
  MARKETPLACE_BUYER = 'MARKETPLACE_BUYER',
}

// ─── MARKETPLACE ────────────────────────────────────────────────────────────
export enum SellerProfileStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  SUSPENDED = 'SUSPENDED',
  REJECTED = 'REJECTED',
}

export enum MarketplacePublicationStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  SUSPENDED = 'SUSPENDED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
}

export enum ExportReadinessStatus {
  NOT_ELIGIBLE = 'NOT_ELIGIBLE',
  INTERNAL_ONLY = 'INTERNAL_ONLY',
  PENDING_DOCUMENTS = 'PENDING_DOCUMENTS',
  PENDING_QUALITY_REVIEW = 'PENDING_QUALITY_REVIEW',
  EXPORT_READY = 'EXPORT_READY',
  EXPORT_READY_WITH_CONDITIONS = 'EXPORT_READY_WITH_CONDITIONS',
}

export enum MarketplacePriceMode {
  FIXED = 'FIXED',
  QUOTE_ONLY = 'QUOTE_ONLY',
  FROM_PRICE = 'FROM_PRICE',
}

export enum MarketplaceVisibilityScope {
  PRIVATE = 'PRIVATE',
  BUYERS_ONLY = 'BUYERS_ONLY',
  PUBLIC = 'PUBLIC',
}

export enum MarketplaceDocumentVisibility {
  PRIVATE = 'PRIVATE',
  BUYER_ON_REQUEST = 'BUYER_ON_REQUEST',
  PUBLIC = 'PUBLIC',
}

export enum MarketplaceVerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export enum MediaAssetType {
  IMAGE = 'IMAGE',
  ILLUSTRATION = 'ILLUSTRATION',
  VIDEO = 'VIDEO',
}

export enum MediaAssetRole {
  PRIMARY = 'PRIMARY',
  GALLERY = 'GALLERY',
  PACKAGING = 'PACKAGING',
  LABEL = 'LABEL',
  LOT = 'LOT',
  ORIGIN = 'ORIGIN',
  MARKETING = 'MARKETING',
  LOGO = 'LOGO',
  BANNER = 'BANNER',
}

export enum MediaModerationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum QuoteRequestStatus {
  NEW = 'NEW',
  QUALIFIED = 'QUALIFIED',
  QUOTED = 'QUOTED',
  NEGOTIATING = 'NEGOTIATING',
  WON = 'WON',
  LOST = 'LOST',
  CANCELLED = 'CANCELLED',
}

export enum MarketplaceReviewType {
  PUBLICATION = 'PUBLICATION',
  MEDIA = 'MEDIA',
  DOCUMENT = 'DOCUMENT',
}

export enum MarketplaceReviewStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum MarketplaceRelatedEntityType {
  SELLER_PROFILE = 'SELLER_PROFILE',
  MARKETPLACE_PRODUCT = 'MARKETPLACE_PRODUCT',
  MARKETPLACE_OFFER = 'MARKETPLACE_OFFER',
  PRODUCT_BATCH = 'PRODUCT_BATCH',
}

// ─── STATUTS BÉNÉFICIAIRES ─────────────────────────────────────────────────
export enum BeneficiaryStatus {
  DRAFT = 'DRAFT',
  QUALIFIED = 'QUALIFIED',
  IN_PROGRESS = 'IN_PROGRESS',
  SUSPENDED = 'SUSPENDED',
  EXITED = 'EXITED',
}

export enum MaturityLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum AccompanimentActionStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// Transitions de statut bénéficiaire autorisées
export const BENEFICIARY_STATUS_TRANSITIONS: Record<BeneficiaryStatus, BeneficiaryStatus[]> = {
  [BeneficiaryStatus.DRAFT]: [BeneficiaryStatus.QUALIFIED],
  [BeneficiaryStatus.QUALIFIED]: [BeneficiaryStatus.IN_PROGRESS, BeneficiaryStatus.DRAFT],
  [BeneficiaryStatus.IN_PROGRESS]: [BeneficiaryStatus.SUSPENDED, BeneficiaryStatus.EXITED],
  [BeneficiaryStatus.SUSPENDED]: [BeneficiaryStatus.IN_PROGRESS, BeneficiaryStatus.EXITED],
  [BeneficiaryStatus.EXITED]: [],
};

// ─── STATUTS PRODUITS ──────────────────────────────────────────────────────
export enum ProductStatus {
  DRAFT = 'DRAFT',
  IN_PREPARATION = 'IN_PREPARATION',
  READY_FOR_VALIDATION = 'READY_FOR_VALIDATION',
  COMPLIANT = 'COMPLIANT',
  COMPLIANT_WITH_RESERVATIONS = 'COMPLIANT_WITH_RESERVATIONS',
  BLOCKED = 'BLOCKED',
  ARCHIVED = 'ARCHIVED',
}

export const PRODUCT_STATUS_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  [ProductStatus.DRAFT]: [ProductStatus.IN_PREPARATION],
  [ProductStatus.IN_PREPARATION]: [ProductStatus.READY_FOR_VALIDATION, ProductStatus.DRAFT],
  [ProductStatus.READY_FOR_VALIDATION]: [
    ProductStatus.COMPLIANT,
    ProductStatus.COMPLIANT_WITH_RESERVATIONS,
    ProductStatus.BLOCKED,
    ProductStatus.IN_PREPARATION,
  ],
  [ProductStatus.COMPLIANT]: [ProductStatus.ARCHIVED, ProductStatus.READY_FOR_VALIDATION],
  [ProductStatus.COMPLIANT_WITH_RESERVATIONS]: [
    ProductStatus.COMPLIANT,
    ProductStatus.BLOCKED,
    ProductStatus.READY_FOR_VALIDATION,
  ],
  [ProductStatus.BLOCKED]: [ProductStatus.IN_PREPARATION],
  [ProductStatus.ARCHIVED]: [],
};

// ─── STATUTS LOT ENTRANT ───────────────────────────────────────────────────
export enum InboundBatchStatus {
  RECEIVED = 'RECEIVED',
  IN_CONTROL = 'IN_CONTROL',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export const INBOUND_BATCH_STATUS_TRANSITIONS: Record<InboundBatchStatus, InboundBatchStatus[]> = {
  [InboundBatchStatus.RECEIVED]: [InboundBatchStatus.IN_CONTROL],
  [InboundBatchStatus.IN_CONTROL]: [InboundBatchStatus.ACCEPTED, InboundBatchStatus.REJECTED],
  [InboundBatchStatus.ACCEPTED]: [],
  [InboundBatchStatus.REJECTED]: [],
};

// ─── STATUTS LOT PRODUIT FINI ──────────────────────────────────────────────
export enum ProductBatchStatus {
  CREATED = 'CREATED',
  READY_FOR_VALIDATION = 'READY_FOR_VALIDATION',
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  SHIPPED = 'SHIPPED',
  BLOCKED = 'BLOCKED',
  DESTROYED = 'DESTROYED',
}

export const PRODUCT_BATCH_STATUS_TRANSITIONS: Record<ProductBatchStatus, ProductBatchStatus[]> = {
  [ProductBatchStatus.CREATED]: [
    ProductBatchStatus.READY_FOR_VALIDATION,
    ProductBatchStatus.BLOCKED,
  ],
  [ProductBatchStatus.READY_FOR_VALIDATION]: [
    ProductBatchStatus.AVAILABLE,
    ProductBatchStatus.BLOCKED,
    ProductBatchStatus.CREATED,
  ],
  [ProductBatchStatus.AVAILABLE]: [
    ProductBatchStatus.RESERVED,
    ProductBatchStatus.BLOCKED,
    ProductBatchStatus.SHIPPED,
  ],
  [ProductBatchStatus.RESERVED]: [
    ProductBatchStatus.AVAILABLE,
    ProductBatchStatus.SHIPPED,
    ProductBatchStatus.BLOCKED,
  ],
  [ProductBatchStatus.SHIPPED]: [],
  [ProductBatchStatus.BLOCKED]: [ProductBatchStatus.CREATED, ProductBatchStatus.DESTROYED],
  [ProductBatchStatus.DESTROYED]: [],
};

// ─── DÉCISION DE MISE EN MARCHÉ ────────────────────────────────────────────
export enum MarketReleaseDecision {
  COMPLIANT = 'COMPLIANT',
  COMPLIANT_WITH_RESERVATIONS = 'COMPLIANT_WITH_RESERVATIONS',
  NON_COMPLIANT = 'NON_COMPLIANT',
}

// ─── STATUTS CONTRATS APPROVISIONNEMENT ────────────────────────────────────
export enum SupplyContractStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  EXPIRED = 'EXPIRED',
  TERMINATED = 'TERMINATED',
}

export const SUPPLY_CONTRACT_STATUS_TRANSITIONS: Record<
  SupplyContractStatus,
  SupplyContractStatus[]
> = {
  [SupplyContractStatus.DRAFT]: [SupplyContractStatus.ACTIVE],
  [SupplyContractStatus.ACTIVE]: [
    SupplyContractStatus.SUSPENDED,
    SupplyContractStatus.EXPIRED,
    SupplyContractStatus.TERMINATED,
  ],
  [SupplyContractStatus.SUSPENDED]: [SupplyContractStatus.ACTIVE, SupplyContractStatus.TERMINATED],
  [SupplyContractStatus.EXPIRED]: [],
  [SupplyContractStatus.TERMINATED]: [],
};

// ─── STATUTS OPPORTUNITÉS COMMERCIALES ────────────────────────────────────
export enum OpportunityStatus {
  IDENTIFIED = 'IDENTIFIED',
  QUALIFIED = 'QUALIFIED',
  NEGOTIATING = 'NEGOTIATING',
  OFFER_SENT = 'OFFER_SENT',
  WON = 'WON',
  LOST = 'LOST',
  SUSPENDED = 'SUSPENDED',
}

// ─── STATUTS INCIDENTS ─────────────────────────────────────────────────────
export enum IncidentStatus {
  OPEN = 'OPEN',
  ANALYZING = 'ANALYZING',
  ACTION_IN_PROGRESS = 'ACTION_IN_PROGRESS',
  CONTROLLED = 'CONTROLLED',
  CLOSED = 'CLOSED',
}

export enum IncidentSeverity {
  MINOR = 'MINOR',
  MAJOR = 'MAJOR',
  CRITICAL = 'CRITICAL',
}

// ─── TYPES DE DOCUMENTS ────────────────────────────────────────────────────
export enum DocumentStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  REJECTED = 'REJECTED',
}

// ─── TYPES D'ENTREPRISES ───────────────────────────────────────────────────
export enum CompanyType {
  SUPPLIER = 'SUPPLIER',
  COOPERATIVE = 'COOPERATIVE',
  BUYER = 'BUYER',
  PARTNER = 'PARTNER',
  INSTITUTIONAL = 'INSTITUTIONAL',
}

// ─── DISTRIBUTIONS ─────────────────────────────────────────────────────────
export enum DistributionStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export const DISTRIBUTION_STATUS_TRANSITIONS: Record<DistributionStatus, DistributionStatus[]> = {
  [DistributionStatus.PLANNED]: [DistributionStatus.IN_PROGRESS, DistributionStatus.CANCELLED],
  [DistributionStatus.IN_PROGRESS]: [DistributionStatus.COMPLETED, DistributionStatus.CANCELLED],
  [DistributionStatus.COMPLETED]: [],
  [DistributionStatus.CANCELLED]: [],
};

// ─── TYPES D'ENTITÉS POUR AUDIT / DOCUMENTS (polymorphisme) ───────────────
export enum EntityType {
  BENEFICIARY = 'BENEFICIARY',
  PRODUCT = 'PRODUCT',
  INBOUND_BATCH = 'INBOUND_BATCH',
  TRANSFORMATION_OPERATION = 'TRANSFORMATION_OPERATION',
  PRODUCT_BATCH = 'PRODUCT_BATCH',
  MARKET_RELEASE_DECISION = 'MARKET_RELEASE_DECISION',
  SUPPLY_CONTRACT = 'SUPPLY_CONTRACT',
  INCIDENT = 'INCIDENT',
  DISTRIBUTION = 'DISTRIBUTION',
  USER = 'USER',
  COMPANY = 'COMPANY',
  SELLER_PROFILE = 'SELLER_PROFILE',
  MARKETPLACE_PRODUCT = 'MARKETPLACE_PRODUCT',
  MARKETPLACE_OFFER = 'MARKETPLACE_OFFER',
  MARKETPLACE_DOCUMENT = 'MARKETPLACE_DOCUMENT',
  MEDIA_ASSET = 'MEDIA_ASSET',
  QUOTE_REQUEST = 'QUOTE_REQUEST',
  MARKETPLACE_REVIEW = 'MARKETPLACE_REVIEW',
}
