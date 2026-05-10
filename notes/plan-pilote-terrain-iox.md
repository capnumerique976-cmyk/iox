# Plan Pilote Terrain — IOX Mayotte

> Document stratégique opérationnel — version 2026-05-10.  
> Toutes les projections financières et volumétriques sont marquées **[HYPOTHÈSE]**.

---

## 1. Objectif du pilote

Valider la plateforme IOX dans des conditions réelles avec un panel représentatif de l'économie locale de Mayotte, avant un déploiement large.

**Périmètre** :
- **3 à 5 coopératives vendeurs** (producteurs de vanille, ylang-ylang, épices locales)
- **1 acheteur B2B réel** (importateur, distributeur bio, grossiste RHF)
- **Durée : 3 mois** (12 semaines)
- **Résultat attendu** : au moins 1 transaction complète (RFQ → WON → paiement Stripe reçu)

**Ce que le pilote ne couvre pas** : scale (pas de SEO, pas de campagne marketing), internationalisation complète, multi-devises avancé.

---

## 2. Critères de sélection des vendeurs pilotes

### 2.1 Critères obligatoires

| Critère | Détail | Vérification |
|---|---|---|
| Produit certifié ou en cours de certification | Vanille label rouge, ylang AOC, épices biologiques certifiées | Document de certification à uploader sur IOX |
| Dirigeant disponible | 2h pour la formation initiale + 30 min de suivi J14 et J30 | Engagement écrit (email suffit) |
| Compte bancaire local | Nécessaire pour le KYC Stripe Connect — compte au nom de la structure (SICA, GIE, coopérative) | RIB + Kbis ou statuts |
| Téléphone avec connexion data | Pour accéder à la plateforme — 4G suffit | Test de connexion lors du J0 |

### 2.2 Critères préférentiels (bonus)

- Expérience d'export antérieure (même informelle)
- Présence d'un jeune relais numérique au sein de la coopérative
- Produit avec une fiche technique existante (même basique)
- Coopérative déjà en relation avec la MCH (Mayotte Commerce Halal) ou une structure d'accompagnement

### 2.3 Critères d'exclusion

- Structure sans personnalité morale (particulier non enregistré)
- Dirigeant non joignable ou en phase de succession
- Produit sans aucune traçabilité ni document (bloquerait le KYC)

### 2.4 Sourcing recommandé

- Réseau MCH et SICA locales
- Chambre de Commerce et d'Industrie de Mayotte
- Programme LEADER / FEADER agricole Mayotte
- Contacts directs via le réseau terrain de l'équipe IOX

---

## 3. Étapes d'onboarding vendeur (timeline)

### J0 — Invitation & création de compte

- [ ] Envoi d'un email d'invitation personnalisé depuis IOX (lien d'activation)
- [ ] Appel téléphonique de bienvenue par le référent terrain (10–15 min) — expliquer le pilote, les étapes, les bénéfices
- [ ] Vérification que le vendeur peut se connecter sur mobile ou tablette
- [ ] Création du compte utilisateur avec rôle `MARKETPLACE_SELLER`
- [ ] Livraison d'un guide de démarrage (PDF A4 simple, en français, idéalement aussi en shimaoré pour les explications orales)

**Durée estimée** : 1h maximum (appel + création compte).

---

### J1–J3 — Profil, produits, certifications

- [ ] Remplissage du profil vendeur (seller profile) : nom de la coopérative, description, localisation
- [ ] Upload des documents de conformité (certifications, statuts, Kbis)
- [ ] Création de 1 à 3 produits avec photos et description
- [ ] Review par l'équipe IOX (rôle QUALITY_MANAGER) — feedback dans 24h

**Points de friction anticipés** :
- Photos : souvent prises avec un smartphone en lumière insuffisante — prévoir des conseils photos (PDF)
- Description produit : barrière de la langue écrite — proposer un template pré-rempli à adapter
- Upload documents : format PDF parfois non disponible — accepter JPG haute qualité

---

### J7 — Stripe Connect KYC initié

- [ ] Entretien guidé avec le référent terrain (30 min, en présentiel ou visio)
- [ ] Démarrage du flux Stripe Connect depuis le dashboard IOX (endpoint `/api/v1/payments/seller/onboard`)
- [ ] Vérification des pièces requises : CNI dirigeant, RIB, justificatif structure
- [ ] Soumission du dossier KYC Stripe

**Points de friction anticipés** :
- CNI expirée ou illisible — prévoir un délai de 3–5 jours pour renouvellement
- Compte bancaire au nom d'un particulier et non de la structure — bloquerait le KYC (critère d'exclusion J0 à vérifier)
- Connexion lente lors de l'upload des documents KYC (pièces jointes volumineuses)

