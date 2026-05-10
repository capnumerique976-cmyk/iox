# Checklist RGPD — IOX Marketplace B2B

> **DOCUMENT DE TRAVAIL — TEMPLATE**
> Ce document est un support interne destiné à préparer la mise en conformité RGPD de la plateforme IOX.
> Il ne constitue pas un avis juridique. Faire valider par un juriste ou un DPO qualifié avant mise en production.
> Dernière mise à jour : [À compléter]

---

## 1. Données collectées

### 1.1 Données utilisateurs (comptes)
- Nom, prénom
- Adresse e-mail (identifiant de connexion)
- Numéro de téléphone (optionnel)
- Rôle sur la plateforme : COOPERATIVE (vendeur) ou BUYER (acheteur B2B)
- Mot de passe (haché bcrypt, jamais stocké en clair)
- Date de création du compte
- Historique de connexion (logs)

### 1.2 Données entreprises
- Raison sociale
- Numéro SIREN / SIRET [À vérifier : collecté ou non ?]
- Adresse du siège social
- Pays (pour les acheteurs hors France)
- Coordonnées bancaires via Stripe Connect (non stockées en base IOX — hébergées chez Stripe)

### 1.3 Données RFQ (demandes de devis)
- Produit(s) demandé(s), quantité, unité
- Prix cible (optionnel)
- Conditions de livraison (Incoterm)
- Délai souhaité
- Commentaires libres
- Statut du RFQ et historique des transitions
- Messages échangés entre vendeur et acheteur

### 1.4 Données financières / transactions
- Montant des transactions (via Stripe)
- Frais de plateforme (5 % de commission)
- Factures générées
- Relevés Stripe Connect
- Données de paiement : gérées exclusivement par Stripe — IOX ne stocke aucune donnée de carte bancaire

### 1.5 Données techniques
- Adresses IP (logs applicatifs et serveur)
- User-agent navigateur
- Tokens d'authentification (JWT / session)
- Logs d'erreurs

---

## 2. Bases légales des traitements

| Traitement | Base légale (Art. 6 RGPD) |
|---|---|
| Création et gestion du compte | Exécution du contrat (6.1.b) |
| Traitement des RFQ et commandes | Exécution du contrat (6.1.b) |
| Paiements via Stripe | Exécution du contrat (6.1.b) |
| Facturation et archivage comptable | Obligation légale (6.1.c) — loi française : 10 ans |
| Envoi d'e-mails transactionnels (Resend) | Exécution du contrat (6.1.b) |
| Newsletters / communications marketing | Consentement (6.1.a) — [À vérifier : fonctionnalité existante ?] |
| Logs techniques / sécurité | Intérêt légitime (6.1.f) — sécurité, détection fraude |
| Cookies analytiques | Consentement (6.1.a) — bandeaux requis |
| Cookies strictement nécessaires | Pas de base légale requise (exemptés) |

---

## 3. Durées de conservation

| Catégorie | Durée | Justification |
|---|---|---|
| Données de compte actif | Durée de la relation contractuelle | — |
| Données de compte clôturé | 3 ans après clôture | Prescription civile (Art. 2224 C.civ.) |
| Factures et données comptables | 10 ans | Obligation légale (Code de commerce L.123-22) |
| Données RFQ / transactions | 5 ans après la transaction | Prescription commerciale |
| Logs applicatifs | 12 mois | Recommandation CNIL |
| Logs de sécurité | 12 mois | Recommandation CNIL |
| Données de paiement Stripe | Selon politique Stripe (hors stockage IOX) | — |
| Tokens de session | Durée de session (+ invalidation à déconnexion) | — |

---

## 4. Droits des personnes concernées

### Droits applicables
- [ ] **Droit d'accès** (Art. 15) : l'utilisateur peut demander une copie de ses données
- [ ] **Droit de rectification** (Art. 16) : correction des données inexactes
- [ ] **Droit à l'effacement** (Art. 17) : suppression du compte et des données (sauf obligations légales)
- [ ] **Droit à la portabilité** (Art. 20) : export des données dans un format lisible par machine (JSON ou CSV)
- [ ] **Droit d'opposition** (Art. 21) : opposition aux traitements fondés sur l'intérêt légitime
- [ ] **Droit à la limitation** (Art. 18) : gel du traitement pendant une contestation

### Implémentation technique
- [ ] Page "Mon compte" avec export de données (portabilité)
- [ ] Bouton de suppression de compte (avec délai de grâce : [À définir])
- [ ] Formulaire de contact RGPD : [À compléter — email dédié ex. : rgpd@iox.example]
- [ ] Délai de réponse : 1 mois (prorogeable de 2 mois si complexité)
- [ ] Vérification d'identité avant communication des données

---

## 5. Sous-traitants (DPA — Data Processing Agreements)

| Sous-traitant | Usage | DPA disponible | Localisation |
|---|---|---|---|
| **Stripe** | Paiements, Stripe Connect | Oui (stripe.com/legal/dpa) | USA (SCCs) + UE |
| **Resend** | E-mails transactionnels | Oui (resend.com/legal/dpa) | [À vérifier] |
| **MinIO** | Stockage fichiers (documents, exports) | [À vérifier — auto-hébergé ou cloud ?] | [À préciser] |
| **PostgreSQL** | Base de données (auto-hébergé VPS) | N/A — auto-hébergé | [Localisation VPS — À préciser] |
| **VPS Provider** | Hébergement infrastructure | [À compléter — OVH, Scaleway, etc.] | UE de préférence |

### Actions requises
- [ ] Signer ou accepter le DPA Stripe
- [ ] Signer ou accepter le DPA Resend
- [ ] Si MinIO cloud : identifier le DPA applicable
- [ ] Documenter tous les sous-traitants dans le registre des activités de traitement (RAT)

