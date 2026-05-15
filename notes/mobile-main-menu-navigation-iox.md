# Navigation Mobile IOX — Principe M115

**Date** : 2026-05-15
**Mandat** : M115

---

## Problème utilisateur

Après M102, la navigation mobile est simple mais incomplète.
Les fonctionnalités importantes (profil, certifications, paiements, favoris)
ne sont accessibles que sur desktop.
Les utilisateurs agriculteurs/artisans abandonnent sur mobile.

---

## Principe retenu

Architecture à 3 niveaux :

```
Niveau 1 — Bottom nav (4 onglets + Menu)
  → Actions fréquentes. Toujours visibles.

Niveau 2 — Menu principal (drawer bottom sheet)
  → Accès complet. Sections accordéon.

Niveau 3 — Sous-menus par section
  → Items groupés. Description courte.
```

---

## Bottom nav vs Menu principal

| Bottom nav | Menu principal |
|---|---|
| 4 onglets fréquents + Menu | Toutes les fonctionnalités |
| Accès immédiat, 1 tap | Accès 2 taps (Menu → Section) |
| Inchangé (tests verts) | Nouveau drawer accordéon |
| Icônes + labels courts | Labels clairs + descriptions |

---

## Structure seller

Bottom nav : Accueil / Produits / Demandes / Messages(désactivé) / Menu

Menu sections :
1. **Mes produits** (ouverte par défaut) — produits, offres, créer
2. **Mes demandes** (fermée) — devis reçus, note messages
3. **Documents** (fermée) — documents, certifications
4. **Conformité** (fermée) — statut
5. **Paiements et factures** (fermée) — factures, paiements
6. **Mon compte** (fermée) — profil edit, statistiques

---

## Structure buyer

Bottom nav : Accueil / Rechercher / Demandes / Messages(désactivé) / Menu

Menu sections :
1. **Rechercher** (ouverte) — catalogue, favoris, catégories
2. **Mes demandes** (fermée) — nouvelle demande, toutes les demandes
3. **Paiements** (fermée) — à finaliser, commandes
4. **Factures** (fermée) — mes factures
5. **Mon compte** (fermée) — profil, modifier profil, préférences

---

## Structure admin

Bottom nav : Tableau / Revue / Vendeurs / Utilisateurs / Menu

Menu sections :
1. **À traiter** (ouverte) — documents, médias, vendeurs en attente
2. **Utilisateurs** (fermée) — users, rattachements
3. **Marketplace** (fermée) — catégories, RFQ, conformité
4. **Exploitation** (fermée) — KPI, audit, diagnostics, emails

---

## Routes couvertes

### Seller
`/seller`, `/seller/marketplace-products`, `/seller/marketplace-products/new`,
`/seller/marketplace-offers`, `/seller/marketplace-offers/new`,
`/seller/quote-requests`, `/seller/documents`, `/seller/compliance`,
`/seller/invoices`, `/seller/payments`, `/seller/profile/edit`,
`/seller/profile/certifications`, `/seller/analytics`

### Buyer
`/buyer`, `/marketplace-hub`, `/marketplace/favorites`, `/marketplace/categories`,
`/quote-requests/new`, `/buyer/quote-requests`, `/buyer/payments`,
`/buyer/orders`, `/buyer/invoices`, `/buyer/profile`, `/buyer/profile/edit`,
`/buyer/preferences`

### Admin
`/admin`, `/admin/review-queue`, `/admin/media-moderation`, `/admin/sellers`,
`/admin/users`, `/admin/memberships`, `/admin/marketplace/categories`,
`/admin/rfq`, `/admin/compliance`, `/admin/kpi`, `/admin/audit-logs`,
`/admin/diagnostics`, `/admin/notif-email/logs`

---

## Décisions UX

| Question | Décision | Raison |
|---|---|---|
| Accordion ou page séparée ? | Accordion dans Sheet | Pas de rupture de contexte, 0 dépendance lourde |
| Sections ouvertes par défaut ? | Première section ouverte | Guide l'utilisateur vers l'essentiel |
| Nombre max sections ? | 6 | Au-delà = surcharge cognitive |
| "Plus" ou "Menu" ? | "Menu" | Plus intuitif pour un non-technophile |
| Route /messages ? | Désactivée + note explicative | Route non prête (M58) |

---

## Limites

| Élément | État | Suite |
|---|---|---|
| Route `/messages` | Désactivée, note dans Mes demandes | Activer quand route prête |
| Badges dynamiques sur sections | Non implémentés | Passer `badge` depuis daily actions via context |
| Animations accordéon | Transition simple | Améliorer si besoin UX |
| Admin : Swagger | Non exposé mobile | Outil dev, pas besoin mobile |
