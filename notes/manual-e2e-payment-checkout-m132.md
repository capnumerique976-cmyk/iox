# Runbook manuel — E2E paiement checkout Stripe test

**Date :** 2026-05-19  
**Environnement cible :** `https://iox.mycloud.yt` (APP_ENV=staging, sk_test_)  
**Carte test Stripe :** `4242 4242 4242 4242` / date future / CVC quelconque

---

## Prérequis

- [ ] Seller `smoke-seller@iox.mch` a complété l'onboarding Connect Express en mode test
- [ ] `seller_stripe_accounts.charges_enabled = true` pour ce seller
- [ ] Une RFQ entre smoke-buyer et smoke-seller est au statut WON
- [ ] Stripe CLI disponible localement OU webhook configuré dans le Dashboard Stripe test

---

## Étape 0 — Onboarding seller (si pas encore fait)

```
1. Ouvrir https://iox.mycloud.yt/login
2. Login : smoke-seller@iox.mch / IoxSmoke2026!
3. Aller sur https://iox.mycloud.yt/seller/payments
4. Cliquer "Démarrer l'onboarding Stripe"
5. Sur la page Stripe Connect Express :
   - Nom : Test Seller IOX
   - IBAN test : FR7630006000011234567890189
   - Numéro de téléphone fictif
   - Compléter jusqu'à la confirmation
6. Retourner sur https://iox.mycloud.yt/seller/payments
7. Vérifier status = ACTIVE ou charges_enabled
```

Vérification DB :
```bash
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T postgres \
  psql -U iox -d iox_prod -c \"SELECT charges_enabled, payouts_enabled FROM seller_stripe_accounts LIMIT 1;\""
```

---

## Étape 1 — Créer une RFQ WON

**Option A — via UI seller :**
```
1. Login seller → /quote-requests
2. Ouvrir une RFQ QUOTED appartenant à smoke-buyer
3. Cliquer "→ Gagnée" (transition QUOTED → WON)
4. Confirmer
```

**Option B — via DB (emergency) :**
```bash
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T postgres \
  psql -U iox -d iox_prod -c \"UPDATE quote_requests SET status = 'WON' WHERE id = 'a6a7f30a-4217-4bcb-ba74-c86116ea2d5e';\""
```

---

## Étape 2 — Parcours buyer checkout

```
1. Login : smoke-buyer@iox.mch / IoxSmoke2026!
2. Aller sur https://iox.mycloud.yt/buyer/quote-requests
3. Ouvrir la RFQ au statut "Gagnée"
4. Vérifier :
   ☐ CTA "Finaliser le paiement" visible (data-testid="buyer-rfq-payment-cta")
   ☐ Bouton lien vers /buyer/payments/checkout/<rfqId>
5. Cliquer "Finaliser le paiement"
6. Sur la page /buyer/payments/checkout/<rfqId> :
   ☐ Résumé visible (produit, vendeur, quantité)
   ☐ Montant affiché en lecture seule (<p>, non éditable)
   ☐ Offer ID pré-rempli (read-only input)
7. Cliquer "Payer via Stripe"
8. Vérifier redirection vers https://checkout.stripe.com/...
```

---

## Étape 3 — Paiement Stripe test

```
Sur la page Stripe Checkout :
1. Carte : 4242 4242 4242 4242
2. Date : 12/29 (ou toute date future)
3. CVC : 424
4. Nom : Test Buyer
5. Cliquer "Pay" / "Payer"
```

**Cartes test supplémentaires :**
| Scénario | Numéro |
|---|---|
| Succès | `4242 4242 4242 4242` |
| Refus generic | `4000 0000 0000 0002` |
| 3DS requis | `4000 0025 0000 3155` |
| Fonds insuffisants | `4000 0000 0000 9995` |

---

## Étape 4 — Vérifications post-paiement

### 4.1 Page retour

