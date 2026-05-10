# Cascade 2 PR — #52 MP-MEDIA-1 LOT 2 (vidéo) + #53 LOT 3 (admin moderation)

> Push + PR + merge + deploy de 2 branches feature chaînées. ~45 min total. Clôt entièrement le chantier MP-MEDIA-1.

## Branches à push

| PR | Branche | Parent | SHA |
|---|---|---|---|
| #52 | `mp-media-1-video-product` | main `7975d0d` | `3c37720` |
| #53 | `mp-media-1-moderation-admin` | `mp-media-1-video-product` (chaîne LOT 2) | `a4e0bb0` |

LOT 3 = **chaînée** sur LOT 2. Après merge PR #52, rebase --onto main pour porter LOT 3 sur main avancé.

---

## Pré-requis (STOP si non remplis)

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git rev-parse main                                                # → 7975d0deb328fda61cbbe9da51e5c086c385bddf
git rev-parse --short mp-media-1-video-product                     # → 3c37720
git rev-parse --short mp-media-1-moderation-admin                  # → a4e0bb0
git stash list                                                     # → vide
which gh && gh auth status                                         # → gh OK
ssh -o ConnectTimeout=5 rahiss-vps 'echo ok'                       # → ok (ControlMaster actif)
```

Si pas vert → STOP + `notes/handoff-cascade-35-stop.md`.

---

## Garde-fous

- ❌ Pas de force-push sur main.
- ❌ Pas de `gh pr merge --admin` sauf CI rouge.
- ✅ ControlMaster SSH actif → fail2ban couvert.
- ✅ Sleep 60s entre deploys (ControlMaster réduit risque).
- ❌ 0 migration Prisma à appliquer.

---

## Étapes

### 1. Pre-flight + sync remote

```
git checkout main
git fetch origin --prune
git status --short
git log --oneline origin/main | head -3
```

Confirmer `origin/main = main = 7975d0d`. Si origin a avancé → STOP + signaler.

### 2. Push #52 (LOT 2 vidéo)

```
git checkout mp-media-1-video-product
git push -u origin mp-media-1-video-product

gh pr create \
  --title "feat(media): MP-MEDIA-1 LOT 2 — vidéo produit (50 MB, mp4/webm/mov) + player public" \
  --body "$(cat <<'EOF'
## Résumé

LOT 2 du chantier MP-MEDIA-1. Permet au seller d'attacher 1 vidéo (max V1) à son produit. Player html5 sur fiche produit publique.

### Périmètre
- **Backend** :
  - Constantes `MEDIA_VIDEO_MAX_BYTES = 50 * 1024 * 1024` (50 MB).
  - `MEDIA_ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime']`.
  - Service `upload` détecte MIME `video/*` → mediaType=VIDEO auto, vérifie taille + whitelist MIME (BadRequestException sinon).
  - Sécurité : mediaType calculé serveur-side, client ne peut pas forcer.
- **Frontend** :
  - Helper `marketplace-media-assets.ts` : `MEDIA_VIDEO_MAX_BYTES` + `MEDIA_ALLOWED_VIDEO_MIMES` + `validateVideoFile`.
  - Composant `ProductVideoUploader` : single-file picker + preview html5 + progress bar XHR + replace + delete.
  - Page seller `/seller/marketplace-products/[id]` : section "Vidéo" sous galerie.
  - Page publique `/marketplace/products/[slug]` : player html5 controls preload="metadata" si vidéo APPROVED présente.

### Tests
- Backend `media-assets` : 49/49 verts (4 nouveaux specs vidéo).
- Frontend `ProductVideoUploader` : 24/24 verts (8 specs nouveaux).
- TypeScript strict ✅ backend + frontend.

### Hors scope (V2)
- Génération thumbnails serveur-side (ffmpeg).
- Capture frame poster côté client via canvas.
- Multi-vidéos par produit.

### Migration Prisma
Aucune. Modèle `MediaAsset` déjà complet.
EOF
)" \
  --base main \
  --head mp-media-1-video-product

gh pr checks --watch
```

Si CI rouge → STOP. Sinon :

### 3. Merge #52 + sync + deploy + sleep

```
gh pr merge --squash --delete-branch
git checkout main
git pull --rebase origin main
git log --oneline -3 origin/main

