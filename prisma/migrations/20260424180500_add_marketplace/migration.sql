-- CreateEnum
CREATE TYPE "SellerProfileStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'SUSPENDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MarketplacePublicationStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'SUSPENDED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ExportReadinessStatus" AS ENUM ('NOT_ELIGIBLE', 'INTERNAL_ONLY', 'PENDING_DOCUMENTS', 'PENDING_QUALITY_REVIEW', 'EXPORT_READY', 'EXPORT_READY_WITH_CONDITIONS');

-- CreateEnum
CREATE TYPE "MarketplacePriceMode" AS ENUM ('FIXED', 'QUOTE_ONLY', 'FROM_PRICE');

-- CreateEnum
CREATE TYPE "MarketplaceVisibilityScope" AS ENUM ('PRIVATE', 'BUYERS_ONLY', 'PUBLIC');

-- CreateEnum
CREATE TYPE "MarketplaceDocumentVisibility" AS ENUM ('PRIVATE', 'BUYER_ON_REQUEST', 'PUBLIC');

-- CreateEnum
CREATE TYPE "MarketplaceVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MediaAssetType" AS ENUM ('IMAGE', 'ILLUSTRATION', 'VIDEO');

-- CreateEnum
CREATE TYPE "MediaAssetRole" AS ENUM ('PRIMARY', 'GALLERY', 'PACKAGING', 'LABEL', 'LOT', 'ORIGIN', 'MARKETING', 'LOGO', 'BANNER');

