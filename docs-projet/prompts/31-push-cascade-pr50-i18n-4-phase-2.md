# Cascade PR #50 — push I18N-4 phase 2 (templates EN rfq-qualified + rfq-quoted)

> Push + PR + merge + deploy de la branche `i18n-4-phase-2-rfq-qualified-quoted-en`. ~30 min total.

## Pré-requis (STOP si non remplis)

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git rev-parse main                                                     # → d8731a44535e4f6ace255e870d6d82ff6f8731fa
git rev-parse --short i18n-4-phase-2-rfq-qualified-quoted-en            # → 5e53c83
git stash list                                                          # → vide
which gh && gh auth status                                              # → gh OK
ssh -o ConnectTimeout=5 rahiss-vps 'echo ok'                            # → ok (ControlMaster actif)
```

Si pas vert → STOP + `notes/handoff-cascade-pr50-stop.md`.

---

## Garde-fous

- ❌ Pas de force-push sur main.
- ❌ Pas de `gh pr merge --admin` sauf CI rouge.
- ✅ ControlMaster SSH actif.
- ✅ Sleep pas requis (1 deploy seul).
- ✅ Rebase `main` requis car main a avancé (PR #49 mergée).
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

Confirmer `origin/main = main = d8731a4`. Si origin a avancé → STOP + signaler.

### 2. Rebase + push + PR #50

```
git checkout i18n-4-phase-2-rfq-qualified-quoted-en
git rebase main
```

Conflits attendus : **0** (zones disjointes — i18n-4 touche `notif-email/templates/`, mp-media-1 touche `media-assets/`). Si conflit inattendu → résoudre en gardant la branche feature et signaler.

```
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -3
git push -u origin i18n-4-phase-2-rfq-qualified-quoted-en --force-with-lease

gh pr create \
  --title "feat(notif): I18N-4 phase 2 — templates EN rfq-qualified + rfq-quoted" \
  --body "$(cat <<'EOF'
## Résumé

Phase 2 du chantier I18N-4 (architecture emails multi-locale, posée en phase 1 PR #48). Ajoute les versions EN des 2 templates de transition RFQ les plus fréquents (`rfq-qualified`, `rfq-quoted`).

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
echo "=== 1. Templates EN présents dans dist backend ==="
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T backend find /app/apps/backend/dist/notif-email/templates -name '*.en.template.js' 2>/dev/null"

echo "=== 2. EmailLog count en DB cohérent (smoke ne casse rien) ==="
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T postgres psql -U iox -d iox_prod -c 'SELECT count(*) FROM email_logs'"

echo "=== 3. Health backend récent ==="
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print(d)"

echo "=== 4. Logs récents notif-email (vérifier pas d'erreur boot template registry) ==="
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml logs backend --tail=50 | grep -i 'notif\|template\|registry' | tail -10"
```

Attendus :
- `find` trouve `rfq-qualified.en.template.js`, `rfq-quoted.en.template.js`, `rfq-message-created.en.template.js` dans dist.
- email_logs count cohérent (>= count avant deploy).
- Health `status: ok`.
- Logs : pas d'erreur registry au boot.

### 5. Validations finales

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git status --short
git log --oneline origin/main | head -5

echo "=== aucune branche i18n-4 résiduelle ==="
git branch | grep "i18n-4-phase-2" || echo "OK aucune"

echo "=== bilan ==="
echo "main = $(git rev-parse --short origin/main)"
echo "Total squash PR cumulés:"
git log --oneline main --grep="(#" | wc -l
```

```
git branch -D i18n-4-phase-2-rfq-qualified-quoted-en 2>/dev/null || echo "(déjà nettoyée par gh pr merge --delete-branch)"
```

---

## Preuves anti-hallucination obligatoires

```
# 1. PR #50 mergée
gh pr view 50 --json state,mergedAt,statusCheckRollup -q '"state:" + .state + " mergedAt:" + .mergedAt, "checks:", (.statusCheckRollup[] | "  " + .name + " → " + (.conclusion // .status))'

# 2. main local + remote
git rev-parse main
git rev-parse origin/main
git log --oneline origin/main | head -3

# 3. Health VPS
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print(d)"

# 4. Templates EN dans dist backend
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T backend find /app/apps/backend/dist/notif-email/templates -name '*.en.template.js' 2>/dev/null"

# 5. EmailLog count cohérent
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T postgres psql -U iox -d iox_prod -c 'SELECT count(*) FROM email_logs'"

# 6. Branche i18n-4 supprimée
git branch | grep "i18n-4-phase-2" || echo "OK aucune"

# 7. Stash list vide
git stash list

# 8. Working tree propre
git status --short
```

---

## TL;DR rapport attendu

```
Cascade PR #50 — livrée ✅
- PR #50 mergée. CI vert. Deploy VPS OK.
- main = <SHA_FINAL> (était d8731a4), 48 lots cumulés.
- 3 templates EN visibles dans dist backend (rfq-qualified, rfq-quoted, rfq-message-created).
- email_logs count cohérent.
- 0 branche i18n-4 résiduelle.
- 0 migration Prisma appliquée.
```

Caveman resume off pour ce livrable car prompt opérationnel.
