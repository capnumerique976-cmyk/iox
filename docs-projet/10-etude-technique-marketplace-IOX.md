# Étude technique — Marketplace IOX

## 1. Objet

Cette étude technique décrit l'architecture, le périmètre fonctionnel, l'état d'avancement, les choix de conception et la trajectoire d'évolution de la marketplace IOX.

L'objectif de la marketplace est de permettre à des producteurs / vendeurs de publier des profils, des produits, des offres et des pièces justificatives, afin de les rendre visibles à des acheteurs dans un catalogue public ou semi-public, avec modération, contrôle de conformité et projection publique maîtrisée.

Cette étude couvre :

- l'architecture actuelle
- les composants métier existants
- les flux seller / admin / public
- les limites connues
- les évolutions engagées sur la fiche producteur et la fiche produit
- la feuille de route technique recommandée

## 2. Contexte

La marketplace IOX n'est pas un simple catalogue statique. Elle s'inscrit dans une plateforme métier plus large, qui gère déjà :

- les bénéficiaires
- les entreprises
- les produits
- les lots entrants
- les transformations
- les lots finis
- les validations
- les décisions de mise sur le marché
- les distributions
- les incidents
- les documents
- les workflows de revue

La marketplace vient s'appuyer sur ce socle existant pour exposer, dans un cadre contrôlé, des vendeurs, des produits et des offres à vocation commerciale.

La logique retenue n'est donc pas celle d'un site e-commerce grand public, mais celle d'une place de marché B2B gouvernée, avec :

- contrôle d'accès
- statuts
- modération
- exigences documentaires
- publication conditionnelle
- traçabilité applicative

## 3. Objectifs fonctionnels de la marketplace

La marketplace IOX doit permettre à terme :

### 3.1 Côté vendeur

- créer et maintenir une identité vendeur / producteur
- décrire ses produits
- publier des offres commerciales
- joindre des documents utiles à la confiance commerciale
- valoriser ses certifications
- décrire sa saisonnalité, ses volumes, ses capacités export
- alimenter une fiche producteur crédible pour des acheteurs B2B

### 3.2 Côté admin / modération

- revoir les contenus soumis
- approuver ou rejeter les éléments
- contrôler la cohérence des informations publiées
- empêcher l'exposition publique de contenus non validés
- filtrer, suspendre, révoquer

### 3.3 Côté acheteur / public

- consulter un catalogue de produits publiés
- consulter des fiches produit détaillées
- consulter des fiches vendeur / producteur
- visualiser les certifications et éléments de preuve valides
- initier des demandes de devis / RFQ

## 4. Architecture technique actuelle

### 4.1 Backend

Le backend repose sur NestJS, avec une architecture modulaire, une couverture de tests importante et un modèle métier structuré.

Les modules marketplace déjà présents ou en cours d'extension couvrent notamment :

- `seller-profiles`
- `marketplace-products`
- `marketplace-offers`
- `marketplace-documents`
- `marketplace-review`
- `marketplace-catalog`
- `quote-requests`

Le backend assure :

- le CRUD métier
- les règles de rôle
- les transitions d'état
- les projections publiques
- les contrôles de conformité
- les endpoints seller/admin/public

### 4.2 Base de données

La persistance repose sur Prisma + PostgreSQL.

Les entités cœur de la marketplace sont :

- `SellerProfile`
- `MarketplaceProduct`
- `MarketplaceOffer`
- `MarketplaceDocument`
- `MediaAsset`

Des extensions récentes ou prévues ajoutent :

- la saisonnalité produit
- les certifications structurées

Le modèle évolue de manière additive, avec migrations Prisma non destructives.

### 4.3 Frontend

Le frontend repose sur Next.js.

Il expose trois grandes surfaces :

- surface seller
- surface admin
- surface publique marketplace

Les pages publiques déjà en place incluent :

- catalogue public
- fiche produit publique
- projection publique liée aux vendeurs
- flux RFQ

Les surfaces seller restent encore incomplètes sur certains points, notamment l'auto-édition complète du profil vendeur.

### 4.4 Observabilité et robustesse

Les travaux récents ont renforcé :

- l'idempotence sur les requêtes mutantes
- la révocation réelle des refresh tokens
- les métriques d'authentification
- les backups et drills de restauration
- les confirmations destructives UI
- les notifications d'erreur cohérentes

Cela donne une base plus fiable pour continuer à enrichir la marketplace.

## 5. Modèle métier actuel de la marketplace

### 5.1 SellerProfile

Le `SellerProfile` représente l'identité marketplace du vendeur / producteur.

Il porte déjà ou portera :

- identité publique
- histoire du producteur
- langues
- destinations servies
- incoterms
- expérience export
- capacité export
- médias de présentation
- certifications liées au vendeur