-- CreateEnum
CREATE TYPE "MediaModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "QuoteRequestStatus" AS ENUM ('NEW', 'QUALIFIED', 'QUOTED', 'NEGOTIATING', 'WON', 'LOST', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MarketplaceReviewType" AS ENUM ('PUBLICATION', 'MEDIA', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "MarketplaceReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MarketplaceRelatedEntityType" AS ENUM ('SELLER_PROFILE', 'MARKETPLACE_PRODUCT', 'MARKETPLACE_OFFER', 'PRODUCT_BATCH');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EntityType" ADD VALUE 'SELLER_PROFILE';
ALTER TYPE "EntityType" ADD VALUE 'MARKETPLACE_PRODUCT';
ALTER TYPE "EntityType" ADD VALUE 'MARKETPLACE_OFFER';
ALTER TYPE "EntityType" ADD VALUE 'MARKETPLACE_DOCUMENT';
ALTER TYPE "EntityType" ADD VALUE 'MEDIA_ASSET';
ALTER TYPE "EntityType" ADD VALUE 'QUOTE_REQUEST';
ALTER TYPE "EntityType" ADD VALUE 'MARKETPLACE_REVIEW';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'MARKETPLACE_SELLER';
ALTER TYPE "UserRole" ADD VALUE 'MARKETPLACE_BUYER';

-- CreateTable
CREATE TABLE "seller_profiles" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "status" "SellerProfileStatus" NOT NULL DEFAULT 'DRAFT',
    "public_display_name" TEXT NOT NULL,
    "legal_name" TEXT,
    "slug" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "region" TEXT,
    "city_or_zone" TEXT,
    "description_short" TEXT,
    "description_long" TEXT,
    "story" TEXT,
    "languages" JSONB,
    "sales_email" TEXT,
    "sales_phone" TEXT,
    "website" TEXT,
    "supported_incoterms" JSONB,
    "destinations_served" JSONB,
    "average_lead_time_days" INTEGER,
    "logo_media_id" TEXT,
    "banner_media_id" TEXT,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "rejection_reason" TEXT,
    "approved_at" TIMESTAMP(3),
    "suspended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,

    CONSTRAINT "seller_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_categories" (
    "id" TEXT NOT NULL,
    "parent_id" TEXT,
    "name_fr" TEXT NOT NULL,
    "name_en" TEXT,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_products" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "seller_profile_id" TEXT NOT NULL,
    "category_id" TEXT,
    "commercial_name" TEXT NOT NULL,
    "regulatory_name" TEXT,
    "subtitle" TEXT,
    "slug" TEXT NOT NULL,
    "origin_country" TEXT NOT NULL,
    "origin_region" TEXT,
    "variety_species" TEXT,
    "production_method" TEXT,
    "description_short" TEXT,
    "description_long" TEXT,
    "usage_tips" TEXT,
    "packaging_description" TEXT,
    "storage_conditions" TEXT,
    "shelf_life_info" TEXT,
    "allergen_info" TEXT,
    "nutrition_info_json" JSONB,
    "default_unit" TEXT,
    "minimum_order_quantity" DECIMAL(12,3),
    "main_media_id" TEXT,
    "completion_score" INTEGER NOT NULL DEFAULT 0,
    "compliance_status_snapshot" TEXT,
    "export_readiness_status" "ExportReadinessStatus" NOT NULL DEFAULT 'PENDING_QUALITY_REVIEW',
    "publication_status" "MarketplacePublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "rejection_reason" TEXT,
    "submitted_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,

    CONSTRAINT "marketplace_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_offers" (
    "id" TEXT NOT NULL,
    "marketplace_product_id" TEXT NOT NULL,
    "seller_profile_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "short_description" TEXT,
    "price_mode" "MarketplacePriceMode" NOT NULL DEFAULT 'QUOTE_ONLY',
    "unit_price" DECIMAL(12,2),
    "currency" TEXT,
    "moq" DECIMAL(12,3),
    "available_quantity" DECIMAL(12,3),
    "availability_start" TIMESTAMP(3),
    "availability_end" TIMESTAMP(3),
    "lead_time_days" INTEGER,
    "incoterm" TEXT,
    "departure_location" TEXT,
    "destination_markets_json" JSONB,
    "visibility_scope" "MarketplaceVisibilityScope" NOT NULL DEFAULT 'BUYERS_ONLY',
    "export_readiness_status" "ExportReadinessStatus" NOT NULL DEFAULT 'PENDING_QUALITY_REVIEW',
    "publication_status" "MarketplacePublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "featured_rank" INTEGER,
    "rejection_reason" TEXT,
    "submitted_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "suspended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,

    CONSTRAINT "marketplace_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_offer_batches" (
    "id" TEXT NOT NULL,
    "marketplace_offer_id" TEXT NOT NULL,
    "product_batch_id" TEXT NOT NULL,
    "quantity_available" DECIMAL(12,3) NOT NULL,
    "quantity_reserved" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "export_eligible" BOOLEAN NOT NULL DEFAULT true,
    "quality_status" TEXT,
    "traceability_status" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_offer_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_documents" (
    "id" TEXT NOT NULL,
    "related_type" "MarketplaceRelatedEntityType" NOT NULL,
    "related_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "visibility" "MarketplaceDocumentVisibility" NOT NULL DEFAULT 'PRIVATE',
    "verification_status" "MarketplaceVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_user_id" TEXT,

    CONSTRAINT "marketplace_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "related_type" "MarketplaceRelatedEntityType" NOT NULL,
    "related_id" TEXT NOT NULL,
    "media_type" "MediaAssetType" NOT NULL DEFAULT 'IMAGE',
    "role" "MediaAssetRole" NOT NULL DEFAULT 'GALLERY',
    "storage_key" TEXT NOT NULL,
    "public_url" TEXT,
    "mime_type" TEXT,
    "size_bytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "alt_text_fr" TEXT,
    "alt_text_en" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "moderation_status" "MediaModerationStatus" NOT NULL DEFAULT 'PENDING',
    "moderation_reason" TEXT,
    "uploaded_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_requests" (
    "id" TEXT NOT NULL,
    "buyer_company_id" TEXT NOT NULL,
    "buyer_user_id" TEXT NOT NULL,
    "marketplace_offer_id" TEXT NOT NULL,
    "requested_quantity" DECIMAL(12,3),
    "requested_unit" TEXT,
    "delivery_country" TEXT,
    "target_market" TEXT,
    "message" TEXT,
    "status" "QuoteRequestStatus" NOT NULL DEFAULT 'NEW',
    "assigned_to_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_request_messages" (
    "id" TEXT NOT NULL,
    "quote_request_id" TEXT NOT NULL,
    "author_user_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_internal_note" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_request_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_review_queue" (
    "id" TEXT NOT NULL,
    "entity_type" "MarketplaceRelatedEntityType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "review_type" "MarketplaceReviewType" NOT NULL,
    "status" "MarketplaceReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_user_id" TEXT,
    "review_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_review_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seller_profiles_company_id_key" ON "seller_profiles"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "seller_profiles_slug_key" ON "seller_profiles"("slug");

-- CreateIndex
CREATE INDEX "seller_profiles_status_idx" ON "seller_profiles"("status");

-- CreateIndex
CREATE INDEX "seller_profiles_country_idx" ON "seller_profiles"("country");

-- CreateIndex
CREATE INDEX "seller_profiles_region_idx" ON "seller_profiles"("region");

-- CreateIndex
CREATE INDEX "seller_profiles_is_featured_idx" ON "seller_profiles"("is_featured");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_categories_slug_key" ON "marketplace_categories"("slug");

-- CreateIndex
CREATE INDEX "marketplace_categories_parent_id_idx" ON "marketplace_categories"("parent_id");

-- CreateIndex
CREATE INDEX "marketplace_categories_is_active_sort_order_idx" ON "marketplace_categories"("is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_products_slug_key" ON "marketplace_products"("slug");

-- CreateIndex
CREATE INDEX "marketplace_products_product_id_idx" ON "marketplace_products"("product_id");

-- CreateIndex
CREATE INDEX "marketplace_products_seller_profile_id_idx" ON "marketplace_products"("seller_profile_id");

-- CreateIndex
CREATE INDEX "marketplace_products_category_id_idx" ON "marketplace_products"("category_id");

-- CreateIndex
CREATE INDEX "marketplace_products_publication_status_idx" ON "marketplace_products"("publication_status");

-- CreateIndex
CREATE INDEX "marketplace_products_export_readiness_status_idx" ON "marketplace_products"("export_readiness_status");

-- CreateIndex
CREATE INDEX "marketplace_products_origin_country_idx" ON "marketplace_products"("origin_country");

-- CreateIndex
CREATE INDEX "marketplace_products_origin_region_idx" ON "marketplace_products"("origin_region");

-- CreateIndex
CREATE INDEX "marketplace_offers_marketplace_product_id_idx" ON "marketplace_offers"("marketplace_product_id");

-- CreateIndex
CREATE INDEX "marketplace_offers_seller_profile_id_idx" ON "marketplace_offers"("seller_profile_id");

-- CreateIndex
CREATE INDEX "marketplace_offers_publication_status_idx" ON "marketplace_offers"("publication_status");

-- CreateIndex
CREATE INDEX "marketplace_offers_export_readiness_status_idx" ON "marketplace_offers"("export_readiness_status");

-- CreateIndex
CREATE INDEX "marketplace_offers_visibility_scope_idx" ON "marketplace_offers"("visibility_scope");

-- CreateIndex
CREATE INDEX "marketplace_offers_availability_start_availability_end_idx" ON "marketplace_offers"("availability_start", "availability_end");

-- CreateIndex
CREATE INDEX "marketplace_offer_batches_product_batch_id_idx" ON "marketplace_offer_batches"("product_batch_id");

-- CreateIndex
CREATE INDEX "marketplace_offer_batches_export_eligible_idx" ON "marketplace_offer_batches"("export_eligible");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_offer_batches_marketplace_offer_id_product_batc_key" ON "marketplace_offer_batches"("marketplace_offer_id", "product_batch_id");

-- CreateIndex
CREATE INDEX "marketplace_documents_related_type_related_id_idx" ON "marketplace_documents"("related_type", "related_id");

-- CreateIndex
CREATE INDEX "marketplace_documents_document_id_idx" ON "marketplace_documents"("document_id");

-- CreateIndex
CREATE INDEX "marketplace_documents_visibility_idx" ON "marketplace_documents"("visibility");

-- CreateIndex
CREATE INDEX "marketplace_documents_verification_status_idx" ON "marketplace_documents"("verification_status");

-- CreateIndex
CREATE INDEX "marketplace_documents_valid_until_idx" ON "marketplace_documents"("valid_until");

-- CreateIndex
CREATE INDEX "media_assets_related_type_related_id_idx" ON "media_assets"("related_type", "related_id");

-- CreateIndex
CREATE INDEX "media_assets_uploaded_by_user_id_idx" ON "media_assets"("uploaded_by_user_id");

-- CreateIndex
CREATE INDEX "media_assets_moderation_status_idx" ON "media_assets"("moderation_status");

-- CreateIndex
CREATE INDEX "media_assets_role_idx" ON "media_assets"("role");

-- CreateIndex
CREATE INDEX "media_assets_sort_order_idx" ON "media_assets"("sort_order");

-- CreateIndex
CREATE INDEX "quote_requests_buyer_company_id_idx" ON "quote_requests"("buyer_company_id");

-- CreateIndex
CREATE INDEX "quote_requests_buyer_user_id_idx" ON "quote_requests"("buyer_user_id");

-- CreateIndex
CREATE INDEX "quote_requests_marketplace_offer_id_idx" ON "quote_requests"("marketplace_offer_id");

-- CreateIndex
CREATE INDEX "quote_requests_status_idx" ON "quote_requests"("status");

-- CreateIndex
CREATE INDEX "quote_requests_assigned_to_user_id_idx" ON "quote_requests"("assigned_to_user_id");

-- CreateIndex
CREATE INDEX "quote_request_messages_quote_request_id_idx" ON "quote_request_messages"("quote_request_id");

-- CreateIndex
CREATE INDEX "quote_request_messages_author_user_id_idx" ON "quote_request_messages"("author_user_id");

-- CreateIndex
CREATE INDEX "quote_request_messages_created_at_idx" ON "quote_request_messages"("created_at");

-- CreateIndex
CREATE INDEX "marketplace_review_queue_entity_type_entity_id_idx" ON "marketplace_review_queue"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "marketplace_review_queue_review_type_idx" ON "marketplace_review_queue"("review_type");

-- CreateIndex
CREATE INDEX "marketplace_review_queue_status_idx" ON "marketplace_review_queue"("status");

-- CreateIndex
CREATE INDEX "marketplace_review_queue_reviewed_by_user_id_idx" ON "marketplace_review_queue"("reviewed_by_user_id");

-- AddForeignKey
ALTER TABLE "seller_profiles" ADD CONSTRAINT "seller_profiles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_categories" ADD CONSTRAINT "marketplace_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "marketplace_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_products" ADD CONSTRAINT "marketplace_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_products" ADD CONSTRAINT "marketplace_products_seller_profile_id_fkey" FOREIGN KEY ("seller_profile_id") REFERENCES "seller_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_products" ADD CONSTRAINT "marketplace_products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "marketplace_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_offers" ADD CONSTRAINT "marketplace_offers_marketplace_product_id_fkey" FOREIGN KEY ("marketplace_product_id") REFERENCES "marketplace_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_offers" ADD CONSTRAINT "marketplace_offers_seller_profile_id_fkey" FOREIGN KEY ("seller_profile_id") REFERENCES "seller_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_offer_batches" ADD CONSTRAINT "marketplace_offer_batches_marketplace_offer_id_fkey" FOREIGN KEY ("marketplace_offer_id") REFERENCES "marketplace_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_offer_batches" ADD CONSTRAINT "marketplace_offer_batches_product_batch_id_fkey" FOREIGN KEY ("product_batch_id") REFERENCES "product_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_documents" ADD CONSTRAINT "marketplace_documents_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_buyer_company_id_fkey" FOREIGN KEY ("buyer_company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_buyer_user_id_fkey" FOREIGN KEY ("buyer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_marketplace_offer_id_fkey" FOREIGN KEY ("marketplace_offer_id") REFERENCES "marketplace_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_request_messages" ADD CONSTRAINT "quote_request_messages_quote_request_id_fkey" FOREIGN KEY ("quote_request_id") REFERENCES "quote_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_request_messages" ADD CONSTRAINT "quote_request_messages_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_review_queue" ADD CONSTRAINT "marketplace_review_queue_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