---

## 6. Registre des activités de traitement (RAT)

Obligation selon Art. 30 RGPD pour toute organisation traitant des données personnelles.

- [ ] Créer le RAT (modèle disponible sur le site de la CNIL)
- [ ] Documenter chaque traitement : finalité, base légale, catégories de données, destinataires, durée, mesures de sécurité
- [ ] Mettre à jour le RAT à chaque nouveau traitement ou modification substantielle

---

## 7. Consentement aux cookies (Next.js frontend)

### Cookies strictement nécessaires (exemptés de consentement)
- Cookie de session / authentification JWT
- Cookie CSRF
- Cookie de préférence de langue (si fonctionnel)

### Cookies nécessitant consentement
- [ ] Analytics (ex. : Plausible, Matomo, Google Analytics — [À vérifier : outil utilisé ?])
- [ ] Traceurs marketing (si applicable)

### Implémentation requise
- [ ] Bannière de cookies conforme CNIL (opt-in, refus aussi simple qu'accepter)
- [ ] Pas de dépôt de cookies analytiques avant consentement
- [ ] Durée de conservation du consentement : 6 mois maximum (recommandation CNIL)
- [ ] Possibilité de retirer le consentement à tout moment

### Recommandation
Utiliser une bibliothèque de gestion de consentement (ex. : `cookie-consent`, `Klaro`, `Axeptio`) intégrable avec Next.js.

---

## 8. Privacy by Design & Privacy by Default

### Mesures à vérifier
- [ ] Minimisation des données : ne collecter que ce qui est strictement nécessaire
- [ ] Pseudonymisation des logs (hachage des IPs après 7 jours ?)
- [ ] Chiffrement en transit : HTTPS / TLS partout (y compris communication API interne)
- [ ] Chiffrement au repos : base de données et stockage fichiers [À vérifier]
- [ ] Accès aux données restreint par rôle (RBAC) : les acheteurs ne voient pas les données d'autres acheteurs
- [ ] Séparation des environnements dev / staging / production (pas de données réelles en dev)
- [ ] Politique de mots de passe robuste (hashage bcrypt, longueur minimale)
- [ ] Journalisation des accès administrateurs
- [ ] Revue régulière des droits d'accès (utilisateurs internes)

---

## 9. Violation de données — Procédure de notification (Art. 33-34 RGPD)

### Délais impératifs
- **72 heures** après la prise de connaissance : notification à la CNIL (si risque pour les personnes)
- **Sans délai** : information des personnes concernées (si risque élevé)

### Procédure interne à définir
- [ ] Désigner un référent interne pour la gestion des incidents
- [ ] Documenter la procédure de détection et d'escalade
- [ ] Créer un registre des violations (même si non notifiées à la CNIL)
- [ ] Préparer un modèle de notification CNIL (téléchargeable sur notifications.cnil.fr)
- [ ] Préparer un modèle de communication aux personnes concernées

### Notification CNIL
Formulaire disponible sur : [notifications.cnil.fr](https://notifications.cnil.fr)

---

## 10. DPO (Délégué à la Protection des Données)

### Obligation de désigner un DPO
Selon l'Art. 37 RGPD, la désignation d'un DPO est obligatoire si :
- L'organisation est une autorité publique → **Non applicable**
- Les activités principales impliquent un suivi régulier et systématique à grande échelle → **À évaluer**
- Les activités principales impliquent un traitement à grande échelle de données sensibles → **Non applicable (pas de données sensibles)**

### Conclusion probable pour IOX (startup / PME)
La désignation d'un DPO n'est **vraisemblablement pas obligatoire** à ce stade, compte tenu de la taille de la structure et du volume de données traitées. Cependant :

- [ ] Documenter cette analyse et la conserver
- [ ] Désigner un **référent RGPD interne** (même sans obligation légale) : [À compléter — Nom / Fonction]
- [ ] Réévaluer l'obligation si la plateforme dépasse un seuil significatif d'utilisateurs
- [ ] Si DPO désigné volontairement : déclarer à la CNIL via le portail de notification

---

## 11. Analyse d'Impact (AIPD / PIA)

Une AIPD est requise si le traitement est susceptible d'engendrer un risque élevé (Art. 35 RGPD).

### Critères à vérifier (CNIL — liste des types d'opérations)
- Données financières sensibles → **Oui (transactions)** — risque modéré car délégué à Stripe
- Données de localisation → **Non (pas de géolocalisation temps réel)**
- Profiling → **Non (pas de scoring automatisé)**
- Données à grande échelle → **À évaluer selon le volume utilisateurs**

### Recommandation
AIPD non obligatoire a priori pour IOX à ce stade, mais recommandée pour le traitement des données financières et des documents d'identité/entreprise si collectés.

---

## 12. Transferts hors UE

| Sous-traitant | Pays | Mécanisme de transfert |
|---|---|---|
| Stripe | USA | SCCs (Standard Contractual Clauses) + Adequacy Framework |
| Resend | [À vérifier] | [À vérifier] |

- [ ] Vérifier que les SCCs sont bien intégrées dans les contrats Stripe et Resend
- [ ] S'assurer que le VPS est hébergé dans l'UE

---

## Prochaines étapes

1. [ ] Faire rédiger / valider la politique de confidentialité par un juriste
2. [ ] Publier les mentions légales, CGU, et politique de confidentialité sur le site
3. [ ] Implémenter la bannière de cookies conforme CNIL
4. [ ] Créer le Registre des Activités de Traitement (RAT)
5. [ ] Signer les DPA avec Stripe et Resend
6. [ ] Désigner un référent RGPD interne
7. [ ] Former l'équipe aux bonnes pratiques RGPD
