# Scénario Pilote — Ferme / Coopérative

**Date :** 2026-05-17
**Mandat :** M122
**Contexte :** Premier pilote terrain IOX avec un vendeur réel (agriculteur/coopérative) et un acheteur réel (importateur/distributeur)
**URL :** https://iox.mycloud.yt

---

## 1. Profil des participants cibles

### Vendeur — Agriculteur / Coopérative
- Producteur local (vanille, mangue, épices…)
- Peu à l'aise avec le numérique
- Smartphone Android ou iPhone, connexion 4G
- Pas de formation préalable IOX

### Acheteur — Importateur / Distributeur
- Structure professionnelle (import, restauration, épicerie fine)
- Habitué aux outils professionnels
- Objectif : sourcer des produits locaux certifiés

---

## 2. Comptes de démonstration disponibles

| Rôle | Email | Mot de passe | État |
|------|-------|-------------|------|
| Vendeur | `smoke-seller@iox.mch` | `IoxSmoke2026!` | ✅ Profil riche (Coopérative Vanille de Mayotte) |
| Acheteur | `smoke-buyer@iox.mch` | `IoxSmoke2026!` | ✅ 2 demandes actives, progression 60% |

**Données vendor riches :**
- Nom : Coopérative Vanille de Mayotte
- Localisation : Mamoudzou, Grande-Terre (YT)
- Description : planteurs de vanille bourbon, récolte mature, séchage traditionnel
- 4 offres (2 publiées) — Vanille pure 100%, Vanille Bourbon Mayotte Grade A

**Données buyer :**
- 1 devis reçu en attente de décision (Mangue de Tsingoni, 500 kg)
- 1 demande annulée (Vanille, 10 kg)
- Enterprise : à renseigner avant pilote (champs vides)

---

## 3. Parcours vendeur (mobile, ~15 min)

### Étape 1 — Connexion
1. Ouvrir `https://iox.mycloud.yt` sur mobile
2. Saisir `smoke-seller@iox.mch` / `IoxSmoke2026!`
3. Vérifier : arrivée sur tableau de bord vendeur ← **point de validation**

### Étape 2 — Découvrir le tableau de bord
4. Observer : progression, actions en attente, résumé
5. Ouvrir le menu (bouton "Menu" en bas)
6. Observer les modules : Accueil, Mon dossier, Production, Achats, Catalogue, Distribution
7. ← **question pilote : "Est-ce que vous comprenez à quoi sert chaque section ?"**

### Étape 3 — Mon dossier (profil vendeur)
8. Taper sur "Mon dossier" dans le menu
9. Taper sur "Mon profil vendeur"
10. Observer le profil Coopérative Vanille de Mayotte, statut "Approuvé"
11. ← **point de validation : label "Mon dossier" compris ?**

### Étape 4 — Voir ses produits
12. Ouvrir le menu → Production → Mes produits
13. Observer : liste des produits avec photos/descriptions
14. Taper sur un produit pour voir le détail
15. ← **question pilote : "Pouvez-vous trouver où ajouter un nouveau produit ?"**

### Étape 5 — Voir les demandes reçues
16. Taper sur "Demandes" dans la barre du bas (ou Menu → Achats)
17. Observer : demande Poudre de Vanille / Acme Foods / 10 kg / Annulée
18. ← **question pilote : "Que signifie le statut 'Annulée' ?"**

### Étape 6 — Voir ses offres (Catalogue)
19. Menu → Catalogue → Mes offres
20. Observer : 4 offres listées (2 publiées, 2 brouillons)
21. ← **point de validation : distinction publiée/brouillon claire ?**

---

## 4. Parcours acheteur (mobile, ~10 min)

### Étape 1 — Connexion
1. Déconnecter le compte vendeur (Menu → Déconnexion)
2. Se connecter : `smoke-buyer@iox.mch` / `IoxSmoke2026!`
3. Vérifier : tableau de bord acheteur, progression 60%

### Étape 2 — Voir ses demandes
4. Taper sur "Demandes" dans la barre du bas
5. Observer : 2 demandes (Mangue Tsingoni en attente, Vanille annulée)
6. Taper sur la demande "Mangue Maya" → statut "Devis reçu"
7. ← **question pilote : "Savez-vous quoi faire maintenant avec ce devis ?"**

### Étape 3 — Explorer le catalogue
8. Menu → Catalogue ou bouton "Rechercher" (barre du bas)
9. Parcourir les vendeurs disponibles
10. ← **question pilote : "Comment trouveriez-vous un fournisseur de mangue ?"**

### Étape 4 — Mon dossier acheteur
11. Menu → Mon dossier → Modifier le profil
12. Observer : formulaire entreprise (DEMO-BUYER-001, champs vides)
13. ← **note : renseigner avant le vrai pilote**

---

## 5. Points de friction anticipés

| Point | Risque | Mitigation |
|-------|--------|------------|
| "Mon profil" vs "Mon dossier" | Confusion si l'user cherche le profil dans "Mon dossier" | Expliquer : Mon dossier = profil métier public, Mon profil = compte perso |
| "Mon profil" et "Déconnexion" dans le tiroir | User peut cliquer Déconnexion par erreur | ⚠️ Prévoir l'explication (fix prévu M123) |
| Champs enterprise buyer vides | Profil incomplet visible | Renseigner avant pilote |
| Connexion 4G / lenteur VPS | Temps de chargement | Tester depuis réseau local si possible |
| Terminologie "Brouillon" / "Publié" | Peut être confus | Préparer explication courte |

---

## 6. Questions pilote (feedback UX)

À poser après chaque module :
1. "C'est clair ou vous auriez besoin d'aide ?"
2. "Le nom 'Mon dossier' vous parle ?"
3. "Vous retrouveriez facilement cette page seul(e) ?"
4. "Qu'est-ce qui manque sur cette page ?"
5. "Préférez-vous utiliser ça sur téléphone ou ordinateur ?"

---

## 7. Prérequis avant pilote

- [ ] Renseigner les données enterprise de `smoke-buyer@iox.mch`
- [ ] Vérifier que `iox.mycloud.yt` est accessible depuis réseau mobile
- [ ] Tester sur vrai appareil mobile (pas Chrome desktop émulé)
- [ ] Préparer compte pilote dédié si données smoke insuffisantes
- [ ] Briefer le facilitateur sur les 2 points de friction principaux
