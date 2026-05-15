# IOX — Architecture de navigation (Mandat 102)

> **TL;DR** : Navigation à 3 niveaux (top bar → sidebar → page). Mobile : bottom nav 4 tabs par rôle. Desktop : sidebar contextuelle. Source de vérité unique : `nav-config.ts` + `mobile-nav-config.ts`.

---

## Architecture 3 niveaux

```
┌────────────────────────────────────────────────────────────┐
│  Top bar  │  Accueil · Référentiel · Catalogue · Admin…   │  ← sections (≥md)
├───────────┬────────────────────────────────────────────────┤
│  Sidebar  │                                                │
│  (≥lg)   │            Contenu de la page                  │
│  items    │                                                │
│  section  │                                                │
└───────────┴────────────────────────────────────────────────┘
│   Bottom nav (mobile <md, seller/buyer/admin uniquement)   │
└────────────────────────────────────────────────────────────┘
```

Niveau 1 — **Top bar horizontale** : sections principales (`HOME_SECTION` + `SECTIONS`). Visible ≥ md. Masquée sur mobile pour les rôles marketplace/admin (bottom nav remplace).

Niveau 2 — **Sidebar contextuelle** : items de la section active. Visible ≥ lg. Sur mobile : drawer hamburger pour staff ; bottom nav + sheet "Plus" pour marketplace/admin.

Niveau 3 — **Page de landing de section** : dashboard de rubrique agrégeant les sous-modules (ex. `/seller/dashboard`, `/buyer`, `/admin`).

---

## Sections et rôles

| Section | id | Rôles | Landing |
|---|---|---|---|
| Accueil | `home` | tous | `/dashboard` |
| Référentiel | `referentiel` | staff | `/referentiel` |
| Production | `production` | staff | `/production` |
| Achats | `buyer` | staff + BUYER | `/buyer` |
| Catalogue | `marketplace` | staff + SELLER | `/marketplace-hub` |
| Distribution | `distribution` | staff | `/distribution` |
| Administration | `admin` | ADMIN | `/admin` |

ADMIN voit toutes les sections. Staff voit toutes sauf les sections marketplace pures.

---

## Navigation mobile par rôle

### MARKETPLACE_SELLER (4 onglets primaires)

| Position | Label | Route | État |
|---|---|---|---|
| 1 | Accueil | `/seller/dashboard` | actif |
| 2 | Produits | `/seller/marketplace-products` | actif |
| 3 | Demandes | `/seller/quote-requests` | actif |
| 4 | Messages | `/messages` | **désactivé** (futur) |
| → Plus | sheet | Analytique, Offres, Documents, Conformité, Paiements, Factures | — |

**Actions contextuelles** :
- Sur `/seller/marketplace-products` (liste exacte) → chip « Nouveau produit »
- Sur `/seller/marketplace-offers` (liste exacte) → chip « Nouvelle offre »

### MARKETPLACE_BUYER (4 onglets primaires)

| Position | Label | Route | État |
|---|---|---|---|
| 1 | Accueil | `/buyer` | actif |
| 2 | Rechercher | `/marketplace-hub` | actif |
| 3 | Demandes | `/buyer/quote-requests` | actif |
| 4 | Messages | `/messages` | **désactivé** (futur) |
| → Plus | sheet | Commandes, Factures, Préférences, Mon entreprise | — |

### ADMIN (4 onglets primaires)

| Position | Label | Route |
|---|---|---|
| 1 | Tableau | `/admin` |
| 2 | Revue | `/admin/review-queue` |
| 3 | Vendeurs | `/admin/sellers` |
| 4 | Utilisateurs | `/admin/users` |
| → Plus | sheet | KPIs, Conformité, Médias, Catégories, Devis admin, Rattachements, Emails, Journal, Diagnostics |

### Staff (COORDINATOR, BENEFICIARY_MANAGER, etc.)

Hamburger drawer → toutes sections visibles + items.