```
Vérifier redirection vers : https://iox.mycloud.yt/buyer/payments/return/<rfqId>
☐ Titre "Paiement reçu" visible
☐ Bouton "Voir ma facture" visible
☐ Numéro de demande affiché
```

### 4.2 Webhook (si Stripe CLI disponible)

```bash
# Dans un terminal local :
stripe listen --forward-to https://iox.mycloud.yt/api/v1/payments/webhook

# Dans un autre terminal, déclencher l'event :
stripe trigger payment_intent.succeeded
```

**Vérifier dans les logs backend :**
```bash
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml logs --tail=50 backend" \
  | grep -E "SUCCEEDED|Payment SUCCEEDED|paymentId"
```

### 4.3 DB post-webhook

```bash
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T postgres \
  psql -U iox -d iox_prod -c \"SELECT id, status, amount_cents, stripe_payment_intent_id FROM payments ORDER BY created_at DESC LIMIT 3;\""
```

Attendu : `status = SUCCEEDED`, `stripe_payment_intent_id` non null.

### 4.4 Facture PDF

```bash
# Obtenir token smoke-buyer
TOKEN=$(curl -s -X POST https://iox.mycloud.yt/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke-buyer@iox.mch","password":"IoxSmoke2026!"}' \
  | jq -r '.data.accessToken')

# Lister les factures
curl -s https://iox.mycloud.yt/api/v1/invoices \
  -H "Authorization: Bearer $TOKEN" | jq '.data | length'

# Télécharger le PDF (remplacer <invoice-id>)
curl -s https://iox.mycloud.yt/api/v1/invoices/<invoice-id>/pdf \
  -H "Authorization: Bearer $TOKEN" \
  -o /tmp/facture-test.pdf && echo "PDF OK"
```

### 4.5 Daily Actions

```bash
curl -s https://iox.mycloud.yt/api/v1/buyers/daily-actions \
  -H "Authorization: Bearer $TOKEN" | jq '.data[] | select(.id == "pending-payment")'
```

Attendu : `null` (CTA paiement pending disparaît après SUCCEEDED).

---

## Étape 5 — Vérification seller

```
1. Login : smoke-seller@iox.mch / IoxSmoke2026!
2. Aller sur /seller/payments ou /seller/invoices
3. ☐ Paiement visible avec statut SUCCEEDED
4. ☐ Facture téléchargeable
```

---

## Cas de blocage documentés

| Blocage | Cause | Action |
|---|---|---|
| `400 "Le vendeur n'est pas configuré"` | seller_stripe_accounts vide | Onboarding seller Étape 0 |
| `400 "statut RFQ QUOTED ne permet pas"` | RFQ pas WON | Transition seller Étape 1 |
| Webhook non reçu | `STRIPE_WEBHOOK_SECRET` incorrect | Vérifier valeur dans Stripe Dashboard |
| PDF 404 | Invoice non créée | Vérifier logs webhook + créer manuellement via `/api/v1/invoices` |

---

## Webhook sans Stripe CLI (alternative)

Si Stripe CLI non disponible, simuler le webhook manuellement :

```bash
# Stripe Dashboard → Developers → Webhooks → Test in Stripe Dashboard
# Ou utiliser l'API Stripe pour déclencher un event test
# https://dashboard.stripe.com/test/webhooks
```

Endpoint cible : `https://iox.mycloud.yt/api/v1/payments/webhook`  
Event à tester : `payment_intent.succeeded`

---

## Critères de succès

- [ ] Checkout session créée (HTTP 200, `checkoutUrl` non vide)
- [ ] Redirection Stripe réussie
- [ ] Retour sur `/buyer/payments/return/<rfqId>`
- [ ] `Payment.status = SUCCEEDED` en DB
- [ ] Invoice créée en DB
- [ ] PDF `/invoices/<id>/pdf` → HTTP 200
- [ ] Daily Actions sans "paiement pending"
- [ ] Seller voit le paiement
