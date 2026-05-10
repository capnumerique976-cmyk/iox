# IOX — Stripe Live Readiness

**Date :** 2026-05-10  
**Statut :** Prêt pour activation live — voir checklist section 2

---

## 1. Audit état actuel

### Ce qui est implémenté

| Fonctionnalité | Fichier | Statut |
|---|---|---|
| Stripe Connect Express onboarding (AccountLink) | `stripe-onboarding.service.ts` | Complet |
| Création compte Express seller (idempotent) | `stripe-onboarding.service.ts` | Complet |
| Sync statut compte depuis Stripe → DB | `stripe-onboarding.service.ts` | Complet |
| Checkout Session buyer (Stripe Hosted) | `payments.service.ts` | Complet |
| Commission plateforme 5% (`application_fee_amount`) | `payments.service.ts` | Complet |
| Transfer destination seller (`transfer_data.destination`) | `payments.service.ts` | Complet |
| Split à la source (charge + fee en 1 appel) | `payments.service.ts` | Complet |
| Webhook signature HMAC (STRIPE_WEBHOOK_SECRET) | `payments.controller.ts` | Complet |
| Handler `payment_intent.succeeded` | `payments-webhook.service.ts` | Complet |
| Handler `payment_intent.payment_failed` | `payments-webhook.service.ts` | Complet |
| Handler `account.updated` (sync seller status) | `payments-webhook.service.ts` | Complet |
| Remboursement total ou partiel (`stripe.refunds.create`) | `payments.service.ts` | Complet |
| Email confirmation buyer après paiement | `payments-webhook.service.ts` | Complet (safeNotify) |
| Multi-devise EUR / USD | `payments.service.ts` + `money.ts` | Complet |
| FSM guard — seul statut WON est payable | `quote-request-fsm.ts` | Complet |
| Audit log PAYMENT_REFUNDED | `payments.service.ts` | Complet |

### Architecture Stripe Connect

```
Buyer  ──[Checkout Session]──►  Stripe
                                   │
                    application_fee_amount (5%)
                                   │
                    transfer_data.destination = stripeAccountId (seller)
                                   │
                         ┌─────────┴─────────┐
                    IOX Platform (5%)    Seller Express Account (95%)
```

### Status SellerStripeAccount (enum)

```
PENDING_ONBOARDING   — compte non créé ou formulaire non démarré
ONBOARDING_INCOMPLETE — détails soumis, en cours de vérification Stripe
CHARGES_ENABLED      — peut encaisser des paiements
PAYOUTS_ENABLED      — peut encaisser ET recevoir des virements (état final OK)
RESTRICTED           — requirements.disabled_reason présent (action requise)
```

### Endpoints paiements

```
POST /api/v1/payments/connect/onboarding-link   # seller — génère AccountLink
POST /api/v1/payments/connect/refresh-status    # seller — sync status depuis Stripe
GET  /api/v1/payments/connect/account-status    # seller — lecture status DB (sans appel Stripe)
POST /api/v1/payments/checkout-session          # buyer — crée Checkout Session
POST /api/v1/payments/:id/refund                # admin + seller — rembourse
POST /api/v1/payments/webhook                   # Stripe → backend (signature HMAC)
```

---

## 2. Checklist activation live

### Etape 1 — Stripe Dashboard : configuration du compte plateforme

- [ ] Se connecter sur https://dashboard.stripe.com avec le compte IOX
- [ ] Vérifier que le compte est en **mode live** (toggle en haut à droite : "Live mode")
- [ ] Aller dans **Settings → Business** et compléter :
  - Nom légal de la société
  - Adresse enregistrée
  - Numéro de TVA / SIRET
  - Site web (`https://iox.example`)
  - Description de l'activité (marketplace B2B)
- [ ] **Settings → Connect** → activer Stripe Connect pour la plateforme :
  - Type : **Express accounts**
  - Activer `card_payments` et `transfers`
  - Renseigner l'URL de la politique de remboursement
  - Renseigner les URLs de support (email + URL)

### Etape 2 — KYB (Know Your Business) de la plateforme IOX

- [ ] Stripe demandera des documents justificatifs :
  - Extrait Kbis (moins de 3 mois)
  - Pièce d'identité du représentant légal
  - RIB du compte bancaire de la plateforme (pour réception des 5%)
- [ ] Délai de vérification Stripe : 1 à 5 jours ouvrés
- [ ] Surveiller l'email associé au compte Stripe pour les demandes complémentaires
- [ ] Le compte doit afficher : "Payouts enabled" avant d'activer le live

### Etape 3 — Récupération des clés live

- [ ] Aller dans **Developers → API keys** en mode Live
- [ ] Copier `sk_live_...` (secret key) — ne jamais exposer côté frontend
- [ ] Copier `pk_live_...` (publishable key) — peut être exposée côté frontend si nécessaire
- [ ] Stocker de façon sécurisée (vault, secrets manager, jamais dans le repo)

### Etape 4 — Rotation des clés dans .env production

Mettre à jour `/opt/iox/backend/.env` :

