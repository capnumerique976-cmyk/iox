# Menu Principal Métier Mobile IOX — M116B

## 1. Problème initial

Après M115, IOX disposait d'un bouton "Menu" et d'un drawer Sheet avec des sections **feature-based** (Mes produits, Mes demandes, Documents, Paiements...). Cette organisation reflétait les écrans techniques, pas les modules métier attendus par les utilisateurs.

Les agriculteurs et acheteurs ne se repèrent pas dans une liste de features techniques. Ils pensent en termes de flux métier : "je veux gérer ma production", "je cherche à acheter".

## 2. Différence M115 → M116B

| Aspect | M115 | M116B |
|--------|------|-------|
| Organisation | Feature-based (Produits / Demandes / Documents) | Module métier (Accueil / Référentiel / Production / Achats / Catalogue / Distribution / Administration) |
| Nombre sections | 6 sections par rôle | 6–7 modules selon le rôle |
| Descriptions modules | Absentes | Chaque module a une description courte |
| Composant drawer | Inchangé | Description section affichée (minor) |
| Bottom nav | Inchangée | Inchangée |

## 3. Architecture retenue

```
Bottom nav (4 tabs fixes par rôle)
└── Bouton "Menu" → Sheet drawer
    └── 7 modules métier (accordéons)
        └── Sous-liens par module
```

**Fichiers modifiés :**
- `components/layout/mobile-menu-config.ts` — config restructurée (source de données pure)
- `components/layout/mobile-bottom-nav.tsx` — affichage `section.description` (minor)
- `components/layout/mobile-menu-config.test.ts` — tests réécrits M116B

**Fichiers inchangés :**
- `components/layout/mobile-nav-config.ts` — bottom nav tabs
- `components/layout/mobile-sidebar.tsx` — sidebar desktop

## 4. Les 7 modules métier

| # | Module | ID | Description |
|---|--------|----|-------------|
| 1 | Accueil | `home` | Vos actions du jour et votre tableau de bord. |
| 2 | Référentiel | `referentiel` | Vos profils, documents et données de base. |
| 3 | Production | `production` | Vos produits, lots et médias. |
| 4 | Achats | `achats` | Demandes, devis et commandes. |
| 5 | Catalogue | `catalogue` | Recherche, offres et catégories. |
| 6 | Distribution | `distribution` | Factures, paiements et suivi. |
| 7 | Administration | `administration` | Contrôle, modération et exploitation. |

## 5. Mapping Seller (6 modules)

Administration : **cachée**. Jamais de route admin exposée.

| Module | Routes |
|--------|--------|
| Accueil | `/seller/dashboard` |
| Référentiel | `/seller/profile/edit`, `/seller/documents`, `/seller/profile/certifications`, `/seller/compliance` |
| Production | `/seller/marketplace-products`, `/seller/marketplace-products/new` |
| Achats | `/seller/quote-requests` |
| Catalogue | `/seller/marketplace-offers`, `/seller/marketplace-offers/new`, `/seller/analytics` |
| Distribution | `/seller/invoices`, `/seller/payments` |

## 6. Mapping Buyer (5 modules)

Production + Administration : **cachées**. Pas de route seller ni admin.

| Module | Routes |
|--------|--------|
| Accueil | `/buyer` |
| Référentiel | `/buyer/profile`, `/buyer/profile/edit`, `/buyer/preferences` |
| Achats | `/quote-requests/new`, `/buyer/quote-requests` |
| Catalogue | `/marketplace-hub`, `/marketplace/categories`, `/marketplace/favorites` |
| Distribution | `/buyer/payments`, `/buyer/orders`, `/buyer/invoices` |

## 7. Mapping Admin (7 modules complets)

| Module | Routes |
|--------|--------|
| Accueil | `/admin` |
| Référentiel | `/admin/users`, `/admin/sellers`, `/admin/memberships` |
| Production | `/admin/review-queue`, `/admin/media-moderation` |
| Achats | `/admin/rfq` |
| Catalogue | `/admin/marketplace/categories` |
| Distribution | `/admin/compliance`, `/admin/kpi` |
| Administration | `/admin/audit-logs`, `/admin/diagnostics`, `/admin/notif-email/logs` |

## 8. Routes couvertes vs futures

### Couvertes (M116B)
Toutes les routes listées ci-dessus existent et sont testées en build Next.js.

### Futures (documentées, non liées)
- `/messages` — messagerie temps réel (non implémentée)
- `/seller/traceability` — traçabilité lot à lot (non implémentée)
- `/admin/queues` — gestion files attente (non implémentée)
- Routes livraison/transport physique — non dans le scope actuel

## 9. Décisions UX

| Décision | Choix | Raison |
|----------|-------|--------|
| Accueil ouvert par défaut | Oui | L'utilisateur voit immédiatement l'entrée vers son tableau de bord |
| Tous les autres modules fermés | Oui | Évite d'afficher une liste interminable sur mobile |
| Administration cachée pour seller/buyer | Oui | Sécurité — jamais de route admin exposée aux non-admins |
| Production cachée pour buyer | Oui | Aucune route production pertinente pour un acheteur |
| Descriptions sur les sections | Oui | Aide les agriculteurs à comprendre les modules sans ouvrir |
| Labels simples sans jargon | Oui | RFQ → "Demandes", dashboard → "Tableau de bord" |

## 10. Limites

- Le module "Distribution" pour admin couvre conformité + KPI, car il n'y a pas de routes de distribution admin stricto sensu.
- "Achats" pour seller représente les réponses aux RFQ entrants — le terme peut sembler contre-intuitif mais reste cohérent avec la structure des 7 modules.
- Un seul item dans certains modules (Achats/seller, Catalogue/admin) — acceptable pour maintenir la cohérence structurelle.

## 11. Suite recommandée

- **M116C** : Ajouter badge de comptage sur les modules avec alertes (ex: nombre de demandes en attente sur "Achats").
- **M116D** : Auto-ouvrir le module actif lorsque l'utilisateur ouvre le Menu depuis une sous-page.
- **Futur** : Module messagerie une fois `/messages` implémenté.
