# Media-Assets Orphelins — Diagnostic M116A

## Problème
5 enregistrements `media_assets` en base PostgreSQL sans fichier correspondant dans MinIO bucket `iox-prod`.
Détecté dans les logs iox_backend (WARN répétés sur /url et /api/v1/media-assets/{uuid}).

## Dry-run diagnostic (ne rien supprimer)

```bash
# 1. Lister les IDs en WARN dans les logs
ssh rahiss-vps "docker logs iox_backend 2>&1 | grep -i 'not found\|404\|media' | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | sort -u"

# 2. Vérifier dans MinIO si le fichier existe
# (via mc si installé, ou via API MinIO)
ssh rahiss-vps "docker exec iox_minio mc ls local/iox-prod/ 2>/dev/null | head -20"
```

## Action recommandée (à valider humainement)
1. Extraire les 5 UUIDs depuis les logs.
2. Vérifier dans la DB : `SELECT id, filename, created_at, owner_id FROM media_assets WHERE id IN (...)`.
3. Si les fichiers sont absents de MinIO ET non référencés dans des produits actifs : DELETE sûr.
4. Si référencés dans des produits : notifier l'owner et laisser le produit avec image manquante visible.

## Ne pas supprimer automatiquement — validation humaine requise.
