# Notes de version — pilot-v0.1.0

> **Tag git** : `pilot-v0.1.0`  
> **Date de release** : 2026-05-11  
> **Phase** : Pilote terrain — ~5 coopératives, ~10 acheteurs (Mayotte / Océan Indien)  
> **Stack** : NestJS · Next.js 14 App Router · PostgreSQL · Redis · BullMQ · MeiliSearch · Stripe Connect · MinIO · Pnpm monorepo

---

## 1. Tag de release

```bash
# Créer le tag
git tag -a pilot-v0.1.0 -m "Pilote IOX v0.1.0 — lancement terrain 2026-05-11"

# Pousser le tag vers le remote
git push origin pilot-v0.1.0
```

---

## 2. Historique des mandats inclus

### M50–M55 — Fondations de la marketplace

- **M50** : Authentification complète (JWT, refresh tokens, email de confirmation)
- **M51** : Onboarding vendeur (inscription coopérative, formulaire KYB, upload documents)
- **M52** : Marketplace produits (listing offres, filtres catégories, recherche MeiliSearch)
- **M53** : Flux RFQ — création demande de devis, envoi au(x) vendeur(s)
- **M54** : Gestion des offres vendeur (création, édition, publication, dépublication)
- **M55** : Tableaux de bord vendeur et acheteur (version initiale)

### M56–M60 — Paiements, conformité et facturation

- **M56** : Dashboard acheteur avancé (suivi commandes, historique RFQ)
- **M57** : Intégration Stripe Connect (onboarding vendeur Stripe, paiement acheteur, split automatique)
- **M58** : Génération de factures PDF (acheteur et vendeur)
- **M59** : Dashboard compliance admin (`/admin/compliance`, validation KYB, rejet avec motif)
- **M60** : Messagerie RFQ — chat entre acheteur et vendeur sur une demande de devis

### M61–M65 — Multi-devise, API et packaging démo

- **M61** : Support multi-devise (EUR, USD, MGA) avec taux de change configurables
- **M62** : Smoke tests préprod — suite de tests end-to-end sur l'environnement staging
- **M63** : Packaging démo — script seed démo complet, données réalistes pour présentation
- **M64** : Pitch investisseur — deck, FAQ, script de démo commerciale
- **M65** : Swagger / documentation API (`/api/docs`) — tous les endpoints documentés avec exemples

### M66–M75 — Sécurité, RGPD et préparation au lancement

- **M66** : Audit de sécurité — revue des endpoints, CORS, headers HTTP, rate limiting
- **M67** : Templates RGPD — modèles de CGU, politique de confidentialité, mentions légales
- **M68** : Stripe readiness — checklist complète mode live, webhooks, gestion des erreurs
- **M69** : Scripts de backup PostgreSQL automatisés
- **M70** : Monitoring et alerting — configuration pm2, logs structurés, métriques
- **M71** : Plan pilote terrain — document de planification, SLA, procédures support
- **M72** : Guide utilisateur acheteur
- **M73** : Guide utilisateur vendeur
- **M74** : Guide administrateur
- **M75** : Go/No-Go lancement pilote — critères validés

### M76 — Correctifs sécurité P0

- **M76** : Correctifs de sécurité prioritaires avant pilote :
  - Vérification Stripe au démarrage du backend (boot check)
  - Configuration `allowedOrigins` stricte en production
  - En-tête `X-Frame-Options: DENY` sur toutes les réponses
  - Audit des variables d'environnement sensibles

### M77 — PWA et mobile terrain

- **M77** : Progressive Web App :
  - Manifest PWA (`/manifest.json`) avec métadonnées complètes
  - Icônes PWA multiples résolutions (192×192, 512×512)
  - Apple Touch Icon pour installation iOS
  - Méta-tags viewport optimisés mobile
  - Sidebar collapsible mobile

### M78 — Pages légales

- **M78** : Pages légales obligatoires :
  - Conditions Générales d'Utilisation : `/legal/terms`
  - Politique de confidentialité (RGPD) : `/legal/privacy`
  - Mentions légales : `/legal/mentions-legales`
  - Layout légal avec skip-to-content et navigation

---

## 3. Fonctionnalités disponibles dans pilot-v0.1.0

### Authentification et gestion des comptes

- Inscription acheteur et vendeur avec validation email
- Connexion sécurisée (JWT, refresh token, rate limiting)
- Réinitialisation de mot de passe par email
- Profil utilisateur éditable
- Gestion des rôles : `BUYER`, `SELLER`, `ADMIN`

### Marketplace

