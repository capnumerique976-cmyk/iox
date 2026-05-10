# IOX — Runbook Backup / Restore

**Date :** 2026-05-10  
**Criticité :** Haute — toujours exécuter un backup avant tout déploiement

---

## Règle d'or

> **Avant chaque déploiement en production : lancer `./scripts/backup-postgres.sh`.**  
> Sans backup validé, ne pas déployer.

---

## 1. Stratégie de backup

### Périmètre

| Composant | Méthode | Fréquence recommandée | Rétention |
|---|---|---|---|
| PostgreSQL (données applicatives) | `pg_dump` compressé | Quotidien (cron 2h) | 7 jours |
| MinIO (documents, fichiers) | `mc mirror` | Quotidien (cron 3h) | Miroir permanent |
| Variables d'environnement (secrets) | Copie manuelle vers vault | À chaque rotation | Vault sécurisé |
| Migrations Prisma | Dans le repo Git | À chaque migration | Git (permanent) |

### Ce qui N'est PAS inclus dans pg_dump

- Les fichiers binaires (documents, images) — stockés dans MinIO, sauvegarder séparément
- Les logs applicatifs — épheméres, non critiques
- Les sessions Redis — reconstruction automatique après restart

### Critères d'un backup valide

1. Le fichier `.dump.gz` est créé sans erreur
2. La taille est cohérente avec les backups précédents (variation > 50% = alarme)
3. Le test de restore (`pg_restore --list`) ne retourne pas d'erreur

---

## 2. Script de backup PostgreSQL

Fichier : `scripts/backup-postgres.sh`

**Usage :**
```bash
# Backup dans le répertoire par défaut (/opt/iox/backups)
./scripts/backup-postgres.sh

# Backup dans un répertoire spécifique
./scripts/backup-postgres.sh /mnt/backup-nas/iox
```

Voir le script complet à : `scripts/backup-postgres.sh`

---

## 3. Script de restore PostgreSQL

Fichier : `scripts/restore-postgres.sh`

**Usage :**
```bash
# Restaurer depuis un fichier de backup spécifique
./scripts/restore-postgres.sh /opt/iox/backups/iox_20260510_020000.dump.gz

# Restaurer dans une DB cible différente (staging)
./scripts/restore-postgres.sh /opt/iox/backups/iox_20260510_020000.dump.gz postgresql://iox_staging:pass@host:5432/iox_staging
```

**ATTENTION :** La restore écrase la base de données cible. Confirmer manuellement.

Voir le script complet à : `scripts/restore-postgres.sh`

---

## 4. Cron recommandé

Ajouter via `crontab -e` sur le serveur de production (user qui a accès à psql) :

```cron
# IOX — Backup PostgreSQL quotidien à 2h00 UTC
0 2 * * * /opt/iox/scripts/backup-postgres.sh /opt/iox/backups >> /var/log/iox-backup.log 2>&1

# IOX — Backup MinIO quotidien à 3h00 UTC
0 3 * * * /usr/local/bin/mc mirror iox-minio/iox-documents /opt/iox/backups/minio/ >> /var/log/iox-backup-minio.log 2>&1
```

Vérifier que les crons tournent :
```bash
crontab -l
# Vérifier les dernières exécutions
tail -50 /var/log/iox-backup.log
```

---

## 5. Backup MinIO (fichiers et documents)

### Configuration de mc (MinIO Client)

```bash
# Installer mc
curl -O https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc
mv mc /usr/local/bin/mc

# Configurer l'alias pour MinIO IOX
mc alias set iox-minio https://s3.iox.example MINIO_ACCESS_KEY MINIO_SECRET_KEY

# Vérifier la connexion
mc ls iox-minio/iox-documents
```

### Commande de mirror (backup complet)

```bash
# Mirror (synchronisation unidirectionnelle MinIO → local)
mc mirror iox-minio/iox-documents /opt/iox/backups/minio/

# Mirror vers un bucket S3 externe (backup offsite)
mc mirror iox-minio/iox-documents s3-backup/iox-documents-backup/

# Mirror avec suppression des fichiers supprimés (strict sync)
mc mirror --remove iox-minio/iox-documents /opt/iox/backups/minio/
```

### Vérification du mirror

```bash
# Comparer le nombre de fichiers
mc ls --recursive iox-minio/iox-documents | wc -l
ls -R /opt/iox/backups/minio/ | wc -l
# Les deux doivent être proches (quelques fichiers .sys peuvent différer)

# Vérifier la taille totale
mc du iox-minio/iox-documents
du -sh /opt/iox/backups/minio/
```

---

## 6. Test de restore — procédure de vérification

### Test complet (recommandé une fois par semaine)