./deploy/vps/deploy.sh all
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print('status:',d['data']['status'])"

echo "💤 sleep 60 (anti-fail2ban) ..."
sleep 60
```

Capturer le SHA squash (utilisé pour rebase #53).

### 4. Rebase #53 sur main + push + PR #53 (LOT 3 admin moderation)

LOT 3 partait de `mp-media-1-video-product` (3c37720). Après merge #52, ce SHA est remplacé par squash. Rebase --onto main.

```
git checkout mp-media-1-moderation-admin
git rebase --onto main mp-media-1-video-product mp-media-1-moderation-admin
```

Conflits attendus : **0** (LOT 3 touche `dto/`, controller list filtres, page admin frontend, `MediaPreviewModal`, helpers — disjoints du LOT 2 qui touche service.ts upload + ProductVideoUploader). Si conflit inattendu → résoudre en gardant la branche feature et signaler.

```
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -3
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3

git push -u origin mp-media-1-moderation-admin --force-with-lease

gh pr create \
  --title "feat(media): MP-MEDIA-1 LOT 3 — admin moderation page + filtres list + reject reason" \
  --body "$(cat <<'EOF'
## Résumé

LOT 3 du chantier MP-MEDIA-1 (clôture). Expose côté admin une vue de modération des MediaAsset PENDING avec actions approve / reject reason.

### Périmètre
- **Backend** :
  - Extension `GET /api/v1/marketplace/media-assets` avec filtres `?moderationStatus=` (CSV multi), `?relatedType=`, `?mediaType=`. Pagination conservée.
  - `RejectMediaAssetDto` étendu avec `reason: string` optionnel.
  - Permissions : ADMIN, COORDINATOR pour PENDING. SELLER scopé à ses propres médias (déjà câblé).
- **Frontend** :
  - Helper `marketplace-media-assets.ts` : `listForModeration`, `approve`, `reject` (avec reason).
  - Page `/admin/media-moderation` : tableau filtrable (status / relatedType / mediaType) + colonnes thumbnail + type icon + rôle + sellerSlug + status badge + actions Voir / Approuver / Rejeter.
  - Composant `MediaPreviewModal` : preview full image/vidéo + métadonnées + boutons approve/reject + sub-modal reject reason.

### Tests
- Backend : filtres list + reject reason couverts.
- Frontend : page admin + modal preview.
- TypeScript strict ✅.

### Hors scope (V2)
- Export CSV des modérations.
- Statistiques agrégées (par jour / par type).
- Auto-modération via heuristiques (taille fichier, ratio aspect, etc.).

### Migration Prisma
Aucune.

### Doc
`docs/marketplace/MP_MEDIA_1_LOT_2_LOT_3.md` (récap LOT 1+2+3 + TODO V2).
EOF
)" \
  --base main \
  --head mp-media-1-moderation-admin

gh pr checks --watch
```

Si CI rouge → STOP. Sinon :

### 5. Merge #53 + sync + deploy

```
gh pr merge --squash --delete-branch
git checkout main
git pull --rebase origin main
git log --oneline -5 origin/main

