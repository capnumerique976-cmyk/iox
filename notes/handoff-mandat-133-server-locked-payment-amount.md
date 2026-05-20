# Handoff — Mandat 133 : Server-locked payment amount

**Date** : 2026-05-19  
**Commit** : `57e94da`  
**Branche** : `main` (poussé)  
**Statut** : ✅ TERMINÉ — en attente de migration VPS

---

## Problème corrigé

Avant M133, le montant du checkout Stripe était calculé côté client
(`unitPrice × requestedQuantity`) et envoyé dans le body POST.
Un buyer malveillant pouvait intercepter la requête et modifier `amountCents`.

---

## Ce qui a changé

### Prisma / BDD
- `QuoteRequest` : deux nouvelles colonnes nullable  
  `agreed_amount_cents INTEGER` et `agreed_currency VARCHAR(10)`
- Migration : `prisma/migrations/20260519120000_m133_rfq_agreed_amount/migration.sql`
- Non-destructive (`ADD COLUMN IF NOT EXISTS`)

### Backend — `quote-requests.service.ts`
- `updateStatus` : à la transition → WON, verrouille `agreedAmountCents` / `agreedCurrency`
  - Source 1 : `dto.agreedAmountCents` (vendeur fournit le montant explicitement)
  - Source 2 : auto-compute `Math.round(unitPrice × qty × 100)` depuis `offer.unitPrice` et `rfq.requestedQuantity`
  - Sinon : `BadRequestException`
- Include étendu : `unitPrice: true, currency: true` sur `marketplaceOffer`

### Backend — `payments.service.ts`
- `createCheckoutSession` : lit `rfq.agreedAmountCents` exclusivement
- `input.amountCents` ignoré (backward-compat uniquement)
- `rfq.agreedCurrency` utilisé pour la devise
- Throw `BadRequestException` si `agreedAmountCents` null ou ≤ 0

### DTOs
- `UpdateQuoteRequestStatusDto` : `agreedAmountCents?` + `agreedCurrency?` ajoutés
- `CreateCheckoutSessionDto` : `amountCents` et `currency` marqués `@IsOptional()` + DÉPRÉCIÉ

### Frontend
- `checkout/[rfqId]/page.tsx` : `handlePay` n'envoie plus `amountCents`
- `lib/payments.ts` : `amountCents?: number` (optionnel, déprécié)

---

## Tests

| Suite | Résultat |
|-------|----------|
| Backend (Jest) | 89 suites, 1037 tests ✅ |
| Frontend (Vitest) | 81 suites, 741 tests ✅ |
| TypeScript (tsc) | 0 erreurs ✅ |

Nouveaux tests M133 :
- `quote-requests.service.spec.ts` : WON avec montant explicite, auto-compute, pas de montant → 400
- `payments.service.spec.ts` : agreedAmountCents null → 400, agreedCurrency USD
- `checkout/page.test.tsx` : M133 — click Payer sans montant → API appelée (guard serveur)

---

## Action requise — Migration VPS

⚠️ La migration n'a **pas encore** été appliquée sur le VPS.

Avant de déployer :

```bash
# 1. Backup DB
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec postgres \
  pg_dump -U iox iox_prod > /opt/backups/iox_pre_m133_$(date +%Y%m%d%H%M).sql"

# 2. Déployer backend (inclut prisma migrate deploy via entrypoint)
./deploy/vps/deploy.sh backend

# 3. Vérifier colonnes
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec postgres \
  psql -U iox -d iox_prod -c '\d quote_requests' | grep agreed"
```

Résultat attendu après migration :
```
 agreed_amount_cents | integer        | ...
 agreed_currency     | character(10)  | ...
```

---

## Comportement en production après migration

- RFQs WON existantes : `agreedAmountCents = NULL` → checkout → 400 "montant non verrouillé"
- Solution : demander au vendeur de re-transitionner (ou migration one-shot SQL ci-dessous)

```sql
-- Migration one-shot pour les RFQs WON existantes (optionnel, manuel)
-- À n'exécuter qu'après audit des montants
UPDATE quote_requests qr
SET
  agreed_amount_cents = ROUND((mp.unit_price * qr.requested_quantity * 100)::numeric)::integer,
  agreed_currency = COALESCE(mo.currency, 'EUR')
FROM marketplace_offers mo
JOIN marketplace_products mp ON mp.id = mo.marketplace_product_id
WHERE qr.marketplace_offer_id = mo.id
  AND qr.status = 'WON'
  AND qr.agreed_amount_cents IS NULL
  AND mp.unit_price IS NOT NULL
  AND qr.requested_quantity IS NOT NULL;
```

---

## Prochaines étapes

1. `./deploy/vps/deploy.sh backend` — après confirmation go-live M133
2. Tester checkout sur un RFQ WON réel (nécessite seller onboardé Stripe)
3. M134 (futur) : afficher `agreedAmountCents` depuis le RFQ dans le résumé checkout
   (actuellement on affiche `unitPrice × qty` calculé côté frontend — cohérent mais redondant)
