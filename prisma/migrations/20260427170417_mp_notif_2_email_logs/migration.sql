-- CreateEnum
CREATE TYPE "EmailLogStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "transport" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "recipient_email" TEXT NOT NULL,
    "recipient_user_id" TEXT,
    "subject" TEXT NOT NULL,
    "status" "EmailLogStatus" NOT NULL,
    "error_code" TEXT,
    "error_message" TEXT,
    "provider_message_id" TEXT,
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_logs_recipient_email_created_at_idx" ON "email_logs"("recipient_email", "created_at");

-- CreateIndex
CREATE INDEX "email_logs_template_id_status_idx" ON "email_logs"("template_id", "status");

-- CreateIndex
CREATE INDEX "email_logs_created_at_idx" ON "email_logs"("created_at");
