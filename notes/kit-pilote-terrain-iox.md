# Kit pilote terrain IOX — Guide complet coopératives et acheteurs

> Document interne — Pilote IOX (Mayotte)
> Dernière mise à jour : 2026-05-11
> Version : 1.0

---

## 1. Objectif du pilote

### Ce que nous testons

IOX est une marketplace B2B agricole dédiée à l'océan Indien, avec un focus initial sur Mayotte. Le pilote terrain a pour objectif de valider :

1. **L'utilisabilité** : les coopératives et acheteurs peuvent utiliser la plateforme de manière autonome après une formation de 30 minutes.
2. **Le flux de transaction** : le cycle complet RFQ → devis → paiement → facture fonctionne de bout en bout avec de vrais utilisateurs.
3. **La valeur perçue** : les coopératives et acheteurs trouvent un avantage réel à utiliser IOX par rapport aux méthodes actuelles (WhatsApp, téléphone, Excel).
4. **La fiabilité technique** : la plateforme tient la charge d'utilisation réelle sans incident bloquant.

### Durée du pilote

**4 à 8 semaines** selon l'intensité d'utilisation des participants.
- Semaine 1-2 : onboarding et prise en main
- Semaine 3-6 : transactions réelles (mode test Stripe)
- Semaine 7-8 : bilan, collecte de feedback, rapport

### Participants

- **Vendeurs :** 5 coopératives agricoles de Mayotte (sélectionnées en amont)
- **Acheteurs :** 10 acheteurs B2B (importateurs, grossistes, restaurateurs)

### Critères de succès du pilote

| Critère | Objectif |
|---|---|
| Vendeurs actifs (≥1 produit publié) | ≥ 3 sur 5 coopératives |
| RFQ créées pendant le pilote | ≥ 5 |
| Taux de réponse vendeur sous 48h | ≥ 70% |
| Transactions complètes (RFQ → paiement) | ≥ 2 |
| NPS vendeurs | ≥ 6/10 |
| NPS acheteurs | ≥ 6/10 |
| Incidents bloquants non résolus sous 4h | 0 |

---

## 2. Préparation avant J-1 (coopérative vendeuse)

La coopérative doit préparer les éléments suivants AVANT la session de formation :

### Catalogue de produits
- [ ] Liste des produits disponibles à la vente (minimum 2-3 pour le pilote)
- [ ] Pour chaque produit : nom commercial, description, unité de vente (kg, tonne, carton, etc.)
- [ ] Prix indicatif par unité (peut être modifié à tout moment)
- [ ] Quantités disponibles actuellement
- [ ] Photos des produits (minimum 1 photo par produit, format JPG ou PNG, bonne luminosité)
- [ ] Période de disponibilité si saisonnière

### Documents légaux
- [ ] Statuts de la coopérative (document fondateur)
- [ ] Extrait Kbis ou équivalent local (moins de 3 mois) — ou récépissé de déclaration en préfecture
- [ ] Attestation de capacité d'exportation si applicable
- [ ] Tout certificat de qualité ou label agricole disponible (AB, indication géographique, etc.)

### Coordonnées
- [ ] Nom et prénom du contact principal pour le pilote
- [ ] Email professionnel valide (sera le login IOX)
- [ ] Numéro de téléphone direct (WhatsApp de préférence)
- [ ] Adresse postale de la coopérative

### Informations bancaires (pour Stripe)
- [ ] IBAN du compte bancaire de la coopérative (pour recevoir les paiements)
- [ ] BIC/SWIFT
- [ ] Nom du titulaire du compte (doit correspondre au nom légal de la coopérative)
- [ ] Pièce d'identité du représentant légal (pour KYC Stripe)

### Matériel nécessaire le jour J
- [ ] Connexion internet (WiFi ou 4G suffisant)
- [ ] Smartphone ou tablette pour l'interface mobile
- [ ] Photos des produits disponibles sur le téléphone ou par email

---

## 3. Étapes vendeur (coopérative) — Guide pas à pas

### Étape 1 — Recevoir l'invitation par email
Vous recevez un email d'invitation de la part de l'équipe IOX (noreply@iox.example).
Cliquer sur le lien "Rejoindre IOX" dans l'email.
Si l'email n'est pas reçu dans 5 minutes : vérifier les spams ou contacter le support.

