# IOX — Checklist préproduction / go-live

Document opérationnel pour amener IOX en préproduction réelle puis en production.
Chaque section distingue **ce qui est déjà prêt dans le dépôt** et **ce qui doit être
exécuté manuellement sur l'hôte de préprod** (parce qu'il nécessite une infra externe
— Postgres, Redis, MinIO, DNS, certificats).

---

## 1. Pré-requis infrastructure (manuel, hors dépôt)

| Composant     | Exigence        | Remarque                                          |
| ------------- | --------------- | ------------------------------------------------- |
| PostgreSQL    | 15+             | Accessible via `DATABASE_URL`                     |
| Redis         | 7+              | Rate-limit + cache                                |
| MinIO (ou S3) | compatible S3   | Credentials dédiés (pas `minioadmin`)             |
| Reverse proxy | Nginx / Traefik | TLS terminaison + redirection HTTP→HTTPS          |
| DNS           | A/AAAA          | `api.<domaine>` → backend, `<domaine>` → frontend |
| Certificats   | Let's Encrypt   | Renouvellement auto                               |

---

## 2. Secrets & variables d'environnement

### Prêt dans le dépôt

- `apps/backend/.env.example` — gabarit complet avec avertissements
- `apps/backend/src/common/config/env.validation.ts` — schéma class-validator + garde `FORBIDDEN_SECRETS`
- `docs/SECRETS.md` — procédures de rotation JWT / MinIO / DB

### À faire manuellement en préprod

1. Générer des secrets forts :
   ```bash
   openssl rand -hex 48   # JWT_SECRET
   openssl rand -hex 48   # JWT_REFRESH_SECRET  (doit être différent)
   openssl rand -hex 24   # MINIO_SECRET_KEY
   ```
2. Renseigner dans le gestionnaire de secrets (Vault / SOPS / variables CI) :
   - `DATABASE_URL`, `REDIS_URL`
   - `JWT_SECRET`, `JWT_REFRESH_SECRET` (≥ 32 car, distincts, non-démo)
   - `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`
   - `APP_ENV=staging` (ou `production`)
   - `FRONTEND_URL=https://<domaine>` (HTTPS obligatoire en préprod/prod)
3. Lancer le preflight avant tout déploiement :
   ```bash
   pnpm preflight
   # ou directement :
   APP_ENV=staging JWT_SECRET=… JWT_REFRESH_SECRET=… \
   MINIO_ACCESS_KEY=… MINIO_SECRET_KEY=… DATABASE_URL=… \
   node scripts/preflight.mjs
   ```
   Exit code 0 = OK, 1 = checks en échec (détail imprimé).

---

## 3. Migrations Prisma

### Prêt

- `prisma/schema.prisma` — modèle de données complet
- `package.json` — scripts `db:migrate:deploy`, `db:migrate:status`
- `.gitignore` — n'exclut plus `migration.sql` (commit obligatoire en préprod)

### ⚠️ À faire avant le premier déploiement préprod

Le dossier `prisma/migrations/` est **vide**. Générer la migration baseline
**une seule fois**, sur un environnement avec Postgres accessible, puis committer :

```bash
# Local dev avec docker-compose up -d postgres
DATABASE_URL="postgresql://user:pass@localhost:5434/iox" \
pnpm exec prisma migrate dev --schema=prisma/schema.prisma --name init

git add prisma/migrations/
git commit -m "chore(db): add initial Prisma migration baseline"
```

En préprod, le backend doit exécuter au démarrage :

```bash
pnpm db:migrate:deploy
```

