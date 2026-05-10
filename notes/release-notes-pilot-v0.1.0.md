# Notes de Version — pilot-v0.1.0

**Tag Git** : `pilot-v0.1.0`
**Date** : 2026-05-11
**Branche** : `main`
**Commit de référence** : `18ba075`

---

> Cette release marque la fin de la phase de développement du pilote fermé IOX (M50–M100). Elle est destinée à un déploiement sur VPS privé avec un groupe restreint de coopératives et d'acheteurs partenaires de Mayotte / Océan Indien. Elle n'est **pas** destinée à une production publique dans l'état actuel.

---

## 1. Tag de release

```bash
# Créer le tag annoté
git tag -a pilot-v0.1.0 -m "Pilote IOX v0.1.0 — lancement terrain 2026-05-11"

# Pousser le tag vers le dépôt distant
git push origin pilot-v0.1.0
```

---

## 2. Fonctionnalités incluses

### Authentification et gestion des accès

- Authentification JWT (login, refresh de token, logout sécurisé)
- Gestion des rôles : Admin, Coordinator, Seller, Buyer
- Réinitialisation de mot de passe par email
- Sessions sécurisées (tokens httpOnly, rotation automatique du refresh token)
- Rate limiting sur les endpoints d'authentification

### Onboarding et profils

- Onboarding vendeur step-by-step (informations entreprise, coordonnées bancaires IBAN, upload documents)
- Validation admin des profils vendeurs (KYB — Know Your Business)
- Profil acheteur complet avec informations entreprise

### Catalogue et recherche

- Catalogue produits avec recherche full-text MeiliSearch (recherche instantanée, tolérance aux fautes)
- Filtres par catégorie, origine géographique, certifications, fourchette de prix
- Marketplace publique accessible sans authentification
- Fiches produits détaillées avec galerie photos

### RFQ (Request for Quotation) — Demandes de devis

- Création de demande de devis par les acheteurs
- Suivi du statut de la RFQ (ouvert, devis envoyé, accepté, refusé, payé, expiré)
- Réponse vendeur avec contre-proposition de prix et conditions
- Messagerie intégrée par RFQ (chat acheteur / vendeur)
- Notifications email automatiques à chaque changement de statut
- Relances automatiques par file d'attente BullMQ

### Paiements Stripe Connect (mode test)

- Paiements sécurisés via Stripe Checkout (mode test)
- Onboarding Stripe Connect pour chaque vendeur (KYC Stripe)
- Split automatique de la commission plateforme
- Gestion des webhooks Stripe de manière asynchrone
- Support multi-devise (EUR configuré pour le pilote)

### Facturation PDF automatique

- Génération automatique de facture PDF à la confirmation du paiement
- Facture acheteur et facture vendeur générées séparément
- Téléchargement depuis le tableau de bord acheteur, vendeur et admin

### Documents de conformité et traçabilité

- Upload de documents par les vendeurs (certificats phytosanitaires, labels AB, certifications)
- Validation et rejet des documents par l'administrateur (avec motif)
- Statut de conformité visible sur la fiche vendeur

### Notifications et emails transactionnels

- Notifications email transactionnelles via file d'attente BullMQ et SMTP
- Templates email HTML responsifs pour chaque événement métier
- Fonctionnalité d'unsubscribe (désinscription aux emails non-transactionnels)
- Retry automatique en cas d'échec d'envoi

### Audit logs

- Journalisation de toutes les actions sensibles (connexion, modification données, paiements)
- Consultation des audit logs depuis le tableau de bord admin

### Dashboard admin — KPI et opérations

- KPI en temps réel : nombre de vendeurs, acheteurs, RFQ, volume de paiements
- Module de suivi de conformité (compliance KYB — documents vendeurs)
- File de validation (review queue) des profils et documents
- Gestion des utilisateurs (liste, activation, suspension, suppression)
- Gestion des vendeurs (liste, validation, statuts Stripe)
- Gestion des RFQ (liste, détails, historique de messagerie)
- Monitoring de la file d'attente BullMQ via Bull Board (`/admin/queue`)
- Documentation API Swagger interactive (`/api/docs`)