### Étape 2 — Créer votre compte
Sur la page d'inscription :
1. Saisir votre adresse email (celle qui a reçu l'invitation)
2. Choisir un mot de passe sécurisé (minimum 8 caractères, avec majuscule et chiffre)
3. Accepter les CGU IOX
4. Cliquer sur "Créer mon compte"
5. Vérifier votre email : cliquer sur le lien de confirmation reçu

### Étape 3 — Compléter le profil de la coopérative
Dans votre tableau de bord → "Mon profil" :
1. Saisir le nom légal de la coopérative
2. Ajouter l'adresse du siège social
3. Décrire l'activité (ex : "Coopérative maraîchère de Mayotte — production locale de fruits et légumes")
4. Ajouter le numéro de téléphone de contact
5. Uploader le logo de la coopérative (optionnel mais recommandé)
6. Sauvegarder

### Étape 4 — Uploader les documents KYC Stripe
Dans votre tableau de bord → "Vérification du compte" :
1. Cliquer sur "Commencer la vérification"
2. Renseigner les informations du représentant légal (nom, prénom, date de naissance)
3. Saisir l'IBAN du compte bancaire de la coopérative
4. Uploader les documents demandés (pièce d'identité, Kbis)
5. Attendre la validation (généralement quelques minutes à quelques heures)
6. Vous recevrez un email de confirmation quand votre compte est activé pour recevoir des paiements

### Étape 5 — Publier 2-3 produits
Dans votre tableau de bord → "Mes produits" → "Ajouter un produit" :
1. Saisir le nom du produit (ex : "Bananes fraîches de Mayotte")
2. Ajouter une description détaillée
3. Choisir la catégorie (fruits, légumes, épices, etc.)
4. Indiquer l'unité de vente et le prix indicatif
5. Saisir la quantité disponible
6. Uploader au moins une photo
7. Cliquer sur "Publier"
Répéter pour chaque produit.

### Étape 6 — Recevoir et répondre à une demande de devis (RFQ)
Quand un acheteur envoie une RFQ pour vos produits :
1. Vous recevez un email de notification
2. Dans votre tableau de bord → "Demandes de devis" : cliquer sur la RFQ
3. Vérifier les détails (produit, quantité, date souhaitée, conditions)
4. Cliquer sur "Répondre avec un devis"
5. Saisir votre prix proposé, la quantité disponible, les délais de livraison, les conditions
6. Cliquer sur "Envoyer le devis"
**Délai recommandé :** Répondre dans les 48 heures pour maintenir un bon taux de réponse.

### Étape 7 — Confirmer la transaction
Si l'acheteur accepte votre devis :
1. Vous recevez une notification "Devis accepté"
2. Vérifier les conditions de livraison avec l'acheteur (via la messagerie IOX)
3. Confirmer votre disponibilité pour honorer la commande

### Étape 8 — Recevoir le paiement (mode test pour le pilote)
Pendant le pilote, les paiements sont effectués en **mode test Stripe** (aucun argent réel ne circule) :
1. L'acheteur effectue le paiement sur IOX
2. Vous recevez une notification "Paiement confirmé"
3. Votre solde IOX est crédité (visible dans "Mon compte → Finances")
4. En mode live (post-pilote) : le virement est effectué vers votre compte bancaire sous 2-7 jours ouvrés

### Étape 9 — Télécharger la facture
Dans votre tableau de bord → "Mes transactions" :
1. Cliquer sur la transaction concernée
2. Cliquer sur "Télécharger la facture"
3. La facture au format PDF est générée et téléchargée automatiquement

---

## 4. Étapes acheteur — Guide pas à pas

### Étape 1 — Recevoir l'invitation
Email d'invitation reçu de noreply@iox.example → cliquer sur le lien "Rejoindre IOX".

### Étape 2 — Créer le compte acheteur
1. Saisir l'email professionnel
2. Choisir un mot de passe sécurisé
3. Sélectionner le rôle "Acheteur B2B"
4. Accepter les CGU
5. Confirmer l'email via le lien de vérification

### Étape 3 — Compléter le profil entreprise
1. Nom légal de l'entreprise
2. Secteur d'activité (restauration, importation, distribution, etc.)
3. Adresse de livraison principale
4. Volume d'achats estimé (annuel)
5. Sauvegarder

### Étape 4 — Parcourir le catalogue
1. Dans "Marketplace" : parcourir les catégories de produits
2. Utiliser la barre de recherche pour trouver un produit spécifique
3. Filtrer par catégorie, localisation du vendeur, disponibilité
4. Cliquer sur un produit pour voir la fiche détaillée

### Étape 5 — Envoyer une demande de devis (RFQ)
Sur la fiche produit :
1. Cliquer sur "Demander un devis"
2. Indiquer la quantité souhaitée et l'unité
3. Préciser la date de livraison souhaitée
4. Ajouter des conditions particulières (conditionnement, certificats requis, etc.)
5. Cliquer sur "Envoyer la demande"
Le vendeur reçoit une notification et dispose de 48h pour répondre.

### Étape 6 — Comparer et accepter un devis
Dans "Mes demandes de devis" :
1. Consulter les devis reçus en réponse à votre RFQ
2. Comparer les prix, quantités et conditions proposés
3. Cliquer sur "Accepter ce devis" pour le devis retenu
4. Confirmer votre acceptation

### Étape 7 — Procéder au paiement
Après acceptation du devis :
1. Vous êtes redirigé vers la page de paiement sécurisée Stripe
2. En mode test (pilote) : utiliser la carte de test fournie par l'équipe IOX
   - Numéro : `4242 4242 4242 4242`
   - Date : n'importe quelle date future
   - CVC : n'importe quels 3 chiffres
3. Confirmer le paiement
4. Vous recevez un email de confirmation immédiat

### Étape 8 — Suivi de la commande et facture
Dans "Mes commandes" :
1. Suivre le statut de la commande
2. Échanger avec le vendeur via la messagerie IOX si besoin
3. Télécharger la facture au format PDF dans "Mes transactions"

---

## 5. Support pilote

### Contact support IOX

| Canal | Contact | Disponibilité |
|---|---|---|
| WhatsApp (recommandé) | [À compléter avant lancement] | Lun-Sam 8h-18h (heure Mayotte) |
| Téléphone | [À compléter avant lancement] | Lun-Ven 9h-17h |
| Email | support@iox.example | Réponse sous 24h |

### Niveaux d'escalade

**Niveau 1 — Problème simple (réponse < 2h) :**
Compte bloqué, mot de passe oublié, problème d'upload, question fonctionnelle.
→ Contacter support WhatsApp

**Niveau 2 — Problème bloquant une transaction (réponse < 4h) :**
Paiement bloqué, erreur lors de la soumission d'un devis, RFQ disparue.
→ Contacter support téléphone + email support@iox.example

**Niveau 3 — Incident critique (réponse < 1h) :**
Plateforme inaccessible, données incorrectes ou manquantes.
→ Contacter directement l'équipe technique IOX (contact interne)

---

## 6. Formation 30 minutes — Agenda type

### Déroulement de la session de formation

**Structure recommandée pour une session groupe (5-10 participants)**

**[0-5 min] Introduction et contexte**
- Présentation de l'équipe IOX
- Objectif du pilote en 3 phrases
- Rappel : aucune donnée financière réelle pendant le pilote (mode test Stripe)
- Questions préliminaires des participants

**[5-15 min] Démonstration vendeur (coopérative)**
Démonstration en direct par le formateur IOX :
1. Connexion au compte vendeur
2. Publication d'un produit (1 minute)
3. Réception et réponse à une RFQ simulée (2 minutes)
4. Visualisation d'une transaction confirmée
5. Téléchargement d'une facture de démonstration

**[15-25 min] Démonstration acheteur**
Démonstration en direct par le formateur IOX :
1. Connexion au compte acheteur
2. Recherche d'un produit dans le catalogue
3. Envoi d'une RFQ (1 minute)
4. Réception d'un devis et acceptation simulée
5. Simulation de paiement avec carte de test

**[25-30 min] Questions et manipulation libre**
- 5 minutes de manipulation libre sur leurs propres comptes (déjà créés)
- Réponses aux questions
- Distribution du guide utilisateur papier (version imprimée de ce kit)
- Rappel du contact support WhatsApp

---

## 7. Checklist Jour 1

À vérifier le premier jour de lancement du pilote (par l'équipe IOX terrain) :

- [ ] Tous les comptes vendeurs (5 coopératives) ont reçu leur email d'invitation
- [ ] Tous les comptes acheteurs (10 acheteurs) ont reçu leur email d'invitation
- [ ] Au minimum 3 vendeurs se sont connectés et ont complété leur profil
- [ ] Au minimum 3 acheteurs se sont connectés
- [ ] Au minimum 2 vendeurs ont publié au moins 1 produit
- [ ] La messagerie IOX fonctionne (test d'un échange entre vendeur et acheteur)
- [ ] Le contact support WhatsApp est opérationnel et a été testé
- [ ] L'équipe technique IOX est en alerte monitoring (voir notes/monitoring-alerting-iox.md)
- [ ] Les logs backend ne montrent pas d'erreurs 5xx au démarrage
- [ ] Une RFQ test a été envoyée et reçue avec succès

---

## 8. Checklist Semaine 1

À vérifier en fin de première semaine d'utilisation :

- [ ] Au moins 3 coopératives ont publié un catalogue (≥2 produits chacune)
- [ ] Au moins 5 RFQ ont été créées par les acheteurs
- [ ] Au moins 70% des RFQ ont reçu une réponse du vendeur dans les 48h
- [ ] Aucun incident bloquant non résolu dans les logs de support
- [ ] Les emails de notification sont reçus (pas de plaintes de non-réception)
- [ ] Au moins 1 transaction complète (RFQ → devis → paiement test) a été effectuée
- [ ] Les retours utilisateurs informels ont été collectés (appels téléphoniques, WhatsApp)
- [ ] Un rapport de semaine 1 a été préparé (voir notes/kpi-pilote-iox.md pour le template)

---

## 9. KPI à suivre pendant le pilote

| KPI | Définition | Cible | Fréquence |
|---|---|---|---|
| Vendeurs actifs | Coopératives ayant publié ≥1 produit | ≥ 3 / 5 | Hebdomadaire |
| Acheteurs actifs | Acheteurs s'étant connectés ≥1 fois | ≥ 7 / 10 | Hebdomadaire |
| Produits publiés | Nombre total d'offres publiées | ≥ 10 | Hebdomadaire |
| RFQ créées | Demandes de devis envoyées | ≥ 5 | Hebdomadaire |
| Taux réponse RFQ | % RFQ avec réponse vendeur < 48h | ≥ 70% | Hebdomadaire |
| Taux conversion | % RFQ converties en transaction | ≥ 30% | Fin pilote |

---

## 10. Fiche retour utilisateur — Template de collecte de feedback

À distribuer en fin de pilote (semaine 7-8) ou par email via un formulaire simple.

---

### Fiche retour IOX — Pilote terrain 2026

**Participant :** (coopérative / acheteur)
**Date :**

**Section 1 — Prise en main (noter de 1 à 5)**

| Question | 1 (très difficile) | 2 | 3 | 4 | 5 (très facile) |
|---|---|---|---|---|---|
| La création de mon compte a été facile | | | | | |
| La publication d'un produit a été facile (vendeur) | | | | | |
| L'envoi d'une RFQ a été facile (acheteur) | | | | | |
| La réponse à une RFQ a été facile (vendeur) | | | | | |
| Le paiement/la confirmation a été facile | | | | | |

**Section 2 — Valeur perçue (noter de 1 à 5)**

| Question | 1 (pas du tout) | 2 | 3 | 4 | 5 (tout à fait) |
|---|---|---|---|---|---|
| IOX me fait gagner du temps | | | | | |
| IOX est plus pratique que mes méthodes actuelles | | | | | |
| Je ferais confiance à IOX pour de vraies transactions | | | | | |

**Section 3 — Satisfaction globale**

Note globale (1 à 10) : ___/10

**Section 4 — Problèmes rencontrés**

*Décrivez les 1 à 3 principaux problèmes ou difficultés rencontrés :*

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

**Section 5 — Suggestions d'amélioration**

*Qu'est-ce qui vous aiderait le plus à utiliser IOX au quotidien ?*

_______________________________________________
_______________________________________________

**Section 6 — Continuation d'usage**

Utiliseriez-vous IOX après le pilote si la plateforme était disponible en production ?
- [ ] Oui, absolument
- [ ] Oui, si [condition] : _______________
- [ ] Probablement pas
- [ ] Non

**Merci pour votre retour. Votre avis nous aide à améliorer IOX.**
Contact : support@iox.example | WhatsApp : [À compléter]

---

*Ce kit est à distribuer à chaque participant pilote. Conserver une version imprimée pour les sessions de formation terrain.*