Il constitue la base de la fiche producteur.

### 5.2 MarketplaceProduct

Le `MarketplaceProduct` représente la fiche produit marketplace.

Il porte déjà ou portera :

- nom commercial
- nom réglementaire
- origine
- description
- MOQ
- capacité annuelle
- saisonnalité
- certifications produit
- documents produit
- médias produit

Il constitue la base de la fiche produit publique.

### 5.3 MarketplaceOffer

Le `MarketplaceOffer` représente la déclinaison commerciale du produit.

Il porte :

- prix
- mode de prix
- quantité disponible
- délai
- incoterm
- marchés desservis
- paramètres commerciaux liés à une campagne ou une disponibilité donnée

Il faut distinguer :

- la donnée structurelle produit
- la donnée commerciale d'offre

### 5.4 MarketplaceDocument

Le `MarketplaceDocument` permet d'associer des documents à différentes entités liées à la marketplace.

Il est utilisé pour :

- pièces justificatives
- documents publics
- documents privés
- analyses
- fiches techniques
- certificats PDF
- autres annexes documentaires

### 5.5 MediaAsset

Le `MediaAsset` gère les médias :

- image principale
- galerie
- packaging
- origine
- labels
- potentiellement vidéo

## 6. Flux métier principaux

### 6.1 Flux de publication vendeur

1. le vendeur renseigne ou complète son profil
2. il crée un produit marketplace
3. il associe une offre
4. il ajoute documents et médias
5. il soumet les éléments à revue
6. l'admin approuve ou rejette
7. si les conditions sont remplies, la projection publique devient visible

### 6.2 Flux de modération admin

1. l'admin consulte la review queue
2. il filtre par type d'item
3. il approuve ou rejette
4. un rejet peut comporter un motif
5. le vendeur corrige puis resoumet
6. un nouvel item de revue est généré si nécessaire

### 6.3 Flux public / acheteur

1. l'acheteur consulte le catalogue
2. il ouvre une fiche produit
3. il voit uniquement les éléments autorisés publiquement
4. il consulte les certifications visibles et valides
5. il initie éventuellement une RFQ

## 7. État d'avancement technique

### 7.1 Solide et déjà fonctionnel

La marketplace dispose déjà d'un socle sérieux :

- profils vendeur
- produits marketplace
- offres marketplace
- documents marketplace
- médias
- review queue admin
- publication contrôlée
- catalogue public
- fiche produit publique
- RFQ

### 7.2 Limites actuelles

Les principales limites identifiées sont :

- auto-édition seller incomplète
- certifications structurées seulement récemment ajoutées
- saisonnalité ajoutée mais pas encore pleinement saisissable partout
- vidéo et analyses labo encore incomplètes côté UI
- certains parcours seller encore trop dépendants de surfaces admin
- filtrage catalogue encore incomplet sur certains critères riches

## 8. Évolution récente de la fiche produit

La fiche produit a évolué pour mieux répondre au besoin B2B export.

Les enrichissements clés sont :

- saisonnalité
- clarification volumes / MOQ
- structuration de la projection publique
- préparation des certifications structurées
- séparation plus nette entre produit, offre, documents, médias et vendeur

La saisonnalité a été traitée comme un premier lot autonome, avec :

- mois de récolte
- mois de disponibilité
- disponibilité toute l'année
- projection publique sur la fiche produit

Cette évolution améliore immédiatement la lisibilité commerciale de l'offre.

## 9. Évolution récente de la fiche producteur

La fiche producteur est conçue comme un socle de confiance de la marketplace.

Elle vise à centraliser :

- identité du producteur
- histoire
- origine et implantation
- capacités export
- conditions logistiques
- destinations servies
- certifications
- médias et documents de crédibilité

L'objectif n'est pas seulement d'avoir une fiche "belle", mais une fiche :

- exploitable commercialement
- crédible pour des acheteurs
- modérable par l'admin
- projetable publiquement sans fuite d'informations non validées

## 10. Certifications structurées

### 10.1 Problème initial

Avant l'introduction des certifications structurées, les certifications étaient soit :

- libres
- implicites
- dispersées dans des documents
- peu filtrables

Cela limitait fortement :

- la confiance
- la recherche
- l'affichage public
- la cohérence seller/admin/public

### 10.2 Choix technique retenu

Le choix retenu est une table dédiée `Certification`, de nature polymorphe.

Ce choix permet :

- de rattacher une certification à plusieurs scopes métiers
- de dater la validité
- de filtrer par type
- de gérer un statut
- d'afficher uniquement les certifications valides publiquement
- de conserver une logique d'évolution future

### 10.3 Portée MVP

Le MVP cible en priorité :

- `SELLER_PROFILE`
- `MARKETPLACE_PRODUCT`

