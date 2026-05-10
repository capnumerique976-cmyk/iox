# Politique de Confidentialité — IOX

> **DOCUMENT TEMPLATE — À COMPLÉTER**
> Ce document est un modèle de politique de confidentialité pour la plateforme IOX.
> Tous les champs marqués [À compléter] doivent être renseignés avec les informations réelles avant publication.
> Ne pas publier ce document en l'état. Faire valider par un professionnel du droit ou un DPO qualifié.

---

## Politique de Confidentialité et Protection des Données Personnelles

**Version** : [À compléter]
**Date d'entrée en vigueur** : [À compléter]

La présente Politique de Confidentialité décrit la manière dont [À compléter — NOM DE LA SOCIÉTÉ] (ci-après « IOX », « nous », « notre ») collecte, utilise, conserve et protège les données à caractère personnel des utilisateurs de la plateforme IOX accessible à l'adresse [iox.example] (ci-après « la Plateforme »).

IOX s'engage à traiter vos données personnelles dans le strict respect du **Règlement (UE) 2016/679 du Parlement européen et du Conseil** du 27 avril 2016 (RGPD) et de la **loi n° 78-17 du 6 janvier 1978** relative à l'informatique, aux fichiers et aux libertés (loi Informatique et Libertés), dans ses versions en vigueur.

---

## Article 1 — Responsable de Traitement

Le responsable du traitement de vos données personnelles est :

- **Raison sociale** : [À compléter — NOM DE LA SOCIÉTÉ]
- **Forme juridique** : [À compléter]
- **Siège social** : [À compléter — ADRESSE COMPLÈTE, CODE POSTAL, VILLE]
- **SIREN** : [À compléter]
- **E-mail** : [À compléter — rgpd@iox.example]
- **Téléphone** : [À compléter]

