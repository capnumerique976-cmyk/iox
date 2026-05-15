# Audit UX Mobile — IOX Navigation (M115)

**Date** : 2026-05-15
**Analysé par** : Chantier M115

---

## Problème constaté

La navigation mobile IOX (M102) utilise une bottom nav à 4 onglets + sheet "Plus".
Le sheet "Plus" affiche une liste plate de liens secondaires sans structure.
Résultat : utilisateurs peu technophiles ne trouvent pas les fonctionnalités importantes.

---

## Routes inaccessibles sur mobile (avant M115)

### Seller

| Route | Description | Impact |
|---|---|---|
| `/seller/profile/edit` | Modifier le profil vendeur | Bloquant si l'utilisateur doit modifier son profil |
| `/seller/marketplace-products/new` | Nouveau produit | Accessible seulement depuis la liste produits (contextual action), pas dans Plus |
| `/seller/marketplace-offers/new` | Nouvelle offre | Idem — contextual action uniquement |
| `/seller/profile/certifications` | Certifications | Absent de toute navigation mobile |

### Buyer

| Route | Description | Impact |
|---|---|---|
| `/buyer/payments` | Paiements à finaliser | Lien depuis daily actions mais pas depuis menu |
| `/buyer/profile/edit` | Modifier profil acheteur | Non accessible |
| `/marketplace/favorites` | Favoris produits | Non accessible |
| `/marketplace/categories` | Catégories catalogue | Non accessible |
| `/quote-requests/new` | Nouvelle demande de devis | Non accessible sans passer par le catalogue |

### Admin

| Route | Description | Impact |
|---|---|---|
| `/admin/memberships` | Rattachements user↔entreprise | Absent du secondaryItems admin |

---

## Analyse UX

### Problème 1 — Liste plate sans groupement
Le sheet "Plus" affiche N liens sans catégorie. L'utilisateur doit tout lire pour trouver ce qu'il cherche.

### Problème 2 — Pas de description
Aucune explication sur ce que fait chaque lien. Non-évident pour un vendeur agriculteur.

### Problème 3 — Fonctionnalités masquées
Plusieurs routes clés ne sont dans aucun menu mobile.

---

## Recommandation UX

1. Remplacer le sheet "Plus" par un drawer structuré par sections
2. Sections en accordéon : l'utilisateur voit les catégories, ouvre la bonne
3. Chaque item : icône + label simple + description courte
4. Renommer "Plus" en "Menu" pour indiquer l'accès complet
5. Ajouter profil, certifications, favoris, paiements aux sections
6. Ne pas dépasser 6 sections par rôle (charge cognitive)
7. Ouvrir la 1ère section par défaut (guidage)
