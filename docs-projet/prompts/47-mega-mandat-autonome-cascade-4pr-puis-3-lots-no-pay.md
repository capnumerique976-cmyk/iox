# Méga-mandat autonome — Cascade 4 PR + 3 LOTs nouveau dev (sans PAY, sans intervention user)

> Coller dans Claude Code en un seul bloc. ~12h total. Aucune action user requise (0 dashboard, 0 DNS, 0 compte externe, 0 Stripe).
>
> 2 phases : déploiement (cascade 4 PR existantes) + développement (3 LOTs nouveau code).

## Pré-requis (STOP si non remplis)

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git rev-parse main                                              # → 3423eca (ou plus récent)
git stash list                                                   # → vide
which gh && gh auth status                                       # → gh OK
ssh -o ConnectTimeout=5 rahiss-vps 'echo ok'                     # → ok (ControlMaster actif)
```

Si pas vert → STOP + `notes/handoff-mandat-47-stop.md`.

---

## Garde-fous transverses (toutes phases)

- 0 force-push main, force-with-lease feature OK après rebase.
- 0 `gh pr merge --admin` sauf CI rouge.
- 0 deploy user-side (que via `./deploy/vps/deploy.sh`).
- 0 appel Stripe réel — Stripe activation utilisateur reste pendante (code mergé en mode dégradé OK).
- 0 modification env vars VPS.
- 0 envoi email externe (transport mock).
- ControlMaster SSH actif → `sleep 60` entre deploys (≥3 deploys).
- Anti-hallucination strict : vérif disque, recopier preuves brutes, STOP+revert+doc si invention.
- Migrations Prisma additives uniquement.

---

## PHASE 1 — Cascade 4 PR existantes (~1h30)

État attendu remote : 4 PR ouvertes vertes :
- #61 Stripe prep
- #62 I18N-6 sellers (indep)
- #63 MP-CATEGORY-1 admin (chaîné #62)
- #64 I18N-7/8 + MP-CAT-2 (indep)

### 1.1 Pre-flight + sync

```
git checkout main
git fetch origin --prune
git status --short
git log --oneline origin/main | head -3

# Confirme état 4 PR
for n in 61 62 63 64; do
  echo "--- PR #$n ---"
  gh pr view $n --json state,mergeable,statusCheckRollup -q '"state:" + .state + " mergeable:" + .mergeable, (.statusCheckRollup[] | "  " + .name + " → " + (.conclusion // .status))'
done
```

Si une PR rouge → STOP, capturer logs, ne pas merger.

### 1.2 Merge #61 + #62 (independent) + sync + deploy

```
gh pr merge 61 --squash --delete-branch
gh pr merge 62 --squash --delete-branch
git checkout main
git pull --rebase origin main
git log --oneline -3 origin/main

./deploy/vps/deploy.sh all
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print('status:',d['data']['status'])"
sleep 60
```

### 1.3 Rebase #63 sur main + push --force-with-lease

```
# #63 chaîné sur #62 — son parent disparaît au squash, rebase --onto main
git checkout mp-category-1-admin 2>/dev/null || git fetch origin mp-category-1-admin:mp-category-1-admin
git checkout mp-category-1-admin
git rebase --onto main HEAD~$(git rev-list --count main..mp-category-1-admin) mp-category-1-admin 2>/dev/null || git rebase main

pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -3
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
git push --force-with-lease

gh pr checks --watch 63
```

Si CI rouge → STOP. Sinon merge :

```
gh pr merge 63 --squash --delete-branch
git checkout main && git pull --rebase origin main
./deploy/vps/deploy.sh all
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print('status:',d['data']['status'])"
sleep 60
```

### 1.4 Rebase #64 sur main + merge

```
git checkout i18n-7-and-8-and-mp-cat-2 2>/dev/null || git fetch origin i18n-7-and-8-and-mp-cat-2:i18n-7-and-8-and-mp-cat-2
# (adapter nom branche selon vraie nomenclature de #64)
git checkout <BRANCHE_PR_64>
git rebase main

pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -3
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
git push --force-with-lease
gh pr checks --watch 64
```

```
gh pr merge 64 --squash --delete-branch
git checkout main && git pull --rebase origin main
./deploy/vps/deploy.sh all
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print('status:',d['data']['status'])"
```

### 1.5 Validation Phase 1

```
git status --short
git log --oneline origin/main | head -7
git branch | grep -vE "^\* main$" || echo "OK aucune branche feature résiduelle"
echo "Total squash PR cumulés:"
git log --oneline main --grep="(#" | wc -l
```

```
git branch -D <branches-feature-supprimées-remote-mais-locales-reste> 2>/dev/null
```

Capturer SHA final main pour Phase 2.

---

## PHASE 2 — Développement 3 LOTs sans PAY (~10h)

3 LOTs autonomes, aucun externe requis. Toutes specs avec mocks.

```
git checkout main
git pull --rebase origin main
NEW_MAIN=$(git rev-parse --short main)
echo "main avancé : $NEW_MAIN"
```

### LOT A — MP-NOTIF-3 phase 7 (stats avancées EmailLog + retry policy + replay) — ~3h

**Branche** : `mp-notif-3-ph7-stats-retry-replay` à partir de main.

**Périmètre** :

#### A.1 Backend — endpoint stats agrégées

Étendre `notif-email.controller.ts` :
- `GET /api/v1/notif-email/logs/stats` (admin/coordinator).
- Query params : `?dateFrom=&dateTo=&groupBy=day|template|status` (default `day`).
- Service `NotifEmailService.getStats(filters)` :
  - Query Prisma `groupBy` sur EmailLog selon param.
  - Retour JSON : `{ groupKey: string, sent: number, failed: number, skipped: number, total: number }[]`.
- 4 specs (par jour, par template, par status, range invalide → 400).

#### A.2 Backend — replay manuel email échoué

Endpoint `POST /api/v1/notif-email/logs/:id/replay` (admin uniquement) :
- Vérifie EmailLog status=FAILED.
- Recharge templateId + recipientEmail + metadataJson.
- Appelle `NotifEmailService.send` avec mêmes args (recrée nouvel EmailLog).
- Retour : `{ originalId, newLogId, status }`.
- 3 specs (replay FAILED happy, replay non-FAILED → 400, replay 404).

#### A.3 Backend — retry policy automatique (basique)

Service `NotifEmailRetryService` :
- Méthode `retryFailedSinceLastHour()` — query EmailLog status=FAILED, errorCode != "UNSUBSCRIBED", createdAt > 1h ago, retry count < 3.
- Increment retry count via metadataJson.retryCount.
- Cron-like : trigger via `@nestjs/schedule` toutes les 15 min (V1 simple).
- Pattern safeNotify (try/catch + log warn).
- 3 specs (retry happy, max retries → skip, unsubscribed → skip).

#### A.4 Frontend — page stats admin

Étendre `apps/frontend/src/app/(dashboard)/admin/notif-email/logs/page.tsx` :
- Section "Statistiques" en haut avec 3 graphes simples (table HTML, pas lib externe) :
  - Par jour 30 derniers jours.
  - Par template.
  - Par status.
- Bouton "Replay" sur chaque EmailLog FAILED → POST /replay → toast success.
- 4 specs vitest.

#### A.5 Doc

`docs/marketplace/MP_NOTIF_3_PH7_STATS_RETRY_REPLAY.md`.

#### A.6 Preuves LOT A

```
git log --oneline main..mp-notif-3-ph7-stats-retry-replay
git diff main..mp-notif-3-ph7-stats-retry-replay --stat
grep -nE "@Get.*stats|@Post.*replay" apps/backend/src/notif-email/notif-email.controller.ts
grep -nE "retryFailedSinceLastHour" apps/backend/src/notif-email/ -r 2>&1 | head -3
pnpm --filter @iox/backend test src/notif-email 2>&1 | tail -10
pnpm --filter @iox/frontend test admin/notif-email 2>&1 | tail -10
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -3
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
```

---

### LOT B — BUYER-DASHBOARD-2 (orders + profile company avancé + settings) — ~4h

**Branche** : `buyer-dashboard-2-orders-profile-settings` à partir de `mp-notif-3-ph7-stats-retry-replay`.

**Périmètre** :

#### B.1 Backend — endpoint orders buyer

Le model "Order" probablement absent (BUYER V1 pas géré). Approche pragmatique : créer un **read-only "orders"** vue agrégée RFQ status=WON — pas de nouvelle table.

Endpoint `GET /api/v1/marketplace/quote-requests/won` (role BUYER) :
- Liste les RFQ que le buyer a "gagnées" (status=WON).
- Query params filtre `?dateFrom=&dateTo=&sellerSlug=`.
- Pagination existante.

Tests backend : 3 specs (list won + filtres + pagination).

#### B.2 Frontend — page /buyer/orders

`apps/frontend/src/app/(dashboard)/buyer/orders/page.tsx` :
- Tableau orders : offer title + seller + quantité + total + date WON.
- Lien vers RFQ detail.
- Filtres simples.

3 specs vitest.

#### B.3 Backend — Company profile édition étendue

Vérifier endpoint existant `PATCH /companies/mine/:id` (déjà câblé via BUYER-DASHBOARD-3 #42 cascade #18).

Étendre champs éditables : description, website, sector, sizeCategory si pas déjà autorisés.

3 specs.

#### B.4 Frontend — page /buyer/profile/company avancée

Étendre page existante avec champs additionnels (description, website, sector, sizeCategory).

3 specs vitest.

#### B.5 Backend — préférences notifications buyer

Vérifier endpoint `PATCH /buyers/me/notification-preferences` (déjà câblé via BUYER-DASHBOARD-4 #45 cascade #18).

Étendre avec préférences supplémentaires : `notifyOrderShipped`, `notifyPriceChange`, `notifyNewSellerOnboarded` (V1 stub, juste field).

#### B.6 Frontend — page /buyer/settings

Étendre page settings buyer avec checkboxes additionnelles.

#### B.7 Doc

`docs/marketplace/BUYER_DASHBOARD_2_ORDERS_PROFILE_SETTINGS.md`.

#### B.8 Preuves LOT B

```
git log --oneline mp-notif-3-ph7-stats-retry-replay..buyer-dashboard-2-orders-profile-settings
git diff mp-notif-3-ph7-stats-retry-replay..buyer-dashboard-2-orders-profile-settings --stat
ls apps/frontend/src/app/\(dashboard\)/buyer/{orders,profile,settings}/ 2>&1 | head
grep -nE "@Get.*won" apps/backend/src/quote-requests/quote-requests.controller.ts
pnpm --filter @iox/backend test src/quote-requests 2>&1 | tail -10
pnpm --filter @iox/frontend test buyer 2>&1 | tail -10
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -3
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
```

---

### LOT C — ADMIN-AUDIT-VIEWER (consult audit logs) — ~3h

**Branche** : `admin-audit-viewer` à partir de `buyer-dashboard-2-orders-profile-settings`.

**Périmètre** :

#### C.1 Backend — endpoint admin audit logs

Modèle `AuditLog` existant (schema.prisma). Vérifier.

Endpoint `GET /api/v1/admin/audit-logs` (admin uniquement) :
- Filtres : `?action=&actorId=&entityType=&dateFrom=&dateTo=`
- Pagination.
- Service `AuditLogsService.list(filters, actor)` paginated query Prisma.

5 specs (filtres + pagination + ownership).

#### C.2 Frontend — page admin

`apps/frontend/src/app/(dashboard)/admin/audit-logs/page.tsx` :
- Tableau : action, actor (email), entityType, entityId, createdAt.
- Filtres dropdown action + entityType + date range.
- Pagination.
- Modal "Voir détails" → display fullJson (previousData + newData).

4 specs vitest.

#### C.3 Doc

`docs/marketplace/ADMIN_AUDIT_VIEWER.md`.

#### C.4 Preuves LOT C

```
git log --oneline buyer-dashboard-2-orders-profile-settings..admin-audit-viewer
grep -nE "@Get.*audit-logs" apps/backend/src/audit/ -r 2>&1 | head -3
ls apps/frontend/src/app/\(dashboard\)/admin/audit-logs/
pnpm --filter @iox/backend test src/audit 2>&1 | tail -10
pnpm --filter @iox/frontend test admin/audit 2>&1 | tail -10
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -3
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
```

---

## PHASE 3 — Cascade 3 PR (LOTs A + B + C) — ~1h

```
git checkout main
git fetch origin --prune
git status --short
```

### 3.1 Push #65 NOTIF-3 PH7

```
git checkout mp-notif-3-ph7-stats-retry-replay
git push -u origin mp-notif-3-ph7-stats-retry-replay
gh pr create --title "feat(notif): MP-NOTIF-3 phase 7 — stats EmailLog + retry policy + replay" --body "Mandat 47 LOT A. Stats agrégées admin + retry auto failed (cron 15min) + replay manuel + UI graphes." --base main --head mp-notif-3-ph7-stats-retry-replay
gh pr checks --watch
```

```
gh pr merge --squash --delete-branch
git checkout main && git pull --rebase origin main
./deploy/vps/deploy.sh all
sleep 60
```

### 3.2 Rebase #66 BUYER-DASHBOARD-2 + push + merge

```
git checkout buyer-dashboard-2-orders-profile-settings
git rebase --onto main mp-notif-3-ph7-stats-retry-replay buyer-dashboard-2-orders-profile-settings
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -3
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
git push -u origin buyer-dashboard-2-orders-profile-settings --force-with-lease
gh pr create --title "feat(buyer): BUYER-DASHBOARD-2 — orders (RFQ won view) + profile company avancé + settings notifications" --body "Mandat 47 LOT B. Orders read-only depuis RFQ won, profile company champs étendus, settings prefs notifications buyer." --base main --head buyer-dashboard-2-orders-profile-settings
gh pr checks --watch
gh pr merge --squash --delete-branch
git checkout main && git pull --rebase origin main
./deploy/vps/deploy.sh all
sleep 60
```

### 3.3 Rebase #67 ADMIN-AUDIT-VIEWER + push + merge

```
git checkout admin-audit-viewer
git rebase --onto main buyer-dashboard-2-orders-profile-settings admin-audit-viewer
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -3
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
git push -u origin admin-audit-viewer --force-with-lease
gh pr create --title "feat(admin): ADMIN-AUDIT-VIEWER — page consultation audit logs" --body "Mandat 47 LOT C. Endpoint admin audit-logs filtrés + paginés + page admin avec filtres + modal détails." --base main --head admin-audit-viewer
gh pr checks --watch
gh pr merge --squash --delete-branch
git checkout main && git pull --rebase origin main
./deploy/vps/deploy.sh all
```

### 3.4 Smoke combiné

```
echo "=== 1. Health ==="
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print('status:',d['data']['status'])"

