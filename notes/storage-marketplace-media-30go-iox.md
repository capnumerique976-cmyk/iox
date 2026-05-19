# IOX — Stockage médias marketplace 30 Go

**Version :** Mai 2026 · Confidentiel

---

## Contexte

IOX marketplace utilise MinIO (compatible S3) pour stocker les médias vendeurs :
images principales, galeries produit, vidéos de présentation.

Pour le pilote V1, un volume de **30 Go** est réservé sur le VPS.

---

## Architecture

```
MinIO bucket : iox-marketplace
Préfixe clé  : marketplace/media/{relatedType}/{relatedId}/{timestamp}-{filename_safe}

Exemples :
  marketplace/media/marketplace_product/prod-uuid/1715000000-photo_produit.jpg
  marketplace/media/marketplace_product/prod-uuid/1715000010-demo.mp4
  marketplace/media/seller_profile/sp-uuid/1715000020-logo.png
```

---

## Limites par fichier

| Type | MIME autorisés | Taille max |
|------|---------------|-----------|
| Image (principale / galerie) | `image/jpeg`, `image/png`, `image/webp` | **5 Mo** |
| Vidéo (présentation produit) | `video/mp4`, `video/webm`, `video/quicktime` | **50 Mo** |

---

## Quota global 30 Go (pilot V1)

### Où est appliqué le quota

**Backend** — `media-assets.service.ts` méthode `upload()` :

```typescript
const QUOTA_BYTES = 30 * 1024 * 1024 * 1024; // 30 GB
const { _sum } = await this.prisma.mediaAsset.aggregate({
  _sum: { sizeBytes: true },
  where: { relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT },
});
const usedBytes = Number(_sum.sizeBytes ?? 0);
if (usedBytes + file.size > QUOTA_BYTES) {
  throw new BadRequestException(
    `Quota stockage dépassé (${usedMb} Mo utilisés sur ${totalMb} Mo). Supprimez des médias avant d'en ajouter.`,
  );
}
```

- Agrégation **avant** chaque upload
- Erreur `400 Bad Request` si dépassement
- Message FR lisible renvoyé au frontend
- Le frontend affiche l'erreur textuellement dans le composant uploader

### Périmètre du quota

Seuls les `MARKETPLACE_PRODUCT` médias sont comptabilisés dans le quota (images + vidéos produits). Les médias de profil vendeur (`SELLER_PROFILE`) ne sont pas inclus dans V1 — la charge est négligeable.

### Seuils de vigilance (opérations manuelles)

| Seuil | Action recommandée |
|-------|-------------------|
| 24 Go (80%) | Alerter l'admin — contacter vendeurs pour nettoyage |
| 27 Go (90%) | Bloquer les nouveaux vendeurs, purger anciens médias |
| 30 Go | Bloqué automatiquement par le code |

---

## Bucket MinIO — configuration pilote

```bash
# Créer le bucket (si non existant)
mc mb minio/iox-marketplace

# Quota MinIO natif (protection double-layer) — optionnel
mc quota set minio/iox-marketplace --size 30GB

# Vérifier l'usage
mc du --depth 1 minio/iox-marketplace
```

### Dans `docker-compose.yml` (VPS pilote)

```yaml
services:
  minio:
    image: minio/minio:latest
    volumes:
      - minio_data:/data
    environment:
      MINIO_ROOT_USER: ${MINIO_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_PASSWORD}
    command: server /data --console-address ":9001"
    # Pour réserver 30 Go : configurer le volume Docker ou le disque physique
```

---

## Modèle de données

```prisma
model MediaAsset {
  id               String   @id @default(uuid())
  relatedType      String   // MarketplaceRelatedEntityType
  relatedId        String   // ID de l'entité parente
  mediaType        String   // IMAGE | VIDEO | ILLUSTRATION
  role             String   // PRIMARY | GALLERY
  storageKey       String   @unique
  mimeType         String
  sizeBytes        Int
  moderationStatus String   // PENDING | APPROVED | REJECTED
  // ...
}
```

Le champ `sizeBytes` est peuplé au moment de l'upload depuis `file.size` (Multer).

---

## Cascade delete mainMediaId

Lorsqu'un `MediaAsset` est supprimé, si c'était l'image principale référencée dans
`MarketplaceProduct.mainMediaId`, la référence est automatiquement effacée :

```typescript
if (existing.relatedType === MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT) {
  await this.prisma.marketplaceProduct.updateMany({
    where: { id: existing.relatedId, mainMediaId: id },
    data: { mainMediaId: null },
  });
}
```

---

## Modération

Tout média uploadé arrive avec `moderationStatus: PENDING`.

| Statut | Signification | Visible acheteur |
|--------|--------------|-----------------|
| `PENDING` | En attente de validation staff | ❌ |
| `APPROVED` | Validé | ✅ |
| `REJECTED` | Refusé (motif stocké) | ❌ |

La gate `publish()` exige au moins 1 `MediaAsset` `PRIMARY + APPROVED` avant publication.

---

## Monitoring usage stockage

### Requête SQL directe (psql)

```sql
SELECT
  relatedType,
  COUNT(*) AS nb_medias,
  ROUND(SUM("sizeBytes") / 1048576.0, 1) AS total_mo,
  MAX("sizeBytes") / 1048576.0 AS max_mo
FROM media_assets
GROUP BY relatedType
ORDER BY total_mo DESC;
```

### Commande MinIO

```bash
mc du --depth 2 minio/iox-marketplace/marketplace/media/
```

---

## Évolutions post-pilote [HYPOTHÈSE]

- Quota **par vendeur** (au lieu de global)
- CDN devant MinIO pour les médias approuvés (Cloudflare R2 ou BunnyCDN)
- Transcoding vidéo côté serveur (HLS adaptatif)
- Compression auto images (sharp)
- Purge automatique des médias `REJECTED` après 30 jours
