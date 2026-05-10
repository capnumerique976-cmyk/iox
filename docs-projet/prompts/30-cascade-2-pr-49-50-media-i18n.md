# Cascade 2 PR — #49 MP-MEDIA-1 LOT 1 + #50 I18N-4 phase 2

> Push + PR + merge + deploy de 2 branches feature indépendantes (pas chaîne parent-enfant). Total ~45 min.

## Branches à push

| PR | Branche | Parent | SHA |
|---|---|---|---|
| #49 | `mp-media-1-gallery-product` | main `f717294` | `d8e1593` |
| #50 | `i18n-4-phase-2-rfq-qualified-quoted-en` | main `f717294` | `5e53c83` |

Les 2 branches sont **indépendantes** (touchent zones différentes : media-assets vs notif-email/templates). Aucun rebase `--onto main` à priori nécessaire entre elles, mais on rebase #50 après merge #49 pour garder un historique linéaire propre.

---

## Pré-requis (STOP si non remplis)

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git rev-parse main                                                     # → f717294e96d1df8eafe5409f2b3a7584315aa5d3
git rev-parse --short mp-media-1-gallery-product                        # → d8e1593
git rev-parse --short i18n-4-phase-2-rfq-qualified-quoted-en            # → 5e53c83
git stash list                                                          # → vide
which gh && gh auth status                                              # → gh OK
ssh -o ConnectTimeout=5 rahiss-vps 'echo ok'                            # → ok (ControlMaster actif côté ~/.ssh/config)
```

Si pas vert → STOP + `notes/handoff-cascade-2pr-stop.md`.

---

## Garde-fous

- ❌ Pas de force-push sur main.
- ❌ Pas de `gh pr merge --admin` sauf CI rouge.
- ✅ ControlMaster SSH actif → fail2ban couvert.
- ✅ `sleep 60` entre deploys (ControlMaster réduit le risque, 60s suffit).
- ❌ Pas de touchage à d'autres branches.
- ❌ 0 migration Prisma à appliquer (modèles déjà complets).

---

## Étapes

### 1. Pre-flight + sync remote

```
git checkout main
git fetch origin --prune
git status --short
git log --oneline origin/main | head -3
```

Confirmer `origin/main = main = f717294`. Si origin a avancé, **STOP** + signaler.

---

### 2. Push branche #49 (MP-MEDIA-1 LOT 1)

```
git checkout mp-media-1-gallery-product
git push -u origin mp-media-1-gallery-product

gh pr create \
  --title "feat(media): MP-MEDIA-1 LOT 1 — galerie multi-images produit (drag-reorder + lightbox public)" \
  --body "$(cat <<'EOF'
## Résumé

LOT 1 du chantier MP-MEDIA-1. Permet au seller d'attacher plusieurs images de galerie à son produit (en plus de PRIMARY), réordonner par drag, supprimer. Affichage public avec lightbox interactif.

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
- Backend `media-assets` : 37/37 (28 existants + 9 nouveaux).
- Frontend total : 296/296 (sans régression, 12 nouveaux specs).
- TypeScript strict ✅.

### Hors scope (mandats futurs)
- LOT 2 vidéo produit (mp4/webm/quicktime, 50 MB, player public).
- LOT 3 page admin `/admin/media-moderation`.

### Migration Prisma
Aucune. Modèle `MediaAsset` déjà complet.

### Doc
`docs/marketplace/MP_MEDIA_1_LOT_1_GALLERY.md` (165 lignes).
EOF
)" \
  --base main \
  --head mp-media-1-gallery-product

gh pr checks --watch
```

Si CI rouge → STOP. Sinon :

---

### 3. Merge #49 + sync + deploy + sleep

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

Capturer le SHA squash (utilisé pour rebase #50).

---

### 4. Rebase #50 sur main + push + PR #50 (I18N-4 phase 2)

Main avancé après merge #49. Rebase la branche I18N-4 sur le nouveau main pour historique propre.

```
git checkout i18n-4-phase-2-rfq-qualified-quoted-en
git rebase main
```

Conflits attendus : **0** (zones disjointes : media-assets vs notif-email/templates). Si conflit inattendu → résoudre en gardant la branche feature et signaler.

```
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -3
git push -u origin i18n-4-phase-2-rfq-qualified-quoted-en --force-with-lease

gh pr create \
  --title "feat(notif): I18N-4 phase 2 — templates EN rfq-qualified + rfq-quoted" \
  --body "$(cat <<'EOF'
## Résumé

Phase 2 du chantier I18N-4 (architecture emails multi-locale). Ajoute les versions EN des 2 templates de transition RFQ les plus fréquents (`rfq-qualified`, `rfq-quoted`).

### Périmètre
- Helper `rfq-transition.helper.ts` étendu avec dictionnaire i18n interne (greeting, sellerNote, attribut `<html lang>`).
- `rfq-qualified.en.template.ts` + `rfq-quoted.en.template.ts` — mirrors EN des templates FR existants.
- Registry templates : variantes EN ajoutées, fallback FR auto pour `rfq-won` + `rfq-lost` (phase 3 à venir).
- Pattern `pickLocale(copy)` : retourne `en` si `copy.locale === 'en'`, sinon `fr`.

### Tests
- Templates : 52 verts (41 → 52, +11 nouveaux/modifiés).
- Backend total : 628 verts (0 régression).

### Hors scope (phase 3)
- `rfq-won.en` + `rfq-lost.en` + `rfq-created-to-seller.en`.
- Footer EN (lien désinscription).
- Locales ES / AR / ZH.

### Migration Prisma
Aucune.

