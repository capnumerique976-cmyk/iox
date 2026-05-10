# Handoff — Mandat 55B : Fix 4 bugs critiques + notifications marketplace + polish buyer

**Statut :** ✅ Complet  
**Backend tests :** 959/959 (avant : 952) — +7 nouveaux  
**Frontend tests :** 451/451 dans 73 fichiers (avant : 422 dans 72 fichiers) — +29 nouveaux  
**TSC :** clean (backend + frontend)  
**Branche :** `mandat-55B`  
**Date :** 2026-05-10

---

## Synthèse — ce qui a changé

### Bugs critiques — statut réel au démarrage de M55B

| Bug | Statut trouvé | Action |
|---|---|---|
| BUG-1 : Checkout page V1 inutilisable | ❌ Confirmé | Corrigé (A3) |
| BUG-2 : Journey Stripe hardcodé false | ❌ Confirmé | Corrigé (A2) |
| BUG-3 : Webhook account.updated non traité | ✅ Déjà implémenté | Rien à faire |
| BUG-4 : Unsubscribe backend non câblé | ✅ Déjà câblé | Rien à faire |

> **Note :** BUG-3 et BUG-4 avaient déjà été résolus dans la baseline M52-54b. L'audit M55A les avait identifiés mais ils avaient été patchés entre-temps sans handoff.

---

## Bloc A — Bugs critiques

### A2 — Journey service : Stripe check réel ✅

**Fichier modifié :** `apps/backend/src/users/journey.service.ts`

