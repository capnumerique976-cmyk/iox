-- CreateEnum
CREATE TYPE "SellerStripeAccountStatus" AS ENUM ('PENDING_ONBOARDING', 'ONBOARDING_INCOMPLETE', 'CHARGES_ENABLED', 'PAYOUTS_ENABLED', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'REQUIRES_ACTION', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'REFUNDED');

-- CreateTable
CREATE TABLE "seller_stripe_accounts" (
    "id" TEXT NOT NULL,
    "seller_profile_id" TEXT NOT NULL,
    "stripe_account_id" TEXT NOT NULL,
    "status" "SellerStripeAccountStatus" NOT NULL DEFAULT 'PENDING_ONBOARDING',
    "charges_enabled" BOOLEAN NOT NULL DEFAULT false,
    "payouts_enabled" BOOLEAN NOT NULL DEFAULT false,
    "details_submitted" BOOLEAN NOT NULL DEFAULT false,
    "capabilities_json" JSONB,
    "requirements_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_stripe_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "quote_request_id" TEXT,
    "marketplace_offer_id" TEXT,
    "seller_profile_id" TEXT NOT NULL,
    "buyer_company_id" TEXT NOT NULL,
    "buyer_user_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "application_fee_cents" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "stripe_payment_intent_id" TEXT,
    "stripe_checkout_session_id" TEXT,
    "stripe_charge_id" TEXT,
    "stripe_transfer_id" TEXT,
    "error_code" TEXT,
    "error_message" TEXT,
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seller_stripe_accounts_seller_profile_id_key" ON "seller_stripe_accounts"("seller_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "seller_stripe_accounts_stripe_account_id_key" ON "seller_stripe_accounts"("stripe_account_id");

-- CreateIndex
CREATE INDEX "seller_stripe_accounts_status_idx" ON "seller_stripe_accounts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripe_payment_intent_id_key" ON "payments"("stripe_payment_intent_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripe_checkout_session_id_key" ON "payments"("stripe_checkout_session_id");

-- CreateIndex
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at");

-- CreateIndex
CREATE INDEX "payments_seller_profile_id_created_at_idx" ON "payments"("seller_profile_id", "created_at");

-- CreateIndex
CREATE INDEX "payments_buyer_company_id_created_at_idx" ON "payments"("buyer_company_id", "created_at");

-- CreateIndex
CREATE INDEX "payments_quote_request_id_idx" ON "payments"("quote_request_id");

-- AddForeignKey
ALTER TABLE "seller_stripe_accounts" ADD CONSTRAINT "seller_stripe_accounts_seller_profile_id_fkey" FOREIGN KEY ("seller_profile_id") REFERENCES "seller_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
