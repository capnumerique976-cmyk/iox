# Navigation Mobile — Desktop Parity IOX (M117)

**Date :** 2026-05-16
**Précédent :** M115 (bottom nav), M116B (menu métier accordéons)

---

## 1. Problème utilisateur

M116B introduit les 7 modules métier dans le drawer mobile, mais :
- Tous les modules s'affichent simultanément avec leurs accordéons → liste trop longue
- Le module actif n'est pas automatiquement ouvert selon la page courante
- Plusieurs routes desktop importantes absentes du menu mobile (seller : `/marketplace-hub` ; admin : 14 routes staff)
- L'utilisateur ne peut pas naviguer par chemin progressif (module → sous-menu → page)

## 2. Pourquoi M115/M116B ne suffisaient pas

| Problème | M115 | M116B | M117 |
|---------|------|-------|------|
| Routes desktop toutes couvertes | ❌ | Partiel | ✅ |
| Navigation progressive | ❌ | ❌ (accordéons plats) | ✅ |
| Auto-détection module actif | ❌ | ❌ | ✅ |
| Admin voit routes staff | ❌ | ❌ | ✅ |
| Seller voit `/marketplace-hub` | ❌ | ❌ | ✅ |

## 3. Principe desktop parity

Règle : **toute route visible dans la navigation desktop doit être accessible dans la navigation mobile**, sauf :
- Route admin pour non-admin (sécurité)
- Route inexistante (non créée côté backend/Next.js)
- Route deprecated ou interne
- Route avec justification documentée dans l'audit

Source de vérité desktop : `nav-config.ts` → `getVisibleSections(role)`.

## 4. Navigation progressive

Architecture 2 niveaux dans le drawer :

```
Niveau 1 — Liste modules
┌─────────────────────────────────────┐
│ 🏠 Accueil          (1) >          │
│ 📚 Référentiel      (4) >          │ ← module actif mis en évidence
│ 📦 Production       (2) >          │
│ 🛒 Achats           (1) >          │
│ 🏪 Catalogue        (4) >          │
│ 🚚 Distribution     (2) >          │
└─────────────────────────────────────┘

Niveau 2 — Sous-menus du module sélectionné
┌─────────────────────────────────────┐
│ ← Retour    Production              │
├─────────────────────────────────────┤
│ 📦 Mes produits                     │
│    Gérez vos fiches produit         │
│ ➕ Ajouter un produit  [●]          │  ← page active
│    Créer une nouvelle fiche produit │
└─────────────────────────────────────┘
```

Comportement :
- Ouverture drawer : `getBusinessModuleForPath(pathname, sections)` détecte le module actif
- Si détecté → drawer s'ouvre directement au Niveau 2 (sous-menus du module)
- Si non détecté → Niveau 1 (liste des modules)
- Bouton ← Retour → revient au Niveau 1
- Clic sur un lien → navigation + fermeture drawer
- Fermeture drawer → réinitialisation à null (prochaine ouverture repart de la détection pathname)

## 5. Mapping seller (6 modules)

| Module | Routes | Chemin d'accès |
|--------|--------|---------------|
| Accueil | `/seller/dashboard` | Direct |
| Référentiel | `/seller/profile/edit`, `/seller/documents`, `/seller/profile/certifications`, `/seller/compliance` | Niveau 2 |
| Production | `/seller/marketplace-products`, `/seller/marketplace-products/new` | Niveau 2 |
| Achats | `/seller/quote-requests` | Niveau 2 |
| Catalogue | `/marketplace-hub` (nouveau M117), `/seller/marketplace-offers`, `/seller/marketplace-offers/new`, `/seller/analytics` | Niveau 2 |
| Distribution | `/seller/invoices`, `/seller/payments` | Niveau 2 |

## 6. Mapping buyer (5 modules)

| Module | Routes |
|--------|--------|
| Accueil | `/buyer` |
| Référentiel | `/buyer/profile`, `/buyer/profile/edit`, `/buyer/preferences` |
| Achats | `/quote-requests/new`, `/buyer/quote-requests`, `/buyer/payments` |
| Catalogue | `/marketplace-hub`, `/marketplace/categories`, `/marketplace/favorites` |
| Distribution | `/buyer/payments`, `/buyer/orders`, `/buyer/invoices` |

## 7. Mapping admin (7 modules — parité desktop complète)

| Module | Routes admin | Routes staff (nouvelles M117) |
|--------|-------------|------------------------------|
| Accueil | `/admin` | `/dashboard` |
| Référentiel | `/admin/users`, `/admin/sellers`, `/admin/memberships` | `/beneficiaries`, `/companies`, `/supply-contracts`, `/products` |
| Production | `/admin/review-queue`, `/admin/media-moderation` | `/inbound-batches`, `/transformation-operations`, `/product-batches`, `/label-validations`, `/traceability`, `/market-release-decisions` |
| Achats | `/admin/rfq` | — |
| Catalogue | `/admin/marketplace/categories` | — |
| Distribution | `/admin/compliance`, `/admin/kpi` | `/distributions`, `/incidents`, `/documents` |
| Administration | `/admin/audit-logs`, `/admin/diagnostics`, `/admin/notif-email/logs` | — |

## 8. Routes couvertes vs exclues

### Couvertes
Toutes les routes `getVisibleSections(role)` desktop pour seller, buyer, admin.

### Exclues

| Route | Raison |
|-------|--------|
| `/messages` | Route non implémentée — onglet disabled bottom nav |
| `/seller/traceability` | Route inexistante |
| Pages détail `[id]` | Accessible depuis les listes — non item de navigation |
| Callbacks Stripe | Routes techniques (return/refresh/cancel) |
| Routes admin inexistantes | `/admin/buyers`, `/admin/payments`, `/admin/queues`, etc. |
| Swagger / monitoring | Non exposé via routing Next.js public |

## 9. `getBusinessModuleForPath` — détection active

```typescript
getBusinessModuleForPath(pathname, sections): string | null
```

Stratégie **"longest match wins"** : si plusieurs items matchent le pathname, on retient le href le plus long (le plus spécifique).

Exemples :
- `/admin/compliance` → matche `/admin` (home) ET `/admin/compliance` (distribution) → retient `/admin/compliance` → `'distribution'`
- `/seller/marketplace-products/42` → matche `/seller/marketplace-products` → `'production'`
- `/unknown` → null → ouvre Niveau 1

## 10. Tests de parité

`mobile-menu-config.test.ts` — 733 tests :
- Structure 7 modules par rôle
- Isolation admin/seller/buyer (aucune route admin exposée aux non-admins)
- Couverture routes seller : 14 tests de route
- Couverture routes buyer : 12 tests de route
- Couverture routes admin : 27 tests de route (13 admin + 14 staff M117)
- `getBusinessModuleForPath` : 30 tests (seller × 12, buyer × 6, admin × 10, limites × 2)
- Labels sans jargon

## 11. Limites

- `buyer-payments` apparaît dans deux modules (Achats : paiements à finaliser ; Distribution : paiements) — intentionnel, contextes différents
- Module Administration admin contient 3 items seulement (routes d'exploitation existantes)
- `/messages` reste disabled — route non implémentée côté backend
- Navigation progressive sans animation de transition (CSS simple)

## 12. Suite recommandée

- **M117B** : Animations de transition Niveau 1 → Niveau 2 (slide CSS)
- **M118** : Badge de comptage sur les modules (nb demandes en attente)
- **M119** : Auto-ouverture du bon module depuis la bottom nav (sync entre nav tabs et drawer)
- **Futur** : Module messagerie une fois `/messages` implémenté côté backend
