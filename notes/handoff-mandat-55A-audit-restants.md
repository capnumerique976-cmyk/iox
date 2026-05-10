# Handoff — Mandat 55A : Audit stratégique chantiers restants IOX

**Date :** 2026-05-09  
**Type :** Audit stratégique pré-session 12h  
**Fichiers inspectés :** ~696 TS/TSX + schema Prisma + docker-compose + .env.example + 55+ handoff docs  
**Backend :** 952/952 tests ✅ — TSC clean ✅  
**Frontend :** 72/72 tests ✅  

---

## 1. Résumé exécutif

IOX est une plateforme B2B agricole mature côté infrastructure et API. Les modules principaux (marketplace, RFQ, paiement Stripe Connect, MeiliSearch, BullMQ, audit, PDF) sont en place. **Mais 4 bugs critiques bloquent l'exploitation réelle** — ils ne cassent pas les tests parce qu'ils sont des TODOs silencieux ou des placeholders V1. Sans les corriger, un seller ou buyer réel ne peut pas utiliser le parcours de bout en bout.

**Bonne nouvelle :** tous les 4 sont correctibles en < 6h combinées. La session 12h peut donc corriger les blockers ET délivrer de la valeur business (notifications marketplace, polish buyer UX).

---

## 2. État actuel IOX

### Infrastructure
| Composant | Status |
|---|---|
| PostgreSQL 15 | ✅ docker-compose, health checks |
| Redis 7 (port 6381) | ✅ BullMQ + sessions |
| MinIO | ✅ documents/medias |
| MeiliSearch v1.7 | ✅ indexation produits + sellers |
| MailHog (dev) | ✅ SMTP dev |
| Stripe Connect Express | ✅ phase 1 — Connect + webhooks |

### Backend (NestJS)
- 40 modules, 37 contrôleurs, 37 modèles Prisma
- 89% Swagger documenté (33/37 controllers)
- Role guards sur 100% des endpoints sensibles (463 `@Roles` decorators)
- BullMQ : 2 queues (email, search), retries, Bull Board admin `/admin/queues`
- EventEmitter2 : domain events search sync + notifications email
- QuoteRequest FSM centralisé

### Frontend (Next.js)
- 80+ pages/routes
- Toaster Sonner configuré globalement
- AlertsBell polling (2min) — alertes supply chain pour staff
- Parcours seller : onboarding, profil, produits, offres, certifications, analytics
- Parcours buyer : RFQ, suivi, paiement, factures, préférences

---

## 3. Chantiers restants identifiés

### 3.1 BUGS CRITIQUES (bloquants production)

#### BUG-1 : Checkout page V1 inutilisable
**Fichier :** `apps/frontend/src/app/(dashboard)/buyer/payments/checkout/[rfqId]/page.tsx`  
**Symptôme :** L'acheteur doit saisir manuellement l'UUID de l'offre ET le montant en euros dans deux `<input>` vides. V1 placeholder, LOT 4 prévu mais pas fait.  
**Impact :** Aucun buyer réel ne peut payer. Bloque le revenu.  
**Fix requis :** Fetch SSR des détails du RFQ (offerId + montant négocié) depuis `/marketplace/quote-requests/:id`. Pre-fill les champs. Afficher le résumé (produit, quantité, prix).  
**Effort :** ~2h (backend endpoint existe déjà)

#### BUG-2 : Journey seller — Stripe toujours "non configuré"
**Fichier :** `apps/backend/src/users/journey.service.ts` ligne 211  
**Symptôme :** `hasStripeAccount: false` hardcodé — le dashboard vendeur affiche toujours l'étape Stripe comme incomplète même après onboarding Stripe réussi.  
**Impact :** Sellers confus, créent des tickets, abandonnent l'onboarding.  
**Fix requis :** Query `SellerStripeAccount` table pour le sellerProfileId de l'acteur. Retourner `hasStripeAccount: account?.chargesEnabled ?? false`.  
**Effort :** ~30min

