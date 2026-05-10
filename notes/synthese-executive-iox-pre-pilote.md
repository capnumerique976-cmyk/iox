# Synthèse Exécutive — IOX Pré-Pilote

**Version :** M99 / Mai 2026  
**Destinataires :** Investisseurs, partenaires stratégiques, comité de pilotage  
**Statut :** Plateforme prête — Infrastructure à provisionner

---

## 1. État Produit

### Fonctionnalités clés opérationnelles

La plateforme IOX est fonctionnelle et couvre l'intégralité du parcours B2B agricole, de la publication produit au paiement :

**Rôles et accès**
- **Admin** : gestion globale de la plateforme (utilisateurs, coopératives, litiges, reporting)
- **Coordinateur** : supervision d'un groupe de coopératives, validation des profils
- **Vendeur (coopérative)** : publication produits, gestion RFQ, onboarding Stripe, facturation
- **Acheteur** : exploration catalogue, demandes de devis, paiements, messagerie

**Fonctionnalités déployées (70+ pages et routes)**
- Marketplace avec recherche full-text (MeiliSearch) et filtres multi-critères
- Request for Quotation (RFQ) : envoi, réponse, négociation, statuts
- Paiements Stripe Connect : onboarding vendeur KYC, transactions, transferts, remboursements
- Facturation PDF automatique à chaque transaction confirmée
- Gestion documents conformité et traçabilité (certificats phytosanitaires, d'origine)
- Messagerie intégrée par thread RFQ
- Notifications email transactionnelles (avec lien de désinscription conforme RGPD)
- PWA installable (manifest, icônes, meta tags — Android Chrome)
- Pages légales : CGU, politique de confidentialité, mentions légales
- Dashboard admin : KPIs, gestion utilisateurs, modération

**Qualité technique**
- Tests : **1016 tests backend** (NestJS/Jest) + **508 tests frontend** (Next.js/Testing Library) — tous verts
- TypeScript strict : zéro erreur de compilation
- Build de production : OK (backend NestJS + frontend Next.js 14)

---

## 2. État Technique

### Architecture

| Composant | Technologie | Rôle |
|---|---|---|
| Backend | NestJS (Node.js) — monolithique modulaire | API REST + logique métier |
| Frontend | Next.js 14 — App Router | Interface utilisateur |
| Monorepo | pnpm workspaces | Gestion dépendances et scripts |
| Base de données | PostgreSQL + Prisma ORM | Données métier persistantes |
| Cache / Queues | Redis + BullMQ | Jobs asynchrones (emails, webhooks) |
| Recherche | MeiliSearch | Recherche plein texte catalogue |
| Paiements | Stripe Connect | Transactions B2B multi-vendeurs |
| Stockage fichiers | MinIO (compatible S3) | Photos produits, documents PDF |
| PWA | Manifest installable + icônes | Installation mobile (no service worker — intentionnel) |

### Décisions d'architecture notables

- **Pas de service worker** : décision intentionnelle pour le pilote. Les PWA avec service worker ajoutent de la complexité de cache difficile à déboguer. À ajouter post-pilote si le besoin offline est confirmé terrain.
- **Monolithe modulaire** : architecture choisie pour la vélocité de développement. Migration vers microservices envisageable post-traction commerciale.
- **Stripe Connect** (et non Stripe standard) : permet aux vendeurs de recevoir des paiements directement sur leur compte bancaire, avec commission IOX prélevée automatiquement.

---

## 3. État Business

### Marché cible

- **Vendeurs :** coopératives agricoles de Mayotte (département français d'outre-mer — 320 000 habitants, économie agricole significative : vanille, ylang-ylang, fruits tropicaux, épices)
- **Acheteurs :** grossistes, distributeurs, restaurateurs, importateurs B2B — principalement France métropolitaine, La Réunion, Comores, et acheteurs internationaux

### Phase actuelle

| Paramètre | Valeur |
|---|---|
| Phase | Pilote fermé (invitation uniquement) |
| Vendeurs cibles | 5 coopératives |
| Acheteurs cibles | 10 acheteurs B2B |
| Durée pilote estimée | 4-8 semaines terrain |
| Objectif pilote | Valider l'usage réel, identifier les frictions, mesurer la conversion RFQ→paiement |

### Modèle économique

- **Commission sur transactions** : pourcentage prélevé sur chaque paiement via Stripe Connect (taux exact à définir — fourchette envisagée : 2-5%)
- **Freemium possible** : accès catalogue gratuit, commission uniquement sur transactions confirmées
- **Services premium futurs** : mise en avant produits, import CSV, analytics avancées

### Stripe

- Actuellement en **mode test** (aucun paiement réel)
- Passage en **mode live** prévu après validation pilote (nécessite activation compte Stripe Business + KYC vendeurs)

---

## 4. État Légal

### Documents créés

| Document | Statut | Note |
|---|---|---|
| CGU (Conditions Générales d'Utilisation) | Template créé | Champs [À compléter] à renseigner |
| Politique de confidentialité | Template créé | Champs [À compléter] à renseigner |
| Mentions légales | Template créé | Champs [À compléter] à renseigner |
| Checklist RGPD | Existante | DPO à désigner, registre traitements à compléter |
| Documents conformité export | Intégrés à la plateforme | Validés fonctionnellement |

### RGPD

- Des templates de politique de confidentialité et registre des traitements ont été créés
- Les champs d'identification (SIREN, adresse siège, DPO) sont marqués `[À compléter]`
- Un DPO (Délégué à la Protection des Données) ou référent RGPD doit être désigné avant la production publique
- Acceptable pour un pilote fermé — obligatoire avant ouverture publique

### Conformité export

- Fonctionnalité de gestion de documents de conformité intégrée à la plateforme
- Les vendeurs peuvent uploader et faire valider leurs certificats phytosanitaires, certificats d'origine, etc.
- La vérification finale des documents reste sous responsabilité des parties

---

## 5. État Déploiement

| Composant | Statut | Action requise |
|---|---|---|
| VPS production | Non provisionné | Louer VPS Ubuntu 22.04 (4 vCPU, 8 GB RAM, 100 GB SSD) |
| Domaine | Non acheté | Acheter domaine (iox.ma, iox.re, ou iox.yt) |
| SSL | Non configuré | Certbot + Let's Encrypt après domaine |
| DNS | Non configuré | Configurer après domaine + VPS |
| Monitoring | Non configuré | Sentry (erreurs) + UptimeRobot (disponibilité) |
| Backup cron | Scripts prêts, cron inactif | Configurer sur VPS après provisionnement |
| Stripe live | Non activé | Activer après validation pilote |

### Documentation d'infrastructure disponible

- `notes/deployment-vps-pilote-ferme-iox.md` : guide complet de provisionnement VPS
- `notes/backup-restore-runbook-iox.md` : runbook backup et restauration
- `notes/monitoring-alerting-iox.md` : guide configuration monitoring
- `notes/stripe-live-readiness-iox.md` : checklist activation Stripe live

---

## 6. Risques Principaux

| Risque | Criticité | Mitigation |
|---|---|---|
| VPS non provisionné | Haute — bloque tout déploiement | Priorité absolue : 1-2 jours de travail |
| Stripe mode test | Haute — pas de paiements réels | Intentionnel pour pilote ; activation live post-validation |
| RGPD non finalisé | Haute — obligatoire avant production | Acceptable pilote fermé ; champs à remplir |
| Monitoring absent | Moyenne — détection incidents lente | Surveiller manuellement logs pendant pilote |
| Domaine non acheté | Moyenne — emails de confiance impossibles | Requis avant envoi emails production (SPF, DKIM) |
| Adoption terrain incertaine | Stratégique — risque pilote | Accompagnement intensif (formations, support WhatsApp) |

---

## 7. Prochaine Décision

### GO / NO-GO

| Décision | Verdict | Condition |
|---|---|---|
| Démo investisseur | **GO** | Aucune condition |
| Pilote fermé (code) | **GO** | Code prêt |
| Pilote fermé (infra) | **GO conditionnel** | Provisionner VPS + SSL + tester backup |
| Production publique | **NO-GO** | RGPD finalisé + Stripe live + monitoring + domaine |

### Timeline estimée

- **Semaines 1-2 :** Provisionnement VPS, domaine, SSL, backup cron, déploiement pilote
- **Semaines 3-6 :** Pilote terrain (5 coopératives + 10 acheteurs, accompagnement hebdomadaire)
- **Semaines 7-8 :** Analyse résultats pilote, décision go/no-go production publique
- **Mois 3-4 :** Si pilote validé : activation Stripe live, finalisation RGPD, production publique

---

*Rédigé : Mai 2026 — Mandat M99 — IOX*
