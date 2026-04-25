# IOX — Stratégie de backup

> Dernière mise à jour : 2026-04-25 — Lot 9 / L9-6.
> Ce document complète `docs/ops/PRE-DEPLOY.md` et
> `docs/ops/ROLLBACK.md`.

## Objectif

Garantir qu'on peut restaurer IOX à un état cohérent **≤ 24h** en cas
de perte de données (corruption, erreur humaine, crash disque VPS, ou
compromission).

## Portée

Trois sources d'état à sauvegarder :

| Source           | Contenu                                           | Criticité |
| ---------------- | ------------------------------------------------- | --------- |
| Postgres         | Toutes les tables métier (18 tables, schéma IOX)  | 🔴 Haute  |
| MinIO / S3       | Documents seller uploadés, proof sheets, exports  | 🟠 Moyen  |
| Secrets `.env`   | JWT, DB, MinIO, METRICS_TOKEN                     | 🔴 Haute  |

Hors scope de ce document (responsabilité infra / organisation) :

- snapshots du VPS hôte (disque système),
- backup du reverse-proxy nginx (`/etc/nginx/…`),
- copie offsite cross-région.

## Cible opérationnelle

- **RPO** (Recovery Point Objective) : 24h (1 dump quotidien).
- **RTO** (Recovery Time Objective) : 30 min.
- **Rétention** : 7 jours local sur VPS + rétention longue offline
  mensuelle (manuelle — hors scope auto).

## Implémentation

### 1. Postgres — `pg_dump -Fc`

Le dump **format custom** (`-Fc`) est compressé par défaut, parallélisable
en restore, et permet de restaurer sélectivement une table si besoin.

Codifié dans `deploy/vps/backup.sh` :

```bash
docker exec -i iox_postgres pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB" \
  > /opt/apps/iox/backups/postgres/iox-YYYYMMDDTHHMMSSZ.dump
```

Taille attendue sur IOX préprod : quelques MB par dump. La compression
`-Fc` est ≈ 10× pour du texte + faible cardinalité.

### 2. MinIO — tar du volume

`docker exec iox_minio tar czf - -C /data $BUCKET > iox-STAMP.tar.gz`

Archive le contenu du bucket applicatif (pas les buckets système MinIO).

### 3. Rotation

`find $BACKUP_DIR -mtime +7 -delete` dans `backup.sh` — sans faille
de race (exécution atomique par backup, jamais concurrente).

### 4. Secrets `.env`

**Non inclus** dans les backups automatiques (volontairement).

Pourquoi : les mettre dans un dump automatique sur la même machine que
la base les rend vulnérables à un vol de volume.

À la place :

- Secret versionnés **hors VPS** dans un coffre (1Password, Bitwarden,
  Vault, SOPS+git).
- Procédure de rotation documentée dans `docs/SECRETS.md`.

## Planification

Cron sur le VPS, user `deploy`, tous les jours 03:15 UTC :

```cron
15 3 * * * /opt/apps/iox/deploy/vps/backup.sh >> /var/log/iox-backup.log 2>&1
```

Pourquoi 03:15 UTC : entre pics d'activité européenne et asiatique,
load I/O minimum sur Postgres.

## Miroir local (recommandé)

Depuis le poste opérateur, en option :

```bash
export IOX_LOCAL_BACKUP_MIRROR="$HOME/iox-backups"
./deploy/vps/backup.sh
```

Cela rapatrie les dumps en local via `rsync -az --delete`. À chainer
avec un backup Time Machine / disque chiffré externe pour couvrir la
perte totale du VPS.

## Procédure de restore

Documentée dans `deploy/vps/restore.sh`. Résumé :

1. Choisir un dump : `ls -la /opt/apps/iox/backups/postgres/`
2. Sur poste opérateur : `./deploy/vps/restore.sh <chemin-dump>`
3. Taper `YES` (confirmation destructive).
4. Redémarrer le backend : `docker compose restart backend`.
5. Vérifier `/api/v1/health` et smoke-test login admin.

## Validation du plan de backup

**À faire au moins une fois par trimestre** : _disaster recovery drill_.

### DR drill automatisé (L9-6)

`deploy/vps/dr-drill.sh` industrialise la chaîne complète sans toucher
à la base active :

1. `pg_dump -Fc` du container source vers un dump temporaire local.
2. `docker run` d'un Postgres jetable (image `postgres:15-alpine`,
   port `55432` par défaut, container `iox_dr_drill`).
3. `pg_restore` du dump dans le jetable.
4. Requêtes de validation : `tables_count` (≥ 5 attendu),
   `users_count`, dernière migration `_prisma_migrations`.
5. Tear-down du container jetable et du dump (sauf `IOX_DRILL_KEEP=1`).

Variables utiles :