```bash
# 1. Identifier le backup le plus récent
ls -lht /opt/iox/backups/*.dump.gz | head -5

BACKUP_FILE="/opt/iox/backups/iox_YYYYMMDD_020000.dump.gz"

# 2. Créer une base de test dédiée
psql "$DATABASE_URL_ADMIN" -c "CREATE DATABASE iox_restore_test;"

# 3. Restaurer dans la base de test
./scripts/restore-postgres.sh "$BACKUP_FILE" "postgresql://iox_prod:PASS@host:5432/iox_restore_test"

# 4. Vérifier l'intégrité des données
psql "postgresql://iox_prod:PASS@host:5432/iox_restore_test" -c "
  SELECT
    (SELECT COUNT(*) FROM users) AS users,
    (SELECT COUNT(*) FROM marketplace_offers) AS offers,
    (SELECT COUNT(*) FROM payments) AS payments,
    (SELECT COUNT(*) FROM quote_requests) AS rfqs;
"
# Comparer avec les chiffres de production

# 5. Vérifier les migrations Prisma
psql "postgresql://iox_prod:PASS@host:5432/iox_restore_test" -c "
  SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;
"

# 6. Nettoyer la base de test
psql "$DATABASE_URL_ADMIN" -c "DROP DATABASE iox_restore_test;"
```

### Test rapide (vérification listing seulement)

```bash
BACKUP_FILE="/opt/iox/backups/iox_YYYYMMDD_020000.dump.gz"

# Lister le contenu sans restaurer (rapide)
gunzip -c "$BACKUP_FILE" | pg_restore --list | head -50

# Vérifier que le fichier n'est pas corrompu
gunzip -t "$BACKUP_FILE" && echo "Backup OK" || echo "BACKUP CORROMPU"
```

---

## 7. Checklist pré-déploiement

A compléter avant chaque déploiement en production.

```
DEPLOIEMENT du : _______________
Version : _______________
Opérateur : _______________

[ ] 1. Backup PostgreSQL lancé manuellement :
        ./scripts/backup-postgres.sh /opt/iox/backups
        Fichier créé : _______________________________
        Taille : _______________________________

[ ] 2. Backup MinIO déclenché (si des documents ont changé) :
        mc mirror iox-minio/iox-documents /opt/iox/backups/minio/

[ ] 3. Intégrité du backup vérifiée :
        gunzip -t <fichier>.dump.gz → OK

[ ] 4. Secrets .env sauvegardés dans le vault (si rotation de clés)

[ ] 5. Statut DB vérifié avant migration :
        npx prisma migrate status → "Database schema is up to date"

[ ] 6. BACKUP CONFIRMÉ — GO déploiement
```

---

## 8. Rollback d'urgence

En cas de problème post-déploiement nécessitant une restauration DB :

```bash
# STOP — arrêter le backend immédiatement
pm2 stop iox-backend

# Identifier le dernier backup valide
ls -lht /opt/iox/backups/*.dump.gz | head -5

# Restaurer (ECRASE la base courante)
./scripts/restore-postgres.sh /opt/iox/backups/iox_YYYYMMDD_HHMMSS.dump.gz

# Redémarrer avec la version précédente du code
git checkout <commit-precedent>
npm run build
pm2 restart iox-backend

# Vérifier
curl -s https://iox.example/api/v1/health
```

**Note :** Prisma ne supporte pas le rollback automatique de migrations. La restauration DB est la seule option sûre en cas de migration problématique.

---

## 9. Monitoring des backups

### Vérification quotidienne (à ajouter au monitoring)

```bash
# Script de vérification — à lancer par le monitoring (Uptime Robot custom check)
#!/usr/bin/env bash
BACKUP_DIR="/opt/iox/backups"
MAX_AGE_HOURS=26  # Backup doit être < 26h (marge sur le cron quotidien à 2h)

LATEST=$(ls -t "$BACKUP_DIR"/*.dump.gz 2>/dev/null | head -1)
if [ -z "$LATEST" ]; then
  echo "CRITICAL: Aucun backup trouvé dans $BACKUP_DIR"
  exit 2
fi

AGE_HOURS=$(( ($(date +%s) - $(stat -c %Y "$LATEST")) / 3600 ))
if [ "$AGE_HOURS" -gt "$MAX_AGE_HOURS" ]; then
  echo "WARNING: Dernier backup vieux de ${AGE_HOURS}h (max: ${MAX_AGE_HOURS}h) : $LATEST"
  exit 1
fi

echo "OK: Backup récent (${AGE_HOURS}h) : $(basename $LATEST)"
exit 0
```

---

*Références :*  
*- Scripts : `scripts/backup-postgres.sh`, `scripts/restore-postgres.sh`*  
*- Déploiement : `notes/deployment-checklist-production-iox.md`*  
*- Documentation Prisma migrate : https://www.prisma.io/docs/reference/api-reference/command-reference#migrate-deploy*
