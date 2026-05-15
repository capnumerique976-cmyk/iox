# Handoff — Mandat 102 : Navigation UX (Mobile + Desktop)

**Date** : 2026-05-15
**Commit** : `f6a630d` feat(nav): M102 — navigation mobile 4 tabs + admin bottom nav
**Branche** : main

---

## Ce qui a été fait

### 1. Audit navigation existante

Audit complet du code de navigation :
- 7 sections (Accueil + 6), 44 items total dans `nav-config.ts`
- SELLER mobile : 3 onglets (Produits, Devis, Tableau) + Plus
- BUYER mobile : 3 onglets (Devis, Commandes, Factures) + Plus
- Admin : aucune bottom nav (hamburger uniquement)
- 3 pages admin sans entrée nav : `/admin/kpi`, `/admin/media-moderation`, `/admin/marketplace/categories`

### 2. nav-config.ts — 3 items admin ajoutés

```
/admin/kpi                      → KPIs (BarChart3)
/admin/media-moderation         → Modération médias (Image)
/admin/marketplace/categories   → Catégories (Layers)
```

pathPrefixes admin enrichi : `/admin/marketplace` ajouté (avant `/admin`) pour que la détection de section fonctionne sur les routes marketplace admin.

### 3. mobile-nav-config.ts — refonte configs

**SELLER** : 3 → 4 onglets primaires
- `home` : Accueil → `/seller/dashboard` (était "Tableau", label jargon)
- `products` : Produits → `/seller/marketplace-products` (inchangé)
- `quotes` : Demandes → `/seller/quote-requests` (était "Devis", jargon simplifié)
- `messages` : Messages → `/messages` (disabled — futur messaging)

Items secondaires : Analytique, Offres, Documents, Conformité, Paiements, Factures

**BUYER** : 3 → 4 onglets primaires
- `home` : Accueil → `/buyer` (nouveau)
- `search` : Rechercher → `/marketplace-hub` (nouveau)
- `quotes` : Demandes → `/buyer/quote-requests` (était "Devis")
- `messages` : Messages → `/messages` (disabled — futur messaging)

Items secondaires : Commandes, Factures, Préférences, Mon entreprise (Commandes + Factures déplacés depuis primaire)

**ADMIN** : config mobile créée (était null)
- Primary : Tableau (`/admin`), Revue (`/admin/review-queue`), Vendeurs (`/admin/sellers`), Utilisateurs (`/admin/users`)
- Secondaire (Plus) : KPIs, Conformité, Médias, Catégories, Devis admin, Rattachements, Emails, Journal, Diagnostics

`getMobileNavConfig` : ajout du cas `UserRole.ADMIN → ADMIN_MOBILE_NAV`

### 4. mobile-bottom-nav.tsx — support disabled

Nouveau rendu pour `tab.disabled === true` :
```tsx
<span aria-disabled="true" title="Bientôt disponible" className="...text-white/25 cursor-not-allowed">
```
Tab non-cliquable, grisé, accessible (`aria-disabled`, `title`).

### 5. Tests — 69/69 verts

`mobile-nav-config.test.ts` intégralement mis à jour :
- SELLER : 4 onglets, labels/routes nouveaux, messages disabled
- BUYER : 4 onglets, labels/routes nouveaux, messages disabled
- ADMIN : section de tests complète (4 onglets, secondaires, intégrité)
- Limite UX : 3 tests `≤4 tabs` par rôle

---

## Ce qui reste (M102 Parts E, F)

| Part | Contenu | Statut |
|---|---|---|
| Part E | Daily actions panel par rôle | Non implémenté — specs manquantes |
| Part F | Conditional menu by user state | Non implémenté — logique métier à définir |
| Messages | Route `/messages` + design | Feature inexistante — tab disabled pour l'instant |
| "Rechercher" buyer | Page catalogue dédiée | `/marketplace-hub` utilisé en proxy |
| Admin cross-section mobile | Navigation hors admin/* sur mobile | Mobile admin = admin pages uniquement |

---

## Fichiers modifiés

```
apps/frontend/src/components/layout/nav-config.ts           (+3 admin items, +2 imports)
apps/frontend/src/components/layout/mobile-nav-config.ts    (refonte complète)
apps/frontend/src/components/layout/mobile-bottom-nav.tsx   (+disabled tab support)
apps/frontend/src/components/layout/mobile-nav-config.test.ts (69 tests vs 42 avant)
notes/navigation-mobile-desktop-iox.md                      (nouveau — architecture doc)
```

---

## Pour reprendre

```bash
# Voir l'état de la nav actuelle
cat notes/navigation-mobile-desktop-iox.md

# Lancer les tests de navigation
pnpm --filter @iox/frontend test -- src/components/layout/

# Implémenter Messages (Part future)
# 1. Créer la feature messaging
# 2. Retirer disabled: true sur les tabs 'messages' dans mobile-nav-config.ts
# 3. Vérifier route /messages accessible

# Implémenter Daily Actions Panel (Part E)
# Voir section "Points en attente" dans navigation-mobile-desktop-iox.md
```