| Var                    | Défaut                 | Rôle                                     |
| ---------------------- | ---------------------- | ---------------------------------------- |
| `IOX_PG_CONTAINER`     | `iox_postgres`         | Container source                         |
| `IOX_PG_DB`            | `iox`                  | Base à dumper (`iox_dev` en local)       |
| `IOX_PG_USER`          | `iox`                  | User Postgres                            |
| `IOX_DRILL_CONTAINER`  | `iox_dr_drill`         | Container jetable                        |
| `IOX_DRILL_PORT`       | `55432`                | Port hôte du jetable                     |
| `IOX_DRILL_KEEP`       | `0`                    | `1` pour conserver dump + container      |

Exemples :

```bash
# DR drill local (dev DB iox_dev)
IOX_PG_DB=iox_dev ./deploy/vps/dr-drill.sh

# DR drill via SSH sur le VPS (en passant par tunnel ou run distant)
ssh rahiss-vps 'cd /opt/apps/iox && ./deploy/vps/dr-drill.sh'

# Conserver le container pour inspection manuelle
IOX_DRILL_KEEP=1 ./deploy/vps/dr-drill.sh
```

Exit codes : `0` OK, `1` pg_dump KO, `2` spawn KO, `3` pg_restore KO,
`4` validation queries KO. Idempotent : nettoie un éventuel container
jetable orphelin avant de spawner.

### Manuel (procédure de référence)

1. Lancer un backup manuel via `deploy/vps/backup.sh`.
2. Copier un dump sur une machine séparée (pas le VPS prod).
3. Restaurer sur une base Postgres jetable (`dr-drill.sh` automatise).
4. Vérifier :
   - `SELECT count(*) FROM sellers;` ≈ la valeur courante prod
   - 5 documents seller choisis au hasard, leur hash vérifié
     depuis le tar MinIO correspondant.

Noter le temps total dans un changelog interne. Tant que RTO
observé < 30 min, OK.

### Preuve runtime L9-6 (2026-04-25)

Premier DR drill exécuté sur la dev DB locale `iox_dev` :

```
== IOX DR drill ==
  source     : container iox_postgres (db=iox_dev user=iox)
  jetable    : container iox_dr_drill (postgres:15-alpine) port 55432
  ✓ dump : /tmp/.../iox-20260425T150337Z.dump (104K)
  ✓ ready après 3s
  ✓ restore terminé
  tables_count|30
  users_count|4
  last_migration|20260424180500_add_marketplace
✅ DR drill OK — 4s
```

RTO observé : **4 s** sur 104K de dump (30 tables, 4 users) — bien en
dessous de la cible 30 min. La base source reste intacte (drill 100 %
isolé sur container jetable).

> ⚠ Cette preuve a été faite sur dev DB. Avant de considérer le drill
> comme validé "préprod", relancer le même script sur le VPS de test
> (`ssh rahiss-vps './deploy/vps/dr-drill.sh'`) une fois les migrations
> L9-3 et L9-4 appliquées via `prisma migrate deploy`.

## Alarmes sur l'absence de backup

À ajouter dans `ops/prometheus/rules/iox-alerts.yml` (non bloquant,
TODO) :

```yaml
- alert: IOXBackupStale
  expr: time() - iox_backup_last_success_seconds > 30 * 3600
  for: 15m
  labels: { severity: warning }
  annotations:
    summary: "Backup IOX plus vieux que 30h — vérifier cron et ssh"
```

Cette métrique n'existe pas encore côté backend (c'est le script cron
qui en serait la source via node_exporter textfile collector, ou un
job healthcheck dédié). À câbler si/quand un alertmanager est
effectivement déployé.

## Recovery matrix

| Scénario                        | Données perdues         | Procédure                           |
| ------------------------------- | ----------------------- | ----------------------------------- |
| Corruption d'une table          | Quelques heures max     | pg_restore sélectif depuis dump     |
| Bucket MinIO écrasé             | Uploads récents         | Extraire `iox-STAMP.tar.gz` dans /data|
| Perte totale du container DB    | 24h max (RPO)           | restore.sh depuis dump distant + miroir|
| Perte totale du VPS             | 24h + récupération infra| Provisionner VPS, restore depuis miroir local |
| Vol de secrets `.env`           | 0 donnée                | Rotation immédiate (cf. SECRETS.md) |

## Statut actuel

- [x] Script `backup.sh` livré et testé syntaxiquement
- [x] Script `restore.sh` livré
- [x] Script `dr-drill.sh` livré (L9-6) — automatise le drill isolé
- [x] Doc BACKUP.md publiée + maj L9-6
- [x] **Premier DR drill effectué** — 2026-04-25, RTO 4 s sur dev DB
- [ ] **Cron activé sur le VPS de test** — action manuelle (hors dépôt)
- [ ] **DR drill rejoué sur VPS test** — à faire après `prisma migrate deploy`
      des migrations L9-3 / L9-4
- [ ] Alarme Prometheus "backup stale" — optionnelle (cf. ci-dessus)
