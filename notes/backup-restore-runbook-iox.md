# IOX — Runbook Backup / Restore

**Date :** 2026-05-11  
**Criticité :** Haute — toujours exécuter un backup avant tout déploiement  
**Version :** 2.0 (enrichi M79)

---

## Règle d'or

> **Avant chaque déploiement en production : lancer `./scripts/backup-postgres.sh`.**  
> Sans backup validé, ne pas déployer.

---

## 1. Scripts de backup / restore

Les scripts de backup et restore sont localisés dans le répertoire `scripts/` du monorepo IOX.

| Script | Chemin | Rôle |
|---|---|---|
| Backup PostgreSQL | `scripts/backup-postgres.sh` | Dump compressé de la base + rotation des anciens backups |
| Restore PostgreSQL | `scripts/restore-postgres.sh` | Restauration depuis un fichier `.dump.gz` avec vérification d'intégrité |

Ces scripts sont exécutables sans dépendances externes au-delà de `pg_dump`, `pg_restore`, `gzip`, et `bash`. Ils fonctionnent sur Ubuntu 22.04 LTS avec PostgreSQL 15.

---

## 2. Variables d'environnement requises

| Variable | Valeur par défaut | Description |
|---|---|---|
| `DATABASE_URL` | *(obligatoire)* | URL PostgreSQL complète : `postgresql://user:pass@host:port/db` |
| `BACKUP_DIR` | `/opt/iox/backups` | Répertoire de destination des backups |
| `RETENTION_DAYS` | `7` | Nombre de jours de rétention avant suppression automatique |

Les scripts lisent ces variables depuis l'environnement shell ou depuis un fichier `.env` à la racine du projet si présent.

```bash
# Exemple d'export manuel avant d'exécuter le script
export DATABASE_URL="postgresql://iox_prod:[MOT_DE_PASSE]@localhost:5432/iox_production"
export BACKUP_DIR="/opt/iox/backups"
export RETENTION_DAYS=7
```

---

## 3. Fonctionnement du backup PostgreSQL

### Pipeline d'exécution

1. **Génération du nom de fichier** avec timestamp : `iox_YYYYMMDD_HHMMSS.dump.gz`
2. **Écriture atomique** : le dump est d'abord écrit dans un fichier temporaire `.tmp` dans le même répertoire, puis renommé (opération atomique) une fois complet. Cela évite qu'un backup partiel soit confondu avec un backup valide.
3. **Compression gzip** : `pg_dump --format=custom | gzip > fichier.dump.gz`
4. **Vérification d'intégrité** : `gunzip -t fichier.dump.gz` — si cette commande échoue, le fichier est supprimé et le script retourne un code d'erreur non-nul.
5. **Rotation automatique** : suppression des fichiers `.dump.gz` plus anciens que `RETENTION_DAYS` jours dans `BACKUP_DIR`.

### Note technique sur la double compression

Le format `--format=custom` de `pg_dump` applique déjà une compression interne (zlib). Passer ensuite le flux dans `gzip` crée une **double compression** : le fichier final est compressé deux fois.

**Impact pratique :** fonctionnel, mais la réduction de taille apportée par le second gzip est marginale (voire nulle si le contenu est déjà bien compressé). Le fichier peut être légèrement plus grand qu'un simple `pg_dump --format=custom` sans gzip.

**Décision :** ce comportement est maintenu tel quel. Non-bloquant. Une future évolution pourra utiliser `--format=plain | gzip` ou `--format=custom` sans gzip pour optimiser.

### Usage

```bash
# Backup dans le répertoire par défaut (/opt/iox/backups)
./scripts/backup-postgres.sh

# Backup dans un répertoire spécifique
./scripts/backup-postgres.sh /mnt/backup-nas/iox
```

---

## 4. Crontab recommandé

