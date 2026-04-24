# IOX — Runbook rollback

> Déclencher quand un déploiement cause : **taux 5xx > 5 %** pendant 2 min,
> **readiness KO** pendant 3 min, **régression fonctionnelle critique**
> observée côté UI/admin diagnostics.

Objectif : retour à la version stable en **< 10 min**.

---

## 0. Décision rollback

Critères **objectifs** (tous automatisables via alertes Prometheus) :

- `IoxHttp5xxRateCritical` actif (> 5 % 5xx pendant 2 min)
- `IoxBackendDown` actif depuis > 2 min après le déploiement
- `IoxReadinessFailing` actif depuis > 3 min

Critères **subjectifs** (valide par responsable release) :
- Plainte utilisateur critique confirmée par log + stack trace
- Data loss potentiel détecté

Une seule ligne rouge suffit → rollback.

## 1. Rollback applicatif (< 3 min)

### k8s / Helm
```bash
# Identifier la révision précédente
helm history iox-backend -n iox

# Revenir à la précédente (N-1)
helm rollback iox-backend <REV-1> -n iox --wait

# Attendre la readiness
kubectl rollout status deploy/iox-backend -n iox --timeout=180s
```

### Docker Compose / VPS
```bash
# Redéployer le tag précédent
export IOX_BACKEND_IMAGE=ghcr.io/iox/backend:<PREV_TAG>
docker compose up -d backend
docker compose logs -f backend  # vérifier démarrage propre
```

### Vercel / Netlify (frontend uniquement)
UI → _Deployments_ → _Promote to production_ sur le déploiement précédent.

## 2. Rollback DB (si nécessaire)

> ⚠ **À éviter** si possible. Les migrations additives (nouveau champ
> nullable, nouvelle table) n'exigent pas de rollback DB — l'ancienne
> version les ignore.

**Rollback DB OBLIGATOIRE si :**
- Colonne renommée / supprimée dans la migration.
- Type modifié de façon non-compatible (ex. `VARCHAR` → `INT`).
- Enum réduit (valeur retirée).

### Procédure
```bash
# 1. Arrêter le backend (évite de nouvelles écritures)
kubectl scale deploy/iox-backend --replicas=0 -n iox
# ou docker compose stop backend

# 2. Restaurer le dump pris en pré-déploiement
pg_restore --dbname=iox_prod --clean --if-exists \
  iox_preprod_YYYYMMDD-HHMM.dump

# 3. Vérifier la cohérence
psql -d iox_prod -c "SELECT COUNT(*) FROM \"User\";"
psql -d iox_prod -c "SELECT COUNT(*) FROM \"SellerProfile\";"

# 4. Redémarrer le backend (version N-1)
kubectl scale deploy/iox-backend --replicas=2 -n iox
```

## 3. Vérifications post-rollback

- [ ] `/api/v1/health/live` → 200
- [ ] `/api/v1/health/ready` → 200
- [ ] Dashboard Grafana _IOX Overview_ : 5xx revenu < 1 %, p95 revenu < 500ms
- [ ] Dashboard _Marketplace ops_ : compteurs cohérents avec pré-déploiement
- [ ] Smoke-check : `./scripts/smoke-check.sh https://<env>.iox.example`
- [ ] Alerte Prometheus déclenchante résolue (`alertname` OK, pas flapping)

## 4. Post-mortem (dans les 48h)

Créer un doc `docs/ops/post-mortems/YYYY-MM-DD-<slug>.md` avec :
1. Timeline (déploiement, détection, décision, rollback, OK)
2. Root cause (code, config, data, infra)
3. Impact (durée, users affectés, data corrompue ?)
4. Ce qui a marché / pas marché dans la détection
5. Actions correctives (1 fix immédiat, 1 amélioration process, 1 test ajouté)

---

Liens :
- Pré-déploiement : `docs/ops/PRE-DEPLOY.md`
- Runbooks alertes : `docs/ops/RUNBOOKS.md`
- Observabilité : `docs/ops/EXTERNAL-OBSERVABILITY.md`
