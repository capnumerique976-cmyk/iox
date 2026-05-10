# IOX — Monitoring Pilote

**Date :** 2026-05-11  
**Périmètre :** Monitoring minimal opérationnel pour la phase pilote (1–3 fermes)  
**Référence :** `notes/monitoring-alerting-iox.md` (monitoring complet post-pilote)

---

## 1. Endpoints à surveiller

Surveillance de disponibilité externe (black-box monitoring).

| Endpoint | Méthode | Code attendu | Fréquence | Criticité |
|---|---|---|---|---|
| `https://api.[domaine]/api/health` | GET | 200 | 1 min | Critique |
| `https://[domaine]/` | GET | 200 | 1 min | Critique |
| `https://[domaine]/marketplace` | GET | 200 | 1 min | Haute |
| `https://api.[domaine]/api/health` (détail DB) | GET | 200 + `db: "ok"` | 1 min | Critique |
| `https://api.[domaine]/api/health` (détail Redis) | GET | 200 + `redis: "ok"` | 1 min | Haute |
| `https://api.[domaine]/api/docs/json` | GET | 200 | 5 min | Basse |
| `http://localhost:7700/health` (MeiliSearch, interne) | GET | 200 | 5 min | Moyenne |
| Espace disque (cron ou PM2) | — | < 80% | 15 min | Haute |

**Note sur /api/health :** Le endpoint health NestJS expose les statuts des sous-systèmes. Configurer le monitoring pour vérifier que la réponse JSON contient `"status": "ok"` et pas uniquement le code HTTP 200.

---

## 2. UptimeRobot — Configuration (tier gratuit)

UptimeRobot gratuit offre 50 monitors avec un intervalle de 5 minutes. Suffisant pour le pilote.

### Monitors à créer

1. **IOX Backend** — HTTP(s), `https://api.[domaine]/api/health`, intervalle 5 min, keyword `"ok"`
2. **IOX Frontend** — HTTP(s), `https://[domaine]/`, intervalle 5 min, status 200
3. **IOX Marketplace** — HTTP(s), `https://[domaine]/marketplace`, intervalle 5 min, status 200
4. **IOX API Marketplace** — HTTP(s), `https://api.[domaine]/api/marketplace/offers`, intervalle 5 min, status 200
5. **IOX SSL** — SSL Certificate, `[domaine]`, alerte 30 jours avant expiration

### Configuration des alertes UptimeRobot

- **Email** : `[À compléter — email responsable technique]`
- **SMS** (optionnel, tier payant) : `[À compléter]`
- **Politique d'alerte** : notifier après 2 échecs consécutifs (évite les faux positifs)
- **Intégration Slack** (si utilisé) : webhook `[À compléter]`

### Accès au dashboard

- URL : `https://uptimerobot.com/dashboard`
- Compte : `[À compléter]`
- Partager la status page publique avec l'équipe : UptimeRobot → Status Pages → Créer une page

---

## 3. PM2 — Monitoring local

Commandes de monitoring à exécuter directement sur le serveur.

### Supervision en temps réel

```bash
# Dashboard PM2 interactif (CPU, mémoire, logs)
pm2 monit

# Statut synthétique de tous les processus
pm2 status

# Logs en temps réel (tous les processus)
pm2 logs

# Logs backend uniquement (100 dernières lignes)
pm2 logs iox-backend --lines 100

# Logs frontend uniquement
pm2 logs iox-frontend --lines 100
```

### Métriques de processus

```bash
# Informations détaillées (uptime, restarts, mémoire)
pm2 show iox-backend
pm2 show iox-frontend

# Historique des redémarrages
pm2 describe iox-backend | grep restart
```

### Alertes PM2 (redémarrages automatiques)

PM2 redémarre automatiquement un processus crashé. En cas de redémarrages fréquents, investiguer :

```bash
# Nombre de redémarrages depuis le lancement
pm2 status | grep -E "name|restarts"

# Si > 3 redémarrages en 10 minutes : investiguer les logs
pm2 logs iox-backend --lines 200 --err
```

---

## 4. Alertes seuils

### Espace disque

Script à ajouter en cron (toutes les 15 minutes) :

```bash
# /opt/iox/scripts/check-disk.sh
#!/usr/bin/env bash
THRESHOLD=80
USAGE=$(df / | awk 'NR==2 {print $5}' | tr -d '%')

if [ "$USAGE" -gt "$THRESHOLD" ]; then
  echo "[IOX ALERTE] Disque / utilisé à ${USAGE}% (seuil: ${THRESHOLD}%)" \
    | mail -s "[IOX] ALERTE Disque" [À compléter — email]
fi
```

Crontab :
```cron
*/15 * * * * /opt/iox/scripts/check-disk.sh
```