---

## Fichiers sources

| Fichier | Rôle |
|---|---|
| `apps/frontend/src/components/layout/nav-config.ts` | Sections, items, helpers (`getActiveSection`, `getVisibleSections`, `getDefaultLanding`) |
| `apps/frontend/src/components/layout/mobile-nav-config.ts` | Configs bottom nav par rôle (`SELLER_MOBILE_NAV`, `BUYER_MOBILE_NAV`, `ADMIN_MOBILE_NAV`) |
| `apps/frontend/src/components/layout/mobile-bottom-nav.tsx` | Composant barre bottom + sheet "Plus" + action contextuelle flottante |
| `apps/frontend/src/components/layout/sidebar.tsx` | Sidebar contextuelle desktop |
| `apps/frontend/src/components/layout/top-nav.tsx` | Top bar sections horizontale |
| `apps/frontend/src/components/layout/mobile-sidebar.tsx` | Drawer hamburger (staff) |
| `apps/frontend/src/app/(dashboard)/layout.tsx` | Assemblage : top bar + sidebar + bottom nav + main |

---

## Règles d'assemblage (`layout.tsx`)

```
Si getMobileNavConfig(role) != null (seller/buyer/admin) :
  → Hamburger masqué sur mobile
  → MobileBottomNav rendu (bottom nav + sheet)
  → main : pb-[5.5rem] sur mobile, réinitialisé à md

Si getMobileNavConfig(role) == null (staff) :
  → Hamburger visible
  → Pas de MobileBottomNav
```

---

## Détection de la section active

`getActiveSection(pathname)` : plus long préfixe `pathPrefixes` matchant le pathname courant. Fallback : `HOME_SECTION`.

Exemples :
- `/admin/users` → admin (`/admin` matche)
- `/admin/marketplace/categories` → admin (`/admin/marketplace` matche, plus long que `/admin`)
- `/seller/dashboard` → marketplace (`/seller` dans pathPrefixes via `/seller`)
- `/buyer/orders` → buyer
- `/unknown` → home (fallback)

---

## Onglet "Messages" (futur)

L'onglet Messages est visible dans la barre bottom (seller et buyer) mais rendu **désactivé** (`disabled: true` sur `MobileTab`). Dans `MobileBottomNav`, un tab désactivé est rendu comme `<span>` avec `aria-disabled="true"` et `cursor-not-allowed`. Pas de navigation, pas d'erreur 404.

Quand la feature Messages sera implémentée :
1. Retirer `disabled: true` du tab dans `mobile-nav-config.ts`
2. Vérifier que la route `/messages` existe
3. Ajouter l'action contextuelle si pertinente

---

## Principes UX appliqués (M102)

- **Progressive disclosure** : 4 items primaires visibles, reste en sheet "Plus"
- **Accueil systématique** : chaque rôle a un "home" comme premier tab (orientation)
- **Labels vernaculaires** : "Demandes" (pas "Devis/RFQ"), "Rechercher" (pas "Catalogue/Marketplace")
- **4 tabs max** : limite cognitive — au-delà, utiliser le sheet "Plus"
- **Désactivé visible** : Messages grisé communique la roadmap sans route cassée
- **WCAG** : `text-white/25` pour tabs désactivés (contraste suffisant sur fond sombre), `aria-disabled`, `title` explicatif

---

## Points en attente de validation design

| Item | Statut |
|---|---|
| Messages tab (route + design messaging) | À implémenter — route `/messages` inexistante |
| "Rechercher" buyer → page dédiée vs `/marketplace-hub` | `/marketplace-hub` utilisé en attendant |
| Admin mobile : cross-section navigation (Référentiel, Production via mobile) | Admin utilise desktop pour sections opérationnelles |
| Daily actions panel (M102 Part E) | Non implémenté — specs à préciser |
| Conditional menu items par état utilisateur (M102 Part F) | Non implémenté |
