-- CreateEnum
CREATE TYPE "EmailUnsubscribeType" AS ENUM ('ALL', 'RFQ_NOTIFICATIONS', 'TRANSACTIONAL');

-- CreateTable
CREATE TABLE "email_unsubscribes" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "unsubscribe_type" "EmailUnsubscribeType" NOT NULL,
    "user_id" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_unsubscribes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_unsubscribes_email_idx" ON "email_unsubscribes"("email");

-- CreateIndex
CREATE UNIQUE INDEX "email_unsubscribes_email_unsubscribe_type_key" ON "email_unsubscribes"("email", "unsubscribe_type");