```bash
# Remplacer les clés test par les clés live :
STRIPE_SECRET_KEY="sk_live_..."        # remplace sk_test_...
STRIPE_PUBLISHABLE_KEY="pk_live_..."   # remplace pk_test_...
# STRIPE_WEBHOOK_SECRET — voir étape 5
```

Redémarrer le backend après modification :
```bash
pm2 restart iox-backend
```

### Etape 5 — Enregistrement du webhook dans Stripe Dashboard

- [ ] Aller dans **Developers → Webhooks → Add endpoint**
- [ ] URL de l'endpoint : `https://iox.example/api/v1/payments/webhook`
- [ ] Sélectionner les events à écouter :
  ```
  payment_intent.succeeded
  payment_intent.payment_failed
  account.updated
  transfer.created
  checkout.session.completed
  ```
- [ ] Cliquer "Add endpoint" — Stripe affiche le **Signing secret** (`whsec_...`)
- [ ] Copier ce secret et l'ajouter dans `.env` :
  ```bash
  STRIPE_WEBHOOK_SECRET="whsec_..."
  ```
- [ ] Redémarrer le backend :
  ```bash
  pm2 restart iox-backend
  ```
- [ ] **Tester** en cliquant "Send test webhook" depuis le Dashboard → vérifier les logs backend

### Etape 6 — KYC flow pour chaque seller (onboarding)

Chaque seller doit compléter son onboarding Stripe Connect avant de pouvoir encaisser.

**Procédure :**