### Mémoire RAM

```bash
# Vérification mémoire > 90%
FREE_MEM=$(free | awk '/^Mem/ {printf "%.0f", $3/$2 * 100}')
if [ "$FREE_MEM" -gt 90 ]; then
  echo "[IOX] Mémoire utilisée à ${FREE_MEM}%"
fi
```

### Résumé des seuils d'alerte

| Métrique | Seuil WARNING | Seuil CRITICAL | Action |
|---|---|---|---|
| Espace disque | 70% | 80% | Purger les vieux logs et backups |
| Mémoire RAM | 80% | 90% | Redémarrer le processus consommateur |
| Backend indisponible | 1 min | 2 min | Redémarrer PM2, si persistant : rollback |
| Jobs BullMQ en échec | 5 | 10 | Investiguer les logs de queue |
| Backup manquant | 26h | 48h | Relancer backup manuellement |

---

## 5. Sentry — Suivi des erreurs applicatives

Sentry capture automatiquement les exceptions non gérées côté backend (NestJS) et frontend (Next.js).

### Configuration

#### Prérequis

1. Créer un projet Sentry sur `https://sentry.io` → New Project → Node.js (backend), Next.js (frontend)
2. Récupérer les DSN pour chaque projet

#### Variables d'environnement

```env
# Backend .env
SENTRY_DSN=https://[À compléter]@o[id].ingest.sentry.io/[project-id]

# Frontend .env.local
NEXT_PUBLIC_SENTRY_DSN=https://[À compléter]@o[id].ingest.sentry.io/[project-id-frontend]
```

Quand ces variables sont définies, les erreurs sont automatiquement reportées. Si elles sont absentes, l'application fonctionne normalement sans Sentry.

#### Alertes Sentry recommandées

- Nouvelle issue → email immédiat
- Issue récurrente (> 10 occurrences/h) → email + Slack
- Performance : p95 > 3s sur les endpoints critiques → alerte

#### Environnements Sentry

- Configurer `environment: process.env.NODE_ENV` dans l'initialisation Sentry pour distinguer `staging` et `production` dans le dashboard.

---

## 6. Bull Board — Monitoring des queues

### Accès

URL : `https://[domaine]/admin/bull-board`  
Authentification : compte admin IOX requis

### Queues surveillées

| Queue | Description | Alerte si |
|---|---|---|
| `email` | Envoi d'emails transactionnels | > 5 jobs en échec |
| `notifications` | Notifications in-app | > 10 jobs en échec |
| `search-index` | Réindexation MeiliSearch | > 2 jobs en échec |
| `payments` | Traitement paiements Stripe | > 1 job en échec |

### Commandes BullMQ depuis le serveur

```bash
# Voir les jobs en échec (via redis-cli)
redis-cli keys "bull:*:failed" | head -20

# Nettoyer les jobs en échec (après investigation)
# Préférer le Bull Board UI pour cette action
```

---

## 7. Procédure d'astreinte pilote

### Contacts

| Rôle | Nom | Contact | Disponibilité |
|---|---|---|---|
| Responsable technique | [À compléter] | [À compléter] | Heures ouvrées + urgences |
| Backup technique | [À compléter] | [À compléter] | Urgences uniquement |
| Responsable pilote | [À compléter] | [À compléter] | Heures ouvrées |

### Arbre de décision en cas d'alerte

```
Alerte UptimeRobot reçue
        │
        ▼
Vérifier pm2 status sur le serveur
        │
        ├── Processus "errored" ou "stopped"
        │       → pm2 restart iox-backend (ou iox-frontend)
        │       → Attendre 30s, re-vérifier
        │       → Si persiste : appeler responsable technique
        │
        ├── Processus "online" mais UptimeRobot toujours KO
        │       → Vérifier Nginx : sudo systemctl status nginx
        │       → Vérifier PostgreSQL : sudo systemctl status postgresql
        │       → Vérifier les logs : pm2 logs --lines 100
        │
        └── Tout semble OK côté serveur
                → Possible faux positif UptimeRobot
                → Attendre la prochaine vérification (5 min)
                → Si alerte persiste : tester manuellement depuis un autre réseau
```

### Durée maximale avant escalade

| Incident | Délai avant escalade |
|---|---|
| Backend indisponible | 5 minutes |
| Frontend indisponible | 10 minutes |
| Base de données inaccessible | 2 minutes |
| Erreur de paiement (Sentry) | Immédiat |

---

*Références :*  
*- Monitoring complet (post-pilote) : `notes/monitoring-alerting-iox.md`*  
*- Déploiement : `notes/deployment-vps-pilote-ferme-iox.md`*  
*- Backup : `notes/backup-restore-runbook-iox.md`*
