# Synthèse Exécutive — IOX Pré-Pilote

**Version :** M99 / Mai 2026
**Destinataires :** Investisseurs, partenaires stratégiques, comité de pilotage
**Statut :** Plateforme prête — Infrastructure à provisionner
**Date :** 2026-05-11

---

## 1. État Produit

### Ce qui est construit

IOX est une marketplace B2B agricole complète, couvrant l'intégralité du parcours de la publication produit jusqu'au paiement. La plateforme compte plus de 70 pages et routes fonctionnelles, couvrant l'ensemble des flux utilisateurs.

**Quatre rôles utilisateurs**

- **Admin** : gestion globale de la plateforme (utilisateurs, coopératives, conformité, KPIs, audit logs)
- **Coordinator** : supervision d'un groupe de coopératives, accompagnement terrain
- **Seller (coopérative)** : publication du catalogue, gestion des demandes de devis, facturation, onboarding Stripe
- **Buyer (acheteur)** : exploration catalogue, demandes de devis, paiements sécurisés, messagerie

**Parcours utilisateur complet implémenté**

- Inscription et onboarding guidé (vendeur et acheteur)
- Catalogue public accessible sans authentification
- Recherche full-text MeiliSearch avec filtres multi-critères (catégorie, origine, certifications, prix)
- Processus RFQ complet : création par l'acheteur, réponse vendeur, négociation, acceptation, paiement
- Paiements Stripe Connect en mode test avec gestion des webhooks
- Facturation PDF automatique à chaque paiement confirmé
- Messagerie intégrée par thread de demande de devis
- Upload et validation de documents de conformité (certificats phytosanitaires, labels)
- Notifications email transactionnelles pour chaque événement métier
- Désinscription email conforme RGPD
- Audit logs de toutes les actions sensibles
- Dashboard admin avec KPIs en temps réel, gestion utilisateurs, file de modération
- Monitoring des files d'attente BullMQ via Bull Board
- Documentation API Swagger interactive
- Seed de démonstration complet pour présentations investisseurs
- PWA installable (manifest, icônes, Apple Touch Icon, méta-tags mobile)
- Pages légales : CGU, politique de confidentialité, mentions légales
- Scripts de backup PostgreSQL
- Scripts de smoke tests post-déploiement

---

## 2. État Technique

### Architecture

| Composant | Technologie | Rôle |
|---|---|---|
| Backend | NestJS (Node.js) — monolithique modulaire | API REST + logique métier |
| Frontend | Next.js 14 — App Router | Interface utilisateur |
| Monorepo | pnpm workspaces | Gestion dépendances et scripts unifiée |
| Base de données | PostgreSQL + Prisma ORM | Données métier persistantes |
| Cache / Files d'attente | Redis + BullMQ | Jobs asynchrones (emails, webhooks Stripe, relances RFQ) |
| Recherche | MeiliSearch | Recherche plein texte et filtres sur le catalogue |
| Paiements | Stripe Connect | Transactions B2B multi-vendeurs avec commission plateforme |

### État des tests et build

| Indicateur | Résultat |
|---|---|
| Tests backend (Jest/NestJS) | 1016 / 1016 ✅ |
| Tests frontend (Jest/Testing Library) | 508 / 508 ✅ |
| Erreurs TypeScript | 0 erreur ✅ |
| Build Next.js | OK ✅ |
| Build NestJS | OK ✅ |

Zéro erreur de compilation TypeScript. Couverture de test complète sur les chemins critiques (authentification, RFQ, paiements, facturation, conformité, notifications).

---

## 3. État Business

### Marché cible

IOX opère sur le marché B2B agricole de l'Océan Indien, avec un focus initial sur Mayotte.

- **Vendeurs :** coopératives agricoles de Mayotte (produits : vanille, ylang-ylang, fruits tropicaux, épices, légumes). Petit nombre d'acteurs, fortes barrières à l'export sans intermédiaire numérique.
- **Acheteurs :** grossistes, distributeurs, restaurateurs, importateurs B2B en France métropolitaine, La Réunion, Comores, et marchés internationaux (Europe, Moyen-Orient).

### Utilisateurs cibles pilote

| Profil | Nombre | Territoire |
|---|---|---|
| Coopératives vendeurs | 5 | Mayotte |
| Acheteurs B2B | 10 | La Réunion, France métropolitaine |

### Modèle de revenus

- **Commission sur transactions** : pourcentage prélevé automatiquement sur chaque paiement via Stripe Connect (taux à finaliser — fourchette envisagée 2 à 5 %).
- **Services premium futurs** : mise en avant produits, import CSV en masse, analytics avancées, scoring confiance vendeurs.
- La plateforme est gratuite pour les acheteurs. La commission est à la charge du vendeur sur chaque vente conclue.

### Objectif du pilote

Valider les hypothèses business sur le terrain :

1. Les coopératives adoptent-elles la plateforme de manière autonome ?
2. Le processus RFQ est-il adapté aux habitudes des acheteurs ?
3. Quel est le taux de conversion catalogue → RFQ → paiement ?
4. Quelles frictions terrain n'ont pas été anticipées en développement ?

---

## 4. État Légal

### Documents produits

