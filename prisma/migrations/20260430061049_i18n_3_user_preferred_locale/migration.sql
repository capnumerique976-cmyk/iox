-- I18N-3 — Locale préférée user (UI + emails)
-- Migration additive : colonne nullable au début pour rétrocompat,
-- puis NOT NULL DEFAULT 'fr' (les rows existants prennent le default).
ALTER TABLE "users" ADD COLUMN "preferred_locale" TEXT NOT NULL DEFAULT 'fr';
