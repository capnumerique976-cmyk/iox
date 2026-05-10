# Contexte canonique IOX — Marketplace / Fiche producteur

> **Document canonique de référence.** À citer (intégralement ou en extraits) en tête de chaque prompt Claude Code, chaque revue de code et chaque spécification touchant à la marketplace IOX. Toute formulation différente doit s'aligner sur celui-ci.

## Architecture métier marketplace actuelle

- La marketplace IOX n'est pas un simple catalogue ; elle repose sur un backend NestJS + Prisma déjà avancé, avec workflows seller/admin/public, review queue, projection publique filtrée et RFQ.
- Les entités marketplace cœur sont distinctes :
  - `SellerProfile` = identité vendeur / producteur
  - `MarketplaceProduct` = fiche produit structurelle
  - `MarketplaceOffer` = paramètres commerciaux / listing
  - `MarketplaceDocument` = documents liés
  - `MediaAsset` = médias
- `MarketplaceProduct` et `MarketplaceOffer` NE SONT PAS la même chose :
  - Product = ce qu'est le produit
  - Offer = comment il est vendu maintenant (prix, disponibilité, incoterm, lead time, etc.)

## Projection publique

- La marketplace publique fonctionne par projection filtrée, pas par exposition brute des données internes.
- Sans être connecté, un visiteur peut voir uniquement :
  - catalogue public
  - fiche produit publique
  - médias approuvés
  - documents publics vérifiés
  - données seller/product explicitement projetées comme publiques
- Ne doivent jamais fuiter publiquement :
  - contenu non approuvé
  - documents rejetés / expirés / non publics
  - médias rejetés
  - notes internes
  - données admin/seller non projetées

## Statuts

- Il faut distinguer deux couches de statuts :

1. Statuts marketplace éditoriaux / publication :
   - ex. `DRAFT`, `IN_REVIEW`, `APPROVED`, `PUBLISHED`
   - ils décrivent l'état de la fiche / du contenu dans le workflow marketplace

2. Statuts métier internes MCH / market release :
   - ex. `not_released`, `released`, `blocked`
   - ils décrivent l'éligibilité métier / conformité interne

- Ces deux couches ne doivent pas être confondues.
- Une fiche peut être correcte dans son workflow marketplace mais non publiable si les gates métier internes ne sont pas remplies.

## Conventions de nommage

- `Lot X` = chantier transverse ou macro-lot plateforme
- `FP-X` = sous-série dédiée à la fiche producteur / fiche produit marketplace
- Les FP-x ne remplacent pas les Lots ; ce sont deux conventions parallèles.

## État réel actuel du VPS de test

- Le VPS de test `https://iox.mycloud.yt/` fait déjà tourner :
  - modules métier IOX
  - dashboard
  - admin marketplace
  - review queue
  - documents marketplace
  - publication marketplace
  - catalogue public
  - fiche produit publique
  - seller dashboard au moins partiellement
  - RFQ
- Donc la marketplace existe déjà réellement, mais certaines surfaces seller restent incomplètes.

## Définition du rôle seller

- Le `seller` dans les travaux marketplace est un rôle marketplace dédié à la publication commerciale.
- Il ne faut pas l'assimiler automatiquement à un "bénéficiaire terrain" MCH.
- Il peut être relié à la donnée métier existante, mais conceptuellement :
  - seller = acteur marketplace
  - beneficiary terrain = autre logique métier potentiellement liée

## Principes d'implémentation à respecter

- approche chirurgicale
- migrations Prisma additives, non destructives
- pas de refacto large opportuniste
- préserver les workflows seller/admin/public existants
- préserver la CI
- penser systématiquement seller/admin/public lors de toute évolution marketplace
- ne pas exposer publiquement plus que la projection filtrée prévue

## Règle d'explicitation obligatoire

Quand tu proposes un modèle ou un lot, tu dois toujours expliciter :

- quels champs relèvent de `SellerProfile`
- quels champs relèvent de `MarketplaceProduct`
- quels champs relèvent de `MarketplaceOffer`
- ce qui est public
- ce qui reste seller/admin only
- comment cela s'articule avec les statuts marketplace et les gates métier internes