| Document | Statut |
|---|---|
| Conditions Générales d'Utilisation | Template créé — champs `[À compléter]` non renseignés |
| Politique de confidentialité RGPD | Template créé — champs `[À compléter]` non renseignés |
| Mentions légales | Template créé — champs `[À compléter]` non renseignés |
| Registre des traitements RGPD | Non créé |
| DPO désigné | Non désigné |

### Ce qui est prêt

Les templates des trois documents légaux obligatoires sont en ligne sur la plateforme (`/legal/terms`, `/legal/privacy`, `/legal/mentions-legales`). Le contenu est structurellement conforme. Les données spécifiques à l'entreprise (SIREN, adresse siège, nom DPO, coordonnées) doivent être renseignées.

### Ce qui manque avant production publique

- Remplir tous les champs `[À compléter]` dans les trois documents légaux.
- Faire valider l'ensemble par un juriste spécialisé droit numérique.
- Désigner un DPO (Délégué à la Protection des Données) ou référent RGPD.
- Créer et maintenir le registre des traitements de données.

Le pilote fermé peut démarrer avec les templates actuels à condition que les participants soient informés du caractère provisoire des documents.

---

## 5. État Déploiement

### Ce qui est prêt

- Code source complet, testé, buildable
- Guide de déploiement VPS détaillé (`notes/deployment-vps-pilote-ferme-iox.md`)
- Scripts de backup PostgreSQL automatisés
- Runbook backup et restauration testé
- Runbook exploitation admin
- Scripts de smoke tests post-déploiement
- Configuration pm2 pour le démarrage automatique des services

### Ce qui n'est pas encore en place

| Composant | Action requise | Délai estimé |
|---|---|---|
| VPS production | Louer VPS Ubuntu 22.04 (4 vCPU, 8 GB RAM, 100 GB SSD) | 1 jour |
| Domaine officiel | Acheter iox.re ou iox.ma | 1 jour |
| SSL / HTTPS | Configurer Certbot + Let's Encrypt après domaine | 2 heures |
| DNS | Configurer les enregistrements A et MX après VPS + domaine | 2 heures |
| Délivrabilité email | SPF, DKIM, DMARC configurés sur le domaine | 1 jour |
| Monitoring erreurs | Sentry configuré (backend et frontend) | 1 jour |
| Monitoring disponibilité | UptimeRobot configuré avec alertes SMS/email | 2 heures |
| Backup cron | Cron actif sur VPS, restauration testée | 1 jour |
| Stripe live | Compte Stripe Business vérifié, clés live configurées | 1 à 3 jours |

---

## 6. Risques Principaux

| Risque | Criticité | Probabilité | Action | Responsable |
|---|---|---|---|---|
| VPS non provisionné avant pilote | Haute | Certaine si non planifié | Provisionner en priorité absolue | CTO / Fondateur |
| Stripe mode test en production publique | Critique | Faible (détectable) | Checklist activation live avant ouverture publique | CTO |
| RGPD non finalisé lors d'une plainte | Haute | Faible (pilote fermé) | Finaliser RGPD avant production publique | Fondateur + Juriste |
| Incident sans monitoring | Moyenne | Possible | Configurer Sentry + UptimeRobot dès le déploiement pilote | CTO |
| Non-adoption terrain des coopératives | Stratégique | Possible | Accompagnement intensif, formations courtes, support WhatsApp réactif | Coordinateur terrain |
| Perte de données sans backup actif | Haute | Faible si backup configuré | Activer et tester le backup avant le premier onboarding vendeur | CTO |
| Litiges non couverts par CGU | Moyenne | Faible (pilote fermé) | Faire valider les CGU par un juriste avant production publique | Fondateur + Juriste |

---

## 7. Timeline Estimée

| Période | Actions |
|---|---|
| J+0 à J+14 | Provisionnement VPS, achat domaine, configuration DNS et SSL, déploiement application, activation backup cron, configuration monitoring minimal |
| J+14 à J+21 | Onboarding des 2 premières coopératives pilotes, formation terrain (30 min / coopérative), création des premiers produits sur la plateforme |
| J+21 à J+49 | Pilote terrain actif — suivi hebdomadaire, support réactif, collecte des retours, tracking des KPIs (RFQ créées, taux de réponse, conversions) |
| J+49 à J+56 | Analyse des résultats pilote, entretiens avec les participants, décision formelle GO production publique ou non |
| J+60 et au-delà | Si GO validé : activation Stripe live, finalisation RGPD, validation juridique CGU, ouverture progressive à de nouveaux vendeurs et acheteurs |

---

## 8. Prochaine Décision

La décision critique conditionnant la suite du projet est :

**Provisionner le VPS de production pilote.**

Sans cette action (délai estimé 1 à 2 jours de travail), aucun déploiement terrain n'est possible quel que soit l'état du code.

| Décision | Verdict | Condition |
|---|---|---|
| GO démo investisseur | GO inconditionnel | Seed demo opérationnel, code prêt |
| GO pilote fermé (code) | GO | Tests verts, build OK, PWA installable, pages légales en ligne |
| GO pilote fermé (infra) | GO conditionnel | VPS + SSL + backup testé + monitoring minimal configurés |
| GO production publique | NO-GO | RGPD finalisé + Stripe live + monitoring complet + validation juridique |

---

*Document rédigé : M99 — 2026-05-11 — IOX Marketplace B2B Agricole — Océan Indien*
