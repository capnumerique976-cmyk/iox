# Handoff — Mandat 104 : Menus conditionnels + Messages progressifs

**Date** : 2026-05-15
**Commit** : `05cd768` feat(dashboard): M104 — daily actions enrichies avec newMessages + pendingPayment
**Branche** : main
**Tests** : 116/116 verts (47 daily-actions + 18 nav-config + 48 mobile-nav-config + 3 marketplace-bell)
**TypeScript** : clean

---

## Décisions prises

| Question | Décision | Raison |
|---|---|---|
| Route `/messages` | **Reste `disabled: true`** | Aucun page `/messages` standalone n'existe — messages dans RFQ detail uniquement (M58). Créer un squelette vide serait trompeur. |
| Menus conditionnels (masquer items selon état user) | **Non implémenté** | Complexity/bénéfice faible à ce stade. Les daily actions jouent déjà ce rôle d'orientation. Reporté M105+. |
| pendingPayment + newMessages | **Implémenté via marketplace-alerts** | Endpoint déjà existant et polled par MarketplaceBell. Fetch silencieux additionnel dans seller + buyer dashboard. |

---

## Fichiers modifiés

```
apps/frontend/src/lib/daily-actions.ts
  + SellerDailyData.newMessages? (optionnel)
  + BuyerDailyData.pendingPayment? (optionnel)
  + BuyerDailyData.newMessages? (optionnel)
  + getSellerDailyActions règle 8: newMessages urgent → "X message(s) non lu(s)"
  + getBuyerDailyActions règle 1: pendingPayment urgent → "X commande(s) à payer"
  + getBuyerDailyActions règle 3: newMessages urgent → "X message(s) non lu(s)"
  + imports: MessageCircle, CreditCard

apps/frontend/src/lib/daily-actions.test.ts
  + 12 nouveaux tests (seller: 4, buyer: 8)

apps/frontend/src/app/(dashboard)/seller/dashboard/page.tsx
  + interface MarketplaceAlerts { newMessages }
  + state marketplaceAlerts
  + fetch silencieux /api/v1/dashboard/marketplace-alerts dans load()
  + sellerDailyData inclut newMessages

apps/frontend/src/app/(dashboard)/buyer/page.tsx
  + interface BuyerMarketplaceAlerts { pendingPayment, newMessages }
  + state marketplaceAlerts
  + fetch silencieux dans load()
  + buyerDailyData inclut pendingPayment + newMessages
```

---

## Nouvelles actions daily

### Seller

| id | Priorité | Condition | CTA |
|---|---|---|---|
| `new-messages-seller` | urgent 🔴 | `newMessages > 0` | /seller/quote-requests |

### Buyer

| id | Priorité | Condition | CTA |
|---|---|---|---|
| `pending-payment` | urgent 🔴 | `pendingPayment > 0` | /buyer/payments |
| `new-messages-buyer` | urgent 🔴 | `newMessages > 0` | /buyer/quote-requests |

**Note** : `pending-payment` est prioritaire sur `quoted-rfq` (paiement > devis dans l'urgence).

---

## Architecture fetch

Fetch silencieux dans chaque dashboard page — pas de hook dédié pour éviter la sur-ingénierie :

```typescript
fetch('/api/v1/dashboard/marketplace-alerts', {
  headers: { Authorization: `Bearer ${token}` },
})
  .then((r) => (r.ok ? r.json() : null))
  .then((json) => { if (json) setMarketplaceAlerts(json.data ?? json); })
  .catch(() => { /* silencieux */ });
```

- Silencieux : erreur réseau n'affecte pas le dashboard
- Optionnel : champs `pendingPayment`/`newMessages` dans les types data sont `?: number`
- Quand `undefined` ou `0` → aucune action générée
- Pas de re-poll : lancé une fois avec le `load()` principal

---

## Tests exécutés

```bash
pnpm --filter @iox/frontend test -- src/lib/daily-actions.test.ts
# ✓ 47 tests (35 M103 + 12 M104)

pnpm --filter @iox/frontend test -- src/components/layout/ src/lib/daily-actions.test.ts
# ✓ 116 tests

pnpm --filter @iox/frontend exec tsc --noEmit
# ✓ 0 erreurs
```

---

## Critères de réussite vérifiés

- ✅ `pendingPayment` buyer dans les daily actions (urgent, → /buyer/payments)
- ✅ `newMessages` seller + buyer dans les daily actions (urgent)
- ✅ Messages tab reste `disabled: true` (route non prête)
- ✅ Dashboards pas cassés (fetch silencieux, données optionnelles)
- ✅ Tests verts (116/116)
- ✅ TypeScript clean
- ✅ Zéro appel API supplémentaire bloquant (fetch silencieux parallèle)

---

## Limites

| Élément | État | Solution future |
|---|---|---|
| Route `/messages` | Non créée | Créer `app/(dashboard)/[seller|buyer]/messages/page.tsx` quand M58 messaging est exposé comme route standalone |
| Menus conditionnels | Non implémentés | M105 — masquer items nav selon état compte (ex: cacher "Créer une offre" si profil non validé) |
| Re-poll marketplace-alerts | Pas de polling dans dashboard pages | Si nécessaire, extraire un hook `useMarketplaceAlerts(interval)` — marketplace-bell le fait déjà toutes les 2min dans la topbar |
| `failedJobs` admin | Non implémenté | Endpoint backend à créer |

---

## Pour reprendre

```bash
# Tests M104
pnpm --filter @iox/frontend test -- src/lib/daily-actions.test.ts

# Activer Messages tab (quand route prête)
# 1. Créer apps/frontend/src/app/(dashboard)/seller/messages/page.tsx
# 2. Créer apps/frontend/src/app/(dashboard)/buyer/messages/page.tsx
# 3. Dans mobile-nav-config.ts : retirer disabled:true sur les tabs 'messages'
# 4. Mettre à jour les tests mobile-nav-config.test.ts

# Menus conditionnels (M105)
# Passer des props d'état (profileComplete, hasProducts...) dans getMobileNavConfig
# Filtrer les tabs secondaires selon l'état
```
