# Cascade PR #49 — push MP-MEDIA-1 LOT 1 galerie

> Push + PR + merge + deploy de la branche `mp-media-1-gallery-product` (mandat 28). 1 PR seule, ~30 min total.

## Pré-requis (STOP si non remplis)

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git rev-parse main                                              # → f717294e96d1df8eafe5409f2b3a7584315aa5d3
git rev-parse --short mp-media-1-gallery-product                 # → d8e1593
git stash list                                                   # → vide
which gh && gh auth status                                       # → gh OK
ssh -o ConnectTimeout=5 rahiss-vps 'echo ok'                     # → ok (ControlMaster déjà actif côté ~/.ssh/config)
```

Si pas vert → STOP + `notes/handoff-cascade-pr49-stop.md`.

---

## Garde-fous

- ❌ Pas de force-push sur main.
- ❌ Pas de `gh pr merge --admin` sauf CI rouge.
- ❌ Pas de touchage à d'autres branches.
- ✅ ControlMaster SSH actif → 1 deploy = 1 connexion comptée fail2ban (vérifié rounds précédents).

---

## Étapes

### 1. Pre-flight + sync remote

```
git checkout main
git fetch origin --prune
git status --short
git log --oneline origin/main | head -3
```

Confirmer `origin/main = main = f717294`. Si origin a avancé entre-temps, **STOP** + signaler.

### 2. Push + PR #49

```
git checkout mp-media-1-gallery-product
git push -u origin mp-media-1-gallery-product

gh pr create \
  --title "feat(media): MP-MEDIA-1 LOT 1 — galerie multi-images produit (drag-reorder + lightbox public)" \
  --body "$(cat <<'EOF'
## Résumé

LOT 1 du chantier MP-MEDIA-1 (mandat 28 standalone). Permet au seller d'attacher plusieurs images de galerie à son produit, réordonner par drag, supprimer. Affichage public avec lightbox interactif.

### Périmètre
- **Backend** : endpoint `PATCH /api/v1/marketplace/media-assets/reorder` + DTO `ReorderMediaAssetsDto` (cap [1, 50]) + service transaction Prisma + audit `MEDIA_ASSETS_REORDERED` + ownership cross-entity rejeté (Forbidden).
- **Frontend lib** : `marketplace-media-assets` étendu (`list`, `reorder`, `delete` + `MEDIA_GALLERY_MAX_PER_PRODUCT_UI=20`).
- **Frontend composants** :
  - `ProductGalleryUploader` — grille drag&drop natif HTML5 + upload multi (parallèle <3, sinon séquentiel) + cap UI 20 + confirm delete.
  - `PublicGalleryLightbox` — overlay fullscreen + nav prev/next clavier + Escape close + filtre publicUrl null.
- **Frontend pages** :
  - `/seller/marketplace-products/[id]` : section Galerie sous PRIMARY.
  - `/marketplace/products/[slug]` : remplace grille statique par lightbox interactif.

### Tests
- Backend `media-assets` : 37/37 (28 existants + 9 nouveaux : DTO + service + controller).
- Frontend total : 296/296 (sans régression, 12 nouveaux specs sur les 2 composants + page seller).
- TypeScript strict ✅ backend + frontend.

### Hors scope (mandats futurs)
- LOT 2 vidéo produit (mp4/webm/quicktime, 50 MB, player public).
- LOT 3 page admin `/admin/media-moderation` (filtres + approve/reject reason).

### Migration Prisma
Aucune. Modèle `MediaAsset` déjà complet (rôle GALLERY existant).

### Doc
`docs/marketplace/MP_MEDIA_1_LOT_1_GALLERY.md` (165 lignes).
EOF
)" \
  --base main \
  --head mp-media-1-gallery-product

gh pr checks --watch
```

Si CI rouge → STOP. Sinon :

### 3. Merge + sync + deploy

```
gh pr merge --squash --delete-branch
git checkout main
git pull --rebase origin main
git log --oneline -3 origin/main

