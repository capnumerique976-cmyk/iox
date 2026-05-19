# IOX — Actions quotidiennes par rôle (Mandat 103)

> **TL;DR** : Chaque dashboard (seller, buyer, admin) affiche maintenant un panneau "travail du jour" qui priorise automatiquement les actions à faire immédiatement. Zéro appel API supplémentaire — dérivé des données déjà chargées.

---

## 1. Objectif

Après M102 (navigation mobile simplifiée), l'utilisateur sait naviguer. M103 lui dit **quoi faire une fois arrivé sur son dashboard** : pas de statistiques à lire, une liste courte d'actions classées par urgence.

---

## 2. Problème utilisateur résolu

| Avant M103 | Après M103 |
|---|---|
| Dashboard = grille de chiffres | Dashboard = "voici ta priorité aujourd'hui" |
| Seller doit chercher ses docs refusés | "1 document refusé — Corriger maintenant" visible en haut |
| Buyer voit ses RFQ noyées dans les compteurs | "2 réponses à consulter" mis en avant |
| Admin doit analyser toutes les cartes | "3 revues bloquées > 7 jours" sur fond orange en premier |

---

## 3. Architecture

```
lib/daily-actions.ts          Fonctions pures + types
  SellerDailyData             → getSellerDailyActions()
  BuyerDailyData              → getBuyerDailyActions()
  AdminDailyData              → getAdminDailyActions()

components/dashboard/
  daily-actions-panel.tsx     Composant UI réutilisable

app/(dashboard)/
  seller/dashboard/page.tsx   Intégration seller (useMemo → sellerDailyActions)
  buyer/page.tsx              Intégration buyer
  admin/page.tsx              Intégration admin
```

---

## 4. Priorités SELLER

| Rang | Condition | id | Priorité | CTA |
|---|---|---|---|---|
| 1 | rejectedDocs > 0 | `rejected-docs` | urgent 🔴 | Corriger maintenant |
| 2 | newRfq > 0 | `new-rfq` | urgent 🔴 | Corriger maintenant |
| 3 | profileCompletionPct < 50 | `complete-profile` | action 🔵 | Voir |
| 4 | !hasProducts | `add-product` | action 🔵 | Voir |
| 5 | !hasDocuments | `add-documents` | action 🔵 | Voir |
| 6 | !hasOffers && hasProducts | `create-offer` | info ⚪ | Accéder |
| 7 | rejectedProducts + rejectedOffers > 0 | `rejected-content` | action 🔵 | Voir |
| 8 | negotiatingRfq > 0 && newRfq === 0 | `negotiating-rfq` | info ⚪ | Accéder |

**État vide** : "Tout est à jour — Aucune action urgente pour aujourd'hui."

Données source : dérivées de `/marketplace/products`, `/marketplace/offers`, `/quote-requests`, `/marketplace/documents`, `/marketplace/seller-profiles` (déjà chargés dans le dashboard).

---

## 5. Priorités BUYER

| Rang | Condition | id | Priorité | CTA |
|---|---|---|---|---|
| 1 | quotedRfq > 0 | `quoted-rfq` | urgent 🔴 | Corriger maintenant |
| 2 | activeRfq > 0 && quotedRfq === 0 | `active-rfq` | info ⚪ | Accéder |
| 3 | totalRfq === 0 | `search-products` | action 🔵 | Voir |

**État vide** : "Tout va bien — Aucune action en attente."

Données source : dérivées des quote-requests déjà chargés dans `/buyer`.

---

## 6. Priorités ADMIN

| Rang | Condition | id | Priorité | CTA |
|---|---|---|---|---|
| 1 | agedReviews > 0 | `aged-reviews` | urgent 🔴 | Corriger maintenant |
| 2 | pendingReviews > 0 | `pending-reviews` | action 🔵 | Voir |
| 3 | pendingSellerProfiles > 0 | `pending-sellers` | action 🔵 | Voir |
| 4 | expiringDocs30 > 0 | `expiring-docs` | info ⚪ | Accéder |

**État vide** : "Aucune urgence — La plateforme est dans un état nominal."

Données source : dérivées de la file de revue, seller profiles, et risks déjà chargés dans `/admin`.

---

## 7. Composants créés

### `DailyActionsPanel` — props

```typescript
interface DailyActionsPanelProps {
  actions: DailyAction[];           // liste triée
  isLoading?: boolean;              // affiche skeleton
  title?: string;                   // "À faire aujourd'hui"
  emptyMessage?: string;            // "Tout est à jour"
  emptyDescription?: string;        // description état vide
}
```

### `DailyAction` — type

```typescript
interface DailyAction {
  id: string;
  title: string;
  description: string;
  href: string;
  priority: 'urgent' | 'action' | 'info';
  icon: LucideIcon;
  badge?: string;
}
```

### Rendu

- **Action principale** : bloc coloré selon priorité + CTA bouton rempli
- **Actions secondaires** (2–4) : lignes cliquables compactes
- **État vide** : badge vert "Tout est à jour"
- **Chargement** : skeleton avec `aria-busy`

---

## 8. Tests ajoutés

`src/lib/daily-actions.test.ts` — 35 tests unitaires

- Seller : état vide, doc refusé, RFQ, profil incomplet, pas de produit, badge singulier/pluriel, tri priorités, ids uniques
- Buyer : état vide, devis reçu, actif, recherche, exclusions mutuelles
- Admin : état vide, revues bloquées, pending, vendeurs, docs expirants, ordre

---

## 9. Limites et données manquantes

| Donnée | Impact | Solution future |
|---|---|---|
| `pendingPayment` buyer | Paiements à finaliser non affichés | Utiliser `/api/v1/dashboard/marketplace-alerts` (déjà polled par MarketplaceBell) |
| `newMessages` seller+buyer | Messages non lus non affichés | Idem |
| `failedJobs` admin | Jobs échoués non affichés | Endpoint à créer côté backend |
| Factures disponibles | Non remontées dans le panel | Ajouter call `/seller/invoices` ou `/buyer/invoices` |

---

## 10. Suite recommandée (M104+)

1. **Connecter `pendingPayment` et `newMessages`** depuis l'endpoint `/dashboard/marketplace-alerts` déjà disponible → enrichir BuyerDailyData et SellerDailyData
2. **Messages tab** (M102 désactivé) → quand la feature messaging existe, retirer `disabled: true` dans `mobile-nav-config.ts`
3. **Menus conditionnels** (M102 Part F) — afficher/masquer items selon avancement utilisateur (ex: cacher "Créer une offre" si profil non validé)
4. **Daily actions admin avancées** — intégrer jobs échoués, KPIs en baisse