(intégré dans le script d'entrée du conteneur ou la procédure CI/CD).

Le preflight refusera le démarrage si `APP_ENV ∈ {staging, production}` et que
`prisma/migrations/` est vide.

---

## 4. Seed & comptes initiaux

### Prêt

- `prisma/seed.ts` — crée les comptes admin/producer/distributor/retailer/consumer

### Recommandation préprod

- Ne pas lancer `pnpm db:seed` en production. En préprod, le lancer **une fois** puis
  forcer la rotation des mots de passe initiaux via l'UI admin.
- Documenter dans le runbook l'utilisateur admin initial et sa procédure de rotation.

---

## 5. Images Docker

### Prêt

- `apps/backend/Dockerfile` — multi-stage, monorepo-aware, non-root, healthcheck
  - `pnpm deploy --prod --legacy` pour node_modules minimal
  - `prisma generate` dans le builder
  - Schéma Prisma copié dans l'image (pour `migrate deploy`)
- `apps/frontend/Dockerfile` — Next.js standalone, non-root, healthcheck
- Les deux healthchecks sont branchés (`/api/v1/health/live` pour le back,
  `/` pour le front)

### Build & push

```bash
docker build -f apps/backend/Dockerfile  -t iox/backend:<tag>  .
docker build -f apps/frontend/Dockerfile -t iox/frontend:<tag> .
docker push iox/backend:<tag>
docker push iox/frontend:<tag>
```

Les Dockerfiles fonctionnent **depuis la racine du monorepo** (contexte `.`),
pas depuis `apps/…`.

---

## 6. Procédure de déploiement préprod (premier passage)

Ordre strict :

1. **Infra** prête (PG / Redis / MinIO / reverse proxy TLS).
2. **Secrets** injectés dans le gestionnaire de secrets.
3. **Preflight** passe (`pnpm preflight` avec les vars de préprod, code 0).
4. **Migrations baseline** committées dans `prisma/migrations/`.
5. **Build** des images Docker taggées (SHA ou version).
6. **Push** vers le registre.
7. **Déploiement** :
   - Le backend démarre, exécute `prisma migrate deploy` (ou étape séparée en CI).
   - Si secrets placeholder détectés → boot refusé par `env.validation` ✅
   - Healthcheck `/api/v1/health/live` passe vert.
   - Readiness `/api/v1/health` passe vert (vérifie Prisma + storage).
8. **Seed initial** (uniquement première fois en préprod).
9. **Smoke test** manuel : login admin, création bénéficiaire, upload photo.
10. **E2E Playwright** en mode préprod (variable `E2E_BASE_URL=https://…`).

---

## 7. Checklist go/no-go

Avant bascule, chaque ligne doit être **verte** :

- [ ] `pnpm preflight` → exit 0 avec `APP_ENV=staging`
- [ ] `prisma/migrations/` contient la migration baseline committée
- [ ] Aucun secret de démo en préprod (contrôlé par preflight + `FORBIDDEN_SECRETS`)
- [ ] `FRONTEND_URL` démarre par `https://`
- [ ] `JWT_SECRET` ≠ `JWT_REFRESH_SECRET`, les deux ≥ 32 caractères
- [ ] Images Docker buildées avec succès et taggées
- [ ] Healthchecks backend (`/live`, `/`) verts pendant 5 min
- [ ] Logs backend : pas d'erreur 5xx à vide
- [ ] Swagger désactivé (automatique si `APP_ENV=production`)
- [ ] CORS limité à `FRONTEND_URL` (pas de `*`)
- [ ] Helmet CSP active (déjà appliqué dans `main.ts`)
- [ ] Rate-limit Redis joignable
- [ ] Backup Postgres configuré côté infra (pg_dump journalier minimum)
- [ ] Monitoring : healthchecks externes vers `/live`

---

## 8. Rollback

- **Code** : redéployer l'image précédente (tag versionné).
- **Schéma** : Prisma ne rollback pas automatiquement. Si une migration est
  destructive, préparer la migration inverse **avant** de déployer.
- **Data** : restaurer depuis le dernier `pg_dump` (RPO défini par la stratégie
  de backup).

---

## 9. Ce qui reste en dev / à améliorer après go-live

- Observabilité : OTLP / Prometheus metrics — voir section observabilité du rapport.
- Audit trail : logs applicatifs structurés OK, mais pas encore d'export centralisé
  (Loki / ELK à brancher côté infra).
- Gestion des rôles RBAC fine : validée fonctionnellement, pas encore de UI admin
  complète pour rôles custom.

---

## 10. Commandes utiles

```bash
# Status migrations (lecture seule)
pnpm db:migrate:status

# Preflight seul
pnpm preflight

# Build images
docker build -f apps/backend/Dockerfile -t iox/backend:dev .
docker build -f apps/frontend/Dockerfile -t iox/frontend:dev .

# Healthchecks
curl -f https://api.<domaine>/api/v1/health/live
curl -f https://api.<domaine>/api/v1/health
```