Le support `MARKETPLACE_OFFER` est volontairement différé pour éviter une complexité prématurée.

## 11. Saisonnalité produit

### 11.1 Pourquoi ce sujet est important

Dans un contexte marketplace B2B, la saisonnalité est structurante. Elle permet à l'acheteur de comprendre :

- quand le produit est récolté
- quand il est réellement disponible
- si l'approvisionnement est permanent ou non

### 11.2 Modèle retenu

Le modèle retenu repose sur :

- `harvestMonths`
- `availabilityMonths`
- `isYearRound`

Ce choix est simple, lisible et suffisant pour un premier niveau de maturité.

### 11.3 Effets métier

Un produit sans saisonnalité ne peut plus être soumis à review dans le nouveau flux. C'est un renforcement volontaire de la qualité de la donnée marketplace.

## 12. Choix techniques structurants

### 12.1 Approche additive

Les évolutions sont réalisées de façon additive :

- migrations non destructives
- nouveaux champs nullables
- nouveaux enums
- nouvelles tables limitées

Cela réduit le risque de régression.

### 12.2 Approche chirurgicale

Chaque lot cherche à :

- livrer un périmètre autonome
- éviter les refontes larges
- préserver les workflows existants
- garder la CI stable

### 12.3 Distinction seller / admin / public

Chaque donnée marketplace est pensée selon trois vues :

- seller : saisie et enrichissement
- admin : contrôle et modération
- public : projection filtrée

C'est un principe fort de conception.

## 13. Sécurité et conformité

La marketplace s'appuie sur :

- RBAC déjà en place
- workflow de modération
- refresh sécurisé
- idempotence des mutations
- contrôle de publication
- projection publique filtrée
- backups et drills validés

Les points de vigilance à moyen terme restent :

- expiration automatique de certaines données
- alertes automatiques
- éventuelle revue documentaire plus fine
- signalement / révocation plus avancés

## 14. Roadmap technique recommandée

### 14.1 FP-1 — Saisonnalité produit

Déjà traitée comme premier lot autonome :

- schéma
- DTO
- service
- projection publique
- composant d'affichage

### 14.2 FP-2 — Certifications structurées

Lot centré sur :

- table `Certification`
- enums
- module backend
- projection publique
- UI seller/admin minimale

### 14.3 FP-3 — Auto-édition seller profile

Lot clé pour rendre la marketplace réellement alimentable :

- édition seller de son profil
- saisie de son histoire
- capacités export
- destinations
- éventuellement saisie UI de la saisonnalité produit si cohérent

### 14.4 Lots suivants

Ensuite pourront venir :

- filtres catalogue enrichis
- vidéos
- analyses labo typées
- pièces justificatives mieux structurées
- signaux d'expiration
- expérience seller plus complète
- documentation d'usage

## 15. Risques techniques identifiés

### 15.1 Risque de dérive de périmètre

La fiche producteur peut vite devenir un gros chantier transversal. Il faut conserver une discipline de lots courts et autonomes.

### 15.2 Risque de confusion produit / offre / vendeur

Sans frontière claire :

- on duplique les champs
- on crée des incohérences
- on brouille la logique métier

Il faut maintenir la séparation :

- vendeur = identité / crédibilité / capacité globale
- produit = caractéristiques structurelles
- offre = paramètres commerciaux ponctuels

### 15.3 Risque d'UI seller incomplète

Le backend peut devenir plus riche que la saisie réelle disponible côté seller. Il faut donc garder comme priorité l'auto-édition seller.

### 15.4 Risque documentaire

Les certifications et documents peuvent devenir un second système de gestion documentaire si on va trop vite vers des workflows complexes. Le MVP doit rester simple.

## 16. Recommandations

1. continuer à lotir de manière stricte
2. maintenir l'approche additive Prisma
3. prioriser l'auto-édition seller profile
4. garder `Certification` comme table dédiée
5. ne pas introduire trop tôt des workflows documentaires complexes
6. préserver la projection publique filtrée comme principe de base
7. faire évoluer la marketplace comme un système B2B de confiance, pas comme un simple catalogue marketing

## 17. Conclusion

La marketplace IOX repose déjà sur un socle technique sérieux, modulaire et testé. Elle a dépassé le stade du prototype simple et s'oriente vers une place de marché B2B gouvernée, avec publication contrôlée, projection publique filtrée et montée progressive en qualité de donnée.

Les évolutions engagées sur :

- la saisonnalité produit
- les certifications structurées
- la future auto-édition du profil vendeur

sont cohérentes avec cet objectif.

La trajectoire recommandée est de continuer à avancer par lots courts, autonomes et validés, afin de transformer progressivement la marketplace en un espace crédible pour la présentation, la qualification et la mise en relation commerciale de producteurs et d'acheteurs.
