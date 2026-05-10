# Guide complet — Vendeur coopérative IOX

> Version : 2026-05-10. Ce guide s'adresse aux vendeurs B2B inscrits sur la plateforme IOX (rôle `MARKETPLACE_SELLER`).

---

## Sommaire

1. [Créer son compte et profil vendeur](#1-créer-son-compte-et-profil-vendeur)
2. [Uploader certifications et documents](#2-uploader-certifications-et-documents)
3. [Créer un produit (MarketplaceProduct)](#3-créer-un-produit-marketplaceproduct)
4. [Créer une offre (MarketplaceOffer)](#4-créer-une-offre-marketplaceoffer)
5. [Comprendre les statuts de publication](#5-comprendre-les-statuts-de-publication)
6. [Gérer les demandes de devis (RFQ)](#6-gérer-les-demandes-de-devis-rfq)
7. [Stripe Connect — recevoir des paiements](#7-stripe-connect--recevoir-des-paiements)
8. [Voir ses factures](#8-voir-ses-factures)
9. [FAQ vendeur](#9-faq-vendeur)

---

## 1. Créer son compte et profil vendeur

### 1.1 Connexion

Rendez-vous sur **`/login`** et connectez-vous avec vos identifiants fournis par l'équipe IOX.

> L'inscription vendeur est gérée par l'équipe IOX (onboarding manuel). Contactez `support@iox.io` si vous n'avez pas encore de compte.

### 1.2 Accéder à votre espace vendeur

Après connexion, vous êtes redirigé vers le tableau de bord. Cliquez sur **"Mon espace vendeur"** ou naviguez vers `/seller/dashboard`.

Le cockpit vendeur affiche en un coup d'œil :
- Le statut de votre profil vendeur
- Le nombre de produits et offres par statut
- Les demandes de devis récentes à traiter
- Les alertes documentaires (documents expirant ou non vérifiés)

### 1.3 Compléter votre profil vendeur

Accédez à **`/seller/profile/edit`** pour compléter votre profil. Les critères de complétude affichés sur le dashboard sont :

| Critère | Description |
|---------|-------------|
| Description courte | Au moins 20 caractères — accroche visible dans le catalogue |
| Description détaillée | Au moins 80 caractères — visible sur votre fiche publique |
| Email commercial | Adresse de contact acheteurs |
| Logo | Image carrée, format recommandé 400×400px |
| Conditions de livraison (Incoterms) | Ex. EXW, FOB, CIF |
| Pays de livraison | Destinations servies par votre coopérative |

Un profil complet améliore votre visibilité dans le catalogue marketplace.

Pour voir votre fiche publique, cliquez sur **"Voir ma vitrine"** (lien vers `/marketplace/sellers/[votre-slug]`).

---

## 2. Uploader certifications et documents

### 2.1 Documents marketplace

Accédez à **`/seller/documents`** pour gérer tous vos documents (certificats d'origine, phytosanitaires, analyses qualité, etc.).

**Statuts possibles d'un document :**

| Statut | Signification |
|--------|---------------|
| `PENDING` | En attente de vérification par l'équipe IOX |
| `VERIFIED` | Document validé |
| `REJECTED` | Document refusé — consultez le motif et re-soumettez |

**Alertes automatiques :**
- Documents expirant dans les 90 jours : alerte orange sur le dashboard
- Documents non vérifiés ou rejetés : alerte bleue

Pour accéder aux documents liés à un type d'entité spécifique, naviguez vers `/seller/documents/[relatedType]/[relatedId]`.

### 2.2 Certifications vendeur

Accédez à **`/seller/profile/certifications`** pour uploader vos certifications (BIO, Fairtrade, ISO, HACCP, etc.).

Ces certifications apparaissent sur votre fiche publique et renforcent la confiance des acheteurs.

### 2.3 Certifications produit

Chaque produit peut avoir ses propres certifications. Accédez-y depuis **`/seller/marketplace-products/[id]/certifications`**.

---

## 3. Créer un produit (MarketplaceProduct)

Un **MarketplaceProduct** est la fiche produit de base (ex. "Vanille de Madagascar bio") indépendamment des conditions commerciales.

### Étapes

1. Accédez à **`/seller/marketplace-products`** (liste de vos produits)
2. Cliquez sur **"Nouveau produit"** → vous êtes redirigé vers **`/seller/marketplace-products/new`**
3. Remplissez le formulaire :
   - **Nom commercial** (`commercialName`) — obligatoire
   - **Catégorie** — sélectionnez dans la liste
   - **Description** — détaillez caractéristiques, variétés, conditionnement
   - **Saisonnalité** — accessible depuis `/seller/marketplace-products/[id]/seasonality`
4. Enregistrez en brouillon (`DRAFT`)
5. Soumettez pour publication → statut passe à `IN_REVIEW`

### Modifier un produit

Accédez à **`/seller/marketplace-products/[id]`** pour éditer un produit existant.

---

## 4. Créer une offre (MarketplaceOffer)

Une **MarketplaceOffer** est une proposition commerciale liée à un produit : prix indicatif, quantités minimum, conditions.

### Étapes

1. Accédez à **`/seller/marketplace-offers`** (liste de vos offres)
2. Cliquez sur **"Nouvelle offre"** → **`/seller/marketplace-offers/new`**
3. Remplissez :
   - **Titre de l'offre** — ex. "Vanille Tahitensis Grade A — Export Europe"
   - **Produit lié** — sélectionnez un `MarketplaceProduct` existant
   - **Conditions** — prix indicatif, MOQ, unité, Incoterm, délai d'exécution
   - **Statut export** (`exportReadinessStatus`) — indiquez votre niveau de préparation à l'export
4. Soumettez pour revue → statut `IN_REVIEW`

### Modifier une offre

Accédez à **`/seller/marketplace-offers/[id]`** pour éditer une offre.

---

## 5. Comprendre les statuts de publication

Les produits et offres suivent le cycle suivant :

```
DRAFT → IN_REVIEW → PUBLISHED
                  ↘ REJECTED → (corrections) → IN_REVIEW
PUBLISHED → SUSPENDED
```

| Statut | Description | Action requise |
|--------|-------------|----------------|
| `DRAFT` | Brouillon — non visible dans le catalogue | Compléter et soumettre |
| `IN_REVIEW` | En cours de vérification par l'équipe IOX | Attendre |
| `PUBLISHED` | Visible dans le catalogue marketplace | Aucune |
| `REJECTED` | Refusé — motif indiqué | Corriger et re-soumettre |
| `SUSPENDED` | Temporairement retiré du catalogue | Contacter IOX |

**Alertes "Contenus rejetés"** : les produits et offres rejetés apparaissent dans une section dédiée de votre dashboard avec un lien direct vers la correction.

---

## 6. Gérer les demandes de devis (RFQ)

### 6.1 Voir les demandes entrantes

Accédez à **`/seller/quote-requests`** pour voir toutes les demandes reçues sur vos offres.

Pour chaque demande, vous voyez :
- L'offre concernée
- L'entreprise acheteuse
- La quantité demandée
- Le statut actuel
- Le nombre de messages échangés

### 6.2 Statuts RFQ

| Statut | Signification |
|--------|---------------|
| `NEW` | Nouvelle demande — action urgente |
| `QUALIFIED` | Demande qualifiée, en cours de traitement |
| `QUOTED` | Devis envoyé à l'acheteur |
| `NEGOTIATING` | Échanges en cours |
| `WON` | Demande gagnée — commande confirmée |
| `LOST` | Demande perdue |
| `CANCELLED` | Demande annulée par l'acheteur |

### 6.3 Répondre à une demande

1. Cliquez sur une demande dans la liste → **`/seller/quote-requests/[id]`**
2. Lisez les détails : quantité, délai souhaité, notes acheteur
3. Répondez via le **fil de messages** (chat intégré)
4. Envoyez votre devis (prix, conditions, délai)
5. Mettez à jour le statut selon l'avancement de la négociation

### 6.4 Marquer une demande comme WON

Lorsqu'un accord est trouvé et le paiement confirmé, le statut passe à `WON` (généralement mis à jour automatiquement après paiement Stripe). En cas de problème, contactez l'équipe IOX.

---

## 7. Stripe Connect — recevoir des paiements

IOX utilise **Stripe Connect** pour sécuriser les paiements entre acheteurs et vendeurs. Vous devez compléter l'onboarding Stripe pour recevoir des virements.

### Étapes

1. Accédez à **`/seller/payments`**
2. Consultez le statut de votre compte Stripe Connect :

| Statut | Signification |
|--------|---------------|
| `PENDING_ONBOARDING` | Onboarding non démarré |
| `ONBOARDING_INCOMPLETE` | Formulaire Stripe en cours d'analyse |
| `CHARGES_ENABLED` | Encaissements activés |
| `PAYOUTS_ENABLED` | Compte entièrement opérationnel — virements actifs |
| `RESTRICTED` | Action requise — vérifiez vos informations Stripe |

3. Cliquez sur **"Démarrer l'onboarding"** → vous êtes redirigé vers Stripe
4. Fournissez vos informations bancaires et complétez le KYC (identité, IBAN)
5. Retournez sur `/seller/payments` pour vérifier le statut
6. Si vous revenez de Stripe sans complétion : cliquez **"Poursuivre l'onboarding"**

> Stripe peut demander 1–3 jours ouvrés pour valider les informations KYC.

---

## 8. Voir ses factures

Accédez à **`/seller/invoices`** pour consulter l'historique de vos transactions et télécharger vos factures.

> La génération de factures est liée aux demandes de devis passées au statut `WON` avec paiement Stripe confirmé.

---

## 9. FAQ vendeur

**Q1. Mon produit est en `IN_REVIEW` depuis plusieurs jours — que faire ?**

L'équipe IOX s'engage à traiter les revues sous 48–72 heures ouvrées. Si le délai est dépassé, contactez `support@iox.io` en indiquant le nom de votre produit.

**Q2. Mon offre a été rejetée — comment corriger ?**

Sur votre dashboard, les offres rejetées apparaissent dans la section "Contenus rejetés à retravailler". Cliquez sur "Corriger" pour ouvrir la fiche. Lisez le motif de rejet (indiqué par l'équipe IOX) et modifiez les champs concernés avant de re-soumettre.

**Q3. Un acheteur m'a envoyé une demande de devis mais je ne vois pas ses coordonnées complètes.**

Les coordonnées détaillées de l'acheteur sont accessibles depuis la fiche de la demande (`/seller/quote-requests/[id]`). Utilisez le fil de messages pour échanger directement.

**Q4. Quand est-ce que je reçois mon virement Stripe ?**

Une fois votre compte Stripe Connect au statut `PAYOUTS_ENABLED`, les virements sont déclenchés automatiquement après confirmation du paiement acheteur. Le délai de virement dépend de votre pays et de la configuration Stripe (généralement 2–7 jours ouvrés).

**Q5. Puis-je avoir plusieurs profils vendeur ?**

Non, un compte `MARKETPLACE_SELLER` est rattaché à un seul profil vendeur actif. Si votre coopérative gère plusieurs entités légales distinctes, contactez l'équipe IOX pour un arrangement multi-comptes.

---

*Pour toute question non couverte : `support@iox.io` — Guide M74 — IOX v2026*