#### BUG-3 : Webhook Stripe `account.updated` non traité
**Fichier :** `apps/backend/src/payments/payments-webhook.service.ts`  
**Symptôme :** Le webhook `account.updated` (envoyé par Stripe quand un seller complète son onboarding Stripe Connect) log + retourne 200 mais ne met pas à jour `SellerStripeAccount` en base.  
**Impact :** BUG-2 ne peut pas être corrigé sans BUG-3. Status Stripe reste "PENDING_ONBOARDING" en DB indéfiniment.  
**Fix requis :** Dans le switch du webhook handler, ajouter case `account.updated` → update `SellerStripeAccount` (chargesEnabled, payoutsEnabled, detailsSubmitted).  
**Effort :** ~45min (structure existe déjà, `stripe-onboarding.service.ts` a `syncAccountStatus()`)

#### BUG-4 : Page unsubscribe email — appel backend non câblé
**Fichier :** `apps/frontend/src/app/unsubscribe/page.tsx` ligne 54  
**Symptôme :** `// MP-NOTIF-3 phase 2c — appel backend réel après merge mandat 19.` — le clic "Se désinscrire" ne fait pas l'appel API réel. Les désabonnements ne sont pas enregistrés.  
**Impact :** RGPD/conformité — les demandes de désabonnement sont ignorées silencieusement.  
**Fix requis :** Câbler l'appel `POST /notif-email/unsubscribe` avec le token de désinscription présent dans l'URL.  
**Effort :** ~30min

---

### 3.2 GAPS VALEUR BUSINESS (non bloquants mais importants)

#### GAP-1 : Pas de notifications marketplace in-app
**Symptôme :** L'AlertsBell existante couvre les alertes supply chain (lots bloqués, incidents, documents). Il n'existe aucune notification pour :
- Seller : "Nouvelle demande de devis reçue"
- Seller : "Paiement confirmé par l'acheteur"
- Buyer : "Devis envoyé par le vendeur"
- Buyer : "Commande acceptée"  

**Impact :** Sellers/buyers doivent rafraîchir manuellement. Perte d'engagement, délais de réponse longs.  
**Fix requis :** Etendre l'AlertsBell OU créer un second bell "Marketplace" avec polling (2min, comme l'existant). Endpoint backend `/dashboard/marketplace-alerts`.  
**Effort :** ~3h (backend alert endpoint + frontend bell component)

#### GAP-2 : Toasts absents dans les parcours buyer
**Symptôme :** Sonner est installé et utilisé dans les pages supply chain (product-batches, distributions, etc.) mais zéro usage dans les pages buyer (quote-requests, payments, invoices).  
**Impact :** Silence total après actions importantes (envoi RFQ, changement statut, annulation).  
**Fix requis :** Ajouter `toast.success()` / `toast.error()` dans les actions buyer critiques.  
**Effort :** ~1h (pattern établi, copier-adapter)

#### GAP-3 : Checkout page sans résumé de la commande
**Lié à BUG-1** — même après correction du pre-fill, la page checkout est minimaliste. Un acheteur B2B qui dépense plusieurs milliers d'euros veut voir : nom du produit, vendeur, quantité, prix unitaire, total, TVA, conditions de livraison.  
**Effort :** ~2h supplémentaires (après BUG-1 corrigé)

#### GAP-4 : Relances RFQ automatiques
**Symptôme :** Un RFQ en statut QUOTED (devis envoyé) depuis > 7 jours sans réponse buyer n'est pas relancé.  
**Impact :** Perte de ventes, sellers frustrés.  
**Fix requis :** Cron quotidien (pattern `RfqExpirationService`) → email + notification in-app.  
**Effort :** ~2h (infrastructure BullMQ + cron existe déjà)

#### GAP-5 : Analytics seller limités
**Symptôme :** La page `/seller/analytics` existe mais les métriques sont basiques.  
**Impact :** Sellers ne peuvent pas piloter leur activité.  
**Fix requis :** Ajouter : taux de conversion RFQ→WON, temps moyen de réponse, comparatif périodes.  
**Effort :** ~3h (SQL agrégats + frontend)

---

### 3.3 DETTE TECHNIQUE

