# Audit déploiement IOX — état réel et procédure cible

_Auteur : run autonome Claude — 2026-04-23_

Objectif : comprendre **comment le code arrive réellement en prod**,
mettre à plat les écarts avec le runbook historique, proposer une
procédure sécurisée et exécutable pour livrer la phase DS-0 → DS-2.

---

## 1. État réel du déploiement

### 1.1 Hôte cible

- **Host** : `rahiss-vps` — Ubuntu 24.04.4 LTS (`srv1570073`)
- **IP** : 187.124.216.193
- **Utilisateur de déploiement** : `deploy` (clé `~/.ssh/rahiss_deploy_ed25519`)
- **Disque** : `/dev/sda1` 48 GB — **37 GB utilisés / 11 GB libres** (79 %)
  - Docker build cache : 22,5 GB, dont 6,6 GB récupérables
- **Uptime** : 9 h 38 min
- **Autres stacks colocalisées** : `telemante`, `studio-solo-ia`
  (isolation Docker network, OK)

### 1.2 Répertoire applicatif sur VPS

```
/opt/apps/iox/
├── .env                    ← secrets (PG / JWT / MinIO) — VPS-only, jamais sync
├── .env.example
├── docker-compose.vps.yml  ← VPS-only, ABSENT du repo local (drift)
├── docker-compose.yml      ← dev-only, non utilisé en prod
├── apps/
├── packages/
├── prisma/
├── scripts/
│   ├── preflight.mjs
│   └── smoke-check.sh
└── deploy/preprod/         ← templates, non exécutés
```

