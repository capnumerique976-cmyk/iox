# Kit Pilote Terrain — IOX Mayotte

> Document opérationnel destiné aux équipes terrain, formateurs et coopératives participantes.  
> Version 2026-05-11 — Confidentiel pilote.

---

## 1. Objectif du pilote

Le pilote terrain IOX a pour objectif de valider la plateforme dans des conditions réelles, avec de vrais utilisateurs, avant tout déploiement à grande échelle.

**Durée :** 4 à 8 semaines (selon disponibilité des coopératives)

**Périmètre cible :**
- **3 à 5 coopératives vendeurs** (producteurs de vanille, ylang-ylang, épices locales)
- **5 à 10 acheteurs B2B** (importateurs, distributeurs, grossistes RHF)
- **Paiements en mode test Stripe** (aucun argent réel ne circule pendant les premières semaines — bascule vers Stripe live sur décision de l'équipe)

**Objectif principal :** valider le flow complet de bout en bout :

```
Acheteur crée une RFQ → Vendeur reçoit et répond → Devis accepté → Paiement traité → Facture téléchargeable
```

**Résultat attendu minimum :** au moins 2 transactions complètes validées pendant la durée du pilote.

**Ce que le pilote ne couvre pas :** SEO, campagne marketing, scale (charge importante), multidevises avancé, internationalisation complète.

---

## 2. Préparation avant J-1 — Ce que la coopérative doit préparer

Transmettre cette liste à chaque coopérative au moins **5 jours avant la session de formation**.

### 2.1 Catalogue produits

Préparer une liste de produits à publier sur la plateforme :

| Champ | Exemples |
|---|---|
| Nom du produit | Vanille Bourbon de Mayotte — grade A |
| Description | Vanille séchée, longueur min. 14 cm, taux d'humidité 30-35%, conditionnée sous vide |
| Prix indicatif | 45 € / kg (modifiable après publication) |
| Unité de vente | kg, tonne, carton de 500g |
| Quantité minimale de commande | 5 kg |
| Stock disponible estimé | 200 kg |
| Photos | 2 à 5 photos (format JPG ou PNG, résolution correcte, fond neutre) |
| Certifications | Label Rouge, Agriculture Biologique, Commerce Équitable |

**Conseil :** commencer avec 2 à 3 produits phares, pas toute la gamme.

### 2.2 Documents légaux

Avoir numérisés (scan ou photo lisible) les documents suivants :

- Statuts de la coopérative (ou GIE, SICA)
- Extrait Kbis ou document équivalent (moins de 3 mois)
- Justificatif de capacité d'export (si applicable : agrément sanitaire, phytosanitaire)
- Certifications produits (label rouge, bio, AOC…)

### 2.3 Coordonnées essentielles

- Nom et prénom du **contact principal** (interlocuteur IOX au quotidien)
- Nom et prénom du **responsable légal** (signataire des contrats)
- Numéro de téléphone WhatsApp (pour le support terrain)
- Email professionnel (utilisé comme identifiant IOX)

### 2.4 IBAN pour Stripe Connect (KYC)

Pour recevoir des paiements via Stripe, la coopérative doit fournir :

- **IBAN** du compte bancaire au nom de la structure (pas un compte personnel)
- **BIC/SWIFT** de la banque
- **Justificatif d'identité** du représentant légal (CNI recto-verso ou passeport)
- **Justificatif de domicile** de la structure (facture électricité, loyer, moins de 3 mois)

> **Important :** le RIB doit être au nom de la structure légale (SICA, GIE, coopérative), pas au nom du gérant.

### 2.5 Équipement minimum

- Smartphone **Android ou iOS** (testé sur Android 10+ et iOS 14+)
- Connexion internet : **4G suffit**, Wi-Fi préférable pour l'upload de photos
- Navigateur : Chrome ou Safari (recommandé), Firefox accepté

---

## 3. Étapes vendeur — Walkthrough complet

### Étape 1 — Activation du compte

1. Recevoir l'email d'invitation IOX (expéditeur : `noreply@iox.example`)
2. Si l'email n'arrive pas dans 10 minutes : vérifier le dossier **Courrier indésirable / SPAM**
3. Cliquer sur le bouton **"Activer mon compte"** dans l'email
4. Choisir un mot de passe : minimum 8 caractères, avec au moins 1 chiffre et 1 majuscule
5. Accepter les **Conditions Générales d'Utilisation** et la **Politique de confidentialité**
6. Cliquer sur **"Créer mon compte"**

### Étape 2 — Compléter le profil coopérative

1. Se connecter sur `https://pilot.iox.example`
2. Cliquer sur son nom en haut à droite → **"Mon profil"**
3. Remplir : nom de la coopérative, adresse, description (2-3 phrases), numéro SIREN, téléphone
4. Uploader le **logo** (optionnel mais recommandé pour la crédibilité)
5. Uploader la **photo de couverture** (optionnel)
6. Cliquer sur **"Enregistrer"**

### Étape 3 — Soumettre les documents KYB (compliance)

1. Dans le menu, aller sur **"Compliance"** ou **"Documents"**
2. Uploader chaque document requis dans la catégorie correspondante
3. Chaque document passe en revue par l'équipe IOX (délai : 24-48h en phase pilote)
4. Recevoir une notification email (validé ou rejeté avec motif)

> Sans documents validés, la publication de produits peut être limitée. Anticiper.

### Étape 4 — Configurer Stripe Connect (paiements)

1. Dans **"Paramètres"** → **"Paiements"** → cliquer sur **"Configurer mon compte Stripe"**
2. Être redirigé vers l'interface Stripe sécurisée
3. Renseigner les informations de la structure et du représentant légal
4. Uploader les pièces justificatives demandées par Stripe
5. Attendre la validation Stripe (peut prendre 24-72h)
6. Revenir sur IOX — le statut affiche **"Compte Stripe actif"**

> En mode test Stripe, l'étape est simplifiée. Les vraies vérifications KYC ont lieu lors du passage en mode live.

### Étape 5 — Publier un produit

1. Aller sur **"Mes produits"** → **"Ajouter un produit"**
2. Remplir le formulaire :
   - **Titre** : nom commercial clair et précis
   - **Description** : caractéristiques, origine, conditionnement, certifications
   - **Catégorie** : sélectionner dans la liste déroulante
   - **Prix** : prix indicatif par unité (modifiable plus tard)
   - **Unité** : kg, tonne, carton, litre…
   - **Quantité minimale de commande** : ex. 5 kg
   - **Stock disponible** : quantité actuelle estimée
3. Uploader **2 à 5 photos** du produit
4. Uploader les **certifications** du produit (PDF ou image)
5. Cliquer sur **"Publier"**
6. Le produit apparaît dans le marketplace — vérifier en ouvrant un onglet en navigation privée

### Étape 6 — Recevoir une RFQ (demande de devis)

1. Recevoir une notification email : *"Nouvelle demande de devis pour [Produit]"*
2. Se connecter → **"Mes RFQ"** ou **"Demandes de devis"**
3. Cliquer sur la RFQ → lire le détail : quantité demandée, délai souhaité, conditions spéciales
4. Délai maximum pour répondre : **48 heures** (KPI pilote)

### Étape 7 — Répondre à une RFQ (créer un devis)

1. Depuis la RFQ, cliquer sur **"Répondre / Créer un devis"**
2. Remplir les champs :
   - **Prix unitaire proposé** (peut différer du prix catalogue)
   - **Quantité disponible confirmée**
   - **Délai de livraison estimé**
   - **Conditions de paiement** : ex. 30% à la commande, solde à la livraison
   - **Validité du devis** : ex. 15 jours
   - **Note personnalisée** (optionnel)
3. Cliquer sur **"Envoyer le devis"**
4. L'acheteur reçoit une notification

### Étape 8 — Devis accepté — suivi de la commande

1. Recevoir notification : *"Votre devis a été accepté"*
2. Dans **"Mes commandes"**, voir le statut de la commande
3. Mettre à jour le statut au fil de l'avancement : **Confirmée → En préparation → Expédiée**
4. Uploader le **bordereau d'expédition** ou **bon de livraison** si applicable

### Étape 9 — Paiement reçu et facture

1. Stripe notifie IOX du paiement reçu
2. Dans **"Mes paiements"**, voir la transaction confirmée
3. La **facture** est générée automatiquement par IOX
4. Télécharger la facture au format PDF depuis **"Mes documents"**
5. Le virement Stripe arrive sur le compte bancaire selon le calendrier Stripe Connect (généralement 7 jours en mode live)

---

## 4. Étapes acheteur — Walkthrough complet

### Étape 1 — Création du compte

1. Recevoir l'invitation IOX ou s'inscrire sur `https://pilot.iox.example`
2. Choisir le profil **"Acheteur"**
3. Renseigner : raison sociale, pays, secteur d'activité, email, téléphone
4. Activer le compte via l'email de confirmation

### Étape 2 — Explorer le catalogue

1. Depuis la page d'accueil, accéder au **Marketplace**
2. Utiliser la barre de recherche (MeiliSearch — résultats instantanés)
3. Utiliser les filtres : catégorie, certifications, origine, prix, disponibilité
4. Cliquer sur une offre pour voir le détail complet

### Étape 3 — Créer une RFQ (demande de devis)

1. Sur la fiche produit, cliquer sur **"Demander un devis"**
2. Remplir le formulaire :
   - **Quantité souhaitée**
   - **Délai de livraison souhaité**
   - **Port de destination** (pour calcul logistique éventuel)
   - **Conditions spéciales** (certifications exigées, emballage spécifique…)
   - **Message personnalisé** au vendeur (optionnel)
3. Cliquer sur **"Envoyer la demande"**

### Étape 4 — Recevoir et comparer les devis

1. Recevoir une notification email quand le vendeur répond
2. Dans **"Mes RFQ"**, voir le devis reçu
3. Si plusieurs devis pour la même demande : les comparer côte à côte

### Étape 5 — Accepter un devis

1. Cliquer sur **"Accepter ce devis"**
2. Confirmer la commande (récapitulatif : produit, quantité, prix, délai)
3. Procéder au **paiement sécurisé via Stripe**

### Étape 6 — Paiement

1. Saisir les informations de carte bancaire (interface Stripe sécurisée)
2. En mode test Stripe : utiliser la carte test `4242 4242 4242 4242`, date future, CVC `123`
3. Paiement confirmé → notification email + statut commande mis à jour

### Étape 7 — Suivi et facture

1. Dans **"Mes commandes"**, suivre l'avancement : Confirmée → En préparation → Expédiée
2. Télécharger la **facture** depuis **"Mes documents"**
3. En cas de problème : utiliser le bouton **"Contacter le vendeur"** ou le support IOX

---

## 5. Support pilote

| Canal | Coordonnées | Disponibilité |
|---|---|---|
| WhatsApp Business | [À compléter — numéro WhatsApp business] | Lun-ven 8h-18h heure locale |
| Email | support@iox.example | Réponse sous 4h ouvrées |
| Téléphone | [À compléter] | Lun-ven 9h-17h |

**Urgences techniques** (plateforme inaccessible) : signaler immédiatement par WhatsApp, tag `#urgence`.

**Pour les problèmes de paiement Stripe** : préciser le numéro de commande IOX dans le message.

---

## 6. Formation 30 minutes — Agenda type

La formation se déroule en présentiel ou en visioconférence (WhatsApp, Zoom, Google Meet).

| Durée | Contenu | Animateur |
|---|---|---|
| 0-2 min | Accueil, tour de table rapide, objectif de la session | Formateur IOX |
| 2-5 min | Présentation rapide de la plateforme (démo écran) | Formateur IOX |
| 5-10 min | Activation du compte et première connexion (pratique) | Participant + formateur |
| 10-17 min | Compléter le profil et uploader les documents (pratique) | Participant + formateur |
| 17-22 min | Publier un premier produit (pratique guidée) | Participant + formateur |
| 22-26 min | Simuler une RFQ et répondre à un devis (démo + pratique) | Formateur + participant |
| 26-28 min | Questions / réponses | Tous |
| 28-30 min | Récap des 3 actions à faire dans la semaine, contacts support | Formateur IOX |

**Matériel nécessaire :**
- Projecteur ou écran partagé
- Connexion internet stable
- Un compte de démonstration IOX prêt (avec données test) pour la démo initiale
- L'email d'invitation du participant déjà envoyé avant la formation

---

## 7. Checklist Jour 1

À compléter par le formateur terrain le jour de la session.

- [ ] Email d'invitation envoyé au participant **avant** la session (minimum 30 min avant)
- [ ] Compte démonstration IOX fonctionnel et prêt (tester la connexion au site)
- [ ] Connexion internet disponible sur place (tester le débit)
- [ ] Documents KYB du participant disponibles (formats acceptés : PDF, JPG, PNG)
- [ ] Participant a son IBAN sous la main (pour Stripe)
- [ ] Le participant a bien reçu l'email d'invitation (vérifier SPAM si besoin)
- [ ] Le participant réussit à se connecter à son compte IOX
- [ ] Au moins 1 produit est publié à l'issue de la session
- [ ] Les documents compliance sont uploadés (même partiellement)
- [ ] Le participant a le numéro WhatsApp du support IOX dans ses contacts

---

## 8. Checklist Semaine 1

À compléter en fin de première semaine.

- [ ] Profil coopérative complété à 100% (tous champs renseignés)
- [ ] Au moins 2 produits publiés et visibles sur le marketplace
- [ ] Documents KYB validés par l'équipe IOX (statut "Validé")
- [ ] Compte Stripe Connect configuré (mode test accepté)
- [ ] Au moins 1 RFQ reçue ou simulée et traitée (réponse envoyée)
- [ ] Le participant a exploré le marketplace en tant qu'acheteur (navigation libre)
- [ ] Compte-rendu d'intégration envoyé à l'équipe IOX (par WhatsApp ou email)
- [ ] Retour utilisateur J7 rempli et transmis (voir fiche retour section 10)

---

## 9. KPI minimaux du pilote

Ces 5 métriques sont suivies hebdomadairement par l'équipe IOX.

| KPI | Valeur cible | Fréquence de suivi |
|---|---|---|
| **Vendeurs actifs** (au moins 1 produit publié) | ≥ 3 coopératives | Hebdomadaire |
| **RFQ créées** (par les acheteurs) | ≥ 5 demandes | Hebdomadaire |
| **Taux de réponse RFQ < 48h** | ≥ 70 % | Hebdomadaire |
| **Transactions complètes** (RFQ → paiement confirmé) | ≥ 2 | Fin de pilote |
| **Score satisfaction moyen** (vendeurs + acheteurs) | ≥ 6 / 10 | Fin de pilote |

---

## 10. Fiche retour utilisateur

À remplir par chaque participant à la fin de la semaine 1 et à la fin du pilote.

---

**Date :** _______________  
**Rôle :** ☐ Vendeur (coopérative)  ☐ Acheteur  
**Nom / Structure :** _______________ (optionnel — anonymat respecté)

---

### Questions fermées (entourer la note de 1 à 5)

**1. La plateforme IOX est facile à utiliser pour moi.**

```
1 — Très difficile    2 — Difficile    3 — Neutre    4 — Facile    5 — Très facile
```

**2. Le processus pour publier un produit / créer une RFQ est clair et rapide.**

```
1 — Pas du tout clair    2 — Peu clair    3 — Neutre    4 — Clair    5 — Très clair
```

**3. Le support IOX a répondu rapidement et m'a aidé efficacement.**

```
1 — Pas du tout    2 — Peu satisfait    3 — Neutre    4 — Satisfait    5 — Très satisfait
```

**4. IOX répond à un vrai besoin pour ma coopérative / mon activité.**

```
1 — Pas du tout    2 — Peu    3 — Neutre    4 — Oui    5 — Absolument
```

**5. Je recommanderais IOX à une autre coopérative ou un autre acheteur.**

```
1 — Non    2 — Probablement non    3 — Neutre    4 — Probablement oui    5 — Oui, certainement
```

---

### Questions ouvertes

**6. Qu'est-ce qui vous a le plus surpris (positivement ou négativement) lors de votre première utilisation ?**

_______________________________________________________________________________

_______________________________________________________________________________

_______________________________________________________________________________

**7. Quelle est la principale amélioration que vous souhaiteriez voir sur IOX avant un lancement officiel ?**

_______________________________________________________________________________

_______________________________________________________________________________

_______________________________________________________________________________

---

*Merci pour votre retour. Il est précieux pour améliorer la plateforme avant son lancement officiel.*  
*Transmettez cette fiche par WhatsApp, email à support@iox.example, ou remettez-la en main propre à votre contact IOX.*