| Item | Fichiers | Sévérité |
|---|---|---|
| `any` TypeScript (~50 usages) | dashboard.service.ts, marketplace-catalog.service.ts | Faible (tests majoritairement) |
| `eslint-disable` (29) | img elements, console.warn error handlers | Faible (justifiés) |
| Rate limiting : 6/37 controllers | quote-requests, auth, payments | Moyen — 31 controllers sans @Throttle spécifique |
| `<img>` au lieu de `<Image>` Next.js | quelques pages | Faible (perf) |
| `window.confirm()` natif | buyer/quote-requests/[id]/page.tsx ligne 111 | Faible (UX) |
| Prisma `$queryRaw` avec `any` | dashboard.service.ts | Faible |

---

### 3.4 MANQUES FONCTIONNELS (non urgents)

| Domaine | Manque | Effort | Tier |
|---|---|---|---|
| Multi-devise | EUR seulement en V1 | 4-6h + migration DB | T3 |
| Chat buyer↔seller | Messages RFQ existent, pas de chat temps réel | 8h+ | T3 |
| Recherche avancée | Filtres MeiliSearch basiques | 3h | T3 |
| Certifications expiry alert | Documents expirés alertés ; certifications non | 2h | T3 |
| Buyer recommendation | Pas de suggestions produits | 6h+ | T4 |
| Admin export CSV | Pas d'export bulk RFQs/invoices | 3h | T3 |
| Runbook production | Aucun runbook écrit | 2h | T3 |
| Swagger response DTOs | 4 controllers non documentés | 1h | T4 |
| Tests E2E Playwright | e2e marketplace partiel | 4h+ | T3 |
| Buyer invoice download UX | Page existe, UX minimal | 1h | T4 |
| Window.confirm → Dialog | 1 occurrence | 30min | T4 |

---

## 4. Priorisation Tier 1 / 2 / 3 / 4

### TIER 1 — Critique production (bloquer avant lancement)

| # | Chantier | Risque si ignoré | Complexité | Dépendances |
|---|---|---|---|---|
| T1-1 | BUG-3 : webhook account.updated → sync SellerStripeAccount | Sellers en PENDING éternellement | Faible | `stripe-onboarding.service.ts` existe |
| T1-2 | BUG-2 : journey service → query SellerStripeAccount | Journey toujours cassé | Très faible | T1-1 d'abord |
| T1-3 | BUG-1 : checkout pre-fill depuis RFQ | Zéro vente possible | Moyen | Endpoint RFQ backend OK |
| T1-4 | BUG-4 : unsubscribe → appel backend réel | RGPD non-conforme | Très faible | Endpoint existe déjà |
| T1-5 | Throttle sur endpoints critiques manquants | DDoS/abuse sellers/buyers | Faible | Pattern établi |

### TIER 2 — Valeur business forte

| # | Chantier | Valeur | Complexité | Dépendances |
|---|---|---|---|---|
| T2-1 | Notifications marketplace in-app (polling bell) | Engagement seller/buyer | Moyen (3h) | Dashboard endpoint à créer |
| T2-2 | Toasts buyer pages | UX confiance | Faible (1h) | Sonner installé |
| T2-3 | Checkout page — résumé commande complet | Confiance buyer B2B | Moyen (2h) | T1-3 d'abord |
| T2-4 | Relances RFQ automatiques (7j sans réponse) | Conversion seller | Moyen (2h) | BullMQ + cron en place |
| T2-5 | Admin export CSV RFQs/Invoices | Ops autonomes | Moyen (2h) | — |
| T2-6 | Rate limiting étendu | Sécurité | Faible (1h) | Pattern établi |

### TIER 3 — Différenciation produit

| # | Chantier | Valeur | Complexité |
|---|---|---|---|
| T3-1 | Analytics seller enrichis (conversion, temps réponse) | Rétention seller | 3h |
| T3-2 | Filtres recherche avancés (pays, certif, prix) | Découvrabilité | 3h |
| T3-3 | Certifications expiry alerts | Compliance seller | 2h |
| T3-4 | Multi-devise EUR/USD | International | 5h + migration |
| T3-5 | Tests E2E Playwright complets | Fiabilité release | 4h+ |
| T3-6 | Admin export (CSV) complet | Autonomie ops | 3h |
| T3-7 | Runbook production | Incident response | 2h docs |

### TIER 4 — Polish / confort