echo "=== 2. Endpoint stats EmailLog 401 sans auth ==="
curl -sS -w "\nHTTP %{http_code}\n" "https://iox.mycloud.yt/api/v1/notif-email/logs/stats" | head -c 200

echo "=== 3. Endpoint orders buyer 401 sans auth ==="
curl -sS -w "\nHTTP %{http_code}\n" "https://iox.mycloud.yt/api/v1/marketplace/quote-requests/won" | head -c 200

echo "=== 4. Endpoint admin audit-logs 401 sans auth ==="
curl -sS -w "\nHTTP %{http_code}\n" "https://iox.mycloud.yt/api/v1/admin/audit-logs" | head -c 200

echo "=== 5. Page admin notif-email logs ==="
curl -sS -o /dev/null -w "HTTP %{http_code}\n" "https://iox.mycloud.yt/admin/notif-email/logs"

echo "=== 6. Page buyer orders ==="
curl -sS -o /dev/null -w "HTTP %{http_code}\n" "https://iox.mycloud.yt/buyer/orders"

echo "=== 7. Page admin audit-logs ==="
curl -sS -o /dev/null -w "HTTP %{http_code}\n" "https://iox.mycloud.yt/admin/audit-logs"
```

### 3.5 Validations finales

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git status --short
git log --oneline origin/main | head -10
git branch | grep -vE "^\* main$" || echo "OK aucune"
echo "Total squash PR cumulés:"
git log --oneline main --grep="(#" | wc -l
```

