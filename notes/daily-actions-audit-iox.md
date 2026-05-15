# IOX — Audit Dashboards : Daily Actions (Mandat 103)

**Date** : 2026-05-15

---

## SELLER — `/seller/dashboard`

### Données déjà chargées

| Source | Données | Endpoint |
|---|---|---|
| Offres | liste complète, publicationStatus | `GET /marketplace/offers?limit=100` |
| Produits | liste complète, publicationStatus | `GET /marketplace/products?limit=100` |
| RFQ | liste complète, status (NEW/NEGOTIATING/WON…) | `GET /quote-requests?limit=100` |
| Documents | liste, verificationStatus, validUntil | `GET /marketplace/documents?limit=100` |
| Profil vendeur | completionCriteria (6 critères) | `GET /marketplace/seller-profiles?limit=5` |

### Ce qui est déjà affiché

- Cartes analytics : produits / offres / RFQ (total + breakdown statuts)
- Score de complétude du profil vendeur (0–6 critères)
- Contenus rejetés (produits + offres) avec lien "Corriger"
- Top 3 RFQ récentes (NEW + NEGOTIATING en priorité)
- Alertes documents (expirant < 90j, non vérifiés)
- Raccourcis (produits, offres, quote-requests, documents)
- `GuidedDashboardHeader` (onboarding journey stepper)

### Manques identifiés pour les Daily Actions

- Pas de synthèse "à faire maintenant" en haut de page
- Profil incomplet (< 50%) → pas de CTA urgent visible
- Seller sans produit → message générique, pas d'action directe
- États vides → textes peu guidants ("Aucun produit pour l'instant")
- Pas de prioritisation des alertes : tous les problèmes au même niveau

### Actions possibles par priorité

| Priorité | Condition | Label | Href |
|---|---|---|---|
| 🔴 urgent | rejectedDocs > 0 | "X document(s) refusé(s)" | `/seller/documents` |
| 🔴 urgent | newRfq > 0 | "Répondre à X demandes" | `/seller/quote-requests` |
| 🟠 action | profileCompletionPct < 50 | "Compléter mon profil" | `/seller/profile/edit` |
| 🟠 action | !hasProducts | "Ajouter mon premier produit" | `/seller/marketplace-products/new` |
| 🟠 action | !hasDocuments | "Ajouter mes documents" | `/seller/documents` |
| 🟡 info | !hasOffers && hasProducts | "Créer une offre" | `/seller/marketplace-offers/new` |
| 🟡 info | rejectedProducts/Offers > 0 | "X contenu(s) à corriger" | `/seller/marketplace-products` |
| ✅ vide | aucune action | "Tout est à jour" | — |

---

## BUYER — `/buyer`

### Données déjà chargées

| Source | Données | Endpoint |
|---|---|---|
| Quote requests | liste par status (NEW/QUALIFIED/QUOTED/NEGOTIATING/WON/LOST/CANCELLED) | `GET /quote-requests?limit=200` |

### Ce qui est déjà affiché

- Compteurs RFQ par statut (grille cliquable)
- CTA "Explorer le catalogue" si aucune RFQ
- Raccourcis : catalogue, commandes, profil entreprise, préférences
- `GuidedDashboardHeader` (onboarding journey stepper)

### Manques identifiés

- Aucune action "prioritaire" visible → buyer doit chercher
- `QUOTED` (devis reçu) = action critique non mise en avant
- Pas d'accès direct à la facture la plus récente
- `pendingPayment` disponible dans `MarketplaceBell` mais pas sur cette page

### Actions possibles par priorité

| Priorité | Condition | Label | Href |
|---|---|---|---|
| 🔴 urgent | quotedRfq > 0 | "X réponse(s) de vendeur à consulter" | `/buyer/quote-requests?status=QUOTED` |
| 🟠 action | activeRfq > 0 | "X demandes en cours" | `/buyer/quote-requests` |
| 🟠 action | totalRfq === 0 | "Rechercher un produit" | `/marketplace-hub` |
| ✅ vide | activeRfq > 0 && quotedRfq === 0 | "Vos demandes sont en cours" | — |

**Note** : `pendingPayment` et `newMessages` disponibles via `/api/v1/dashboard/marketplace-alerts` (déjà polled par `MarketplaceBell`). Pas d'accès direct à cette donnée dans la page buyer sans appel supplémentaire. Non implémenté dans M103 — à prévoir dans M104.

---

## ADMIN — `/admin`

### Données déjà chargées

| Source | Données | Endpoint |
|---|---|---|
| Memberships | diagnostic rattachements | lib `getMembershipsDiagnostic` |
| Seller profiles | total, pendingReview, approved, suspended, rejected | `GET /marketplace/seller-profiles?status=X&limit=1` |
| Review queue | `{ total, byType: { publication, media, document } }` | `GET /marketplace/review-queue/stats/pending` |
| RFQ | ventilation par statut | `GET /quote-requests?status=X&limit=1` |
| Risks | aged reviews (> 7j) + docs expirant (< 30j) | `/marketplace/review-queue?status=PENDING` + `/marketplace/documents` |

### Ce qui est déjà affiché

- 4 cartes analytics (memberships, vendeurs, file de revue, RFQ)
- Section "Risques & alertes" (aged reviews + docs expiring)
- Accès rapides (8 liens)

### Manques identifiés

- "À traiter maintenant" non visible → admin doit analyser les cartes
- Aged reviews (bloqués > 7j) = critique mais noyé dans les risques
- Pas de count résumé en haut de page

### Actions possibles par priorité

| Priorité | Condition | Label | Href |
|---|---|---|---|
| 🔴 urgent | agedReviews > 0 | "X revue(s) bloquée(s) > 7 jours" | `/admin/review-queue?status=PENDING` |
| 🟠 action | pendingReviews > 0 | "X élément(s) à valider" | `/admin/review-queue` |
| 🟠 action | pendingSellerProfiles > 0 | "X vendeur(s) en attente" | `/admin/sellers?status=PENDING_REVIEW` |
| 🟡 info | expiringDocs30 > 0 | "X document(s) à risque" | `/admin/diagnostics` |
| ✅ vide | tout à zéro | "Aucune urgence" | — |

---

## Synthèse UX — Proposition DailyActionsPanel

### Architecture recommandée

```
[GuidedDashboardHeader — onboarding existant]
[PageHeader — titre existant]
[DailyActionsPanel — NOUVEAU]
  → Action principale (prominente, CTA clair)
  → 2–4 actions secondaires (compactes)
  → État vide positif si rien à faire
[Contenu existant du dashboard — inchangé]
```

### Composants

- `lib/daily-actions.ts` — types + fonctions pures par rôle
- `components/dashboard/daily-actions-panel.tsx` — UI réutilisable

### Données réutilisées (zéro appel API supplémentaire)

- Seller : réutilise products/offers/rfq/docs/profile déjà chargés
- Buyer : réutilise items (quote-requests) déjà chargés
- Admin : réutilise sellers/reviews/risks déjà chargés

### Données manquantes (recommandations futures)

| Donnée | Rôle | Source potentielle |
|---|---|---|
| pendingPayment | Buyer | `/api/v1/dashboard/marketplace-alerts` (MarketplaceBell) |
| newMessages | Seller + Buyer | idem |
| failedJobs | Admin | Endpoint à créer |
| invoices count | Seller + Buyer | `/seller/invoices` ou `/buyer/invoices` |