| # | Chantier | Complexité |
|---|---|---|
| T4-1 | window.confirm → Dialog modal | 30min |
| T4-2 | `<img>` → `<Image>` Next.js | 30min |
| T4-3 | Swagger 4 controllers manquants | 1h |
| T4-4 | Journey progress connector CSS (TODO cosmétique) | 30min |
| T4-5 | TypeScript `any` réduction | 2h |
| T4-6 | Buyer invoice download polish | 1h |

---

## 5. Analyse des risques

### Risques si non traités avant lancement

| Risque | Probabilité | Impact | Chantier lié |
|---|---|---|---|
| Zéro transaction B2B (acheteur ne peut pas payer) | **Certaine** | Critique | BUG-1 |
| Sellers abandonnent onboarding (journey cassé) | **Élevée** | Fort | BUG-2 + BUG-3 |
| Non-conformité RGPD (désinscriptions ignorées) | **Certaine** | Légal | BUG-4 |
| DDoS sur endpoints RFQ/checkout | Moyenne | Fort | T1-5 |
| Sellers/buyers ne reviennent pas (pas de notifications) | **Élevée** | Business | T2-1 |

### Risques techniques pour la session 12h

| Risque | Mitigation |
|---|---|
| Migration DB (multi-devise) | **Ne pas faire** en 12h |
| Chat temps réel WebSocket | **Ne pas commencer** — scope trop large |
| Refonte checkout Stripe Embedded | Rester sur Checkout Sessions (V1 OK) |
| E2E tests Playwright avec Stripe | Utiliser les mocks existants uniquement |
| Modifier le schéma Prisma Payment | Éviter si possible — préférer les champs existants |

---

## 6. Recommandation pour la session 12h

### Proposition optimale : 4 blocs

**Bloc A (3h) — Corriger les 4 bugs critiques**  
Tous petits, impact maximal, tests simples.

**Bloc B (4h) — Notifications marketplace + toasts buyer**  
Infrastructure de polling existe (AlertsBell). Étendre plutôt que reconstruire.

**Bloc C (3h) — Checkout page production-ready**  
Pre-fill + résumé commande + relance automatique QUOTED.

**Bloc D (2h) — Rate limiting + Swagger + polish**  
Quick wins sécurité + qualité.

**Total estimé : 12h (serré mais faisable avec focus)**

---

## 7. Liste précise des tâches candidates (session 12h)

### Bloc A — Bugs critiques (~3h)

**A1 — BUG-3 : Webhook account.updated** (~45min)
- Fichier : `apps/backend/src/payments/payments-webhook.service.ts`
- Ajouter case `'account.updated'` dans le switch
- Appeler `this.onboarding.syncAccountStatus(sellerProfileId, ...)` ou update direct SellerStripeAccount
- Test unitaire : mock event `account.updated` → verify DB update
- Test : 1 spec

**A2 — BUG-2 : Journey service Stripe check** (~30min)
- Fichier : `apps/backend/src/users/journey.service.ts`
- Injecter `PrismaService` (déjà global)
- Query `prisma.sellerStripeAccount.findFirst({ where: { sellerProfileId } })`
- Return `hasStripeAccount: account?.chargesEnabled ?? false`
- Test : 1 spec (mock prisma)

**A3 — BUG-1 : Checkout page pre-fill** (~2h)
- Fichier : `apps/frontend/src/app/(dashboard)/buyer/payments/checkout/[rfqId]/page.tsx`
- Passer en Server Component ou ajouter un useEffect de fetch RFQ au montage
- Appeler `GET /marketplace/quote-requests/:id` pour récupérer l'offre + montant
- Pre-fill `offerId` et `amountEuros` automatiquement
- Afficher résumé (nom produit, quantité, prix total)
- Test : 1-2 tests (mock fetch)

**A4 — BUG-4 : Unsubscribe backend call** (~30min)
- Fichier : `apps/frontend/src/app/unsubscribe/page.tsx`
- Câbler l'appel `DELETE /notif-email/unsubscribe?token=xxx`
- Vérifier que l'endpoint existe côté backend (unsubscribe.service.ts)
- Test : 1 spec

### Bloc B — Notifications marketplace (~4h)

