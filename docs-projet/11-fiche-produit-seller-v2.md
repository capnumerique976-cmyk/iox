# Fiche produit — version seller (référence canonique)

## 1. Informations principales

- Nom du produit
- Nom technique / réglementaire
- Catégorie
- Description courte
- Description détaillée
- Origine pays
- Origine région
- Localité / terroir (optionnel)

## 2. Saisonnalité

- Disponible toute l'année ? Oui / Non
- Mois de récolte
- Mois de disponibilité

## 3. Volumes

- Capacité annuelle de production
- Unité
- Volume disponible maintenant
- MOQ producteur
- MOQ offre / campagne (si différent)

## 4. Prix

- Mode de prix
  - Prix fixe
  - Sur demande
  - Variable selon volume
- Prix indicatif
- Devise
- Unité de prix

## 5. Certifications

Pour chaque certification :

- Type
- Organisme certificateur
- Numéro
- Date de validité
- Document justificatif (optionnel selon le lot)

## 6. Qualité et technique

- Spécifications techniques
- Caractéristiques qualité
- Conditions de conservation
- Durée de vie / DDM

## 7. Logistique

- Type d'emballage
- Formats disponibles
- Conditions de transport
- Délai moyen
- Marchés desservis
- Capacité export

## 8. Médias et documents

- Photo principale
- Galerie photos
- Fiche technique
- Analyse labo
- Autres documents

---

## Version admin / public côte à côte

### Côté admin

Affiche tout :

- toutes les infos seller
- certifications avec statut
- dates de validité
- documents liés
- champs internes
- statut de publication / review

### Côté public marketplace

Affiche seulement :

- nom produit
- origine
- description
- saisonnalité
- volume ou disponibilité utile
- MOQ
- prix indicatif ou "sur demande"
- certifications actives
- médias approuvés
- documents publics vérifiés

---

## Notes de mapping technique

Cette fiche se ventile sur trois entités Prisma distinctes (à confirmer côté code) :

- **`MarketplaceProduct`** : sections 1, 2, 3 (sauf MOQ offre), 5, 6, 7 (partiel structurel), 8.
- **`MarketplaceOffer`** : section 4 (prix), MOQ offre, partie commerciale de la section 7 (délai, marchés, incoterm spécifiques).
- **`SellerProfile`** : porte les capacités export globales et l'identité producteur — distinct du produit lui-même.

Le principe de **projection publique filtrée** s'applique : la vue admin = surensemble de la vue seller ; la vue publique = sous-ensemble validé/modéré de la vue seller.
