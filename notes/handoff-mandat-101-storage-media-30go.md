# Handoff — Mandat 101 : Stockage 30 Go + UX upload médias

**Date :** 11 mai 2026  
**Statut :** ✅ Terminé  
**Commits :** `7b52db1` (backend), `[voir ci-dessous]` (frontend UX)

---

## Ce qui a été fait

### Backend (commit 7b52db1)

| Fix | Fichier | Description |
|-----|---------|-------------|
| `mainMediaId` PATCH persisté | `marketplace-product.dto.ts` | Ajout `mainMediaId?: string \| null` dans `UpdateMarketplaceProductDto` |
| Validation ownership `mainMediaId` | `marketplace-products.service.ts` | Vérifie que le media appartient au produit avant PATCH |
| Quota 30 Go global | `media-assets.service.ts` | Agrège `sizeBytes` avant upload, rejette avec 400 si dépassé |
| Cascade delete `mainMediaId` | `media-assets.service.ts` | Efface `mainMediaId` sur `MarketplaceProduct` si le média supprimé était référencé |
| Fix race condition vidéo | `ProductVideoUploader.tsx` | Upload first → then delete old (was: delete then upload) |
| +5 tests backend | `media-assets.service.spec.ts` | Quota OK, quota exceeded, aggregate filter, cascade clear, cascade skip |

**Tests backend : 1021 · 0 failure · TSC clean**

### Frontend (Mandat 101)

| Fix | Fichier | Description |
|-----|---------|-------------|
| Empty state vidéo pédagogique | `ProductVideoUploader.tsx` | Remplace le fond noir par fond gris + icône + instructions |
| Info fichier en preview | `ProductVideoUploader.tsx` | Affiche nom + taille du fichier après sélection |
| Fond conditionnel | `ProductVideoUploader.tsx` | `bg-black` seulement quand la vidéo est présente |
| Badges modération galerie | `ProductGalleryUploader.tsx` | Badge "En attente" (amber) / "Rejetée" (rouge) sur les tuiles PENDING/REJECTED |
| Quota error humain | Déjà géré | Backend renvoie message FR — affiché tel quel dans les uploaders |
| +8 tests frontend | `*.test.tsx` | Empty state, file info, quota error, badges PENDING/REJECTED/APPROVED |

**Tests frontend : 513 · 0 failure · TSC clean**

---

## État composants après M101

### `InlineMediaUploader.tsx` ✅ 

- Preview immédiate via `objectURL` après sélection
- Preview du média actuel via URL signée (effet `[currentMediaId]`)
- Bouton "Remplacer" si media existant
- État success : "Image téléversée et associée — en attente de modération"
- Erreurs : format non supporté / taille > 5 Mo / erreur serveur

### `ProductGalleryUploader.tsx` ✅

- Empty state : "Aucune photo de galerie. Ajoutez plusieurs vues..."
- Tuiles : thumbnail + compteur numéroté + drag & drop
- Badge modération : **APPROVED** = rien, **PENDING** = amber "En attente", **REJECTED** = rouge "Rejetée"
- Erreurs : MIME invalide / taille > 5 Mo / quota dépassé / cap 20 photos
- Compteur : `X/20 photos · max 5 Mo · JPEG/PNG/WebP`

### `ProductVideoUploader.tsx` ✅

- Empty state : icône Video + "Aucune vidéo de présentation" + "MP4, WebM, MOV · max 50 Mo" + "Visible après validation"
- Après sélection : preview HTML5 + bande d'info (nom fichier + taille en Mo)
- Pendant upload : spinner "Téléversement en cours…"
- Après succès : message "Vidéo téléversée — en attente de modération"
- Vidéo existante : lecteur HTML5 + boutons "Remplacer" / "Supprimer" (avec confirm)
- Erreurs : format non supporté / taille > 50 Mo / quota dépassé / erreur serveur

---

## Architecture stockage

Voir : `notes/storage-marketplace-media-30go-iox.md`

Résumé :
- MinIO bucket `iox-marketplace`, préfixe `marketplace/media/`
- Quota 30 Go appliqué côté backend avant chaque upload
- Noms de fichiers safe (sans caractères spéciaux)
- Modération systématique (PENDING → APPROVED/REJECTED par staff)

---

## Critère de réussite

> Un vendeur peut ajouter/remplacer une image ou vidéo produit, comprendre l'état de l'upload, voir les erreurs clairement, et retrouver le média après refresh.

✅ **Validé** — tous les cas couverts par tests et TSC clean.

---

## Prochaines étapes possibles [BACKLOG]

- [ ] Alertes automatiques admin à 80% / 90% du quota (webhook ou email)
- [ ] Quota par vendeur (au lieu de global)
- [ ] Preview thumbnail côté seller sur image principale (état modération badge)
- [ ] Transcoding vidéo (HLS) pour compatibilité mobile étendue
- [ ] Purge automatique des REJECTED après 30 jours
- [ ] Export CSV de l'usage stockage (admin dashboard)
