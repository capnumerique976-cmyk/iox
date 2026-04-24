# IOX — Runbook pré-déploiement

> À exécuter avant chaque release préprod/prod. Temps cible : < 15 min.

---

## 1. Conditions bloquantes (stop si KO)

- [ ] CI verte sur le commit à déployer (`gh pr checks` ou `gh run list`).
- [ ] Tag / SHA du build identifié et validé par le responsable release.
- [ ] Aucune alerte Prometheus `critical` active sur l'env cible
      (vérifier Grafana → _IOX Overview_).
- [ ] Window de maintenance communiquée (canal `#iox-ops`, min. 30 min avant).

## 2. Snapshot avant déploiement

```bash
# 1. Dump logique Postgres (base cible)
pg_dump --format=custom --file=iox_preprod_$(date +%Y%m%d-%H%M).dump \
  "$DATABASE_URL"

# 2. Liste des migrations Prisma déjà appliquées
npx prisma migrate status --schema=apps/backend/prisma/schema.prisma

# 3. Sauvegarder les manifests actuels (si k8s)
kubectl -n iox get deploy,svc,cm,secret -o yaml > snapshot-$(date +%Y%m%d-%H%M).yaml
```

Stocker ces artefacts dans un bucket séparé (`iox-release-snapshots/`),
**TTL 30 jours**.

## 3. Vérifications code/config

- [ ] `apps/backend/.env` (ou secrets k8s) aligné avec `.env.example`
      sur les nouvelles variables ajoutées depuis la release précédente
      (`git diff <prev-tag>..HEAD -- apps/backend/.env.example`).
- [ ] Aucun secret de démo (`JWT_SECRET` != dev-only-\*, `MINIO_SECRET_KEY`
      != `minioadmin`) — le backend refuse de démarrer si détecté.
- [ ] `METRICS_TOKEN` défini si le scraper Prometheus est externe au réseau.
- [ ] Nouvelles migrations Prisma relues par un second dev (pas de `DROP`
      non-documenté, pas de colonne renommée sans fallback).

## 4. Plan de rollback prêt

- [ ] Version précédente identifiée (tag ou SHA) et déployable en < 5 min.
- [ ] Script `scripts/rollback.sh` (ou équivalent Helm/k8s) accessible.
- [ ] Dump DB du point #2 vérifié restaurable sur une base sandbox.

> Détail complet : `docs/ops/ROLLBACK.md`.

## 5. Validations post-migration (dry run local)

```bash
# 1. Appliquer les migrations sur une copie de la DB prod
pg_restore --dbname=iox_shadow iox_preprod_*.dump
DATABASE_URL="postgresql://.../iox_shadow" npx prisma migrate deploy \
  --schema=apps/backend/prisma/schema.prisma

# 2. Smoke-check
./scripts/smoke-check.sh https://preprod.iox.example
```

## 6. Go / No-go

| Critère | OK |
|---|---|
| CI verte | ☐ |
| Snapshot DB + manifests | ☐ |
| Rollback testé | ☐ |
| Secrets à jour | ☐ |
| Migrations revues | ☐ |
| Smoke-check local | ☐ |
| Window communiquée | ☐ |

**Go** si toutes les cases sont cochées. Sinon **No-go** — reporter au créneau
suivant ou escalader.

---

Liens :
- Rollback : `docs/ops/ROLLBACK.md`
- Runbooks alertes : `docs/ops/RUNBOOKS.md`
- Observabilité externe : `docs/ops/EXTERNAL-OBSERVABILITY.md`
