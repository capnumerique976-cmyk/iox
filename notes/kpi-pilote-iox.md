# KPI Pilote IOX — Suivi et mesure de performance

> Document interne — Pilote IOX (Mayotte)
> Dernière mise à jour : 2026-05-11
> Responsable : Admin IOX / Chef de projet pilote

---

## 1. KPI Business

Tableau de bord des indicateurs business à suivre pendant la durée du pilote (4-8 semaines).

| KPI | Définition | Cible pilote | Fréquence mesure | Statut |
|---|---|---|---|---|
| Vendeurs actifs | Coopératives ayant publié ≥1 produit (statut PUBLISHED) | ≥ 3 / 5 | Hebdomadaire | — |
| Produits publiés | Nombre total d'offres avec statut PUBLISHED | ≥ 10 | Hebdomadaire | — |
| RFQ créées | Demandes de devis soumises par les acheteurs | ≥ 5 | Hebdomadaire | — |
| Taux réponse RFQ | % RFQ avec réponse vendeur dans les 48h | ≥ 70% | Hebdomadaire | — |
| RFQ converties en transaction | % RFQ aboutissant à un paiement confirmé | ≥ 30% | Fin pilote | — |
| Paiements traités | Nombre de paiements avec statut SUCCEEDED | ≥ 2 | Fin pilote | — |
| Factures téléchargées | Nombre de PDFs de factures téléchargés | ≥ 2 | Fin pilote | — |
| Acheteurs actifs | Acheteurs s'étant connectés au moins 1 fois dans la semaine | ≥ 7 / 10 | Hebdomadaire | — |
| Valeur totale transactée | Somme des paiements SUCCEEDED (mode test) | ≥ 2 transactions | Fin pilote | — |

---

## 2. KPI Technique

Indicateurs de fiabilité et de performance de l'infrastructure IOX.

| KPI | Définition | Cible pilote | Fréquence mesure | Outil de mesure |
|---|---|---|---|---|
| Uptime backend | % de temps où le backend répond correctement (HTTP 200) | ≥ 99% | Continu | UptimeRobot / monitoring |
| Erreurs 5xx | % de requêtes HTTP retournant une erreur serveur (5xx) | < 1% | Quotidien | Logs PM2 / Nginx |
| Temps réponse API moyen | Latence moyenne des réponses API (p50) | < 500ms | Quotidien | Logs Nginx / APM |
| Temps réponse API p95 | Latence des 5% de requêtes les plus lentes | < 2000ms | Quotidien | Logs Nginx / APM |
| Jobs BullMQ failed | Nombre de jobs BullMQ en erreur non retentés | 0 | Quotidien | Interface Bull Board |
| Emails délivrés | % d'emails transactionnels effectivement délivrés (hors bounce) | ≥ 95% | Hebdomadaire | Dashboard Postmark/Mailgun |
| Erreurs webhook Stripe | Événements Stripe non traités ou en erreur | 0 | Quotidien | Logs backend + Dashboard Stripe |
| Redis disponibilité | Cache Redis opérationnel (connexion backend établie) | 100% | Continu | Health check |

---

## 3. KPI Satisfaction

Indicateurs de satisfaction utilisateur collectés en fin de pilote.

| KPI | Définition | Cible pilote | Fréquence mesure | Méthode |
|---|---|---|---|---|
| NPS coopératives | Note moyenne de satisfaction vendeurs (sur 10) | ≥ 6 / 10 | Fin pilote | Fiche retour utilisateur |
| NPS acheteurs | Note moyenne de satisfaction acheteurs (sur 10) | ≥ 6 / 10 | Fin pilote | Fiche retour utilisateur |
| Problèmes bloquants remontés | Incidents empêchant totalement l'utilisation de IOX | < 3 | Fin pilote | Log support |
| Taux de remplissage des fiches retour | % de participants ayant retourné la fiche feedback | ≥ 70% | Fin pilote | Suivi manuel |
| Intention de continuer à utiliser IOX | % de participants souhaitant continuer post-pilote | ≥ 60% | Fin pilote | Fiche retour utilisateur |

---

## 4. Requêtes SQL utiles

