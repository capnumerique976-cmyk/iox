# Audit Parité Mobile / Desktop IOX — M117

**Date :** 2026-05-16
**Scope :** MARKETPLACE_SELLER, MARKETPLACE_BUYER, ADMIN

---

## Méthode

Source de vérité desktop : `nav-config.ts` — `SECTIONS` + items de chaque section.
Source mobile : `mobile-nav-config.ts` (bottom nav) + `mobile-menu-config.ts` (drawer).

`getVisibleSections(role)` détermine ce que chaque rôle voit sur desktop :
- `MARKETPLACE_SELLER` → section `marketplace` uniquement
- `MARKETPLACE_BUYER` → section `buyer` uniquement
- `ADMIN` → TOUTES les sections (referentiel, production, buyer, marketplace, distribution, admin)

---

## Matrice — MARKETPLACE_SELLER

Desktop section `marketplace` items :

| Route | Label desktop | Desktop | Mobile M116B | Mobile M117 | Accessible par | Manquant | Commentaire |
|-------|--------------|---------|--------------|-------------|---------------|----------|-------------|
| `/marketplace-hub` | Vue d'ensemble | ✅ | ❌ | ✅ | Catalogue → Vue d'ensemble marché | Ajouté M117 | Section landing desktop |
| `/seller/dashboard` | Mon espace vendeur | ✅ | ✅ | ✅ | Accueil → Tableau de bord | — | |
| `/seller/quote-requests` | Demandes de devis | ✅ | ✅ | ✅ | Achats → Demandes reçues | — | |
| `/seller/analytics` | Analytique | ✅ | ✅ | ✅ | Catalogue → Statistiques | — | |
| `/seller/marketplace-products` | Mes produits | ✅ | ✅ | ✅ | Production → Mes produits | — | |
| `/seller/marketplace-offers` | Mes offres | ✅ | ✅ | ✅ | Catalogue → Mes offres | — | |
| `/seller/documents` | Mes documents | ✅ | ✅ | ✅ | Référentiel → Mes documents | — | |
| `/seller/compliance` | Ma conformité | ✅ | ✅ | ✅ | Référentiel → Conformité | — | |
| `/seller/payments` | Paiements | ✅ | ✅ | ✅ | Distribution → Paiements | — | |
| `/seller/invoices` | Mes factures | ✅ | ✅ | ✅ | Distribution → Mes factures | — | |

Routes supplémentaires en mobile M117 (non dans desktop nav mais existantes) :

| Route | Module | Statut |
|-------|--------|--------|
| `/seller/profile/edit` | Référentiel | ✅ mobile only (non dans desktop nav — accessible via sidebar `/profile`) |
| `/seller/profile/certifications` | Référentiel | ✅ mobile only |
| `/seller/marketplace-products/new` | Production | ✅ mobile (action contextuelle bottom nav aussi) |
| `/seller/marketplace-offers/new` | Catalogue | ✅ mobile (action contextuelle bottom nav aussi) |

Routes inexistantes mentionnées dans le mandat :
- `/seller/traceability` — route non créée → exclue
- `/seller/media` — route non créée → exclue (médias via pages produit `/seller/marketplace-products/[id]`)
- `/messages` — non implémenté → onglet bottom nav disabled

**Verdict seller : ✅ Parité atteinte en M117.** Manquait `/marketplace-hub`. Corrigé.

---

## Matrice — MARKETPLACE_BUYER

Desktop section `buyer` items :

| Route | Label desktop | Desktop | Mobile M116B | Mobile M117 | Module mobile | Manquant |
|-------|--------------|---------|--------------|-------------|--------------|----------|
| `/buyer` | Mon espace acheteur | ✅ | ✅ | ✅ | Accueil | — |
| `/buyer/quote-requests` | Mes demandes de devis | ✅ | ✅ | ✅ | Achats | — |
| `/buyer/orders` | Mes commandes | ✅ | ✅ | ✅ | Distribution | — |
| `/buyer/invoices` | Mes factures | ✅ | ✅ | ✅ | Distribution | — |
| `/buyer/preferences` | Préférences | ✅ | ✅ | ✅ | Référentiel | — |
| `/buyer/profile` | Profil entreprise | ✅ | ✅ | ✅ | Référentiel | — |

Routes buyer supplémentaires (non dans desktop nav buyer) :

| Route | Module mobile | Statut |
|-------|--------------|--------|
| `/buyer/profile/edit` | Référentiel | ✅ mobile |
| `/quote-requests/new` | Achats | ✅ mobile |
| `/buyer/payments` | Achats + Distribution | ✅ mobile (dupliqué intentionnel : Achats pour finaliser, Distribution pour historique) |
| `/marketplace-hub` | Catalogue | ✅ mobile (buyer browse marketplace) |
| `/marketplace/categories` | Catalogue | ✅ mobile |
| `/marketplace/favorites` | Catalogue | ✅ mobile |

**Verdict buyer : ✅ Parité atteinte dès M116B.** M117 ajoute `/buyer/payments` dans Achats (paiements à finaliser).

---

## Matrice — ADMIN

Desktop : admin voit TOUTES sections (`getVisibleSections(ADMIN) = SECTIONS`).

### Section admin (routes `/admin/*`) :