### Référent RGPD / DPO
[À compléter selon le cas — l'une des options suivantes :]

**Option A — Référent interne (si pas de DPO obligatoire) :**
Un référent RGPD interne a été désigné pour assurer le suivi de la conformité. Pour toute question relative à vos données personnelles, vous pouvez le contacter à l'adresse : [À compléter — rgpd@iox.example]

**Option B — DPO désigné :**
Un Délégué à la Protection des Données (DPO) a été désigné. Vous pouvez le contacter à :
- **Nom** : [À compléter]
- **E-mail** : [À compléter — dpo@iox.example]
- **Adresse** : [À compléter]

---

## Article 2 — Données Collectées par Catégorie

### 2.1 Données d'identification et de contact
Collectées lors de la création de compte et de l'utilisation de la plateforme :
- Nom, prénom du contact principal
- Adresse e-mail (identifiant de connexion)
- Numéro de téléphone (optionnel)
- Raison sociale de l'entreprise / coopérative

### 2.2 Données de l'entreprise
- Raison sociale et forme juridique
- Numéro SIREN / SIRET ou équivalent étranger [À vérifier : collecté ?]
- Adresse du siège social
- Pays d'établissement
- Secteur d'activité

### 2.3 Données de compte et d'authentification
- Mot de passe (stocké sous forme hachée — jamais lisible par IOX)
- Rôle sur la plateforme (COOPERATIVE vendeur / BUYER acheteur)
- Date et heure de création du compte
- Historique des connexions (adresse IP, date/heure, user-agent)
- Tokens d'authentification (session)

### 2.4 Données commerciales et transactionnelles
- Contenu des demandes de devis (RFQ) : produits, quantités, conditions, commentaires
- Offres soumises par les Coopératives
- Messages échangés entre vendeurs et acheteurs via la messagerie de la plateforme
- Historique des transactions et statuts
- Montants des transactions
- Factures et documents commerciaux
- Documents d'exportation [si applicables]

### 2.5 Données financières
Les données de paiement (numéros de carte bancaire, coordonnées IBAN) sont traitées **exclusivement par Stripe** et ne sont jamais stockées sur les serveurs d'IOX. IOX conserve uniquement :
- Les identifiants de transaction Stripe
- Les montants et statuts de paiement
- Les données de compte Stripe Connect des Coopératives (nécessaires aux versements)

### 2.6 Données techniques
- Adresses IP (collectées dans les logs serveur)
- Type et version du navigateur (user-agent)
- Pages consultées et actions effectuées sur la plateforme (logs applicatifs)
- Données de cookies (voir Article 8)

---

## Article 3 — Finalités et Bases Légales des Traitements

| Finalité du traitement | Données concernées | Base légale (Art. 6 RGPD) |
|---|---|---|
| Création et gestion des comptes utilisateurs | Identification, contact, authentification | Exécution du contrat (6.1.b) |
| Fourniture des services de mise en relation (RFQ) | Données commerciales, messages | Exécution du contrat (6.1.b) |
| Traitement des paiements | Données financières (via Stripe) | Exécution du contrat (6.1.b) |
| Envoi d'e-mails transactionnels (confirmations, alertes) | E-mail, données de transaction | Exécution du contrat (6.1.b) |
| Facturation et archivage comptable | Données financières, factures | Obligation légale (6.1.c) |
| Prévention des fraudes et sécurité | Logs techniques, IP | Intérêt légitime (6.1.f) |
| Amélioration des services (analyse d'usage) | Données techniques, logs | Intérêt légitime (6.1.f) ou Consentement (6.1.a) [selon outil] |
| Communications marketing / newsletters | E-mail | Consentement (6.1.a) [si applicable] |
| Respect des obligations légales | Selon traitement | Obligation légale (6.1.c) |

---

## Article 4 — Durées de Conservation

Vos données ne sont conservées que le temps nécessaire aux finalités pour lesquelles elles ont été collectées, et dans le respect des obligations légales.

| Catégorie de données | Durée de conservation | Fondement |
|---|---|---|
| Données de compte (actif) | Durée de la relation contractuelle | — |
| Données de compte (après clôture) | 3 ans après la clôture du compte | Prescription civile (Art. 2224 C.civ.) |
| Données de transactions et contrats | 5 ans après la transaction | Prescription commerciale |
| Factures et pièces comptables | 10 ans | Obligation légale (Code de commerce, Art. L.123-22) |
| Logs applicatifs et techniques | 12 mois maximum | Recommandation CNIL |
| Données de connexion (IP, sessions) | 12 mois maximum | Recommandation CNIL |
| Données de paiement Stripe | Selon politique Stripe (hors stockage IOX) | — |
| Consentement cookies | 6 mois (renouvellement du recueil) | Recommandation CNIL |

À l'expiration de ces délais, les données sont supprimées ou anonymisées de manière irréversible.

---

## Article 5 — Destinataires des Données

### 5.1 Au sein d'IOX
L'accès à vos données est strictement limité aux personnes habilitées au sein d'IOX, dans la limite de leurs attributions :
- Équipe technique (accès restreint aux données nécessaires à la maintenance)
- Équipe commerciale / support (accès aux données nécessaires à l'assistance)
- Direction (accès aux données de reporting agrégées)

### 5.2 Sous-traitants (prestataires techniques)

IOX fait appel aux sous-traitants suivants, avec lesquels des contrats de traitement des données conformes au RGPD sont conclus :

| Sous-traitant | Rôle | Localisation |
|---|---|---|
| **Stripe, Inc.** | Traitement des paiements, Stripe Connect | USA (avec garanties — voir Article 7) |
| **Resend** | Envoi d'e-mails transactionnels | [À compléter — pays d'hébergement] |
| **[Hébergeur VPS]** | Hébergement de l'infrastructure (serveurs, base de données) | [À compléter — UE de préférence] |
| **MinIO** [si cloud] | Stockage de fichiers et documents | [À compléter] |

### 5.3 Tiers autorisés
IOX peut être amenée à communiquer vos données à des tiers dans les cas suivants :
- Sur réquisition judiciaire ou demande d'une autorité compétente
- En cas de fusion, acquisition ou cession d'activité (avec information préalable)

IOX ne vend jamais vos données personnelles à des tiers.

---

## Article 6 — Droits des Personnes Concernées

Conformément au RGPD, vous disposez des droits suivants sur vos données personnelles :

### 6.1 Droit d'accès (Art. 15 RGPD)
Vous pouvez obtenir la confirmation que des données vous concernant sont traitées et, le cas échéant, en obtenir une copie.

### 6.2 Droit de rectification (Art. 16 RGPD)
Vous pouvez demander la correction de données inexactes ou incomplètes vous concernant.

### 6.3 Droit à l'effacement (Art. 17 RGPD)
Vous pouvez demander la suppression de vos données, sous réserve des obligations légales de conservation (comptabilité, obligations fiscales, etc.).

### 6.4 Droit à la portabilité (Art. 20 RGPD)
Vous pouvez recevoir vos données dans un format structuré, couramment utilisé et lisible par machine, et les transmettre à un autre responsable de traitement.

### 6.5 Droit d'opposition (Art. 21 RGPD)
Vous pouvez vous opposer au traitement de vos données fondé sur l'intérêt légitime d'IOX (notamment pour les communications marketing).

### 6.6 Droit à la limitation (Art. 18 RGPD)
Vous pouvez demander la suspension temporaire du traitement de vos données dans certains cas (contestation de l'exactitude, traitement illicite, etc.).

### 6.7 Droit de retrait du consentement
Lorsque le traitement est fondé sur votre consentement, vous pouvez le retirer à tout moment, sans que cela affecte la licéité du traitement antérieur.

### Comment exercer vos droits
Pour exercer l'un de ces droits, vous pouvez :
- **Par e-mail** : [À compléter — rgpd@iox.example]
- **Par courrier** : [À compléter — adresse du responsable de traitement]

IOX s'engage à répondre à votre demande dans un délai d'**un mois** à compter de la réception. Ce délai peut être prorogé de deux mois supplémentaires en cas de demande complexe ou nombreuse (vous en serez informé dans ce cas).

Une pièce d'identité peut vous être demandée pour vérifier votre identité avant de traiter votre demande.

### Réclamation auprès de la CNIL
Si vous estimez que le traitement de vos données n'est pas conforme au RGPD, vous disposez du droit d'introduire une réclamation auprès de la **Commission Nationale de l'Informatique et des Libertés (CNIL)** :
- Site web : [www.cnil.fr](https://www.cnil.fr)
- Adresse : 3 Place de Fontenoy — TSA 80715 — 75334 Paris Cedex 07
- Téléphone : 01 53 73 22 22

---

## Article 7 — Transferts de Données Hors de l'Union Européenne

Certains de nos sous-traitants sont établis hors de l'Union Européenne. Dans ce cas, IOX s'assure que des garanties appropriées sont mises en place conformément au Chapitre V du RGPD.

### 7.1 Stripe (USA)
**Stripe, Inc.** est établie aux États-Unis. Le transfert de données vers Stripe est encadré par :
- Les **Clauses Contractuelles Types (CCT)** adoptées par la Commission européenne, intégrées dans les conditions de traitement des données de Stripe ;
- Le cas échéant, le cadre **EU-US Data Privacy Framework** (si applicable et valide au moment du traitement).

Vous pouvez consulter la politique de confidentialité de Stripe à l'adresse : [stripe.com/fr/privacy](https://stripe.com/fr/privacy)

### 7.2 Resend
[À compléter selon localisation : si hors UE, décrire les garanties applicables (CCT, pays adéquat, etc.)]

### 7.3 Principe général
IOX s'engage à ne transférer des données hors de l'UE qu'en présence de garanties adéquates et documentées, et à ne pas réaliser de transferts vers des pays ne bénéficiant pas d'une décision d'adéquation de la Commission européenne sans avoir mis en place les mécanismes appropriés.

---

## Article 8 — Cookies et Traceurs

### 8.1 Définition
Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, tablette, smartphone) lors de votre visite sur la Plateforme.

### 8.2 Cookies strictement nécessaires (exemptés de consentement)
Ces cookies sont indispensables au fonctionnement de la Plateforme. Ils ne peuvent pas être désactivés.

| Cookie | Finalité | Durée |
|---|---|---|
| Cookie de session / authentification | Maintien de la connexion | Durée de la session |
| Cookie CSRF | Protection contre les attaques CSRF | Durée de la session |
| [À compléter] | [À compléter] | [À compléter] |

### 8.3 Cookies analytiques (soumis à consentement)
Ces cookies nous permettent de mesurer l'audience de la Plateforme et d'améliorer nos services. Ils ne sont déposés qu'avec votre consentement préalable.

| Outil | Finalité | Durée | Transfert hors UE |
|---|---|---|---|
| [À compléter — ex. : Plausible / Matomo / Google Analytics] | Analyse d'audience | [À compléter] | [À compléter] |

### 8.4 Cookies marketing (soumis à consentement)
[À compléter selon les outils marketing utilisés, le cas échéant]

### 8.5 Gestion de vos préférences
Lors de votre première visite sur la Plateforme, un bandeau vous informe de l'utilisation des cookies et vous permet de les accepter ou de les refuser. Vous pouvez modifier vos préférences à tout moment via [À compléter — lien vers le gestionnaire de cookies / paramètres de la plateforme].

Vous pouvez également configurer votre navigateur pour bloquer ou supprimer les cookies. Cependant, certaines fonctionnalités de la Plateforme pourraient ne plus fonctionner correctement.

---

## Article 9 — Sécurité des Données

IOX met en oeuvre les mesures techniques et organisationnelles appropriées pour assurer la sécurité de vos données personnelles, notamment :
- Chiffrement des communications en transit (HTTPS / TLS)
- Chiffrement des mots de passe (hachage bcrypt)
- Accès aux données restreint par rôle (principe du moindre privilège)
- Journalisation des accès et des opérations sensibles
- [À compléter selon les mesures effectivement en place — ex. : chiffrement au repos, sauvegardes régulières, etc.]

En cas de violation de données à caractère personnel susceptible d'engendrer un risque pour vos droits et libertés, IOX s'engage à notifier la CNIL dans les 72 heures conformément à l'article 33 du RGPD, et à vous informer dans les meilleurs délais si le risque est élevé.

---

## Article 10 — Modifications de la Politique de Confidentialité

IOX se réserve le droit de modifier la présente Politique de Confidentialité à tout moment. Les modifications substantielles vous seront notifiées par e-mail ou par notification sur la Plateforme, au moins [À compléter — ex. : 30 jours] avant leur entrée en vigueur.

La version en vigueur est toujours accessible sur la Plateforme à l'adresse : [À compléter — lien].

---

## Article 11 — Contact

Pour toute question relative à la présente Politique de Confidentialité ou au traitement de vos données personnelles :

- **E-mail** : [À compléter — rgpd@iox.example]
- **Adresse postale** : [À compléter — NOM DE LA SOCIÉTÉ, ADRESSE, VILLE]
- **Téléphone** : [À compléter]

---

*Dernière mise à jour : [À compléter — date]*