```
git branch -D mp-notif-3-ph7-stats-retry-replay buyer-dashboard-2-orders-profile-settings admin-audit-viewer 2>/dev/null
```

---

## Preuves anti-hallucination globales (handoff)

```
# Phase 1 — 4 PR mergées
for n in 61 62 63 64; do
  echo "--- PR #$n ---"
  gh pr view $n --json state,mergedAt,statusCheckRollup -q '"state:" + .state + " mergedAt:" + .mergedAt, (.statusCheckRollup[] | "  " + .name + " → " + (.conclusion // .status))'
done

# Phase 3 — 3 PR mergées
for n in 65 66 67; do
  echo "--- PR #$n ---"
  gh pr view $n --json state,mergedAt,statusCheckRollup -q '"state:" + .state + " mergedAt:" + .mergedAt, (.statusCheckRollup[] | "  " + .name + " → " + (.conclusion // .status))'
done

# main local + remote
git rev-parse main
git rev-parse origin/main
git log --oneline origin/main | head -10

# Health VPS
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print(d['data']['status'])"

# Smoke endpoints nouveaux
curl -sS -w "\nHTTP %{http_code}\n" "https://iox.mycloud.yt/api/v1/notif-email/logs/stats" | head -c 200
curl -sS -w "\nHTTP %{http_code}\n" "https://iox.mycloud.yt/api/v1/marketplace/quote-requests/won" | head -c 200
curl -sS -w "\nHTTP %{http_code}\n" "https://iox.mycloud.yt/api/v1/admin/audit-logs" | head -c 200

# Branches résiduelles
git branch | grep -vE "^\* main$" || echo "OK"

# Stash + working tree
git stash list
git status --short
```