### Doc
`docs/marketplace/I18N_4_PHASE_2_QUALIFIED_QUOTED_EN.md` (64 lignes).
EOF
)" \
  --base main \
  --head i18n-4-phase-2-rfq-qualified-quoted-en

gh pr checks --watch
```

Si CI rouge → STOP. Sinon :

---

### 5. Merge #50 + sync + deploy

```
gh pr merge --squash --delete-branch
git checkout main
git pull --rebase origin main
git log --oneline -3 origin/main

./deploy/vps/deploy.sh all
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print('status:',d['data']['status'])"
```

Capturer le SHA final.

---

### 6. Smoke fonctionnels combinés

```
echo "=== 1. Login smoke-seller ==="
SELLER_TOKEN=$(curl -sS -X POST https://iox.mycloud.yt/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"smoke-seller@iox.mch","password":"IoxSmoke2026!"}' | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['accessToken'])")

echo "=== 2. Endpoint /reorder répond 400 sur DTO vide (smoke #49) ==="
curl -sS -w "\nHTTP %{http_code}\n" -X PATCH "https://iox.mycloud.yt/api/v1/marketplace/media-assets/reorder" -H "Content-Type: application/json" -H "Authorization: Bearer $SELLER_TOKEN" -d '{"items":[]}' | head -c 300

echo "=== 3. Page publique fiche produit (smoke #49 lightbox déployé) ==="
curl -sS -o /dev/null -w "HTTP %{http_code} content-type=%{content_type}\n" "https://iox.mycloud.yt/marketplace/products/demo-vanille-poudre"

echo "=== 4. EmailLog count en DB (smoke #50 base reste cohérente) ==="
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T postgres psql -U iox -d iox_prod -c 'SELECT count(*) FROM email_logs'"

echo "=== 5. Templates EN présents dans le bundle backend (smoke #50) ==="
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T backend ls /app/apps/backend/dist/notif-email/templates/ 2>/dev/null | grep -E 'rfq-qualified.en|rfq-quoted.en' | head -5"
```

Attendus :
- Login OK
- `/reorder` body vide → HTTP 400
- Page publique → HTTP 200 + text/html
- email_logs count cohérent (>= count d'avant)
- 2 templates EN présents dans le dist backend déployé

---

### 7. Validations finales

```
echo "=== git état final ==="
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git status --short
git log --oneline origin/main | head -5

echo "=== aucune branche feature résiduelle ==="
git branch | grep -E "mp-media-1|i18n-4-phase-2" || echo "OK aucune"

echo "=== bilan ==="
echo "main = $(git rev-parse --short origin/main)"
echo "Total squash PR cumulés:"
git log --oneline main --grep="(#" | wc -l
```

```
git branch -D mp-media-1-gallery-product i18n-4-phase-2-rfq-qualified-quoted-en 2>/dev/null || echo "(déjà nettoyées par gh pr merge --delete-branch)"
```

---

## Preuves anti-hallucination obligatoires

```
# 1. Les 2 PR mergées (state + checks)
for n in 49 50; do
  echo "--- PR #$n ---"
  gh pr view $n --json state,mergedAt,statusCheckRollup -q '"state:" + .state + " mergedAt:" + .mergedAt, "checks:", (.statusCheckRollup[] | "  " + .name + " → " + (.conclusion // .status))'
done

# 2. main local + remote
git rev-parse main
git rev-parse origin/main
git log --oneline origin/main | head -5

# 3. Health VPS
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print(d)"

# 4. Endpoint reorder répond 400
curl -sS -w "\nHTTP %{http_code}\n" -X PATCH "https://iox.mycloud.yt/api/v1/marketplace/media-assets/reorder" -H "Content-Type: application/json" -H "Authorization: Bearer $SELLER_TOKEN" -d '{"items":[]}' | head -c 200

# 5. Page publique fiche produit OK
curl -sS -o /dev/null -w "HTTP %{http_code} content-type=%{content_type}\n" "https://iox.mycloud.yt/marketplace/products/demo-vanille-poudre"

# 6. Templates EN dans dist backend
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T backend ls /app/apps/backend/dist/notif-email/templates/ 2>/dev/null | grep -E 'rfq-qualified.en|rfq-quoted.en'"

# 7. Branches feature supprimées
git branch | grep -E "mp-media-1|i18n-4-phase-2" || echo "OK aucune"

# 8. Stash list vide
git stash list

# 9. Working tree propre
git status --short
```

---

## TL;DR rapport attendu

```
Cascade 2 PR — livrée ✅
- PR #49 + #50 mergées dans l'ordre. CI vert sur les 2.
- 2 deploys VPS OK + healthchecks 2/2.
- Smoke #49 : /reorder 400 sur DTO vide, page publique fiche produit HTTP 200.
- Smoke #50 : 2 templates EN visibles dans dist backend, email_logs count cohérent.
- main = <SHA_FINAL> (était f717294), 48 lots cumulés (46 + 2).
- 0 branche feature résiduelle, working tree propre.
- 0 migration Prisma appliquée.
```

---

## Notes de sortie

Après cette cascade :
- Marketplace IOX cumule 48 lots mergés.
- Galerie multi-images produit visible publiquement.
- Templates EN partiels (rfq-qualified, rfq-quoted, rfq-message-created déjà via #48).
- Phase I18N-4 phase 3 reste à faire (rfq-won.en + rfq-lost.en + rfq-created-to-seller.en + footer EN).
- Mandats MP-MEDIA-1 LOT 2 (vidéo) + LOT 3 (admin moderation) à programmer.

Caveman resume off pour ce livrable car prompt opérationnel.