**B1 — Endpoint backend : alerts marketplace** (~1.5h)
- Nouveau endpoint : `GET /dashboard/marketplace-alerts` (rôle MARKETPLACE_SELLER + MARKETPLACE_BUYER)
- Retourner : `{ newRfqs: number, newQuotes: number, pendingPayment: number, unreadMessages: number }`
- Seller : count RFQs reçues depuis lastSeen, messages non lus
- Buyer : count nouvelles réponses/devis, paiements en attente
- Tests : 2-3 specs

**B2 — Frontend : MarketplaceBell component** (~1.5h)
- Nouveau composant `MarketplaceBell` (pattern AlertsBell existant)
- Polling 2min (identique à AlertsBell)
- Afficher : nouvelles RFQ (seller), nouveau devis (buyer), nouveau message
- Ajouter dans le header dashboard aux côtés de AlertsBell
- Test : 1 spec

**B3 — Toasts buyer pages** (~1h)
- `apps/frontend/src/app/(dashboard)/buyer/quote-requests/[id]/page.tsx`
  - `toast.success('Demande annulée')` après cancel
  - `toast.success('Message envoyé')` après envoi message
- `apps/frontend/src/app/(dashboard)/buyer/payments/checkout/[rfqId]/page.tsx`
  - `toast.error(err.message)` si checkout échoue (remplace le state `error`)
- Pattern Sonner déjà établi dans 15+ autres pages

### Bloc C — Checkout production-ready + relances (~3h)

**C1 — Checkout résumé complet** (~1.5h)
- Afficher : produit, vendeur, quantité, prix unitaire, commission plateforme visible
- Bouton "Payer" prominent avec montant total
- Lien "Annuler" → retour RFQ detail
- Responsive mobile

**C2 — Relance RFQ automatique (7j QUOTED)** (~1.5h)
- Nouveau service `RfqReminderService` (pattern `RfqExpirationService`)
- `@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)`
- RFQs status=QUOTED, updatedAt < now - 7j → email buyer "Votre devis expire bientôt"
- Utiliser EmailQueueService (BullMQ, pattern existant)
- Tests : 2 specs
- Enregistrer dans `QuoteRequestsModule`

### Bloc D — Quick wins sécurité/qualité (~2h)

**D1 — Rate limiting étendu** (~45min)
- Ajouter `@Throttle` sur : seller products POST/PATCH, seller offers POST/PATCH, buyer RFQ messages POST, admin actions critiques
- Pattern établi dans `quote-requests.controller.ts`

**D2 — window.confirm → modal Dialog** (~30min)
- `apps/frontend/src/app/(dashboard)/buyer/quote-requests/[id]/page.tsx` ligne 111
- Remplacer `window.confirm(...)` par Dialog modal (composant Shadcn/Radix déjà utilisé)

**D3 — Journey progress connector CSS** (~20min)
- `apps/frontend/src/components/onboarding/journey-progress.tsx`
- Corriger le TODO cosmétique du connecteur entre dots

**D4 — Swagger 4 controllers restants** (~30min)
- Identifier les 4 controllers sans `@ApiOperation`
- Ajouter les décorateurs manquants

---

## 8. Tâches à éviter en session 12h

| Tâche | Raison |
|---|---|
| **Multi-devise EUR/USD** | Require migration Prisma (`Payment.currency` + taux change) |
| **Chat temps réel WebSocket** | Scope 8h+ standalone, risque régressions |
| **Stripe Embedded Components** | Rewrite checkout flow — casse tests existants |
| **E2E Playwright complets** | Dépend env Stripe test, long à setup |
| **Refonte admin dashboard** | Fonctionnel, pas urgent |
| **Analytics ML/recommendation** | Hors scope product actuel |
| **Migration BullMQ v6** | Breaking changes, risque queues prod |
| **Changement auth JWT → sessions** | Architecture breaking |
| **Ajout Redis Pub/Sub (WebSocket)** | Nouveau service infra, deploy risqué |

---

## 9. Modules/fichiers concernés par la session 12h