Ces requêtes SQL sont sûres (SELECT uniquement) et peuvent être exécutées par l'admin sur la base PostgreSQL de production. Adapter les noms de tables selon le schéma Prisma actuel si nécessaire.

### 4.1 Vendeurs actifs (ayant publié ≥1 produit)

```sql
-- Nombre de vendeurs actifs
SELECT COUNT(DISTINCT s.id) AS vendeurs_actifs
FROM sellers s
JOIN marketplace_offers mo ON mo."sellerId" = s.id
WHERE mo.status = 'PUBLISHED';

-- Détail par vendeur
SELECT 
  s.id,
  s."companyName",
  COUNT(mo.id) AS nb_produits_publies
FROM sellers s
JOIN marketplace_offers mo ON mo."sellerId" = s.id
WHERE mo.status = 'PUBLISHED'
GROUP BY s.id, s."companyName"
ORDER BY nb_produits_publies DESC;
```

### 4.2 Produits publiés (total et par catégorie)

```sql
-- Total produits publiés
SELECT COUNT(*) AS total_produits_publies
FROM marketplace_offers
WHERE status = 'PUBLISHED';

-- Par catégorie
SELECT category, COUNT(*) AS nb_produits
FROM marketplace_offers
WHERE status = 'PUBLISHED'
GROUP BY category
ORDER BY nb_produits DESC;
```

### 4.3 RFQ par statut

```sql
-- Vue globale des RFQ par statut
SELECT 
  status,
  COUNT(*) AS nb_rfq
FROM quote_requests
GROUP BY status
ORDER BY nb_rfq DESC;

-- RFQ créées par semaine (depuis début pilote)
SELECT 
  DATE_TRUNC('week', "createdAt") AS semaine,
  COUNT(*) AS nb_rfq
FROM quote_requests
WHERE "createdAt" >= '2026-05-01'
GROUP BY semaine
ORDER BY semaine;
```

### 4.4 Taux de réponse RFQ dans les 48 heures

```sql
-- RFQ avec première réponse dans les 48h
SELECT
  COUNT(*) FILTER (WHERE first_response_delay <= INTERVAL '48 hours') AS rfq_repondues_dans_48h,
  COUNT(*) AS total_rfq_avec_reponse,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE first_response_delay <= INTERVAL '48 hours') 
    / NULLIF(COUNT(*), 0), 
    1
  ) AS taux_reponse_48h_pct
FROM (
  SELECT 
    qr.id,
    MIN(q."createdAt") - qr."createdAt" AS first_response_delay
  FROM quote_requests qr
  JOIN quotes q ON q."quoteRequestId" = qr.id
  GROUP BY qr.id, qr."createdAt"
) AS rfq_avec_delai;
```

### 4.5 Paiements confirmés (total et montant)

```sql
-- Paiements réussis : nombre et montant total
SELECT 
  COUNT(*) AS nb_paiements,
  SUM(amount) AS montant_total_centimes,
  ROUND(SUM(amount) / 100.0, 2) AS montant_total_euros
FROM payments
WHERE status = 'SUCCEEDED';

-- Détail par paiement
SELECT 
  p.id,
  p.amount / 100.0 AS montant_euros,
  p.currency,
  p."createdAt",
  b."companyName" AS acheteur,
  s."companyName" AS vendeur
FROM payments p
JOIN buyers b ON b.id = p."buyerId"
JOIN sellers s ON s.id = p."sellerId"
WHERE p.status = 'SUCCEEDED'
ORDER BY p."createdAt" DESC;
```

### 4.6 Acheteurs actifs dans la semaine

```sql
-- Acheteurs s'étant connectés dans les 7 derniers jours
SELECT COUNT(DISTINCT u.id) AS acheteurs_actifs_7j
FROM users u
WHERE u.role = 'BUYER'
  AND u."lastLoginAt" >= NOW() - INTERVAL '7 days';
```

### 4.7 Factures téléchargées

```sql
-- Nombre de téléchargements de factures (si table invoice_downloads existe)
SELECT COUNT(*) AS nb_telechargements_facture
FROM invoice_downloads
WHERE "downloadedAt" >= '2026-05-01';

-- Alternative : compter les paiements avec facture générée
SELECT COUNT(*) AS paiements_avec_facture
FROM payments
WHERE status = 'SUCCEEDED'
  AND "invoiceUrl" IS NOT NULL;
```