**Délai Stripe** : validation KYC standard en 1–5 jours ouvrés. En cas de demande d'informations complémentaires, compter jusqu'à 14 jours.

---

### J14 — Première offre PUBLISHED

- [ ] Création d'une offre marketplace (prix, devise EUR, conditions de livraison, MOQ)
- [ ] Passage en revue par QUALITY_MANAGER → statut `PUBLISHED`
- [ ] Vérification que l'offre est visible dans le catalogue public
- [ ] Briefing vendeur : comment répondre à une RFQ (expliqué oralement + guide)

**Objectif** : 100% des vendeurs pilotes ont au moins 1 offre publiée à J14.

---

### J30 — Première RFQ reçue

- [ ] L'acheteur pilote soumet une RFQ sur l'offre du vendeur
- [ ] Le vendeur reçoit une notification email (queue `iox.email`)
- [ ] Le vendeur répond via l'interface (ou guidé par le référent terrain)
- [ ] Suivi du statut RFQ : NEW → NEGOTIATING → QUOTED

**Objectif** : au moins 1 RFQ reçue par vendeur pilote à J30.

---

### J60–J90 — Transaction complète

- [ ] RFQ aboutit à un statut WON (ou LOST avec feedback)
- [ ] Si WON : paiement initié par l'acheteur via Stripe Checkout
- [ ] Paiement reçu sur le compte Stripe Connect du vendeur
- [ ] Collecte des retours vendeur (NPS + interview 15 min)

---

## 4. Profil de l'acheteur pilote

### 4.1 Profil cible

| Critère | Description |
|---|---|
| Secteur | Importateur alimentaire spécialisé (bio, exotique, épicerie fine), distributeur RHF (Restauration Hors Foyer), grossiste export DOM-TOM |
| Localisation | Réunion, Métropole (Marseille, Paris), ou pays francophones (Maurice, Madagascar) |
| Volume | Capable de passer une commande test de 50–200 kg (vanille) ou équivalent |
| Profil numérique | À l'aise avec les plateformes B2B en ligne |
| Motivation | Sourcing direct producteur, traçabilité, prix compétitifs, démarche RSE |

### 4.2 Comment recruter l'acheteur pilote

**Canaux prioritaires** :
1. Réseau direct fondateurs IOX (le plus rapide et fiable)
2. Clusters alimentaires régionaux : PRIDES agroalimentaire Réunion, clusters épicerie fine Métropole
3. Salons professionnels : SIRHA, SIAL, salons bio (BioFach)
4. LinkedIn : recherche `acheteur import alimentaire épices DOM-TOM`
5. Partenaires commerciaux MCH existants