| Route | Desktop | M116B | M117 | Module |
|-------|---------|-------|------|--------|
| `/admin` | ✅ | ✅ | ✅ | Accueil |
| `/admin/users` | ✅ | ✅ | ✅ | Référentiel |
| `/admin/memberships` | ✅ | ✅ | ✅ | Référentiel |
| `/admin/sellers` | ✅ | ✅ | ✅ | Référentiel |
| `/admin/compliance` | ✅ | ✅ | ✅ | Distribution |
| `/admin/review-queue` | ✅ | ✅ | ✅ | Production |
| `/admin/rfq` | ✅ | ✅ | ✅ | Achats |
| `/admin/diagnostics` | ✅ | ✅ | ✅ | Administration |
| `/admin/audit-logs` | ✅ | ✅ | ✅ | Administration |
| `/admin/notif-email/logs` | ✅ | ✅ | ✅ | Administration |
| `/admin/kpi` | ✅ | ✅ | ✅ | Distribution |
| `/admin/media-moderation` | ✅ | ✅ | ✅ | Production |
| `/admin/marketplace/categories` | ✅ | ✅ | ✅ | Catalogue |

### Section referentiel (routes staff) :

| Route | Desktop admin | M116B | M117 | Module |
|-------|--------------|-------|------|--------|
| `/dashboard` | ✅ (HOME_SECTION) | ❌ | ✅ | Accueil | Ajouté M117 |
| `/beneficiaries` | ✅ | ❌ | ✅ | Référentiel | Ajouté M117 |
| `/companies` | ✅ | ❌ | ✅ | Référentiel | Ajouté M117 |
| `/supply-contracts` | ✅ | ❌ | ✅ | Référentiel | Ajouté M117 |
| `/products` | ✅ | ❌ | ✅ | Référentiel | Ajouté M117 |

### Section production (routes staff) :

| Route | Desktop admin | M116B | M117 | Module |
|-------|--------------|-------|------|--------|
| `/inbound-batches` | ✅ | ❌ | ✅ | Production | Ajouté M117 |
| `/transformation-operations` | ✅ | ❌ | ✅ | Production | Ajouté M117 |
| `/product-batches` | ✅ | ❌ | ✅ | Production | Ajouté M117 |
| `/label-validations` | ✅ | ❌ | ✅ | Production | Ajouté M117 |
| `/traceability` | ✅ | ❌ | ✅ | Production | Ajouté M117 |
| `/market-release-decisions` | ✅ | ❌ | ✅ | Production | Ajouté M117 |

### Section distribution (routes staff) :

| Route | Desktop admin | M116B | M117 | Module |
|-------|--------------|-------|------|--------|
| `/distributions` | ✅ | ❌ | ✅ | Distribution | Ajouté M117 |
| `/incidents` | ✅ | ❌ | ✅ | Distribution | Ajouté M117 |
| `/documents` | ✅ | ❌ | ✅ | Distribution | Ajouté M117 |

### Routes mentionnées dans le mandat sans route existante :

| Route mentionnée | Existence | Décision |
|-----------------|-----------|---------|
| `/admin/buyers` | ❌ inexistante | Exclue — pas de page buyers admin |
| `/admin/marketplace-products` | ❌ inexistante | Exclue — admin gère via `/admin/review-queue` |
| `/admin/marketplace-offers` | ❌ inexistante | Exclue |
| `/admin/invoices` | ❌ inexistante | Exclue |
| `/admin/payments` | ❌ inexistante | Exclue |
| `/admin/queues` | ❌ inexistante | Exclue — jobs/files non implémentés |
| `/admin/monitoring` | ❌ inexistante | Exclue — couvert par `/admin/diagnostics` |
| Swagger API | interne Docker | Exclue — non exposée via Next.js |

**Verdict admin : ✅ Parité atteinte en M117.** 14 routes staff manquantes corrigées.

---

## Résumé des écarts et corrections

| Écart | Rôle | Présent M116B | Corrigé M117 |
|-------|------|--------------|--------------|
| `/marketplace-hub` manquant | Seller | ❌ | ✅ |
| `/dashboard` manquant | Admin | ❌ | ✅ |
| `/beneficiaries`, `/companies`, `/supply-contracts`, `/products` | Admin | ❌ | ✅ |
| `/inbound-batches`, `/transformation-operations`, `/product-batches`, `/label-validations`, `/traceability`, `/market-release-decisions` | Admin | ❌ | ✅ |
| `/distributions`, `/incidents`, `/documents` | Admin | ❌ | ✅ |
| Navigation progressive (UX) | Tous | ❌ accordéons plats | ✅ niveau 1 → niveau 2 |

---

## Routes exclues et justification

| Route | Justification |
|-------|--------------|
| `/messages` | Route non implémentée — onglet disabled en bottom nav |
| `/seller/traceability` | Route inexistante |
| `/admin/buyers` | Route inexistante |
| `/admin/invoices`, `/admin/payments` | Routes inexistantes |
| `/admin/queues`, `/admin/monitoring` | Routes inexistantes |
| Swagger, interfaces internes | Non exposées via Next.js public routing |
| Pages détail (`[id]`) | Navigation items — accessibles depuis les listes |
| Callbacks Stripe (`/refresh`, `/return`, `/cancel`) | Routes techniques, pas de navigation intentionnelle |