1. Le seller se connecte sur le frontend IOX
2. Il navigue vers son espace "Mes paiements" / "Configuration paiements"
3. L'UI appelle `POST /api/v1/payments/connect/onboarding-link` avec ses `returnUrl` et `refreshUrl`
4. L'API retourne une URL Stripe valide ~5 minutes
5. Le seller est redirigé vers Stripe Connect hosted onboarding :
   - Renseignement des informations de société (SIRET, adresse, IBAN)
   - Upload de justificatifs (pièce d'identité, Kbis)
   - Validation des CGU Stripe
6. Stripe redirige vers `returnUrl` après soumission
7. L'UI appelle `POST /api/v1/payments/connect/refresh-status` pour synchroniser le statut
8. Le seller peut encaisser quand `chargesEnabled = true`

**Vérification statut seller :**
```bash
# Admin — vérifier le statut d'un seller en DB
psql $DATABASE_URL -c "
  SELECT sp.id, ssa.status, ssa.charges_enabled, ssa.payouts_enabled, ssa.details_submitted
  FROM seller_stripe_accounts ssa
  JOIN seller_profiles sp ON sp.id = ssa.seller_profile_id
  ORDER BY ssa.created_at DESC;
"
```

### Etape 7 — Transactions de test avant go-live

Même en mode live, Stripe propose des cartes de test valides pour les comptes live (via le mode "test" du Dashboard). Avant d'ouvrir à de vrais clients :

- [ ] Effectuer un paiement test complet avec un compte buyer de staging
- [ ] Vérifier la réception du webhook `payment_intent.succeeded` dans les logs
- [ ] Vérifier que le statut Payment en DB passe à `SUCCEEDED`
- [ ] Vérifier que l'email de confirmation buyer est envoyé
- [ ] Tester un remboursement (`POST /api/v1/payments/:id/refund`)
- [ ] Vérifier la réception des fonds sur le compte plateforme IOX (délai 2-7 jours selon pays)

---

## 3. Risques et mitigation

### Paiements échoués

| Risque | Comportement actuel | Mitigation |
|---|---|---|
| Carte refusée | `payment_intent.payment_failed` → statut `FAILED` en DB | Email retry buyer (à implémenter V2) |
| Réseau timeout Stripe | Exception non catchée → Payment reste `PENDING` | Ajouter un job de réconciliation (voir ci-dessous) |
| Webhook non reçu | Payment reste `PENDING` indéfiniment | Activer les retentatives Stripe (3 jours, auto) |

**Job de réconciliation recommandé (V2) :**
```
Cron toutes les heures :
  SELECT * FROM payments WHERE status = 'PENDING' AND created_at < NOW() - INTERVAL '2 hours';
  → Pour chaque : stripe.checkout.sessions.retrieve(stripeCheckoutSessionId)
  → Si payment_status = 'paid' → mettre à jour statut à SUCCEEDED
  → Si expires_at dépassé → marquer FAILED
```

### Disputes (chargebacks)

- Stripe n'envoie pas de webhook `charge.dispute.created` par défaut — **l'ajouter au Dashboard**.
- Actuellement pas de handler `charge.dispute.*` dans `payments-webhook.service.ts`.
- **Action immédiate :** Configurer dans Stripe Dashboard les events de dispute + ajouter un handler.
- En V1 : recevoir le webhook et créer une alerte email vers ops@iox.example.

### Remboursements

- Actuellement : remboursement total ou partiel via `POST /api/v1/payments/:id/refund`
- Stripe récupère automatiquement la commission plateforme (5%) en cas de remboursement total
- En cas de remboursement partiel : la commission n'est **pas** proratisée automatiquement — surveiller le Dashboard
- Le statut passe à `REFUNDED` — pas de distinction partial/full en DB (V1)

### Comptes Express seller bloqués

- Si `requirements.disabled_reason` présent → statut `RESTRICTED` en DB
- Le seller ne peut plus encaisser
- L'UI doit afficher un message clair et un lien vers le Dashboard Stripe Connect
- Stripe envoie `account.updated` → le webhook sync automatiquement le statut

---

## 4. Variables .env à changer

```bash
# ─────────────────────────────────────────────────────────────
# STRIPE — valeurs LIVE (production uniquement)
# ─────────────────────────────────────────────────────────────

# Clé secrète live (sk_live_ — jamais sk_test_ en production)
STRIPE_SECRET_KEY="<obtenir depuis Stripe Dashboard → Développeurs → Clés API → Clé secrète live>"

# Clé publique live (optionnelle côté backend, requise si le frontend l'utilise)
STRIPE_PUBLISHABLE_KEY="<obtenir depuis Stripe Dashboard → Développeurs → Clés API → Clé publiable live>"

# Secret webhook — obtenu depuis Stripe Dashboard → Webhooks → endpoint → Signing secret
STRIPE_WEBHOOK_SECRET="<obtenir depuis Stripe Dashboard → Webhooks → endpoint → Signing secret>"
```

**Points de vigilance :**
- `STRIPE_SECRET_KEY` contient `sk_live_` — le backend rejette les clés demo mais pas les clés test en production (pas de guard sur `sk_test_`)
- Ne jamais committer ces valeurs dans le repo Git
- Utiliser un secrets manager (HashiCorp Vault, AWS Secrets Manager, Doppler) en production
- Faire une rotation des clés tous les 90 jours (bonne pratique)

---

## 5. Commandes smoke test — intégration live

```bash
# Variables à adapter
BASE="https://iox.example/api/v1"
SELLER_TOKEN="<JWT_SELLER>"
BUYER_TOKEN="<JWT_BUYER>"
SELLER_PROFILE_ID="<uuid>"

# ─── Test 1 : Vérifier que Stripe est configuré ───────────────────────────
# Appel onboarding — doit retourner 200 avec une URL Stripe (pas une erreur "Stripe non configuré")
curl -s -X POST "$BASE/payments/connect/onboarding-link" \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"returnUrl":"https://iox.example/seller/payments/return","refreshUrl":"https://iox.example/seller/payments/refresh"}' \
  | jq '{url: .url, expiresAt: .expiresAt}'

# ─── Test 2 : Statut compte seller ────────────────────────────────────────
curl -s "$BASE/payments/connect/account-status" \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  | jq '{status: .status, chargesEnabled: .chargesEnabled, payoutsEnabled: .payoutsEnabled}'

# ─── Test 3 : Sync statut depuis Stripe ───────────────────────────────────
curl -s -X POST "$BASE/payments/connect/refresh-status" \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  | jq '{status: .status, chargesEnabled: .chargesEnabled}'

# ─── Test 4 : Webhook reachability (Stripe doit pouvoir atteindre l'URL) ──
curl -s -X POST "$BASE/payments/webhook" \
  -H "Content-Type: application/json" \
  -d '{"type":"test"}' \
  | jq .
# ← Doit retourner 400 "Signature Stripe manquante" — cela confirme que l'endpoint est joignable

# ─── Test 5 : Vérifier les webhooks reçus dans Stripe Dashboard ───────────
# Dashboard → Developers → Webhooks → [votre endpoint] → Recent deliveries
# Tous les events doivent afficher 200 OK

# ─── Test 6 : Vérifier les paiements récents en DB ────────────────────────
# (depuis le serveur, accès DB direct)
psql "$DATABASE_URL" -c "
  SELECT id, status, amount_cents, currency, stripe_payment_intent_id, created_at
  FROM payments
  ORDER BY created_at DESC
  LIMIT 10;
"

# ─── Test 7 : Vérifier les comptes seller actifs ──────────────────────────
psql "$DATABASE_URL" -c "
  SELECT status, charges_enabled, payouts_enabled, COUNT(*) as nb
  FROM seller_stripe_accounts
  GROUP BY status, charges_enabled, payouts_enabled;
"

# ─── Test 8 : Tester un remboursement (après un paiement SUCCEEDED) ───────
PAYMENT_ID="<uuid-d-un-paiement-SUCCEEDED>"
ADMIN_TOKEN="<JWT_ADMIN>"
curl -s -X POST "$BASE/payments/$PAYMENT_ID/refund" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Test remboursement smoke test"}' \
  | jq '{status: .status, refundId: .metadataJson.refundId}'
```

---

*Références :*  
*- Code source : `apps/backend/src/payments/`*  
*- Déploiement : `notes/deployment-checklist-production-iox.md`*  
*- Stripe Connect docs : https://stripe.com/docs/connect/express-accounts*