Ajouter via `crontab -e` sur le serveur de production (avec l'utilisateur qui a accès à `psql`) :

```cron
# IOX — Backup PostgreSQL quotidien à 2h00 UTC
0 2 * * * /opt/iox/scripts/backup-postgres.sh /opt/iox/backups >> /var/log/iox-backup.log 2>&1
```

**Vérification de la configuration cron :**

```bash
# Afficher les crons actifs
crontab -l

# Vérifier les dernières exécutions
tail -50 /var/log/iox-backup.log

# Vérifier que le dernier backup est récent (< 26h)
ls -lht /opt/iox/backups/*.dump.gz | head -3
```

**Création du fichier de log si absent :**

```bash
sudo touch /var/log/iox-backup.log
sudo chown $USER:$USER /var/log/iox-backup.log
```

---

## 5. Procédure de restore

### Prérequis

- Identifier le fichier de backup à restaurer (voir section 6 pour vérifier l'intégrité)
- Arrêter le backend avant la restore pour éviter les connexions actives
- Avoir les droits `SUPERUSER` ou `CREATEDB` sur PostgreSQL

### Restore complète

```bash
# Syntaxe
./scripts/restore-postgres.sh <fichier.dump.gz> [DATABASE_URL_CIBLE]

# Exemple — restaurer sur la base de production
./scripts/restore-postgres.sh /opt/iox/backups/iox_20260511_020000.dump.gz

# Exemple — restaurer sur une base staging différente
./scripts/restore-postgres.sh /opt/iox/backups/iox_20260511_020000.dump.gz \
  postgresql://iox_staging:[PASS]@localhost:5432/iox_staging
```

### Comportement du script de restore

1. **Demande de confirmation explicite** : le script affiche le fichier source et la base cible, puis attend la saisie de `OUI` (majuscules). Tout autre réponse annule l'opération.
2. **Vérification d'intégrité** : `gunzip -t fichier.dump.gz` avant de commencer. Si le fichier est corrompu, la restore est annulée.
3. **Fermeture des connexions actives** : exécute `SELECT pg_terminate_backend(...)` sur toutes les connexions actives à la base cible avant de restaurer.
4. **Drop et re-création de la base** : la base cible est droppée puis recréée (sauf si elle n'existe pas encore, auquel qu'elle est simplement créée).
5. **Restore via `pg_restore`** : décompression et restauration dans la base cible.
6. **Vérification post-restore** : `psql -c "SELECT COUNT(*) FROM users"` pour confirmer que des données sont présentes.

### Séquence complète en cas d'urgence

```bash
# 1. Arrêter le backend immédiatement
pm2 stop iox-backend

# 2. Identifier le backup valide
ls -lht /opt/iox/backups/*.dump.gz | head -5

# 3. Vérifier l'intégrité (voir section 6)
gunzip -t /opt/iox/backups/iox_YYYYMMDD_HHMMSS.dump.gz && echo "BACKUP OK"

# 4. Restaurer (demande OUI)
./scripts/restore-postgres.sh /opt/iox/backups/iox_YYYYMMDD_HHMMSS.dump.gz

# 5. Vérifier les migrations Prisma post-restore
cd /opt/iox && npx prisma migrate status

# 6. Redémarrer le backend
pm2 start iox-backend

# 7. Smoke test rapide
curl -s https://api.[domaine]/api/health | jq '.status'
```

---

## 6. Test de backup — vérification d'intégrité sans restore

Pour vérifier qu'un fichier de backup est valide **sans effectuer de restore** :

```bash
# Test rapide — vérifie que le fichier gzip n'est pas corrompu
BACKUP_FILE="/opt/iox/backups/iox_YYYYMMDD_HHMMSS.dump.gz"
gunzip -t "$BACKUP_FILE" && echo "Backup OK" || echo "BACKUP CORROMPU — NE PAS UTILISER"

# Test complet — liste le contenu du dump
gunzip -c "$BACKUP_FILE" | pg_restore --list | head -30

# Vérifier la taille (un backup trop petit est suspect)
ls -lh "$BACKUP_FILE"
# Référence : pour une base IOX pilote avec données de demo, attendre > 500 KB

# Test de restore sur une base temporaire (recommandé hebdomadairement)
psql "$DATABASE_URL_ADMIN" -c "CREATE DATABASE iox_restore_test;"
./scripts/restore-postgres.sh "$BACKUP_FILE" "postgresql://iox_prod:[PASS]@localhost:5432/iox_restore_test"
psql "postgresql://iox_prod:[PASS]@localhost:5432/iox_restore_test" -c \
  "SELECT COUNT(*) as users FROM users;"
psql "$DATABASE_URL_ADMIN" -c "DROP DATABASE iox_restore_test;"
```

---

## 7. Backup MeiliSearch

**Statut : NON IMPLÉMENTÉ — TODO**

MeiliSearch supporte la création de snapshots via son API REST. À implémenter dans une prochaine itération.

**API snapshot MeiliSearch (documentation) :**

```bash
# Déclencher un snapshot (à appeler depuis le serveur)
curl -X POST "http://localhost:7700/snapshots" \
  -H "Authorization: Bearer ${MEILISEARCH_MASTER_KEY}"

# Les snapshots sont stockés dans le répertoire de données MeiliSearch
# Configurable via --snapshot-dir au lancement du service
```

**Criticité :** Moyenne. En cas de perte de MeiliSearch, les données peuvent être réindexées depuis PostgreSQL (la source de vérité reste la base de données). Cela prend quelques minutes à quelques heures selon le volume de données.

**TODO :**
- [ ] Ajouter un script `scripts/backup-meilisearch.sh`
- [ ] Ajouter un cron de snapshot quotidien (à 3h00 UTC)
- [ ] Documenter la procédure de restore MeiliSearch

---

## 8. Backup fichiers (MinIO)

**Statut : NON IMPLÉMENTÉ — TODO**

Les fichiers utilisateurs (documents, images de produits, pièces jointes RFQ) sont stockés dans un bucket MinIO. Ils ne sont pas inclus dans le `pg_dump`.

**Commande MinIO Client (mc) pour mirror :**

```bash
# Installer mc (si non présent)
curl -O https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc
sudo mv mc /usr/local/bin/

# Configurer l'alias MinIO IOX
mc alias set iox-minio https://[MINIO_ENDPOINT] [MINIO_ACCESS_KEY] [MINIO_SECRET_KEY]

# Mirror du bucket vers le local (backup)
mc mirror iox-minio/[MINIO_BUCKET] /opt/iox/backups/minio/

# Mirror vers un bucket S3 externe (backup offsite)
mc mirror iox-minio/[MINIO_BUCKET] s3-backup/iox-documents-backup/
```

**Cron MinIO (à ajouter) :**

```cron
# IOX — Backup MinIO quotidien à 3h00 UTC
0 3 * * * /usr/local/bin/mc mirror iox-minio/iox-documents /opt/iox/backups/minio/ >> /var/log/iox-backup-minio.log 2>&1
```

**TODO :**
- [ ] Installer et configurer `mc` sur le VPS pilote
- [ ] Créer le script `scripts/backup-minio.sh`
- [ ] Configurer le cron de mirror
- [ ] Documenter la procédure de restore MinIO

---

## 9. Stratégie globale de backup

### Périmètre et méthodes

| Composant | Méthode | Fréquence | Rétention | Statut |
|---|---|---|---|---|
| PostgreSQL | `pg_dump` + gzip | Quotidien (2h UTC) | 7 jours | Implémenté |
| MeiliSearch | Snapshot API | Quotidien (3h UTC) | 3 jours | TODO |
| MinIO (fichiers) | `mc mirror` | Quotidien (3h UTC) | Miroir permanent | TODO |
| Secrets `.env` | Copie manuelle → vault | À chaque rotation | Vault sécurisé | Manuel |
| Migrations Prisma | Git | À chaque migration | Git (permanent) | Automatique |

### Ce qui N'est PAS dans pg_dump

- Les fichiers binaires (documents, images) — stockés dans MinIO
- Les logs applicatifs — éphémères, non critiques
- Les sessions Redis — reconstruction automatique après restart

---

## 10. Checklist mensuelle de vérification

À effectuer le premier lundi de chaque mois.

```
VÉRIFICATION MENSUELLE — [À compléter : mois/année]
Opérateur : [À compléter]

[ ] 1. Test d'intégrité du dernier backup
       gunzip -t /opt/iox/backups/$(ls -t /opt/iox/backups/*.dump.gz | head -1)
       Résultat : OK / CORROMPU

[ ] 2. Test de restore sur base temporaire réussi
       (procédure section 6 — test complet)
       Nombre d'utilisateurs restaurés : ___________
       Cohérence avec production : OUI / NON

[ ] 3. Cron actif et log récent
       crontab -l | grep backup → présent
       tail /var/log/iox-backup.log → dernier backup < 26h
       Date dernier backup : ___________

[ ] 4. Espace disque backups
       du -sh /opt/iox/backups/ → ___________
       Disque total disponible : ___________
       Projection : mois de capacité restante = ___________

[ ] 5. Rotation des anciens backups fonctionnelle
       ls /opt/iox/backups/*.dump.gz | wc -l → nombre ≤ RETENTION_DAYS + 1
       Valeur : ___________
```

---

*Références :*  
*- Scripts : `scripts/backup-postgres.sh`, `scripts/restore-postgres.sh`*  
*- Déploiement : `notes/deployment-vps-pilote-ferme-iox.md`*  
*- Monitoring backups : `notes/monitoring-pilote-iox.md`*  
*- Documentation Prisma migrate : https://www.prisma.io/docs/reference/api-reference/command-reference#migrate-deploy*
