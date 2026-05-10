# IOX — Smoke Tests Pré-Production

**Date :** 2026-05-11  
**Script associé :** `scripts/smoke-preprod-iox.sh`  
**Contexte :** À exécuter après chaque déploiement en staging/preprod et avant tout lancement en production.

---

## 1. Objectif

Les smoke tests valident que l'application est fonctionnellement opérationnelle après un déploiement. Ils ne remplacent pas les tests unitaires et d'intégration (qui passent en CI), mais vérifient que l'environnement déployé répond correctement.

**Ce que les smoke tests garantissent :**

- Le backend démarre et répond (NestJS en bonne santé)
- La documentation API est accessible (Swagger)
- Le frontend est servi (Next.js répond)
- Les endpoints publics sont accessibles
- Les gardes d'authentification fonctionnent (pas de régression sur la sécurité)
- Le manifest PWA est servi correctement

**Ce que les smoke tests ne couvrent pas :**

- La logique métier complète (paiements, RFQ, notifications)
- La performance sous charge
- Les flows utilisateur end-to-end (utiliser les tests Playwright pour cela)

---

## 2. Checks automatiques (ce que fait le script)

Le script `scripts/smoke-preprod-iox.sh` effectue 8 vérifications HTTP séquentielles.

| # | Endpoint | Méthode | Code attendu | Description |
|---|---|---|---|---|
| 1 | `/api/health` | GET | 200 | Backend NestJS opérationnel |
| 2 | `/api/docs/json` | GET | 200 | Swagger JSON accessible |
| 3 | `/marketplace` | GET | 200 | Page marketplace frontend servie |
| 4 | `/api/marketplace/offers` | GET | 200 | Endpoint public marketplace OK |
| 5 | `/api/auth/me` (sans token) | GET | 401 | Guard JWT actif |
| 6 | `/api/auth/login` (mauvais creds) | POST | 401 | Authentification rejetée correctement |
| 7 | `/manifest.webmanifest` | HEAD | 200 | PWA manifest servi |
| 8 | `/legal/terms` | GET | 200 | Page légale accessible |

**Logique du script :**

- Chaque check effectue un `curl` avec timeout de 10 secondes
- Le code HTTP réponse est comparé au code attendu
- En cas de divergence : le check est marqué `FAIL` avec le code reçu
- En fin de script : résumé `X/8 checks passed`
- Exit code : `0` si tout passe, `1` si au moins un check échoue (pour intégration CI/CD)

---

## 3. Checks manuels complémentaires (navigateur)

A réaliser dans un navigateur en navigation privée après les checks automatiques.

### Authentification

- [ ] Accéder à `/login` → formulaire affiché correctement
- [ ] Se connecter avec le compte de test pilote → redirection vers le dashboard
- [ ] Vérifier que le token JWT est bien stocké (DevTools → Application → LocalStorage ou Cookie)
- [ ] Se déconnecter → redirection vers `/login`

### Marketplace

- [ ] Accéder à `/marketplace` → liste des offres affichée (au minimum 3 offres de demo)
- [ ] Cliquer sur une offre → page détail accessible
- [ ] Filtrer par catégorie → filtres fonctionnels

### Paiement (staging uniquement — avec carte de test Stripe)

- [ ] Créer une demande de devis (RFQ) → email de confirmation reçu
- [ ] Tester un paiement avec la carte Stripe test `4242 4242 4242 4242` → confirmation affichée

### Admin

- [ ] Accéder à `/admin` avec le compte admin → dashboard admin accessible
- [ ] Accéder à `/admin/bull-board` → interface Bull Board chargée (queues visibles)

### Mobile (optionnel mais recommandé)

- [ ] Ouvrir sur mobile (ou DevTools → responsive) → layout mobile correct
- [ ] Tester l'installation PWA → bouton "Ajouter à l'écran d'accueil" présent

---

## 4. Variables requises pour le script

Le script `scripts/smoke-preprod-iox.sh` lit les variables suivantes depuis l'environnement ou depuis un fichier `.env.smoke` à la racine du projet.

| Variable | Description | Exemple |
|---|---|---|
| `SMOKE_API_BASE` | URL de base du backend | `https://api.iox.example` |
| `SMOKE_FRONTEND_BASE` | URL de base du frontend | `https://iox.example` |
| `SMOKE_TIMEOUT` | Timeout curl en secondes (défaut: 10) | `10` |
| `SMOKE_VERBOSE` | Afficher les headers de réponse (`true`/`false`, défaut: `false`) | `false` |