### 4.8 État des jobs BullMQ

```sql
-- Si les jobs sont tracés en base (adapter selon implémentation)
SELECT 
  name AS job_type,
  status,
  COUNT(*) AS nb_jobs
FROM bull_jobs
WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
GROUP BY name, status
ORDER BY name, status;
```

**Note :** Si les jobs BullMQ ne sont pas tracés en base, consulter l'interface Bull Board disponible dans l'application admin, ou via les logs PM2 :
```bash
pm2 logs backend 2>&1 | grep -i "bull\|job\|failed"
```

---

## 5. Dashboard admin existant

Une page de tableau de bord KPI est disponible dans l'interface d'administration IOX.

**URL :** `https://pilot.iox.example/admin/kpi`

**Accès requis :** Compte avec rôle `ADMIN` dans IOX.

**Métriques disponibles sur la page :**
- Compteurs en temps réel (vendeurs actifs, produits, RFQ, paiements)
- Graphiques d'activité hebdomadaire
- Liste des RFQ récentes et leur statut
- Alertes sur les indicateurs hors cible

**Limites du dashboard pilote :**
- Les données sont rafraîchies toutes les 5 minutes (cache Redis)
- Pas d'export CSV disponible depuis l'interface (utiliser les requêtes SQL de la Section 4 pour l'export)
- Le dashboard ne montre pas les métriques de satisfaction (à collecter manuellement)

---

## 6. Reporting hebdomadaire — Template

À compléter chaque vendredi pendant la durée du pilote et partagé avec l'équipe IOX.

---

### Rapport pilote IOX — Semaine [N] — [Date]

**Rédigé par :** [Nom]
**Période :** [Date début] → [Date fin]

---

#### Section 1 — KPI Business de la semaine

| KPI | Valeur semaine | Cible | Statut |
|---|---|---|---|
| Vendeurs actifs | [N]/5 | ≥ 3 | Atteint / En cours / Non atteint |
| Produits publiés | [N] | ≥ 10 | Atteint / En cours / Non atteint |
| RFQ créées | [N] | ≥ 5 | Atteint / En cours / Non atteint |
| Taux réponse RFQ | [N]% | ≥ 70% | Atteint / En cours / Non atteint |
| Paiements test | [N] | ≥ 2 | Atteint / En cours / Non atteint |

#### Section 2 — KPI Technique de la semaine

| KPI | Valeur | Cible | Incident ? |
|---|---|---|---|
| Uptime backend | [N]% | ≥ 99% | Oui / Non |
| Erreurs 5xx | [N]% | < 1% | Oui / Non |
| Temps réponse moyen | [N]ms | < 500ms | Oui / Non |
| Jobs BullMQ failed | [N] | 0 | Oui / Non |
| Emails délivrés | [N]% | ≥ 95% | Oui / Non |

#### Section 3 — Incidents et support

**Nombre de demandes de support reçues :** [N]
**Incidents bloquants :** [N]

**Description des incidents (si applicable) :**
- [Incident 1] : [Description] — [Résolu / En cours]
- [Incident 2] : [Description] — [Résolu / En cours]

#### Section 4 — Retours terrain informels

*Résumé des retours utilisateurs collectés par WhatsApp, téléphone ou sur le terrain :*

**Coopératives :**
- [Coopérative 1] : [retour]
- [Coopérative 2] : [retour]

**Acheteurs :**
- [Acheteur 1] : [retour]
- [Acheteur 2] : [retour]

#### Section 5 — Actions pour la semaine suivante

| Action | Responsable | Deadline |
|---|---|---|
| [Action 1] | [Prénom] | [Date] |
| [Action 2] | [Prénom] | [Date] |
| [Action 3] | [Prénom] | [Date] |

---

*Distribuer ce rapport à : équipe IOX, investisseurs (sur demande), participants pilote (version allégée)*

---

*Ce document est mis à jour chaque semaine pendant la durée du pilote. Archiver chaque rapport avec la date dans le dossier `notes/archive/`.*
