# PAY-1 phase 1 LOT 2 — Frontend onboarding seller

## TL;DR

3 pages seller + 1 helper API.

- `/seller/payments` (page principale) : status + boutons démarrer/poursuivre/rafraîchir.
- `/seller/payments/return` : appelle `refresh-status` au mount, affiche état post-Stripe.
- `/seller/payments/refresh` : link expiré → regen + redirect immédiat vers nouvelle URL Stripe.
- Helper `apps/frontend/src/lib/payments.ts` : 3 méthodes API typées.

5 specs vitest verts.

## Pages

### `/seller/payments/page.tsx`

Chargement initial via `getAccountStatus(token)` → DB seule (pas d'appel Stripe).

UI :
- Badge status global (5 valeurs possibles avec couleurs).
- 4 sub-badges : encaissements / versements / détails soumis / opérationnel.
- Bouton "Rafraîchir" → appelle `refreshAccountStatus` (sync depuis Stripe).
- Bouton dynamique :
  - PENDING_ONBOARDING → "Démarrer l'onboarding"
  - autre statut sauf PAYOUTS_ENABLED → "Poursuivre l'onboarding"
  - PAYOUTS_ENABLED → pas de bouton + message OK vert.

Click "Démarrer/Poursuivre" → `getOnboardingLink({ returnUrl, refreshUrl })` → redirect `window.location.href`.

### `/seller/payments/return/page.tsx`

Stripe redirige ici après onboarding terminé (success ou abandonné). useEffect appelle `refreshAccountStatus` puis affiche :
- ✅ "Compte opérationnel" si status=PAYOUTS_ENABLED.
- ⚠️ "Onboarding en cours d'analyse" sinon (Stripe peut prendre quelques minutes à valider).

### `/seller/payments/refresh/page.tsx`

Stripe redirige ici si le AccountLink a expiré (~5 min). useEffect appelle `getOnboardingLink` puis redirect immédiat vers la nouvelle URL Stripe.

## Helper API

`paymentsApi.getOnboardingLink(returnUrl, refreshUrl, token)` → `POST /payments/connect/onboarding-link` → `{ url, expiresAt }`.

`paymentsApi.refreshAccountStatus(token)` → `POST /payments/connect/refresh-status` → `SellerStripeAccountSummary`.

`paymentsApi.getAccountStatus(token)` → `GET /payments/connect/account-status` → `SellerStripeAccountSummary`.

## Tests

```
$ pnpm --filter @iox/frontend test -- seller/payments --run
✓ src/app/(dashboard)/seller/payments/page.test.tsx (5 tests) 88ms
Test Files  1 passed (1)
Tests  5 passed (5)
```

5 specs : rendu PENDING + bouton Démarrer / rendu CHARGES_ENABLED + bouton Poursuivre / rendu PAYOUTS_ENABLED + message OK / click démarrer → API call / click rafraîchir → API call.

## TODO LOT 3

- Endpoint backend `POST /payments/checkout-session` (buyer).
- Webhook handler complet (payment_intent.succeeded, payment_intent.payment_failed, account.updated).
- Page buyer `/buyer/payments/checkout/[rfqId]`.
- Email notification template `payment-confirmed-to-buyer`.