---

## Format rapport final attendu (`notes/handoff-mandat-47.md`)

```
# Méga-mandat 47 autonome — handoff

## TL;DR
- Phase 1 cascade 4 PR (#61 #62 #63 #64) : ✅ / 🟡 / ❌
- Phase 2 dev 3 LOTs A+B+C : ✅ / 🟡 / ❌
- Phase 3 cascade 3 PR (#65 #66 #67) : ✅ / 🟡 / ❌
- main = <SHA_FINAL>
- 7 PR mergées au total ce mandat
- 0 push refusé, 0 force-push main, 0 envoi externe, 0 intervention user requise

## Branches livrées (toutes mergées et supprimées remote)
- #61 stripe-activate-prep-scripts-and-smoke
- #62 i18n-6 sellers
- #63 mp-category-1-admin
- #64 i18n-7-and-8-and-mp-cat-2 (ou nom réel)
- #65 mp-notif-3-ph7-stats-retry-replay
- #66 buyer-dashboard-2-orders-profile-settings
- #67 admin-audit-viewer

## Phases preuves brutes
[recopier sortie commandes anti-hallucination]

## Notes
- Stripe Connect activation reste pendante côté user (chantier ops séparé).
- Stripe API non testée en runtime (factory mock OK pour tests, code merge OK).
- Resend reste désactivé (mock).
- Aucune migration Prisma destructive.
```

---

## TL;DR pour Claude Code

3 phases enchaînées totalement autonomes. ~12h cumul. Si doute, STOP + handoff. À retour user vérifie via grep / git log / pnpm test.

**Point critique** : si une PR existante (#61-#64) a CI rouge → STOP cascade Phase 1, passer direct Phase 2 (LOTs A B C qui ne dépendent pas de Phase 1).

Caveman resume off pour ce livrable car prompt opérationnel.