- Catalogue produits avec recherche MeiliSearch (recherche instantanée)
- Filtres par catégorie, origine, certifications, fourchette de prix
- Pagination des résultats
- Pages détail produit avec photos (stockage MinIO)
- Favoris (sauvegarde d'offres)

### Processus RFQ (demande de devis)

- Création de demande de devis par l'acheteur
- Sélection d'un ou plusieurs vendeurs
- Messagerie intégrée par RFQ (chat acheteur ↔ vendeur)
- Envoi de devis par le vendeur
- Acceptation ou refus par l'acheteur
- Relances automatiques (BullMQ `rfq-reminder`)
- Statuts : `OPEN` → `QUOTED` → `ACCEPTED` / `REJECTED` / `EXPIRED`

### Paiements (mode test Stripe)

- Paiement sécurisé via Stripe Checkout
- Stripe Connect pour les vendeurs (onboarding, KYC Stripe)
- Split automatique de la commission plateforme
- Génération de factures PDF acheteur et vendeur
- Support multi-devise (EUR, USD, MGA)
- Webhook Stripe traité de manière asynchrone (BullMQ)

### Tableau de bord acheteur

- Historique des RFQ et commandes
- Statuts de paiement en temps réel
- Téléchargement des factures

### Tableau de bord vendeur

- Gestion du catalogue produits
- Suivi des RFQ reçues
- Historique des paiements reçus
- Onboarding Stripe Connect guidé

### Administration

- KPI dashboard : `/admin/kpi` (vendeurs, acheteurs, RFQ, volume paiements)
- Gestion des vendeurs (validation, suspension)
- Compliance KYB : `/admin/compliance` (validation documents, rejet avec motif)
- Suivi RFQ admin : `/admin/rfq`
- Bull Board : `/admin/bull-board` (supervision des queues BullMQ)
- Audit logs : `/audit-logs`
- Swagger : `/api/docs`

### Conformité et légal

- Pages légales : CGU, politique de confidentialité, mentions légales
- RGPD : droits utilisateurs (accès, rectification, suppression)
- Audit logs de toutes les actions sensibles

### Infrastructure et opérations

- Progressive Web App (installable sur mobile)
- Notifications temps réel (polling MarketplaceBell)
- Backup PostgreSQL automatisé
- Scripts pm2 pour déploiement VPS
- Monitoring pm2

---

## 4. Limites connues de cette version

| Limite | Description | Prévu pour |
|---|---|---|
| Stripe en mode test uniquement | Les paiements ne sont pas réels. Passage en mode live après validation pilote. | Post-pilote |
| Pas de Service Worker offline | Le PWA est installable mais ne fonctionne pas hors connexion. | v0.2.0 |
| Champs RGPD incomplets | Certains champs de formulaire RGPD (consentements granulaires) ne sont pas tous implémentés. | v0.2.0 |
| VPS non encore provisionné | Le serveur de production final n'est pas encore configuré au moment du tag. | J-1 pilote |
| Monitoring externe absent | Pas encore d'outil de monitoring externe (Uptime Robot, Datadog, etc.). | v0.2.0 |
| Export CSV non disponible | L'export des RFQ, vendeurs et produits n'est pas dans l'interface. | v0.2.0 |
| Import CSV non disponible | Pas d'import automatique de catalogue. Saisie manuelle uniquement. | v0.2.0 |
| Notifications push (PWA) | Les notifications push browser ne sont pas encore activées. | v0.2.0 |

---

## 5. Migration de base de données

### Appliquer les migrations en production

```bash
# Depuis le répertoire backend sur le VPS
cd /opt/iox/apps/backend

# Appliquer toutes les migrations Prisma en attente
npx prisma migrate deploy

# Vérifier l'état des migrations
npx prisma migrate status
```

**Important** : toujours effectuer un backup avant `migrate deploy` en production.

```bash
# Backup avant migration
pg_dump -h localhost -U iox_user -d iox_prod \
  -F c -f /opt/iox/backups/iox_avant_migration_$(date +%Y%m%d_%H%M%S).dump

# Puis appliquer les migrations
npx prisma migrate deploy
```

---

## 6. Couverture de tests

| Suite | Nombre de tests | Statut |
|---|---|---|
| Tests unitaires backend (Jest) | 1 016 | Passent |
| Tests unitaires frontend (Jest/RTL) | 508 | Passent |
| TypeScript | Clean (0 erreurs) | OK |
| Build Next.js | Succès | OK |
| Build NestJS | Succès | OK |
| Smoke tests préprod (M61) | Suite complète | Validés |

---

## 7. Déploiement

Référence complète : `notes/deployment-vps-pilote-ferme-iox.md`

Résumé des étapes principales :

```bash
# 1. Mettre à jour le code
cd /opt/iox
git pull origin main
git checkout pilot-v0.1.0

# 2. Installer les dépendances
pnpm install --frozen-lockfile

# 3. Construire les applications
pnpm build

# 4. Appliquer les migrations
cd apps/backend && npx prisma migrate deploy

# 5. Redémarrer les services
pm2 restart all

# 6. Vérifier l'état
pm2 status
pm2 logs --lines 50
```

---

## 8. Procédure de rollback

En cas de problème critique après le déploiement de `pilot-v0.1.0` :

### Rollback du code

```bash
# Identifier le tag précédent
git tag --sort=-creatordate | head -5

# Revenir au tag précédent (exemple : pilot-v0.0.9)
git checkout pilot-v0.0.9

# Reconstruire et redémarrer
pnpm build
pm2 restart all
```

### Rollback de la base de données

Si une migration a causé un problème :

```bash
# Restaurer le backup pré-migration
pg_restore -h localhost -U iox_user -d iox_prod \
  /opt/iox/backups/iox_avant_migration_[TIMESTAMP].dump

# Vérifier la restauration
psql -h localhost -U iox_user -d iox_prod -c "SELECT COUNT(*) FROM users;"
```

### Critères de déclenchement du rollback

Déclencher un rollback immédiat si :
- Erreurs 5xx dépassant 5 % des requêtes pendant plus de 5 minutes.
- Échec de génération de facture pour un paiement réel.
- Inaccessibilité de la page de paiement Stripe.
- Perte de données utilisateurs détectée.