**Utilisation :**

```bash
# Depuis les variables d'environnement
export SMOKE_API_BASE="https://api.iox.example"
export SMOKE_FRONTEND_BASE="https://iox.example"
./scripts/smoke-preprod-iox.sh

# Ou depuis un fichier (non commité dans Git)
cat > .env.smoke <<EOF
SMOKE_API_BASE=https://api.iox.example
SMOKE_FRONTEND_BASE=https://iox.example
EOF
./scripts/smoke-preprod-iox.sh
```

---

## 5. Interprétation des résultats

### Résultat attendu (succès)

```
[IOX Smoke Tests] Starting...
API base:      https://api.iox.example
Frontend base: https://iox.example

[1/8] GET /api/health ..................... 200 OK  ✓
[2/8] GET /api/docs/json .................. 200 OK  ✓
[3/8] GET /marketplace .................... 200 OK  ✓
[4/8] GET /api/marketplace/offers ......... 200 OK  ✓
[5/8] GET /api/auth/me (no token) ......... 401 OK  ✓
[6/8] POST /api/auth/login (bad creds) .... 401 OK  ✓
[7/8] HEAD /manifest.webmanifest .......... 200 OK  ✓
[8/8] GET /legal/terms .................... 200 OK  ✓

Result: 8/8 checks passed
Status: ALL PASS — deployment OK
```

Exit code : `0`

### Résultat en cas d'échec

```
[1/8] GET /api/health ..................... 502 FAIL ✗ (expected 200)
...
Result: 7/8 checks passed
Status: SOME FAILURES — do not proceed
```

Exit code : `1`

### Codes HTTP inhabituels

| Code reçu | Interprétation probable |
|---|---|
| 502 Bad Gateway | PM2 process crashé ou pas encore démarré |
| 503 Service Unavailable | Nginx actif mais backend KO |
| 000 (curl timeout) | Service injoignable ou firewall bloquant |
| 301 / 302 | Redirection inattendue (config Nginx à vérifier) |
| 500 | Erreur applicative, vérifier les logs PM2 |
| 403 sur /api/docs | Swagger désactivé en production (peut être volontaire) |

---

## 6. En cas d'échec

### Diagnostic rapide

```bash
# Vérifier le statut des processus
pm2 status

# Vérifier les dernières lignes de logs backend
pm2 logs iox-backend --lines 50

# Vérifier les logs frontend
pm2 logs iox-frontend --lines 50

# Vérifier Nginx
sudo nginx -t
sudo systemctl status nginx

# Vérifier PostgreSQL
sudo systemctl status postgresql
psql "$DATABASE_URL" -c "SELECT 1;"

# Vérifier Redis
redis-cli ping  # Doit répondre PONG

# Vérifier MeiliSearch
curl -s http://localhost:7700/health | jq '.status'
```

### Actions selon le check en échec

| Check | Code reçu | Action |
|---|---|---|
| 1 — `/api/health` | 502 | `pm2 restart iox-backend` puis re-check dans 10s |
| 1 — `/api/health` | 500 | Vérifier logs, vérifier DATABASE_URL et connexion Postgres |
| 2 — Swagger | 404 | Vérifier que `NODE_ENV` n'est pas `production` si Swagger est désactivé en prod |
| 3/4 — Frontend/Marketplace | 502 | `pm2 restart iox-frontend` |
| 5/6 — Auth 401 | 200 reçu | **Critique** — le guard JWT n'est plus actif, rollback immédiat |
| 7 — PWA manifest | 404 | Next.js build incomplet, rebuild frontend |
| 8 — Legal/terms | 404 | Page supprimée ou route manquante, vérifier les routes Next.js |

### Si le problème persiste après redémarrage

Déclencher la procédure de rollback documentée dans `notes/deployment-vps-pilote-ferme-iox.md` section 8.

---

*Références :*  
*- Script : `scripts/smoke-preprod-iox.sh`*  
*- Déploiement : `notes/deployment-vps-pilote-ferme-iox.md`*  
*- Monitoring : `notes/monitoring-pilote-iox.md`*
