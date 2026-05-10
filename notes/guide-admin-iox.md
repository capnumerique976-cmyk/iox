# Guide administrateur — Plateforme IOX

> Version : 2026-05-10. Ce guide s'adresse aux administrateurs et coordinateurs IOX (rôles `ADMIN` / `COORDINATOR`).

---

## Sommaire

1. [Accéder au tableau de bord admin](#1-accéder-au-tableau-de-bord-admin)
2. [Modérer les produits et offres (MarketplaceReview)](#2-modérer-les-produits-et-offres-marketplacereview)
3. [Gérer les conformités (ComplianceModule)](#3-gérer-les-conformités-compliancemodule)
4. [Voir les logs emails (NotifEmail)](#4-voir-les-logs-emails-notifemail)
5. [Accéder au Bull Board (queues)](#5-accéder-au-bull-board-queues)
6. [Accéder aux métriques `/api/v1/metrics`](#6-accéder-aux-métriques-apiv1metrics)
7. [Gérer les incidents](#7-gérer-les-incidents)
8. [FAQ administrateur](#8-faq-administrateur)

---

## 1. Accéder au tableau de bord admin

### URL

**`/admin`**

### Prérequis

Être connecté avec un compte `ADMIN` ou `COORDINATOR`. Les accès sont provisionnés par l'équipe technique IOX.

### Vue d'ensemble

Le tableau de bord agrège en temps réel :

| Carte | Description | Lien |
|-------|-------------|------|
| Rattachements utilisateurs | Sellers sans membership, memberships orphelins | `/admin/memberships` |
| Profils vendeurs | Total, en attente de validation, approuvés, suspendus | `/admin/sellers` |
| File de revue marketplace | Publications, médias, documents en attente | `/admin/review-queue` |
| Demandes de devis | En cours, devis émis, gagnées, perdues | `/admin/rfq` |

**Section "Risques & alertes"** — met en évidence :
- Items en file de revue PENDING depuis plus de 7 jours
- Documents vendeurs expirant dans les 30 prochains jours

**Accès rapides** disponibles depuis le dashboard :
- Utilisateurs → `/admin/users`
- Rattachements → `/admin/memberships`
- Vendeurs → `/admin/sellers`
- File de revue → `/admin/review-queue`
- Demandes de devis → `/admin/rfq`
- Diagnostics → `/admin/diagnostics`
- Catégories marketplace → `/admin/marketplace/categories`
- Journal d'audit → `/admin/audit-logs`

Le bouton **"Rafraîchir"** recharge toutes les statistiques en parallèle.

---

## 2. Modérer les produits et offres (MarketplaceReview)

### 2.1 File de revue

Accédez à **`/admin/review-queue`** pour voir tous les éléments en attente de validation.

Trois types de revue :
- **Publication** — produits et offres soumis par les vendeurs
- **Médias** — images et fichiers uploadés
- **Documents** — certifications et pièces justificatives

### 2.2 Modération des médias

Accédez à **`/admin/media-moderation`** pour la file spécifique aux médias.

### 2.3 Processus de modération d'un item

1. Cliquez sur un item en file de revue
2. Examinez le contenu (description, catégorie, certifications, images)
3. Choisissez l'action :
   - **Approuver** → statut passe à `PUBLISHED`
   - **Rejeter** → statut passe à `REJECTED` ; rédigez un motif clair pour le vendeur
   - **Suspendre** → retrait temporaire du catalogue (`SUSPENDED`)

### 2.4 Gestion des catégories

Gérez la taxonomie des catégories produits depuis **`/admin/marketplace/categories`** (ajout, modification, réorganisation de la hiérarchie).

### 2.5 Surveillance des profils vendeurs

Accédez à **`/admin/sellers`** pour :
- Voir tous les profils vendeurs par statut
- Approuver ou rejeter un profil en `PENDING_REVIEW`
- Suspendre un profil actif si nécessaire
- Mettre un vendeur en avant (`isFeatured`)

---

## 3. Gérer les conformités (ComplianceModule)

### 3.1 Vue conformité admin

Accédez à **`/admin/compliance`** pour la vue d'ensemble de la conformité de tous les vendeurs.

Le tableau de bord conformité affiche :
- Nombre total de vendeurs et répartition par statut de conformité
- Compteurs de documents et certifications : en attente, rejetés, expirés, expirant bientôt
- File de revue en attente
- Tableau détaillé par vendeur : documents vérifiés / en attente / rejetés, certifications

### 3.2 Indicateurs clés de conformité

| Métrique | Description |
|----------|-------------|
| `documentsPending` | Documents soumis non encore vérifiés |
| `documentsRejected` | Documents refusés — relancer le vendeur |
| `documentsExpired` | Documents dont la date de validité est dépassée |
| `documentsExpiringSoon` | Documents expirant dans les 90 jours |
| `certificationsPending` | Certifications en attente de validation |
| `certificationsExpired` | Certifications périmées |

### 3.3 Processus de vérification documentaire

1. Depuis `/admin/compliance`, identifiez les vendeurs avec des documents `PENDING`
2. Accédez à la fiche vendeur
3. Examinez le document uploadé
4. Mettez à jour le statut :
   - `VERIFIED` — document conforme
   - `REJECTED` — document non conforme (indiquez le motif)

### 3.4 Alertes automatiques

Les documents expirant dans les 30 jours apparaissent dans la section "Risques & alertes" du dashboard admin. Les documents expirant dans les 90 jours sont visibles dans le dashboard vendeur concerné.

---

## 4. Voir les logs emails (NotifEmail)

### 4.1 Journal des emails

Accédez à **`/admin/notif-email/logs`** pour le journal complet des emails transactionnels envoyés par la plateforme.

**Filtres disponibles :**
- Statut : `SENT` (envoyé), `FAILED` (échec), `SKIPPED` (ignoré)
- Template : identifiant du template email (ex. `rfq-message-created`, `seller-rfq-new`)
- Destinataire : filtrer par adresse email (recherche partielle)
- Créé après : filtrer par date

### 4.2 Statuts emails

| Statut | Signification | Action |
|--------|---------------|--------|
| `SENT` | Email envoyé avec succès | Aucune |
| `FAILED` | Échec d'envoi | Investiguer l'erreur, rejouer si nécessaire |
| `SKIPPED` | Email ignoré (ex. destinataire désinscrit) | Vérifier les préférences |

### 4.3 Rejouer un email en échec

Sur la ligne d'un email `FAILED`, cliquez sur **"Rejouer"** pour déclencher un nouvel envoi. Le résultat (succès ou échec) est affiché en retour immédiat.

### 4.4 Détail d'un email

Cliquez sur **"Détail →"** pour accéder à la fiche complète : **`/admin/notif-email/logs/[id]`**

Inclut : template utilisé, destinataire, sujet, transport, code d'erreur complet si applicable.

### 4.5 Export CSV

Le bouton **"Export CSV"** en haut de la page télécharge la liste filtrée au format CSV (utile pour le reporting ou l'analyse d'incidents).

### 4.6 Statistiques emails

Accédez à **`/admin/notif-email/stats`** pour les métriques agrégées : taux d'envoi, taux d'échec, volume par template.

### 4.7 Désabonnements

Accédez à **`/admin/notif-email/unsubscribes`** pour voir les destinataires ayant choisi de se désabonner.

---

## 5. Accéder au Bull Board (queues)

### URL

**`/admin/queues`** — accès direct au backend (non proxy par le frontend Next.js)

> En production sur VPS : `https://[votre-domaine]/admin/queues`
> En développement local : `http://localhost:3001/admin/queues`

### Authentification

Le Bull Board est protégé par un middleware d'authentification (`bull-board-auth.middleware`). Utilisez vos identifiants administrateur IOX.

### Queues exposées

| Queue | Description |
|-------|-------------|
| Email queue | Envoi des emails transactionnels (templates Handlebars/Resend) |
| Search queue | Indexation des produits et offres pour la recherche |

### Actions disponibles

- Voir les jobs actifs, en attente, différés, en échec, complétés
- Rejouer des jobs en échec
- Vider une queue
- Voir les logs de chaque job

> Attention : les actions destructives (vider une queue) sont irréversibles. Confirmer avant toute suppression en production.

---

## 6. Accéder aux métriques `/api/v1/metrics`

### URL

```
GET /api/v1/metrics
```

### Format

Export **Prometheus** (`text/plain; version=0.0.4`).

### Authentification

Si la variable d'environnement `METRICS_TOKEN` est définie sur le backend :

```bash
curl -H "Authorization: Bearer <METRICS_TOKEN>" https://[votre-domaine]/api/v1/metrics
```

Si `METRICS_TOKEN` n'est pas défini, l'endpoint est public (scrape Prometheus sans auth).

### Métriques exposées

Les métriques incluent les compteurs et histogrammes des requêtes HTTP (via `MetricsInterceptor`), ainsi que les métriques opérationnelles exposées par `OpsMetricsService`.

### Intégration Prometheus / Grafana [À VENIR]

Un tableau de bord Grafana pré-configuré est prévu pour la visualisation des métriques IOX en production. [À VENIR]

### KPI opérationnels

Accédez à **`/admin/kpi`** pour une vue synthétique des indicateurs clés de performance de la plateforme (vue frontend des métriques principales).

### Diagnostics

Accédez à **`/admin/diagnostics`** pour les outils de diagnostic avancés : vérification de la santé des services, détection d'anomalies, documents expirant à court terme.

---

## 7. Gérer les incidents

### 7.1 Procédure standard

1. **Détection** : le tableau de bord `/admin` ou les métriques Prometheus indiquent une anomalie
2. **Qualification** : identifier la zone impactée (queue bloquée ? email en échec ? vendeur suspendu ?)
3. **Investigation** :
   - Logs emails : `/admin/notif-email/logs` (filtrer `FAILED`)
   - File de revue bloquée : `/admin/review-queue?status=PENDING`
   - Bull Board : `/admin/queues` (jobs en échec)
   - Métriques : `GET /api/v1/metrics`
   - Journal d'audit : `/admin/audit-logs`
4. **Résolution** :
   - Rejouer les emails en échec (Bull Board ou bouton "Rejouer")
   - Débloquer un profil vendeur suspendu
   - Valider manuellement un document bloqué en revue
5. **Post-mortem** : documenter l'incident (date, cause, actions correctives)

### 7.2 Alertes critiques à surveiller en priorité

| Signal | Source | Action |
|--------|--------|--------|
| File de revue PENDING > 7 jours | Dashboard `/admin` section Risques | Traiter les items en attente |
| Emails FAILED en hausse | `/admin/notif-email/logs` | Vérifier le service Resend / SMTP |
| Jobs en échec dans les queues | `/admin/queues` | Rejouer ou investiguer les erreurs |
| Documents expirés vendeur | `/admin/compliance` | Contacter le vendeur |
| Sellers `PENDING_REVIEW` > 72h | `/admin/sellers` | Traiter les profils en attente |
| Métriques HTTP 5xx en hausse | `/api/v1/metrics` | Vérifier les logs backend NestJS |

### 7.3 Contacts techniques

- Logs backend NestJS : accès SSH au VPS, `docker logs iox-backend`
- Variables d'environnement : fichier `.env` sur le VPS (accès restreint)
- Support Stripe Connect : tableau de bord Stripe Dashboard du compte plateforme

---

## 8. FAQ administrateur

**Q1. Un vendeur se plaint que son profil est bloqué en `PENDING_REVIEW` depuis plus de 48h.**

Accédez à `/admin/sellers`, retrouvez le profil concerné et examinez les informations soumises. Si le dossier est complet, approuvez le profil. Si des informations manquent, rejetez avec un motif détaillé — le vendeur recevra une notification email.

**Q2. Un email transactionnel n'a pas été reçu par un utilisateur.**

1. Vérifiez `/admin/notif-email/logs` en filtrant par l'adresse du destinataire
2. Si le statut est `FAILED` : cliquez "Rejouer" ou vérifiez le code d'erreur (quota Resend dépassé, adresse invalide, etc.)
3. Si le statut est `SKIPPED` : l'utilisateur est peut-être désinscrit — vérifiez `/admin/notif-email/unsubscribes`
4. Si l'email n'apparaît pas dans les logs : le job n'a pas été enqueué — vérifiez le Bull Board

**Q3. Comment suspendre temporairement un vendeur qui ne respecte pas les CGU ?**

Accédez à `/admin/sellers`, sélectionnez le profil vendeur et changez son statut à `SUSPENDED`. Toutes ses offres seront automatiquement retirées du catalogue. Informez le vendeur par email (hors plateforme) du motif de suspension et des conditions de réintégration.

**Q4. La file de revue est saturée — comment prioriser ?**

Depuis `/admin/review-queue`, triez par date de création (les plus anciens en premier). Les items `PENDING` depuis plus de 7 jours sont remontés automatiquement dans la section "Risques & alertes" du dashboard. Traitez en priorité les publications de produits (impact direct sur les revenus vendeur) puis les documents.

**Q5. Comment accéder aux métriques Prometheus depuis Grafana ?**

Configurez un data source Prometheus dans Grafana pointant vers `https://[votre-domaine]/api/v1/metrics`. Si `METRICS_TOKEN` est défini, ajoutez le header `Authorization: Bearer <token>` dans la configuration du data source. [Tableau de bord Grafana pré-configuré : À VENIR]

---

*Pour toute escalade technique : équipe IOX — Guide M74 — IOX v2026*
