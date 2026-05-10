# KPI Pilote — IOX Mayotte

> Tableau de bord des indicateurs clés de performance pour la phase pilote terrain.  
> Version 2026-05-11 — Usage interne équipe IOX.

---

## 1. KPI Business

Métriques liées à l'adoption et à l'activité commerciale de la plateforme.

| KPI | Définition | Cible pilote | Fréquence |
|---|---|---|---|
| **Vendeurs actifs** | Coopératives ayant publié au moins 1 produit | ≥ 3 | Hebdomadaire |
| **Produits publiés** | Offres au statut PUBLISHED dans le marketplace | ≥ 10 | Hebdomadaire |
| **Documents validés** | Documents KYB/compliance approuvés par l'admin | ≥ 5 | Hebdomadaire |
| **RFQ créées** | Demandes de devis soumises par les acheteurs | ≥ 5 | Hebdomadaire |
| **Taux de réponse RFQ < 48h** | Part des RFQ ayant reçu une réponse vendeur en moins de 48h | ≥ 70 % | Hebdomadaire |
| **RFQ converties** | RFQ ayant abouti à un devis accepté (statut WON) | ≥ 30 % | Fin de pilote |
| **Paiements traités** | Transactions Stripe confirmées (statut SUCCEEDED) | ≥ 2 | Fin de pilote |
| **Factures téléchargées** | Factures PDF téléchargées par vendeurs ou acheteurs | ≥ 2 | Fin de pilote |

**Lecture :** un KPI en dessous de sa cible deux semaines consécutives déclenche une analyse d'impact et une action corrective documentée dans le rapport hebdomadaire.

---

## 2. KPI Technique

Métriques liées à la fiabilité et à la performance de la plateforme.

| KPI | Définition | Cible | Fréquence |
|---|---|---|---|
| **Uptime backend** | Disponibilité de l'API (`/api/health` répondant 200) | ≥ 99 % | Continu (UptimeRobot) |
| **Erreurs 5xx** | Taux de réponses HTTP 5xx sur le total des requêtes API | < 1 % | Quotidien |
| **Latence API p95** | 95e percentile du temps de réponse des endpoints API | < 500 ms | Quotidien |
| **Jobs BullMQ échoués** | Nombre de jobs en statut "failed" non retentés dans les queues | 0 | Quotidien |
| **Emails délivrés** | Taux de délivrance des emails transactionnels (invitations, notifications) | ≥ 95 % | Hebdomadaire |

**Sources de données :**
- Uptime et erreurs 5xx : UptimeRobot + logs PM2
- Latence : logs applicatifs NestJS ou APM (si configuré)
- Jobs BullMQ : Bull Board (`/admin/bull-board`)
- Emails : dashboard du provider SMTP (Mailgun, SendGrid…)

---

## 3. KPI Satisfaction

Métriques liées à l'expérience utilisateur et à la qualité du service.

| KPI | Définition | Cible | Fréquence |
|---|---|---|---|
| **NPS vendeurs** | Note moyenne de satisfaction des coopératives (fiche retour, question 5) | ≥ 6 / 10 | Fin de pilote |
| **NPS acheteurs** | Note moyenne de satisfaction des acheteurs (fiche retour, question 5) | ≥ 6 / 10 | Fin de pilote |
| **Bugs bloquants remontés** | Incidents empêchant totalement l'utilisation normale de la plateforme | < 3 | Fin de pilote |

**Note sur le NPS simplifié :** la note est collectée via la fiche retour utilisateur (section 10 du kit pilote). L'échelle utilisée est 1-5 → convertie sur 10 pour comparaison. Une note ≥ 6/10 correspond à ≥ 3/5 sur la fiche.

---

## 4. Requêtes SQL utiles

Ces requêtes sont exécutées en **lecture seule** (SELECT uniquement) sur la base de données de pilote.

```sql
-- Vendeurs ayant au moins 1 produit publié
SELECT COUNT(DISTINCT "sellerId") AS vendeurs_actifs
FROM marketplace_offers WHERE status = 'PUBLISHED';
```

```sql
-- Produits publiés total
SELECT COUNT(*) AS produits_publies 
FROM marketplace_offers WHERE status = 'PUBLISHED';
```

```sql
-- RFQ par statut
SELECT status, COUNT(*) AS total
FROM quote_requests
GROUP BY status ORDER BY total DESC;
```

```sql
-- Paiements confirmés + montant total
SELECT COUNT(*) AS nb_paiements, 
       SUM(amount) / 100.0 AS montant_total_eur
FROM payments WHERE status = 'SUCCEEDED';
```

```sql
-- Taux réponse RFQ (répondues dans 48h)
SELECT 
  COUNT(*) FILTER (WHERE status != 'PENDING') AS rfq_avec_reponse,
  COUNT(*) AS rfq_total,
  ROUND(COUNT(*) FILTER (WHERE status != 'PENDING') * 100.0 / NULLIF(COUNT(*),0), 1) AS taux_pct
FROM quote_requests
WHERE "createdAt" < NOW() - INTERVAL '48 hours';
```

> **Précautions :** toujours exécuter ces requêtes avec un utilisateur PostgreSQL sans droits d'écriture. Ne jamais lancer de DELETE, UPDATE ou INSERT sur la base de pilote réelle sans backup préalable.

---

## 5. Dashboard admin

La page `/admin/kpi` de l'application IOX affiche en temps réel les métriques business principales :

- Nombre de vendeurs actifs
- Nombre de produits publiés
- RFQ créées et leur statut
- Taux de réponse
- Paiements traités

**Accès :** connexion avec un compte ayant le rôle `ADMIN` sur la plateforme → menu latéral → **"KPI / Tableau de bord"**.

Pour les métriques techniques (uptime, erreurs), consulter :
- **Bull Board** : `/admin/bull-board` pour les jobs BullMQ
- **Swagger** : `/api/docs` pour tester les endpoints
- **Logs PM2** : voir les commandes dans le runbook exploitation

---

## 6. Rapport hebdomadaire pilote

Template à remplir chaque lundi matin et à partager avec l'équipe IOX.

---

**Semaine n° :** ___ / Date : _______________  
**Rédacteur :** _______________

---

### Section 1 — Métriques de la semaine

| KPI | Valeur semaine | Cible | Statut |
|---|---|---|---|
| Vendeurs actifs | | ≥ 3 | ☐ OK ☐ NOK |
| Produits publiés | | ≥ 10 | ☐ OK ☐ NOK |
| Documents validés | | ≥ 5 | ☐ OK ☐ NOK |
| RFQ créées | | ≥ 5 | ☐ OK ☐ NOK |
| Taux réponse < 48h | | ≥ 70 % | ☐ OK ☐ NOK |
| Uptime backend | | ≥ 99 % | ☐ OK ☐ NOK |
| Erreurs 5xx | | < 1 % | ☐ OK ☐ NOK |
| Jobs BullMQ échoués | | 0 | ☐ OK ☐ NOK |

---

### Section 2 — Incidents de la semaine

| Date | Description | Impact | Résolution | Durée |
|---|---|---|---|---|
| | | | | |

*Si aucun incident : mentionner "Aucun incident cette semaine."*

---

### Section 3 — Retours utilisateurs

Synthèse des retours qualitatifs collectés auprès des coopératives et acheteurs :

- **Points positifs :** _______________
- **Points de friction :** _______________
- **Demandes spécifiques :** _______________

---

### Section 4 — Actions correctives

| Action | Priorité | Responsable | Deadline |
|---|---|---|---|
| | | | |

---

### Section 5 — Objectifs semaine suivante

1. _______________
2. _______________
3. _______________