### Backend
```
apps/backend/src/payments/
  payments-webhook.service.ts        ← A1 (webhook account.updated)
  payments-webhook.service.spec.ts   ← A1 test

apps/backend/src/users/
  journey.service.ts                 ← A2 (Stripe check)
  journey.service.spec.ts            ← A2 test

apps/backend/src/dashboard/
  dashboard.service.ts               ← B1 (marketplace alerts endpoint)
  dashboard.controller.ts            ← B1 (new route)
  dashboard.service.spec.ts          ← B1 test

apps/backend/src/quote-requests/
  rfq-reminder.service.ts            ← C2 (new: relance 7j)
  rfq-reminder.service.spec.ts       ← C2 test
  quote-requests.module.ts           ← C2 register
```

### Frontend
```
apps/frontend/src/app/(dashboard)/buyer/payments/checkout/[rfqId]/
  page.tsx                           ← A3 (pre-fill + résumé)
  page.test.tsx                      ← A3 test update

apps/frontend/src/app/unsubscribe/
  page.tsx                           ← A4 (backend call)

apps/frontend/src/app/(dashboard)/buyer/quote-requests/[id]/
  page.tsx                           ← B3 (toasts + modal)

apps/frontend/src/components/layout/
  marketplace-bell.tsx               ← B2 (new component)
  header.tsx ou layout               ← B2 (add bell to header)

apps/frontend/src/components/onboarding/
  journey-progress.tsx               ← D3 (connector CSS TODO)
```

---

## 10. Tests à prévoir (session 12h)

| Test | Type | Priorité |
|---|---|---|
| webhook account.updated → SellerStripeAccount update | Unit (jest) | T1 |
| journey service → hasStripeAccount query réel | Unit (jest) | T1 |
| checkout page : pré-remplissage depuis RFQ | Component (vitest) | T1 |
| unsubscribe page : appel API correct | Component (vitest) | T1 |
| dashboard marketplace-alerts endpoint | Unit (jest) | T2 |
| MarketplaceBell : rendu + polling | Component (vitest) | T2 |
| RfqReminderService : cron 7j QUOTED | Unit (jest) | T2 |
| Toasts buyer pages | Component (vitest) | T3 |

**Total nouveaux tests estimés :** ~15-20 tests

---

## 11. Proposition de roadmap post-55A

| Mandat | Objectif | Durée estimée |
|---|---|---|
| **M55B** | 4 bugs critiques + notifications marketplace + toasts buyer (Blocs A+B) | 6-7h |
| **M56** | Checkout production-ready + relances RFQ (Blocs C+D) | 4-5h |
| **M57** | Analytics seller enrichis + search filtres avancés | 4-5h |
| **M58** | Admin exports CSV + rate limiting étendu | 3h |
| **M59** | Tests E2E Playwright complets (paiement, RFQ, seller flow) | 5h |
| **M60** | Multi-devise EUR/USD (migration DB) | 6h + validation humaine |

---

## 12. Méga-prompt 12h recommandé (prêt à copier-coller)

