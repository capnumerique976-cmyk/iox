# Audit Stripe test — Mandat 132

**Date :** 2026-05-19  
**Environnement :** VPS `iox.mycloud.yt` — APP_ENV=staging

---

## 1. Variables d'environnement Stripe (VPS)

| Variable | Présence | Préfixe |
|---|---|---|
| `STRIPE_SECRET_KEY` | ✅ PRESENT | `sk_test_***` — mode TEST confirmé |
| `STRIPE_WEBHOOK_SECRET` | ✅ PRESENT | `whsec_***` |
| `STRIPE_PUBLISHABLE_KEY` | ✅ PRESENT | `pk_test_***` — mode TEST confirmé |
| `STRIPE_CONNECT_CLIENT_ID` | ❌ ABSENT | Non utilisé (Connect Express flow via API) |
| `APP_ENV` | staging | ✅ Cohérent avec sk_test_ |
| `NODE_ENV` | production | ✅ Normal pour container Docker |

**Verdict : mode Stripe TEST confirmé. Aucune clé live présente.** ✅

---

## 2. État DB VPS — données paiement

| Table | Rows |
|---|---|
| `seller_stripe_accounts` | **0** — aucun seller onboardé |
| `quote_requests` status=WON | **0** — aucune RFQ WON |
| `quote_requests` total | 2 (QUOTED + CANCELLED) |
| `payments` | Non testé (0 attendu) |

---

## 3. Endpoints paiement testés en live (VPS)

### 3.1 FSM guard — checkout sur RFQ non-WON

```bash
POST /api/v1/payments/checkout-session
Authorization: Bearer <smoke-buyer token>
Body: { quoteRequestId: "a6a7f30a-...", marketplaceOfferId: "628aeaab-...", amountCents: 100000, currency: "EUR", ... }
```

**Réponse attendue :**
```json
{ "status": "Bad Request", "message": "Paiement impossible : statut RFQ QUOTED ne permet pas une confirmation de paiement (statuts valides : WON)" }
```
**Résultat :** ✅ CONFORME — FSM guard live et fonctionnel

### 3.2 Webhook sans signature

```bash
POST /api/v1/payments/webhook
Content-Type: application/json
(pas de header stripe-signature)
```

**Réponse :** `400 "Signature Stripe manquante"` ✅

### 3.3 Webhook avec signature invalide

```bash
POST /api/v1/payments/webhook
stripe-signature: t=1234,v1=fakesignature
```

**Réponse :** `400 "Webhook signature invalide: Invalid webhook signature."` ✅

---

## 4. Bloqueur principal : seller Stripe non onboardé

La table `seller_stripe_accounts` est vide. Le checkout flow requiert :

```
stripeAccount.chargesEnabled = true
```

Sans cela, le backend retourne :
```
400 "Le vendeur n'est pas configuré pour les paiements Stripe."
```

**Ce bloqueur doit être levé avant tout test checkout réel.**

Procédure d'onboarding seller test :
1. Login en tant que seller sur `https://iox.mycloud.yt/seller/payments`
2. Cliquer "Démarrer l'onboarding Stripe"
3. Compléter le formulaire Stripe avec données test (nom fictif, IBAN test, etc.)
4. Vérifier que `chargesEnabled=true` en DB
5. Relancer le test checkout

---

## 5. Risque identifié — montant non validé côté serveur

**Niveau :** Moyen (pilote fermé, utilisateurs connus)

Le `amountCents` est calculé côté frontend (`unitPrice × requestedQuantity`) et transmis dans le body POST. Le backend **ne valide pas** ce montant contre une valeur de référence stockée en DB.

**Impact :** Un buyer sophistiqué pourrait modifier le montant via une requête API directe.

**Mitigations en place :**
- UI affiche le montant en `<p>` read-only (non éditable via formulaire)
- Le seller voit le montant et peut refuser/contester
- Scope pilote fermé = utilisateurs confiants

**Action avant scale :** Ajouter un champ `agreedAmountCents` sur le modèle `QuoteRequest`, verrouillé à la transition QUOTED→WON. Valider `input.amountCents` contre ce champ côté backend.

---

## 6. Frontend checkout — validé par tests Vitest (8 cas)

`apps/frontend/src/app/(dashboard)/buyer/quote-requests/[id]/page.test.tsx` :
- CTA "Finaliser le paiement" visible si status=WON ✅
- `canPay = rfq.status === 'WON'` ✅

`apps/frontend/src/app/(dashboard)/buyer/payments/checkout/[rfqId]/page.test.tsx` (8 tests) :
- Bouton "Payer via Stripe" rendu ✅
- Montant affiché en `<p>` (read-only) ✅
- Pré-remplissage depuis RFQ ✅
- `createCheckoutSession` appelé avec bons params ✅
- Redirect `window.location.href = checkoutUrl` ✅
- Erreur RFQ 404 gérée ✅
- Résumé produit/vendeur/quantité ✅
- Bandeau sécurité Stripe ✅

---

## 7. Conclusion

| Check | Résultat |
|---|---|
| Clés Stripe mode test | ✅ Confirmé |
| Endpoint FSM guard WON | ✅ Live — 400 exact |
| Webhook signature manquante | ✅ 400 exact |
| Webhook signature invalide | ✅ 400 exact |
| Seller onboardé pour checkout réel | ❌ Bloqueur — table vide |
| WON RFQ disponible | ❌ Aucune |
| Montant server-locked | ⚠️ Risque moyen — client-side |
| Frontend checkout Vitest | ✅ 8/8 tests |
| Playwright E2E mocked | ✅ Créé (payment-checkout.spec.ts) |