**Engagement acheteur pilote** :
- Accès gratuit pendant 3 mois (pas de commission sur la 1ère transaction)
- Brief de 30 min avant J30 pour comprendre le flux RFQ
- Feedback structuré à J30 et J90 (30 min d'interview)

---

## 5. Métriques de succès du pilote

### 5.1 Métriques primaires (Go / No-Go pour déploiement large)

| Métrique | Seuil de succès | Mesure |
|---|---|---|
| Transactions complètes | ≥ 1 transaction RFQ → WON → paiement reçu | Via dashboard IOX + Stripe |
| NPS vendeur | ≥ 7/10 | Questionnaire J90 |
| Temps d'onboarding | < 2h de J0 à première offre PUBLISHED | Mesure manuelle référent terrain |
| Taux KYC validé | ≥ 80% des vendeurs pilotes | Stripe Connect dashboard |

### 5.2 Métriques secondaires (apprentissage)

| Métrique | Objectif | Mesure |
|---|---|---|
| Offres publiées | ≥ 3 offres / vendeur à J30 | `GET /api/v1/health/ops` → publications |
| RFQ reçues | ≥ 1 RFQ / vendeur à J60 | Dashboard IOX |
| Taux de réponse RFQ | ≥ 70% (vendeur répond dans 72h) | Dashboard IOX |
| Bugs bloquants signalés | 0 à J30 | Sentry + feedback terrain |
| Satisfaction acheteur | ≥ 7/10 | Questionnaire J90 |

### 5.3 Signaux d'arrêt anticipé (Red flags)

- 0 offre publiée à J21 (problème KYC ou d'adoption)
- Taux d'erreur Stripe webhook > 5% (problème technique paiement)
- Abandon > 50% des vendeurs avant J14

---

## 6. Risques terrain et mitigations

### 6.1 Connectivité Mayotte

**Risque** : couverture 4G inégale, surtout dans les zones rurales et montagneuses (Bandraboua, Kani-Kéli, Bouéni). Uptime réseau parfois limité.

**Mitigation** :
- Optimiser le frontend pour les connexions lentes (lazy loading images, PWA offline-ready)
- Proposer des sessions d'onboarding depuis un lieu avec WiFi fiable (locaux MCH, mairie)
- Fournir un numéro de support WhatsApp pour les problèmes de connexion
- [HYPOTHÈSE] Tester la plateforme sur une connexion 3G simulée avant le pilote

---

### 6.2 Langue

**Risque** : le français peut être une barrière pour les dirigeants de coopératives âgés ou peu scolarisés. Le shimaoré est la langue du quotidien.

**Mitigation** :
- Préparer un guide d'onboarding illustré (icônes > texte)
- Formation en présentiel avec un accompagnateur bilingue français/shimaoré
- Glossaire des termes clés (RFQ = "demande de prix", offre = "ce que je vends", KYC = "vérification d'identité")
- Ne pas rendre la plateforme en shimaoré pour le pilote (trop coûteux) — s'appuyer sur l'oral

---

### 6.3 Mobile-first

**Risque** : la majorité des utilisateurs n'auront pas d'ordinateur. Le frontend doit être utilisable sur un smartphone Android d'entrée de gamme (écran 5", 2 Go RAM, Chrome Android).

**Mitigation** :
- Tester le parcours critique (création offre, réponse RFQ) sur un device Android bas de gamme avant J0
- S'assurer que tous les formulaires sont utilisables avec un clavier mobile
- Éviter les uploads de fichiers > 5 Mo (compression côté client si possible)
- [HYPOTHÈSE] 90% des sessions pilotes seront sur mobile

---

### 6.4 KYC bancaire Stripe

**Risque** : Stripe Connect impose des exigences KYC strictes. Les structures informelles ou les comptes bancaires au nom d'un particulier peuvent bloquer le flux.

**Mitigation** :
- Qualifier strictement les vendeurs pilotes sur ce point dès J0 (critère d'exclusion)
- Préparer une checklist KYC à remettre au vendeur avant J7 : CNI valide, RIB structure, justificatif légal
- Avoir un contact Stripe disponible pour les cas difficiles (Stripe Support Priority si plan payant)
- Prévoir un délai de 14 jours entre J7 (initiation KYC) et J14 (offre publiée) pour absorber les retards KYC

---

### 6.5 Adoption et engagement

**Risque** : les coopératives sont sollicitées par de nombreuses initiatives ; risque de désengagement après J0.

**Mitigation** :
- Désigner un "champion" au sein de chaque coopérative (souvent un jeune)
- Check-in hebdomadaire court (5 min WhatsApp ou appel)
- Montrer des résultats concrets rapidement (ex. : première offre visible sur le catalogue dès J5)
- Incentive : gratuité totale pendant le pilote, accès prioritaire aux premiers acheteurs

---

## 7. Budget estimatif pilote — 3 mois [HYPOTHÈSE]

> Toutes les lignes sont des estimations. Elles n'ont pas fait l'objet d'une validation formelle.

### 7.1 Coûts infrastructure (3 mois)

| Poste | Mensuel [HYPOTHÈSE] | Total 3 mois [HYPOTHÈSE] | Notes |
|---|---|---|---|
| VPS production (Hetzner CX32 ou équivalent) | 15€ | 45€ | 4 vCPU, 8 Go RAM, 80 Go SSD |
| Objet storage MinIO / S3 (documents, photos) | 5€ | 15€ | < 10 Go pour le pilote |
| Email transactionnel (Resend ou Mailgun) | 0€ | 0€ | Free tier < 3 000 emails/mois |
| Monitoring (UptimeRobot + Grafana Cloud) | 0€ | 0€ | Free tiers suffisants pilote |
| Sentry error tracking | 0€ | 0€ | Free tier < 5 000 erreurs/mois |
| Stripe Connect | 0€ | 0€ | Frais sur transactions uniquement (2,9% + 0,30€) |
| Nom de domaine | 12€/an | 3€ | Prorata 3 mois |
| **Sous-total infrastructure** | | **63€** | |

### 7.2 Coûts humains [HYPOTHÈSE]

| Poste | Volume estimé | Coût [HYPOTHÈSE] | Notes |
|---|---|---|---|
| Référent terrain Mayotte | 2 jours/semaine × 12 semaines | 4 800€ | Prestation externe ou salarié partiel (300€/j [HYPOTHÈSE]) |
| Développement corrections pilote (bugs, UX) | 3 jours au total | 1 500€ | Dev freelance 500€/j [HYPOTHÈSE] |
| Coordination & suivi (interne) | Inclus dans charge fondateurs | 0€ | |
| Traduction / supports pédagogiques | Forfait | 500€ | Guide PDF, glossaire, WhatsApp template |
| **Sous-total humain** | | **6 800€** | |

### 7.3 Coûts déplacement [HYPOTHÈSE]

| Poste | Quantité | Coût [HYPOTHÈSE] |
|---|---|---|
| Vol A/R Métropole–Mayotte (si équipe non locale) | 1 voyage × 2 personnes | 1 600€ |
| Hébergement 5 nuits | 2 personnes | 700€ |
| Transport local (location véhicule) | 5 jours | 300€ |
| **Sous-total déplacement** | | **2 600€** |

> Si l'équipe est déjà basée à Mayotte ou à La Réunion, ce poste est significativement réduit.

### 7.4 Récapitulatif budget pilote

| Catégorie | Total [HYPOTHÈSE] |
|---|---|
| Infrastructure | 63€ |
| Humain | 6 800€ |
| Déplacement | 2 600€ |
| Imprévus (10%) | 946€ |
| **TOTAL PILOTE 3 MOIS** | **~10 400€** |

**Note** : ce budget ne couvre pas les coûts de développement produit en amont du pilote, ni les frais légaux (mentions légales, CGV).

---

## 8. Planning pilote — Gantt 12 semaines

```
Semaine  | S1   | S2   | S3   | S4   | S5   | S6   | S7   | S8   | S9   | S10  | S11  | S12
─────────────────────────────────────────────────────────────────────────────────────────────
PRÉPARATION
Qualification vendeurs     |XXXX |XXXX |     |     |     |     |     |     |     |     |     |
Recrutement acheteur       |XXXX |XXXX |XXXX |     |     |     |     |     |     |     |     |
Supports formation         |XXXX |XXXX |     |     |     |     |     |     |     |     |     |
Checklist technique prêt   |XXXX |     |     |     |     |     |     |     |     |     |     |

ONBOARDING VENDEURS (J0–J14)
Invitations & comptes J0   |     |XXXX |     |     |     |     |     |     |     |     |     |
Profils & produits J1–J3   |     |XXXX |XXXX |     |     |     |     |     |     |     |     |
KYC Stripe J7              |     |     |XXXX |     |     |     |     |     |     |     |     |
Offres PUBLISHED J14       |     |     |XXXX |XXXX |     |     |     |     |     |     |     |

PHASE ACTIVE (J14–J60)
1ères RFQs (J30)           |     |     |     |     |XXXX |XXXX |     |     |     |     |     |
Suivi hebdomadaire vendeurs|     |     |     |XXXX |XXXX |XXXX |XXXX |XXXX |XXXX |     |     |
Support acheteur actif     |     |     |     |XXXX |XXXX |XXXX |XXXX |XXXX |     |     |     |
1ère transaction complète  |     |     |     |     |     |XXXX |XXXX |XXXX |     |     |     |

BILAN (J60–J90)
Collecte feedback / NPS    |     |     |     |     |     |     |     |XXXX |XXXX |XXXX |     |
Correction bugs post-pilote|     |     |     |     |     |     |     |XXXX |XXXX |     |     |
Rapport pilote & décision  |     |     |     |     |     |     |     |     |     |XXXX |XXXX |
```

### Jalons clés

| Jalon | Semaine | Critère de validation |
|---|---|---|
| **M0** — Go pilote | S1 | Budget validé, référent terrain confirmé, 3–5 vendeurs qualifiés |
| **M1** — Onboarding complet | S4 | 100% des vendeurs ont au moins 1 offre PUBLISHED |
| **M2** — Première RFQ | S5–S6 | ≥ 1 RFQ reçue par un vendeur pilote |
| **M3** — Première transaction | S6–S8 | ≥ 1 paiement Stripe reçu sur un compte vendeur |
| **M4** — Bilan pilote | S11–S12 | Rapport, NPS, décision de déploiement large |

---

## 9. Prochaines étapes recommandées

1. **Valider le budget pilote** avec les parties prenantes (fondateurs, investisseurs éventuels)
2. **Identifier et contacter le référent terrain** (personne clé du pilote)
3. **Shortlister 8–10 coopératives candidates** (pour en retenir 3–5 après qualification)
4. **Tester le parcours mobile** sur un Android bas de gamme avant S1
5. **Configurer les alertes monitoring** (UptimeRobot + Sentry) avant J0 vendeurs
6. **Préparer les supports de formation** (PDF guide + WhatsApp template) en S1

---

*Document préparé dans le cadre des mandats M71–M72 — IOX plateforme marketplace Mayotte.*
