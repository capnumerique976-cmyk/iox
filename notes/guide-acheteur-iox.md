# Guide complet — Acheteur B2B IOX

> Version : 2026-05-10. Ce guide s'adresse aux acheteurs B2B inscrits sur la plateforme IOX (rôle `MARKETPLACE_BUYER`).

---

## Sommaire

1. [Créer son compte acheteur](#1-créer-son-compte-acheteur)
2. [Parcourir le catalogue marketplace](#2-parcourir-le-catalogue-marketplace)
3. [Envoyer une demande de devis (RFQ)](#3-envoyer-une-demande-de-devis-rfq)
4. [Communiquer avec le vendeur](#4-communiquer-avec-le-vendeur)
5. [Procéder au paiement (Stripe)](#5-procéder-au-paiement-stripe)
6. [Télécharger sa facture](#6-télécharger-sa-facture)
7. [FAQ acheteur](#7-faq-acheteur)

---

## 1. Créer son compte acheteur

### 1.1 Connexion

Rendez-vous sur **`/login`** et connectez-vous avec vos identifiants.

> L'inscription acheteur est gérée par l'équipe IOX. Contactez `support@iox.io` pour créer un compte.

### 1.2 Votre espace acheteur

Après connexion, votre tableau de bord est disponible à **`/buyer`**. Vous y trouvez :
- Un résumé de vos demandes de devis actives (par statut)
- Des raccourcis vers les actions principales
- Un accès rapide au catalogue

### 1.3 Compléter votre profil entreprise

Accédez à **`/buyer/profile`** pour renseigner les informations de votre société :
- Raison sociale, SIRET / identifiant fiscal
- Adresse de livraison
- Contacts

Cliquez sur **"Modifier"** → **`/buyer/profile/edit`** pour mettre à jour ces informations.

### 1.4 Préférences de notifications

Accédez à **`/buyer/preferences`** pour choisir les emails que vous souhaitez recevoir (ex. nouveaux devis reçus, mises à jour de statut RFQ).

---

## 2. Parcourir le catalogue marketplace

### 2.1 Catalogue général

Accédez au catalogue depuis **`/marketplace`**.

Vous pouvez :
- Filtrer par catégorie de produit
- Filtrer par origine géographique (pays producteur)
- Filtrer par certification (BIO, Fairtrade, etc.)
- Rechercher par mot-clé

Cliquez sur un produit pour accéder à sa fiche détaillée : **`/marketplace/products/[slug]`**.

### 2.2 Fiche vendeur

Chaque offre affiche le vendeur associé. Cliquez sur le nom du vendeur pour voir sa fiche publique : **`/marketplace/sellers/[slug]`**.

La fiche vendeur inclut :
- Présentation de la coopérative
- Certifications obtenues
- Toutes les offres actives du vendeur

### 2.3 Liste des vendeurs

Naviguez vers **`/marketplace/sellers`** pour voir l'ensemble des vendeurs référencés sur IOX.

### 2.4 Comment ça marche ?

Consultez la page **`/marketplace/how-it-works`** pour une explication du processus d'achat B2B sur IOX.

### 2.5 Produits favoris [À VENIR]

La fonctionnalité de favoris est accessible à **`/marketplace/favorites`**. [À VENIR — interface en cours de développement]

---

## 3. Envoyer une demande de devis (RFQ)

Une **demande de devis (RFQ — Request for Quotation)** permet de contacter un vendeur pour obtenir un prix ferme et des conditions de livraison.

### Étapes

1. Depuis la fiche d'une offre (`/marketplace/products/[slug]`), cliquez sur **"Demander un devis"**
2. Remplissez le formulaire RFQ :
   - **Quantité souhaitée** et unité (kg, tonnes, cartons…)
   - **Délai de livraison souhaité**
   - **Notes complémentaires** — précisez vos exigences (certifications, conditionnement, port de destination…)
3. Validez — votre demande est envoyée au vendeur avec le statut `NEW`

### Suivre vos demandes

Accédez à **`/buyer/quote-requests`** pour voir toutes vos demandes.

| Statut | Signification |
|--------|---------------|
| `NEW` / En attente | Envoyée, en attente de réponse vendeur |
| `QUALIFIED` / En cours | Le vendeur a pris en charge votre demande |
| `QUOTED` / Devis reçu | Le vendeur a envoyé un devis — consultez et payez |
| `NEGOTIATING` / Négociation | Échanges en cours avec le vendeur |
| `WON` / Acceptée | Accord trouvé, commande confirmée |
| `LOST` / Non retenue | Demande non aboutie |
| `CANCELLED` / Annulée | Demande annulée |

Cliquez sur une demande pour voir le détail : **`/buyer/quote-requests/[id]`**.

---

## 4. Communiquer avec le vendeur

### Fil de messages

Depuis la fiche d'une demande de devis (`/buyer/quote-requests/[id]`), un **fil de messages** intégré vous permet d'échanger directement avec le vendeur.

Vous pouvez :
- Poser des questions sur l'offre
- Négocier les conditions (prix, délai, Incoterm)
- Partager des documents (certificats requis, cahier des charges)
- Confirmer les termes avant paiement

Vous recevrez une notification email à chaque nouveau message du vendeur (selon vos préférences configurées dans `/buyer/preferences`).

---

## 5. Procéder au paiement (Stripe)

Lorsque votre demande de devis est au statut `QUOTED` (devis reçu) et que vous avez accepté les conditions :

### Étapes

1. Accédez à la demande : **`/buyer/quote-requests/[id]`**
2. Consultez le devis détaillé (montant, conditions, délai)
3. Cliquez sur **"Procéder au paiement"** → vous êtes redirigé vers **`/buyer/payments/checkout/[rfqId]`**
4. Vous êtes redirigé vers la page de paiement Stripe sécurisée
5. Saisissez vos informations de paiement (carte bancaire ou virement selon les options disponibles)
6. Après confirmation Stripe, vous êtes redirigé vers **`/buyer/payments/return/[paymentId]`**

En cas d'annulation du paiement, vous êtes redirigé vers **`/buyer/payments/cancel/[paymentId]`**.

### Vos paiements

Retrouvez l'historique de vos paiements à **`/buyer/payments`**.

### Suivi des commandes

Les demandes passées au statut `WON` (payées) sont accessibles dans **`/buyer/orders`**.

---

## 6. Télécharger sa facture

1. Accédez à **`/buyer/invoices`**
2. Retrouvez la commande correspondante dans la liste
3. Cliquez sur **"Télécharger la facture"** pour obtenir le PDF

> Les factures sont générées automatiquement après confirmation du paiement Stripe. Comptez quelques minutes après le paiement pour la disponibilité du document.

---

## 7. FAQ acheteur

**Q1. Je n'ai pas reçu de réponse à ma demande de devis depuis plusieurs jours.**

Les vendeurs s'engagent à répondre sous 48–72 heures ouvrées. Si vous n'avez pas de réponse au-delà de ce délai, utilisez le fil de messages pour relancer directement le vendeur. En cas de difficulté persistante, contactez `support@iox.io`.

**Q2. Comment annuler une demande de devis ?**

Depuis la fiche de votre demande (`/buyer/quote-requests/[id]`), une option d'annulation est disponible tant que la demande n'est pas encore au statut `WON`. Confirmez l'annulation — le vendeur en sera notifié automatiquement.

**Q3. Le vendeur a soumis un devis mais les conditions ne me conviennent pas.**

Utilisez le fil de messages pour négocier. Le statut passera à `NEGOTIATING`. Vous pouvez proposer un contre-prix, un délai différent ou des conditions alternatives. Il n'y a pas de limite au nombre d'échanges.

**Q4. Ma carte bancaire a été refusée lors du paiement.**

Le refus est géré par Stripe. Vérifiez :
- Que votre carte est activée pour les paiements en ligne
- Que votre banque n'a pas bloqué la transaction (contactez votre banque)
- Que les informations saisies (numéro, date d'expiration, CVV) sont correctes

Si le problème persiste, contactez `support@iox.io` en indiquant l'identifiant de votre demande de devis.

**Q5. Où puis-je voir tous mes achats passés ?**

Accédez à **`/buyer/orders`** pour la liste de vos commandes confirmées (statut `WON`) et à **`/buyer/invoices`** pour vos factures téléchargeables.

---

*Pour toute question non couverte : `support@iox.io` — Guide M74 — IOX v2026*