### PWA — Progressive Web App

- Application installable sur Android et iOS (manifest.json complet)
- Icônes PWA multi-résolutions (192×192, 512×512)
- Apple Touch Icon pour installation iOS Safari
- Expérience mobile optimisée (responsive design, formulaires adaptés)

### Pages légales et conformité RGPD

- Conditions Générales d'Utilisation (CGU) — `/legal/terms`
- Politique de confidentialité conforme RGPD — `/legal/privacy`
- Mentions légales — `/legal/mentions-legales`
- Procédures de droits utilisateurs RGPD (accès, rectification, suppression)

### Opérations et déploiement

- Seed de démonstration complet (coopératives fictives, acheteurs, transactions, données réalistes pour investisseurs)
- Scripts de backup PostgreSQL automatisés
- Scripts de smoke tests (validation post-déploiement)
- Guide de déploiement VPS détaillé
- Runbook backup et restauration testé
- Runbook exploitation admin

---

## 3. État des tests et du build

| Indicateur | Résultat |
|---|---|
| Tests backend | 1016 / 1016 ✅ |
| Tests frontend | 508 / 508 ✅ |
| Erreurs TypeScript | 0 erreur ✅ |
| Build Next.js | OK ✅ |
| Build NestJS | OK ✅ |
| Lint | Propre ✅ |

---

## 4. Stack technique

| Composant | Technologie |
|---|---|
| Backend | NestJS (Node.js) |
| Frontend | Next.js 14 (App Router) |
| Base de données | PostgreSQL (Prisma ORM) |
| File de tâches | BullMQ (Redis) |
| Recherche | MeiliSearch |
| Paiements | Stripe Connect |
| Emails | SMTP + BullMQ |
| Auth | JWT (access + refresh tokens) |

---

## 5. Limites connues — NO-GO production publique

Les points suivants constituent des blocages explicites pour un passage en production publique :

| Limite | Description |
|---|---|
| Stripe mode test uniquement | Aucun paiement réel ne peut être effectué dans l'état actuel |
| VPS non provisionné | Aucun serveur de production n'est encore configuré |
| Domaine non acheté | Pas de nom de domaine officiel (iox.re ou iox.ma) |
| RGPD incomplet | Champs `[À compléter]` dans les documents légaux non renseignés |
| Monitoring absent | Sentry et UptimeRobot non configurés |
| Backup cron inactif | Le cron de sauvegarde automatique n'est pas encore activé sur VPS |
| CGU non validées juridiquement | Les documents légaux sont des templates, non validés par un juriste |
| DPO non désigné | Le délégué à la protection des données n'est pas encore nommé |

---

## 6. Prérequis déploiement pilote

Se référer au document complet :

```
notes/deployment-vps-pilote-ferme-iox.md
```

Ce document détaille les étapes de provisionnement VPS (Ubuntu 22.04), configuration DNS, SSL via Certbot, déploiement de l'application, activation du backup et du monitoring minimal requis pour le pilote fermé.

---

## 7. Migration base de données

Commande à exécuter après chaque déploiement, avant le démarrage de l'application :

```bash
cd apps/backend && npx prisma migrate deploy
```

Toujours effectuer un backup préalable avant d'appliquer des migrations en production.

---

## 8. Procédure de rollback

En cas de problème critique après le déploiement :

```bash
git checkout pilot-v0.0.x && pm2 restart all
```

Remplacer `pilot-v0.0.x` par le tag de la version précédente stable. S'assurer de restaurer la base de données depuis le dernier backup avant le rollback si des migrations Prisma ont été appliquées.

---

## 9. Commits de référence

| Milestone | Commit | Description |
|---|---|---|
| M77 | `ecb9a74` | PWA mobile terrain (manifest, icônes, Apple Touch Icon) |
| M78 | `18ba075` | Pages légales (CGU, politique confidentialité, mentions légales) |

---

*Release créée : M94 — 2026-05-11*