```
Mandat 55B — Fix 4 bugs critiques + notifications marketplace + checkout production

Contexte :
- Backend : 952/952 tests ✅, TSC clean ✅
- Frontend : 72/72 tests ✅
- Infrastructure : BullMQ, EventEmitter2, Sonner, AlertsBell (polling), Stripe Connect phase 1 — tout en place.

Objectif : Débloquer IOX pour une exploitation réelle en corrigeant les 4 blockers + delivrant les notifications marketplace et le polish buyer.

══════════════════════════════════════════════
BLOC A — 4 BUGS CRITIQUES (priorité absolue)
══════════════════════════════════════════════

A1 — Webhook Stripe account.updated (45min)
Fichier : apps/backend/src/payments/payments-webhook.service.ts
- Le switch du webhook handler gère payment_intent.succeeded et payment_intent.payment_failed.
- Ajouter case 'account.updated' → appeler this.onboarding.syncAccountStatus()
  ou update direct de SellerStripeAccount (chargesEnabled, payoutsEnabled, detailsSubmitted).
- stripe-onboarding.service.ts expose déjà syncAccountStatus() — réutiliser.
- Test : 1 spec dans payments-webhook.service.spec.ts

A2 — Journey service : Stripe check réel (30min)
Fichier : apps/backend/src/users/journey.service.ts
- Ligne 211 et 314 : hasStripeAccount: false — hardcodé.
- Injecter PrismaService (DatabaseModule est @Global, pas besoin de l'importer).
- Query : prisma.sellerStripeAccount.findFirst({ where: { sellerProfileId, chargesEnabled: true } })
- Retourner hasStripeAccount: !!account
- Test : 1 spec dans journey.service.spec.ts

A3 — Checkout page buyer : pre-fill depuis RFQ (2h)
Fichier : apps/frontend/src/app/(dashboard)/buyer/payments/checkout/[rfqId]/page.tsx
- Actuellement : buyer tape manuellement l'UUID de l'offre ET le montant. Inutilisable.
- Transformer en un composant qui fetch le RFQ au montage (useEffect ou server component params).
  Endpoint disponible : GET /marketplace/quote-requests/:id
- Pre-fill automatique : offerId = rfq.marketplaceOfferId, amount = calculé depuis l'offre.
- Afficher résumé : nom produit, quantité, vendeur, montant total.
- Garder le bouton "Payer" — redirection Stripe checkout inchangée.
- Tests : 2 specs (mock fetch, vérifier affichage + call API)

A4 — Unsubscribe page : câbler l'appel backend (30min)
Fichier : apps/frontend/src/app/unsubscribe/page.tsx ligne 54
- TODO : "appel backend réel après merge mandat 19"
- Endpoint : DELETE /notif-email/unsubscribe?token=xxx (ou POST selon signature)
  Vérifier dans apps/backend/src/notif-email/unsubscribe.service.ts
- Câbler l'appel avec le token présent dans l'URL (?token=xxx dans les params)
- Afficher succès/erreur proprement
- Test : 1 spec

══════════════════════════════════════════════
BLOC B — NOTIFICATIONS MARKETPLACE (3h)
══════════════════════════════════════════════

B1 — Endpoint backend marketplace alerts (1.5h)
Fichier cible : apps/backend/src/dashboard/dashboard.service.ts + dashboard.controller.ts
- Nouveau endpoint : GET /dashboard/marketplace-alerts (JWT requis)
- Seller (MARKETPLACE_SELLER) :
  newRfqs : count QuoteRequests reçues sur ses offres depuis X (stocker lastSeenAt en session ou calculer depuis 24h)
  unreadMessages : count messages non lus sur ses RFQs
  pendingActions : RFQs en QUALIFIED sans réponse > 3j
- Buyer (MARKETPLACE_BUYER) :
  newQuotes : count RFQs passées en QUOTED depuis 24h
  pendingPayment : count RFQs en WON non payées
  unreadMessages : count réponses non lues
- Retourner : { total, items: [...] } (même structure qu'AlertsBell pour réutiliser le pattern)
- Test : 2 specs (seller view + buyer view)

B2 — Frontend : MarketplaceBell component (1.5h)
Fichier cible : apps/frontend/src/components/layout/marketplace-bell.tsx (nouveau)
- Copier l'architecture AlertsBell (polling 2min, dropdown, badge rouge)
- Appeler GET /dashboard/marketplace-alerts
- Afficher alertes spécifiques marketplace (RFQ reçue, devis prêt, paiement confirmé)
- Ajouter à côté de AlertsBell dans le layout dashboard
- Visible uniquement pour MARKETPLACE_SELLER et MARKETPLACE_BUYER (conditionnellement)
- Test : 1 spec (rendu + polling mock)

B3 — Toasts buyer pages (1h)
Fichier : apps/frontend/src/app/(dashboard)/buyer/quote-requests/[id]/page.tsx
- Ajouter import { toast } from 'sonner'
- Après cancel RFQ : toast.success('Demande annulée avec succès')
- Après envoi message : toast.success('Message envoyé')
- Erreurs réseau : toast.error(message)
- Même chose dans buyer/payments/checkout/[rfqId]/page.tsx : remplacer le state error par toast.error()
- 5-6 appels toast.success/error à ajouter

══════════════════════════════════════════════
BLOC C — RELANCES RFQ (2h)
══════════════════════════════════════════════

C1 — RfqReminderService (1.5h)
Fichier cible : apps/backend/src/quote-requests/rfq-reminder.service.ts (nouveau)
- @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
- Pattern identique à RfqExpirationService (déjà en place)
- Trouver RFQs status=QUOTED, updatedAt < now - 7 jours
- Pour chaque : envoyer email buyer "Votre devis est disponible, il expire dans 7 jours"
  → utiliser EmailQueueService (pattern BullMQ existant)
  → template : réutiliser ou créer rfq-reminder.template.ts
- AuditService.log action='QUOTE_REQUEST_REMINDER_SENT'
- Registrer dans QuoteRequestsModule providers
- Tests : 2 specs (no-op si 0, trigger email si > 7j)

══════════════════════════════════════════════
BLOC D — QUICK WINS (1h)
══════════════════════════════════════════════

D1 — window.confirm → Dialog (20min)
Fichier : apps/frontend/src/app/(dashboard)/buyer/quote-requests/[id]/page.tsx ligne 111
- Remplacer window.confirm('Annuler définitivement cette demande de devis ?')
  par un Dialog Radix/Shadcn (pattern utilisé ailleurs dans le projet)
- Bouton "Confirmer" déclenche l'annulation, "Annuler" ferme le dialog

D2 — Journey progress connector CSS (15min)
Fichier : apps/frontend/src/components/onboarding/journey-progress.tsx
- Corriger le TODO cosmétique sur le connecteur entre les dots du stepper

D3 — Rate limiting endpoints marketplace (30min)
- Ajouter @Throttle sur :
  POST /seller/marketplace-products → 10 req/min
  POST /seller/marketplace-offers → 10 req/min
  POST /marketplace/quote-requests/:id/messages → 20 req/min
- Pattern : copier @Throttle({ default: { limit: 5, ttl: 60000 } }) de quote-requests.controller.ts

══════════════════════════════════════════════
CONTRAINTES
══════════════════════════════════════════════

- Ne PAS modifier le schéma Prisma (pas de migration en session autonome)
- Ne PAS démarrer le chat WebSocket
- Ne PAS implémenter le multi-devise
- Ne PAS modifier les webhooks Stripe au-delà de A1
- Garder l'architecture BullMQ telle quelle
- Après chaque bloc : npm test --forceExit + tsc --noEmit
- Écrire un test pour chaque nouvelle fonctionnalité backend
- Objectif : 952 → ~970+ tests verts, TSC clean

══════════════════════════════════════════════
LIVRABLE FINAL
══════════════════════════════════════════════

1. 4 bugs critiques corrigés
2. Notifications marketplace seller/buyer (polling 2min)
3. Toasts buyer pages (6+ occurrences)
4. Checkout page production-ready (pre-fill + résumé)
5. Relances automatiques RFQ QUOTED > 7j
6. Quick wins sécurité + UX
7. ~970+ tests verts
8. TSC clean
9. handoff-mandat-55B.md

Ne pas rédiger de plan. Commencer directement par A1.
```