**Avant :** `hasStripeAccount: false` hardcodé (le dashboard seller affichait toujours l'étape Stripe comme incomplète).  
**Après :** Query réelle avant le `return` de `getSellerJourney()` :

```typescript
const sellerProfile = actor.companyIds?.[0]
  ? await this.prisma.sellerProfile.findFirst({
      where: { companyId: actor.companyIds[0] },
      select: { id: true },
    })
  : null;

const stripeAccount = sellerProfile
  ? await this.prisma.sellerStripeAccount.findFirst({
      where: { sellerProfileId: sellerProfile.id, chargesEnabled: true },
      select: { id: true },
    })
  : null;

const hasStripeAccount = !!stripeAccount;
```

Lignes 314 et 338 (buyer journey + staff journey) : `hasStripeAccount: false` conservé — elles ne sont pas concernées par Stripe seller.

**Tests ajoutés :** 2 specs dans `journey.service.spec.ts`
- `returns hasStripeAccount: true when seller has chargesEnabled account`
- `returns hasStripeAccount: false when no chargesEnabled account`

---

### A3 — Checkout page buyer : pre-fill depuis RFQ ✅

**Fichier modifié :** `apps/frontend/src/app/(dashboard)/buyer/payments/checkout/[rfqId]/page.tsx`

**Avant :** Buyer devait saisir manuellement l'UUID de l'offre ET le montant. Inutilisable.  
**Après :**
- `useEffect` au montage : fetch `GET /api/v1/marketplace/quote-requests/:rfqId`
- Pre-fill automatique de `offerId` et `amountEuros` depuis la réponse
- Affichage résumé : produit, montant, ID offre
- Inputs en `readonly` avec les valeurs pré-remplies
- Gestion 404 (RFQ introuvable) avec état d'erreur clair
- `toast.error()` remplace le state `error` pour les erreurs handlePay

**Tests mis à jour :** `page.test.tsx` — 5 specs (dont 2 nouveaux : pre-fill correct, erreur fetch RFQ)

---

## Bloc B — Notifications marketplace

### B1 — Endpoint backend `/dashboard/marketplace-alerts` ✅

**Fichiers modifiés :**
- `apps/backend/src/dashboard/dashboard.service.ts` — méthode `getMarketplaceAlerts(actor)`
- `apps/backend/src/dashboard/dashboard.controller.ts` — route `GET /dashboard/marketplace-alerts`

**Endpoint :** `GET /dashboard/marketplace-alerts`  
**Roles :** `MARKETPLACE_SELLER`, `MARKETPLACE_BUYER`  
**Réponse :**
```typescript
{
  total: number;
  newRfqs: number;         // Seller : RFQs reçues depuis 24h
  newQuotes: number;       // Buyer : RFQs passées en QUOTED depuis 24h
  pendingPayment: number;  // Buyer : RFQs WON sans Payment SUCCEEDED
  pendingActions: number;  // Seller : RFQs QUALIFIED sans réponse > 3j
}
```

**Tests ajoutés :** 2 specs dans `dashboard.service.spec.ts` (seller view + buyer view)

---

### B2 — MarketplaceBell component ✅

**Fichier créé :** `apps/frontend/src/components/layout/marketplace-bell.tsx`

Architecture copiée de `AlertsBell` :
- Polling 2min via `setInterval`
- Appelle `GET /api/v1/dashboard/marketplace-alerts`
- Badge rouge avec count total
- Dropdown avec 4 alertes : nouvelles RFQs, devis disponibles, paiements en attente, actions requises
- Icône `Store` (lucide-react)

**Ajouté dans le layout :** `apps/frontend/src/app/(dashboard)/layout.tsx` — `<MarketplaceBell />` avant `<AlertsBell />`

**Tests ajoutés :** 2 specs dans `marketplace-bell.test.tsx`

---

### B3 — Toasts buyer pages ✅

**Fichier modifié :** `apps/frontend/src/app/(dashboard)/buyer/quote-requests/[id]/page.tsx`

Toasts Sonner ajoutés :
- Annulation RFQ : `toast.success('Demande annulée avec succès')` / `toast.error(...)`
- Envoi message : `toast.success('Message envoyé')` / `toast.error(...)`

**Checkout page :** couvert par A3 (toast.error remplace setError)

---

## Bloc C — Relances RFQ

### C1 — RfqReminderService ✅

**Fichier créé :** `apps/backend/src/quote-requests/rfq-reminder.service.ts`

Pattern identique à `RfqExpirationService` :
- `@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)`
- Trouve les RFQs `status=QUOTED`, `updatedAt < now - 7 jours`
- Par RFQ : envoie email buyer via `EmailQueueService` (`templateId: 'rfq-reminder'`)
- Audit : `action: 'QUOTE_REQUEST_REMINDER_SENT'`
- Erreurs individuelles logguées (non bloquantes)

**Enregistré dans :** `apps/backend/src/quote-requests/quote-requests.module.ts`

**Tests ajoutés :** 2 specs dans `rfq-reminder.service.spec.ts`
- No-op si 0 RFQ QUOTED > 7j
- Envoi email + audit pour chaque RFQ concernée

---

## Bloc D — Quick wins

### D1 — window.confirm → Dialog modal ✅

**Fichier modifié :** `apps/frontend/src/app/(dashboard)/buyer/quote-requests/[id]/page.tsx`

`window.confirm('Annuler définitivement cette demande de devis ?')` remplacé par Dialog Radix/Shadcn :
- `cancelDialogOpen` state
- Titre : "Annuler la demande de devis ?"
- Description : "Cette action est irréversible."
- Bouton "Confirmer" → déclenche `onCancelConfirm()`
- Bouton "Annuler" → ferme le dialog

---

### D2 — Journey progress connector CSS ✅

**Fichier modifié :** `apps/frontend/src/components/onboarding/journey-progress.tsx`

Suppression du `// TODO: position connector between dots — skip for now`.  
Connecteur entre les dots maintenant fonctionnel :
- Parent step wrapper : `relative` ajouté
- Connecteur : `absolute top-3 left-[calc(50%+12px)] right-0 h-0.5 -translate-y-0.5`
- Couleur : `emerald-400/40` si étape done, `white/10` sinon
- Visible uniquement sur `lg+` (`hidden lg:block`)

---

### D3 — Rate limiting endpoints marketplace ✅

**Fichiers modifiés :**
- `apps/backend/src/marketplace-products/marketplace-products.controller.ts` — `@Throttle({ default: { limit: 10, ttl: 60_000 } })` sur `POST /`
- `apps/backend/src/marketplace-offers/marketplace-offers.controller.ts` — throttle ajusté à `limit: 10`
- Messages RFQ : déjà à `limit: 20` depuis M53

---

## Tests — avant / après

| | Avant M55B | Après M55B |
|---|---|---|
| Backend tests | 952/952 | **959/959** (+7) |
| Frontend tests | 422/422 (72 fichiers) | **451/451 (73 fichiers)** (+29, +1 fichier) |
| TSC backend | clean | clean |
| TSC frontend | clean | clean |

### Nouveaux tests backend (+7)
- `journey.service.spec.ts` : +2 (Stripe check réel)
- `dashboard.service.spec.ts` : +2 (marketplace-alerts seller + buyer)
- `rfq-reminder.service.spec.ts` : +3 (nouveau fichier)

### Nouveaux tests frontend (+29)
- `checkout/[rfqId]/page.test.tsx` : réécriture — +2 nouveaux scenarios
- `marketplace-bell.test.tsx` : nouveau fichier, 2 tests
- `buyer/quote-requests/[id]/page.test.tsx` : +1 test dialog
- `journey-progress.test.tsx` : restauré (6 tests stables)
- `guided-dashboard-header.test.tsx` : 10 tests stables

---

## Commits M55B

```
6649632 fix(frontend): restore journey-progress interface + fix connector CSS (D2)
f6eec30 feat(frontend): M55B blocs A3+B2+B3+D1+D2 — checkout prefill, marketplace bell, buyer toasts, dialog, journey CSS
e9de2a7 feat(backend): M55B blocs A2+B1+C1+D3 — journey stripe check, marketplace alerts, rfq reminders, throttle
7120c26 chore: commit M52-54b completed work (baseline for M55B)
```

---

## Architecture — décisions clés

### MarketplaceBell vs AlertsBell
Pattern réutilisé à l'identique (polling 2min, dropdown, badge). `AlertsBell` couvre les alertes supply chain internes (staff). `MarketplaceBell` couvre les alertes marketplace (seller/buyer). Les deux coexistent dans le layout dashboard — visibles selon le rôle de l'utilisateur côté backend.

### RfqReminderService — emailQueue vs notifEmail
Utilise `EmailQueueService` (BullMQ) plutôt que `NotifEmailService` direct — la relance passe par la queue pour bénéficier des retries BullMQ. Le templateId `rfq-reminder` doit exister dans les templates email (sinon le job BullMQ échouera et sera loggué par `QueueEventsService`).

### Journey Stripe check — sellerProfile relay
La query suit le chemin `companyId → sellerProfile.id → sellerStripeAccount.chargesEnabled`. Pas de shortcut via `actor.sellerProfileIds` (champ potentiellement stale dans le JWT). La query DB est la source de vérité.

### Checkout — calcul du montant
`amountEuros = rfq.marketplaceOffer.unitPrice × rfq.requestedQuantity`. Ce calcul correspond au montant négocié. Si le RFQ n'a pas de `marketplaceOffer` lié, le checkout affiche un état d'erreur (RFQ pas encore en WON).

---

## Ce qui reste (non fait en M55B)

Ces items sont dans l'audit M55A mais hors scope M55B :

| Item | Tier | Mandat suggéré |
|---|---|---|
| Checkout résumé complet (GAP-3) | T2 | M56 |
| Analytics seller enrichis | T3 | M57 |
| Filtres recherche avancés | T3 | M57 |
| Admin export CSV | T2 | M58 |
| Tests E2E Playwright | T3 | M59 |
| Multi-devise EUR/USD | T3 | M60 (avec migration Prisma) |
| Template email rfq-reminder | T1 | M56 (lié à C1) |

---

## Prochains mandats

- **M56** : Template email `rfq-reminder` + checkout résumé complet (produit, vendeur, TVA, conditions)
- **M57** : Analytics seller enrichis (conversion, temps réponse) + filtres MeiliSearch
- **M58** : Admin export CSV (RFQs, Invoices) + rate limiting étendu
- **M59** : Tests E2E Playwright (seller flow, RFQ, paiement)
- **M60** : Multi-devise EUR/USD (migration Prisma — valider avec humain)