./deploy/vps/deploy.sh all
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print('status:',d['data']['status'])"
```

Capturer le SHA final.

### 6. Smoke fonctionnels combinés

```
echo "=== 1. Login smoke-seller ==="
SELLER_TOKEN=$(curl -sS -X POST https://iox.mycloud.yt/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"smoke-seller@iox.mch","password":"IoxSmoke2026!"}' | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['accessToken'])")

echo "=== 2. Endpoint upload accepte video MIME (smoke #52) ==="
echo "(test indirect via grep code dist : cherche MEDIA_ALLOWED_VIDEO_MIMES dans dist backend)"
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T backend grep -l 'MEDIA_VIDEO_MAX_BYTES\|video/mp4' /app/apps/backend/dist/media-assets/media-assets.service.js 2>/dev/null"

echo "=== 3. Page publique fiche produit OK (smoke #52 player) ==="
curl -sS -o /tmp/_p -w "HTTP %{http_code}\n" "https://iox.mycloud.yt/marketplace/products/demo-vanille-poudre"
grep -c "video\|player\|preload" /tmp/_p 2>&1 || echo "(0 — markup peut être minifié)"

echo "=== 4. Endpoint list avec filtres (smoke #53) ==="
curl -sS -w "\nHTTP %{http_code}\n" "https://iox.mycloud.yt/api/v1/marketplace/media-assets?moderationStatus=PENDING&limit=5" -H "Authorization: Bearer $SELLER_TOKEN" | head -c 400

echo "=== 5. Page admin /media-moderation (auth requise, juste check 200/302) ==="
curl -sS -o /dev/null -w "HTTP %{http_code}\n" "https://iox.mycloud.yt/admin/media-moderation"

echo "=== 6. EmailLog count cohérent ==="
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T postgres psql -U iox -d iox_prod -c 'SELECT count(*) FROM email_logs'"
```

Attendus :
- Login OK
- `MEDIA_VIDEO_MAX_BYTES` présent dans dist backend
- Page publique HTTP 200 (markup video/player)
- `?moderationStatus=PENDING` HTTP 200 + JSON pagination
- `/admin/media-moderation` HTTP 200 ou 302 (selon session)
- email_logs count cohérent

### 7. Validations finales

```
echo "=== git état final ==="
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git status --short
git log --oneline origin/main | head -7

echo "=== aucune branche mp-media-1 résiduelle ==="
git branch | grep "mp-media-1" || echo "OK aucune"

echo "=== bilan ==="
echo "main = $(git rev-parse --short origin/main)"
echo "Total squash PR cumulés:"
git log --oneline main --grep="(#" | wc -l
```

```
git branch -D mp-media-1-video-product mp-media-1-moderation-admin 2>/dev/null || echo "(déjà nettoyées par gh pr merge --delete-branch)"
```

---

## Preuves anti-hallucination obligatoires

```
# 1. Les 2 PR mergées
for n in 52 53; do
  echo "--- PR #$n ---"
  gh pr view $n --json state,mergedAt,statusCheckRollup -q '"state:" + .state + " mergedAt:" + .mergedAt, "checks:", (.statusCheckRollup[] | "  " + .name + " → " + (.conclusion // .status))'
done

# 2. main local + remote
git rev-parse main
git rev-parse origin/main
git log --oneline origin/main | head -5

# 3. Health VPS
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print(d)"

# 4. Constants vidéo dans dist backend
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T backend grep -E 'MEDIA_VIDEO_MAX_BYTES|video/mp4' /app/apps/backend/dist/media-assets/media-assets.service.js 2>/dev/null | head -3"

# 5. Endpoint /media-assets avec filtre status répond OK
curl -sS -w "\nHTTP %{http_code}\n" "https://iox.mycloud.yt/api/v1/marketplace/media-assets?moderationStatus=PENDING&limit=5" -H "Authorization: Bearer $SELLER_TOKEN" | head -c 200

# 6. Page admin /media-moderation OK
curl -sS -o /dev/null -w "HTTP %{http_code}\n" "https://iox.mycloud.yt/admin/media-moderation"

# 7. Branches mp-media-1 supprimées
git branch | grep "mp-media-1" || echo "OK aucune"

# 8. Stash list vide
git stash list

# 9. Working tree propre
git status --short
```

---

## TL;DR rapport attendu

```
Cascade 2 PR — livrée ✅
- PR #52 + #53 mergées dans l'ordre. CI vert sur les 2.
- 2 deploys VPS OK + healthchecks 2/2.
- Smoke #52 : MEDIA_VIDEO_MAX_BYTES dans dist backend, page publique HTTP 200.
- Smoke #53 : /media-assets?moderationStatus=PENDING répond, /admin/media-moderation accessible.
- main = <SHA_FINAL> (était 7975d0d), 51 lots cumulés (49 + 2).
- 0 branche mp-media-1 résiduelle, working tree propre.
- 0 migration Prisma appliquée.
- Chantier MP-MEDIA-1 entièrement clos (LOT 1 + 2 + 3 mergés).
```

---

## Notes de sortie

Après cette cascade :
- Marketplace IOX cumule **51 lots mergés**.
- Galerie multi-images + vidéo + modération admin actifs côté seller + admin.
- Chantier MP-MEDIA-1 complet.
- Chantiers naturels suivants : PAY-1 phase 1 / I18N-5 frontend / RESEND-PROD / BÊTA / AUTH-FIX-LOCAL.

Caveman resume off pour ce livrable car prompt opérationnel.