---

## Synthèse finale

**Fichiers inspectés :** ~696 TS/TSX + 37 modèles Prisma + docker-compose + .env.example + 55 handoff docs  
**Domaines audités :** 14 (UX, notifications, chat, RFQ, paiement, facturation, marketplace, seller, buyer, admin, observabilité, sécurité, documentation, tests)  

**Top 10 chantiers restants (priorisés) :**
1. BUG-1 : Checkout page inutilisable (V1 placeholder saisie manuelle)
2. BUG-3 : Webhook account.updated silencieux → seller bloqué
3. BUG-2 : Journey Stripe hardcodé false → onboarding cassé
4. BUG-4 : Unsubscribe RGPD non câblé
5. Notifications marketplace (seller : RFQ reçue, buyer : devis prêt)
6. Toasts absents dans parcours buyer
7. Relances RFQ QUOTED > 7j
8. Rate limiting sur endpoints marketplace seller
9. Analytics seller enrichis
10. Export CSV admin

**Top 5 priorités recommandées session 12h :** A1, A2, A3, A4, B1+B2

**Décision recommandée :**  
→ **Lancer Mandat 55B : 4 bugs critiques + notifications + checkout** (Blocs A+B+C+D)  
→ Reporter : chat, multi-devise, WebSocket, E2E complets, analytics

**Ce qui est déconseillé :** Migration Prisma, WebSocket, multi-devise, Stripe Embedded, refonte admin.