Mtimes alignés sur Apr 22 21:35 → toute l'arbo a été écrite en bloc
(typique d'un `rsync -a` ou d'une extraction d'archive).

### 1.3 Conteneurs en cours

| Container    | Image                | Port host      | Statut (10 h) |
| ------------ | -------------------- | -------------- | ------------- |
| iox_frontend | `iox-frontend:local` | 127.0.0.1:3000 | healthy       |
| iox_backend  | `iox-backend:local`  | 127.0.0.1:3001 | healthy       |
| iox_postgres | `postgres:15-alpine` | interne        | healthy       |
| iox_redis    | `redis:7-alpine`     | interne        | healthy       |
| iox_minio    | `minio/minio:latest` | interne        | healthy       |

Project Docker Compose : `iox` • config
`/opt/apps/iox/docker-compose.vps.yml` • working dir `/opt/apps/iox` •
env_file `/opt/apps/iox/.env` • network `iox_iox_net`.

Images créées le **2026-04-22 21:43 UTC (frontend) et 22:53 UTC (backend)** —
donc **bâties on-host** à partir de la copie source courante
(multi-stage Dockerfile qui fait `COPY . . && pnpm build`).

Tailles : frontend **370 MB** (Next standalone), backend **1,65 GB**
(NestJS + Prisma).

### 1.4 TLS et reverse-proxy

- **Nginx hôte** (pas de conteneur nginx pour IOX) — termine TLS.
- Sites actifs : `iox.mycloud.yt.conf`, `telemante.mycloud.yt.conf`,
  `solo.mycloud.yt.conf` dans `/etc/nginx/sites-enabled/`.
- Certificat : Let's Encrypt, répertoire partagé
  `/opt/apps/_shared/letsencrypt/`.
- Upstream : `http://127.0.0.1:3000` (frontend) +
  `http://127.0.0.1:3001` (backend `/api/*`).
- **Live check OK** :
  `GET https://iox.mycloud.yt/` → 307 (redirect) ;
  `GET https://iox.mycloud.yt/api/v1/health` → 200 `{success:true, database:up, storage:up}`.

### 1.5 Automatisation

- Cron `deploy` : **vide**
- Systemd units IOX : **aucune**
- `.github/workflows/ci.yml` : CI existe (typecheck / lint / test)
  mais **sans job de déploiement**
- `~/.bash_history` du user `deploy` : vide (HISTFILE désactivé ou
  purgé)
- Script deploy maison : **aucun** (ni local, ni `/opt/apps/iox/scripts/`,
  ni `~/bin`)

### 1.6 Repo local

- `/Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox/` :
  **pas un clone git** (pas de `.git`). Les changements applicatifs
  vivent directement sur disque.

---

## 2. Écarts avec le runbook historique

| Domaine           | RUNBOOK `deploy/preprod/RUNBOOK.md`            | Réalité VPS                                                        |
| ----------------- | ---------------------------------------------- | ------------------------------------------------------------------ |
| Source des images | Registry : `registry.example.com/iox/*:vX.Y.Z` | **Build on-host** (`iox-*:local`)                                  |
| Fichier compose   | `deploy/preprod/docker-compose.preprod.yml`    | `/opt/apps/iox/docker-compose.vps.yml` (non versionné en local)    |
| Variables env     | `.env.preprod.example` à copier                | `/opt/apps/iox/.env` déjà peuplé                                   |
| Transport du code | Non documenté explicitement                    | `rsync`/`scp` manuel (inféré des mtimes en bloc)                   |
| Versioning        | Implicite tag d'image                          | Pas de tag versionné, tout est `:local`                            |
| Base de données   | Dump + restore                                 | Conteneur `postgres:15-alpine` persistant (`postgres_data` volume) |
| CI/CD             | Non précisé                                    | Aucune, 100 % manuel                                               |

**Conclusion** : le runbook décrit un idéal (registry + tag + CI) qui
n'a jamais été implémenté. La prod tourne sur un schéma beaucoup plus
simple — et toujours fonctionnel — mais non tracé.

---

## 3. Divergences source local ↔ VPS à pousser

Hash SHA-256 des clés de référence :
| Fichier | Local | VPS |
|---|---|---|
| `apps/frontend/package.json` | `51ac2b8b…` | `34cbbe1c…` ⚠ |
| `pnpm-lock.yaml` | `7f8b3fe6…` | `779498ca…` ⚠ |
| `apps/frontend/src/lib/motion.ts` | présent | **absent** |
| `apps/frontend/src/components/ui/*` | 14 composants | **seulement `status-badge.tsx`** |

Delta fonctionnel à pousser (DS-0 + DS-1 + DS-2) :

- Ajout de deps : `framer-motion`, `@radix-ui/react-tabs`,
  `@radix-ui/react-separator`, `@radix-ui/react-avatar`,
  `@radix-ui/react-label` (cf. `apps/frontend/package.json`)
- Nouveau : `apps/frontend/src/lib/motion.ts`
- Nouveau : `apps/frontend/src/components/ui/{button,card,input,label,separator,badge,skeleton,empty-state,metric-card,tabs,dialog,sheet,avatar,index}.tsx`
- Modifié : `status-badge.tsx` (prop `tone` opt-in)
- Modifié : `tailwind.config.ts`, `src/styles/globals.css` (tokens premium)
- Modifié : `src/app/(auth)/login/page.tsx` (fix Suspense)
- Modifié : `src/app/(dashboard)/dashboard/page.tsx` (KpiCard → MetricCard)
- Modifié : `src/components/marketplace/ProductCard.tsx` (hover premium)
- Documentation : `docs/design-system/AUTONOMOUS-RUN-REPORT.md`,
  `docs/deploy/VPS-DEPLOY-AUDIT.md`

Impact backend : **zéro**. `apps/backend/package.json` inchangé.

---

## 4. Procédure cible recommandée (moyen terme)

À mettre en place dans un sprint infra dédié :

1. **Initialiser un vrai repo git** (local + remote GitHub / GitLab)
2. **Versionner `docker-compose.vps.yml`** dans le repo (sortir de la
   dérive VPS-only).
3. Ajouter un workflow GitHub Actions `deploy-preprod.yml` qui, sur push
   `main` :
   - build l'image frontend
   - push vers un registry (ghcr.io ou registry MCH)
   - SSH vers la VPS, pull l'image, restart compose
4. Remplacer les tags `:local` par des tags `:sha-<commit>` pour
   traçabilité.
5. Aligner le RUNBOOK sur cette nouvelle réalité ou l'archiver.

Ces étapes sont **hors scope immédiat** (elles nécessitent du travail
et des décisions : choix du registry, secrets GitHub, rotation de
clés, etc.). Elles n'empêchent pas un déploiement sûr à court terme.

---

## 5. Procédure minimale sécurisée — court terme (celle proposée pour cette livraison)

### 5.1 Principes

- **Aucune modification VPS non-nécessaire** : on ne touche ni le
  backend, ni Postgres, ni MinIO, ni nginx, ni `.env`, ni le compose
  file.
- **Rollback en 5 secondes** via tag d'image `:prev`.
- **Rsync avec excludes explicites** (pas de `--delete` sur les paths
  VPS-only).
- **Build isolé au service `frontend`** : `docker compose build frontend`
  reconstruit uniquement l'image cible sans redémarrer le backend.
- **Healthchecks après restart** : HTTP 200/307 sur `/`, HTTP 200 sur
  `/api/v1/health`.

### 5.2 Commande exacte — synopsis

```bash
# depuis /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
# (machine locale, macOS)

VPS=rahiss-vps
REMOTE=/opt/apps/iox

# 1. Sync source (EXCLUDES critiques)
rsync -av --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='dist' \
  --exclude='.turbo' \
  --exclude='coverage' \
  --exclude='test-results' \
  --exclude='playwright-report' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='docker-compose.vps.yml' \
  --exclude='tsconfig.tsbuildinfo' \
  ./ "${VPS}:${REMOTE}/"

# 2. Snapshot rollback
ssh "${VPS}" "docker tag iox-frontend:local iox-frontend:prev"

# 3. Build isolé
ssh "${VPS}" "cd ${REMOTE} && docker compose -f docker-compose.vps.yml build frontend"

# 4. Recréation du seul container frontend
ssh "${VPS}" "cd ${REMOTE} && docker compose -f docker-compose.vps.yml up -d --no-deps frontend"

# 5. Healthcheck
sleep 6
curl -skfI https://iox.mycloud.yt/ | head -3
curl -skf  https://iox.mycloud.yt/api/v1/health | head -1
```

### 5.3 Checklist post-déploiement

- [ ] `docker ps | grep iox_frontend` → `healthy`
- [ ] `curl -skfI https://iox.mycloud.yt/` → 307 (redirect `/login`)
- [ ] `curl -skfI https://iox.mycloud.yt/login` → 200
- [ ] `curl -skf https://iox.mycloud.yt/api/v1/health` → `{"success":true, … database:up, storage:up}`
- [ ] Page `/login` en HTML : contient "Plateforme MCH"
- [ ] Page `/dashboard` accessible après login (non testable sans
      credentials depuis CLI, à vérifier côté utilisateur)
- [ ] Marketplace public `https://iox.mycloud.yt/marketplace` → liste
      affichée (ou message d'erreur gracieux)
- [ ] Logs backend : `docker logs iox_backend --tail 50` — aucune
      nouvelle erreur 5xx

### 5.4 Rollback plan

Si un health-check échoue ou si un smoke-test manuel renvoie un
comportement dégradé :

```bash
ssh rahiss-vps 'docker tag iox-frontend:prev iox-frontend:local \
  && cd /opt/apps/iox \
  && docker compose -f docker-compose.vps.yml up -d --no-deps frontend'
# Vérifier à nouveau :
curl -skfI https://iox.mycloud.yt/ | head -3
```

Le tag `:prev` reste disponible jusqu'au prochain déploiement ;
penser à le refresh à chaque livraison.

Rollback complet (inclure le code source) : restauration impossible
sans backup préalable du répertoire `/opt/apps/iox/`. **Recommandation
pour les prochains runs** : ajouter une étape "archive tar du répertoire
courant" avant `rsync`.

### 5.5 Pré-conditions avant exécution

- ✅ Tous les tests locaux passent (436/436, cf. rapport nocturne)
- ✅ Utilisateur a validé la mission DS-0 → DS-2
- ✅ SSH vers `rahiss-vps` fonctionnel
- ✅ Disque VPS > 5 GB libres (on a 11 GB)
- ✅ Images `iox-*:local` courantes disponibles pour rollback
- ✅ Pas de maintenance nginx en cours

---

## 6. Limites assumées / choses non vérifiées

Les points suivants **restent opaques** pour ce run et mériteraient
une clarification opérateur :

1. **Workflow historique réel** de push → VPS : probablement `rsync`
   manuel, mais non confirmé (pas de bash history).
2. **Contenu exact du nginx conf** : `sudo` requis pour
   `/etc/nginx/sites-available/iox.mycloud.yt.conf`, lecture refusée
   à l'utilisateur `deploy`. Non bloquant (healthcheck prouve que le
   proxy fonctionne).
3. **Provenance du fichier `/opt/apps/iox/docker-compose.vps.yml`** :
   non commité localement, donc éditions futures côté VPS sont
   invisibles pour le code source.
4. **Stratégie de backup** (PG dumps, volumes MinIO) : non documentée.

Ces points ne sont **pas bloquants** pour un déploiement frontend-only,
mais doivent être tranchés avant toute opération sensible (migration
DB, rotation secrets, changement d'hôte).

---

## 7. Recommandation de déploiement

Le chemin décrit au § 5 est :

- **minimal** (rsync + build frontend uniquement)
- **réversible** (tag `:prev` + rollback one-liner)
- **testé par construction** (tout le delta a passé 436/436 tests)
- **sans impact backend / DB / secrets**

Je propose donc de l'exécuter, **après feu vert explicite utilisateur**,
comme suggéré par le mandat :

> _« tu exécutes le déploiement si et seulement si le chemin est
> propre, compris et maîtrisé »_

La chaîne est désormais propre et documentée. Dernière décision
utilisateur attendue : **GO / NO-GO pour le bloc §5.2**.
