# Cascade PR #51 — push I18N-4 phase 3 (rfq-won.en + rfq-lost.en + rfq-created-to-seller.en + footer EN)

> Push + PR + merge + deploy de la branche `i18n-4-phase-3-rfq-won-lost-created-en`. ~30 min total. Clôt entièrement le chantier I18N-4 emails.

## Pré-requis (STOP si non remplis)

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git rev-parse main                                                       # → b2886d20bc62b528c15db57aa94aec9bb393d4a0
git rev-parse --short i18n-4-phase-3-rfq-won-lost-created-en              # → fe3103a
git stash list                                                            # → vide
which gh && gh auth status                                                # → gh OK
ssh -o ConnectTimeout=5 rahiss-vps 'echo ok'                              # → ok (ControlMaster actif)
```

Si pas vert → STOP + `notes/handoff-cascade-pr51-stop.md`.

---

## Garde-fous

- ❌ Pas de force-push sur main.
- ❌ Pas de `gh pr merge --admin` sauf CI rouge.
- ✅ ControlMaster SSH actif → 1 deploy seul, pas de sleep nécessaire.
- ❌ 0 migration Prisma.
- ❌ Pas de touchage à d'autres branches.

---

## Étapes

### 1. Pre-flight + sync remote

```
git checkout main
git fetch origin --prune
git status --short
git log --oneline origin/main | head -3
```

Confirmer `origin/main = main = b2886d2`. Si origin a avancé → STOP + signaler.

### 2. Push + PR #51

Pas de rebase requis — main pas avancé depuis création de la branche.

```
git checkout i18n-4-phase-3-rfq-won-lost-created-en
git push -u origin i18n-4-phase-3-rfq-won-lost-created-en

gh pr create \
  --title "feat(notif): I18N-4 phase 3 — EN templates won/lost/created-to-seller + multi-locale footer" \
  --body "$(cat <<'EOF'
## Résumé

Phase 3 (et **clôture**) du chantier I18N-4 (architecture emails multi-locale, posée en phase 1 PR #48). Ajoute les 3 derniers templates EN manquants + footer multi-locale.

### Périmètre
- **Footer multi-locale** : `renderFooter({ unsubscribeUrl, locale })` avec dictionnaire `FOOTER_I18N` (FR + EN). Rétrocompat préservée (default FR si `locale` absent).
- **`rfq-won.en.template.ts`** — ton positif ("Good news, your request is confirmed").
- **`rfq-lost.en.template.ts`** — ton neutre ("Update on your request") pour préserver relation buyer-seller.
- **`rfq-created-to-seller.en.template.ts`** — notification seller à création RFQ par buyer ("New quote request for: {offerTitle}"). HTML inline custom.
- Helper `rfq-transition.helper.ts` propage locale → footer.
- Registry templates étendu : 6 ids × 2 locales = **12 variantes** (résolution `templateId + locale` avec fallback FR).

### Tests
- 15 nouveaux specs (3 templates × ~3 specs + footer locale + registry étendu).
- Backend templates : 134/134 verts (0 régression).
- TypeScript strict ✅.

### État final chantier I18N-4 emails
6 templates EN au total (cumul phases 1+2+3) :
- rfq-message-created.en (#48)
- rfq-qualified.en (#50)
- rfq-quoted.en (#50)
- rfq-won.en (#51)
- rfq-lost.en (#51)
- rfq-created-to-seller.en (#51)

Miroirs des 6 FR. Bascule auto via `User.preferredLocale` (déjà câblé phase 1, fallback FR).

### Hors scope (mandats futurs)
- Locales ES / AR / ZH.
- Frontend public marketplace EN couvert (chantier I18N-5 séparé).

### Migration Prisma
Aucune.

### Doc
`docs/marketplace/I18N_4_PHASE_3_WON_LOST_CREATED_EN.md` (100 lignes).
EOF
)" \
  --base main \
  --head i18n-4-phase-3-rfq-won-lost-created-en

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
echo "=== 1. 6 templates EN dans dist backend ==="
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T backend find /app/apps/backend/dist/notif-email/templates -name '*.en.template.js' 2>/dev/null"

echo "=== 2. Footer multi-locale dans dist ==="
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T backend grep -l 'FOOTER_I18N\|locale.*en' /app/apps/backend/dist/notif-email/templates/footer.js 2>/dev/null"

echo "=== 3. EmailLog count cohérent ==="
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T postgres psql -U iox -d iox_prod -c 'SELECT count(*) FROM email_logs'"

echo "=== 4. Health backend ==="
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print(d)"

echo "=== 5. Logs récents notif-email (boot OK, registry chargé sans erreur) ==="
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml logs backend --tail=50 | grep -i 'notif\|template\|registry' | tail -10"
```

Attendus :
- `find` trouve **6 fichiers** `.en.template.js` (les 6 templates EN).
- `grep FOOTER_I18N` trouve le footer multi-locale dans dist.
- email_logs count cohérent (>= count avant deploy).
- Health `status: ok`.
- Logs : pas d'erreur registry au boot.

### 5. Validations finales

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git status --short
git log --oneline origin/main | head -5

echo "=== aucune branche i18n-4 phase 3 résiduelle ==="
git branch | grep "i18n-4-phase-3" || echo "OK aucune"

echo "=== bilan ==="
echo "main = $(git rev-parse --short origin/main)"
echo "Total squash PR cumulés:"
git log --oneline main --grep="(#" | wc -l
```

```
git branch -D i18n-4-phase-3-rfq-won-lost-created-en 2>/dev/null || echo "(déjà nettoyée par gh pr merge --delete-branch)"
```

---

## Preuves anti-hallucination obligatoires

```
# 1. PR #51 mergée
gh pr view 51 --json state,mergedAt,statusCheckRollup -q '"state:" + .state + " mergedAt:" + .mergedAt, "checks:", (.statusCheckRollup[] | "  " + .name + " → " + (.conclusion // .status))'

# 2. main local + remote
git rev-parse main
git rev-parse origin/main
git log --oneline origin/main | head -3

# 3. Health VPS
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print(d)"

# 4. 6 templates EN dans dist backend
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T backend find /app/apps/backend/dist/notif-email/templates -name '*.en.template.js' 2>/dev/null"

# 5. EmailLog count cohérent
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T postgres psql -U iox -d iox_prod -c 'SELECT count(*) FROM email_logs'"

# 6. Branche i18n-4 phase 3 supprimée
git branch | grep "i18n-4-phase-3" || echo "OK aucune"

# 7. Stash list vide
git stash list

# 8. Working tree propre
git status --short
```

---

## TL;DR rapport attendu

```
Cascade PR #51 — livrée ✅
- PR #51 mergée. CI vert. Deploy VPS OK.
- main = <SHA_FINAL> (était b2886d2), 49 lots cumulés.
- 6 templates EN visibles dans dist backend (cumul phases 1+2+3, miroirs des 6 FR).
- Footer multi-locale FOOTER_I18N déployé.
- email_logs count cohérent.
- 0 branche i18n-4-phase-3 résiduelle.
- 0 migration Prisma appliquée.
- Chantier I18N-4 emails clos.
```

Caveman resume off pour ce livrable car prompt opérationnel.