./deploy/vps/deploy.sh all
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print('status:',d['data']['status'])"
```

Capturer le SHA squash. Confirmer `status: ok`.

### 4. Smoke fonctionnels

```
echo "=== 1. Login smoke-seller ==="
SELLER_TOKEN=$(curl -sS -X POST https://iox.mycloud.yt/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"smoke-seller@iox.mch","password":"IoxSmoke2026!"}' | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['accessToken'])")
echo "SELLER_TOKEN len=${#SELLER_TOKEN}"

echo "=== 2. List media-assets demo-vanille-poudre ==="
PRODUCT_ID=$(curl -sS "https://iox.mycloud.yt/api/v1/marketplace/products/demo-vanille-poudre" -H "Authorization: Bearer $SELLER_TOKEN" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['id'])")
echo "PRODUCT_ID=$PRODUCT_ID"

echo "=== 3. Endpoint reorder répond (smoke 400 sur DTO vide attendu) ==="
curl -sS -w "\nHTTP %{http_code}\n" -X PATCH "https://iox.mycloud.yt/api/v1/marketplace/media-assets/reorder" -H "Content-Type: application/json" -H "Authorization: Bearer $SELLER_TOKEN" -d '{"items":[]}' | head -c 300

echo "=== 4. Page publique fiche produit (HTTP 200 + HTML) ==="
curl -sS -o /tmp/_p -w "HTTP %{http_code} content-type=%{content_type}\n" "https://iox.mycloud.yt/marketplace/products/demo-vanille-poudre"
grep -c "PublicGalleryLightbox\|gallery\|lightbox" /tmp/_p 2>&1 || echo "(grep 0 — markup peut être minifié)"

echo "=== 5. Section Galerie page seller (login requis, juste check 200 sur API) ==="
curl -sS -w "\nHTTP %{http_code}\n" -o /dev/null "https://iox.mycloud.yt/seller/marketplace-products/$PRODUCT_ID"
```

Attendus :
- smoke-seller login OK
- `PATCH /reorder` body vide → HTTP 400 (validation `ArrayMinSize`)
- Page publique → HTTP 200 + content-type text/html
- Page seller → HTTP 200 ou 302 selon session

### 5. Validations finales

```
echo "=== git état final ==="
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git status --short
git log --oneline origin/main | head -5

echo "=== branche mandat 28 supprimée ==="
git branch | grep "mp-media-1-gallery-product" || echo "OK aucune"

echo "=== bilan ==="
echo "main = $(git rev-parse --short origin/main)"
echo "Total squash PR cumulés:"
git log --oneline main --grep="(#" | wc -l
```

```
git branch -D mp-media-1-gallery-product 2>/dev/null || echo "(déjà nettoyée par gh pr merge --delete-branch)"
```

---

## Preuves anti-hallucination obligatoires

```
# 1. PR #49 mergée
gh pr view 49 --json state,mergedAt,statusCheckRollup -q '"state:" + .state + " mergedAt:" + .mergedAt, "checks:", (.statusCheckRollup[] | "  " + .name + " → " + (.conclusion // .status))'

# 2. main local + remote
git rev-parse main
git rev-parse origin/main
git log --oneline origin/main | head -3

# 3. Health VPS
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print(d)"

# 4. Endpoint reorder répond 400 sur DTO vide
curl -sS -w "\nHTTP %{http_code}\n" -X PATCH "https://iox.mycloud.yt/api/v1/marketplace/media-assets/reorder" -H "Content-Type: application/json" -H "Authorization: Bearer $SELLER_TOKEN" -d '{"items":[]}' | head -c 300

# 5. Page publique fiche produit OK
curl -sS -o /dev/null -w "HTTP %{http_code} content-type=%{content_type}\n" "https://iox.mycloud.yt/marketplace/products/demo-vanille-poudre"

# 6. Branche supprimée
git branch | grep "mp-media-1-gallery-product" || echo "OK aucune"

# 7. Stash list vide
git stash list

# 8. Working tree propre
git status --short
```

---

## TL;DR rapport attendu

```
Cascade PR #49 — livrée ✅
- PR #49 mergée. CI vert. Deploy VPS OK.
- main = <SHA_FINAL> (était f717294), 47 lots cumulés.
- Endpoint /reorder répond 400 sur DTO vide (validation OK).
- Page publique demo-vanille-poudre HTTP 200 (lightbox déployé).
- 0 branche mandat 28 résiduelle.
- Aucune migration Prisma appliquée (modèle déjà complet).
```

Caveman resume off pour ce livrable car prompt opérationnel.
