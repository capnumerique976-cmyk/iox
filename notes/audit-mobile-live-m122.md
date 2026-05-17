# Audit Mobile Live — M122

**Date :** 2026-05-17
**Session :** M122 PARTIE A/B/C
**URL testée :** https://iox.mycloud.yt
**Méthode :** Chrome MCP + CSS injection (`lg:hidden → display:flex`) pour forcer l'affichage mobile à 1470px
**Comptes :** `smoke-seller@iox.mch` / `smoke-buyer@iox.mch` (IoxSmoke2026!)

---

## 1. Résumé

| Critère | Statut |
|---------|--------|
| M120 "Mon dossier" en production | ✅ Confirmé (seller + buyer) |
| Navigation mobile Level 1 | ✅ Fonctionnelle |
| Navigation mobile Level 2 | ✅ Fonctionnelle |
| Auto-détection module actif | ✅ Correcte sur toutes les pages |
| Bottom nav rôle-spécifique | ✅ Seller ≠ Buyer |
| Données demo seller | ✅ Riches (Coopérative Vanille de Mayotte) |
| Données demo buyer | ✅ Présentes (2 demandes de devis actives) |

---

## 2. Pages testées — Vendeur/Agriculteur

| URL | Page | Module L2 actif | Résultat |
|-----|------|-----------------|----------|
| `/seller` | Tableau de bord | Accueil → Tableau de bord | ✅ |
| `/seller/marketplace-products` | Mes produits | Production → Mes produits | ✅ |
| `/seller/quote-requests` | Demandes de devis reçues | Achats → Demandes reçues | ✅ |
| `/seller/marketplace-offers` | Mes offres (4 offres) | Catalogue → Mes offres | ✅ |
| `/seller/invoices` | Factures vendeur | Distribution → Mes factures | ✅ |
| `/seller/profile/edit` | Édition profil vendeur | **Mon dossier** → Mon profil vendeur | ✅ M120 |

### Bottom nav seller
`Accueil | Produits | Demandes | Messages | Menu`

### Données demo seller
- Nom public : Coopérative Vanille de Mayotte
- Localisation : YT / Grande-Terre / Mamoudzou
- Description : Coopérative de planteurs de vanille bourbon, séchage traditionnel
- Statut profil : Approuvé et publié
- Offres : 4 (2 publiées, 2 brouillons) — Vanille pure 100%, Vanille Bourbon Mayotte Grade A
- Devis reçus : 1 (Poudre de Vanille / Acme Foods / 10 kg / Annulée)

---

## 3. Pages testées — Acheteur/Importateur

| URL | Page | Module L2 actif | Résultat |
|-----|------|-----------------|----------|
| `/buyer` | Tableau de bord | Accueil → Tableau de bord | ✅ |
| `/buyer/quote-requests` | Mes demandes de devis | Achats → Demandes envoyées | ✅ |
| `/buyer/profile/edit` | Modifier mon entreprise | **Mon dossier** → Modifier le profil | ✅ M120 |
| `/profile` | Mon profil (perso) | — | ✅ |

### Bottom nav buyer
`Accueil | Rechercher | Demandes | Messages | Menu`

### Données demo buyer
- Progression : 60 % (3/5 étapes complétées)
- Demandes : 2 en cours
  - Mangue Maya de Tsingoni — 500 kg — **Devis reçu** (en attente de décision)
  - Poudre de Vanille 100% / Coopérative Vanille de Mayotte — 10 kg — Annulée
- Action urgente : "1 réponse de vendeur à consulter"
- Entreprise : DEMO-BUYER-001, champs vides (non renseigné)

---

## 4. Anomalies identifiées

### A1 — Pas de séparateur visuel entre modules métier et liens utilitaires
**Sévérité :** ⚠️ Cosmétique
**Constat :** Dans tous les tiroirs Level 2 (Catalogue, Distribution, Mon dossier…), les items "Mon profil" et "Déconnexion" apparaissent directement sous les items métier, sans ligne de séparation visuelle.
**Impact :** L'utilisateur perçoit "Mon profil" comme un élément du module en cours, ce qui crée une confusion pour les utilisateurs terrain.
**Fix :** Ajouter un `<hr>` ou `border-t` avant les liens utilitaires dans `mobile-progressive-menu.tsx`.
**Décision M122 :** Reporté M123 (touche le composant).

### A2 — Double indicateur actif dans Mon dossier (buyer)
**Sévérité :** ⚠️ Visuel mineur
**Constat :** Sur `/buyer/profile/edit`, deux items ont le point bleu simultanément : "Mon profil acheteur" (`/buyer/profile`) ET "Modifier le profil" (`/buyer/profile/edit`).
**Cause :** `isPathActive` utilise `startsWith(href + '/')` — `/buyer/profile/edit` est prefixé par `/buyer/profile/`, donc les deux matchent.
**Fix :** Ajouter `exactMatch?: boolean` à `MobileMenuItem` + l'utiliser dans `SubItem`. OU ajouter `/buyer/profile` à `EXACT_MATCH_ROUTES` dans `mobile-nav-config.ts`.
**Décision M122 :** Reporté M123 (touche interface + composant).

### A3 — `/seller/referentiel` retourne 404
**Sévérité :** ℹ️ Informatif (non bloquant)
**Constat :** L'URL `/seller/referentiel` n'est pas routée (404). Mais aucun lien dans l'UI ne pointe vers cette URL directement — les utilisateurs naviguent vers les sous-pages (`/seller/profile/edit`, `/seller/documents`…).
**Décision M122 :** Acceptable, non bloquant pour le pilote.

### A4 — Buyer enterprise : données vides
**Sévérité :** ⚠️ Pour le pilote uniquement
**Constat :** `smoke-buyer@iox.mch` n'a pas de données d'entreprise renseignées (champs vides sur `/buyer/profile/edit`).
**Impact :** Moins percutant pour une démo live.
**Fix :** Renseigner manuellement les données avant le pilote, ou créer un compte pilote dédié.
**Décision M122 :** Documenté, à traiter avant J-pilote.

---

## 5. Bilan navigation progressive

| Feature | Résultat |
|---------|----------|
| Level 1 → Level 2 (click module) | ✅ |
| Level 2 → Level 1 (bouton ←) | ✅ |
| Auto-ouverture Level 2 si déjà dans module | ✅ (direct jump au bon module) |
| Fermeture drawer (Escape / clic extérieur) | ✅ |
| Badge numérique sur modules | ✅ (visible sur Production) |
| Label "Mon dossier" (M120) | ✅ Seller + Buyer + partout |

---

## 6. Verdict

**Navigation mobile : OPÉRATIONNELLE.**
Parcours vendeur et acheteur complets testés. Aucune régression fonctionnelle.
M120 confirmé en production.
