-- M133 — Verrouillage serveur du montant payable RFQ
-- Non destructif : colonnes nullables, rétrocompatibles.
-- Null tant que la RFQ n'est pas WON.

ALTER TABLE "quote_requests" ADD COLUMN IF NOT EXISTS "agreed_amount_cents" INTEGER;
ALTER TABLE "quote_requests" ADD COLUMN IF NOT EXISTS "agreed_currency" VARCHAR(10);

COMMENT ON COLUMN "quote_requests"."agreed_amount_cents" IS 'Montant payable verrouillé serveur à la transition → WON. Source de vérité pour le checkout Stripe. Null tant que non WON.';
COMMENT ON COLUMN "quote_requests"."agreed_currency" IS 'Devise ISO du montant payable (ex: EUR, USD). Null tant que non WON.';
