# Prompt 22 — Push-cascade 4 branches du méga-mandat 20 (BUYER-DASHBOARD-1 + MP-NOTIF-3 + MP-OFFER-EDIT-2)

## Contexte

Le méga-mandat 20 a livré 4 sous-branches en topologie non-linéaire (par-dessus `main = 4250db2` à l'époque, maintenant `main = b7dfb40` après cascade #21). On les pousse dans l'ordre, en rebasant chaque branche `--onto main` pour aplatir la topologie sur le main courant.

```
État avant cascade :

main (b7dfb40)
 ├─ buyer-dashboard-1-quote-requests              (9719fbe, 6 commits, parent: 4250db2)
 │    └─ mp-notif-3-unsubscribe-page              (2c6e706, +1, parent: 9719fbe)
 │         └─ mp-offer-edit-2-visibility-and-batches (5a92da7, +1, parent: 2c6e706)
 │
 └─ mp-notif-3-emaillog-admin                     (71ae8be, +1, parent: 9a12880 → squashé en b71258a sur main)
```

Ordre cascade :

```
1. PR #27 BUYER-DASHBOARD-1            (rebase --onto main 4250db2 buyer-dashboard-1-quote-requests)
2. PR #28 MP-NOTIF-3 unsubscribe-page  (rebase --onto main mp-notif-3-unsubscribe-page-old-base mp-notif-3-unsubscribe-page)
3. PR #29 MP-OFFER-EDIT-2              (rebase --onto main mp-offer-edit-2-old-base mp-offer-edit-2-visibility-and-batches)
4. PR #30 MP-NOTIF-3 emaillog-admin    (rebase --onto main 9a12880 mp-notif-3-emaillog-admin)
```

⚠️ **Note critique fail2ban VPS** : la cascade #21 a constaté un ban SSH ~38 min après 3 connexions `deploy.sh` consécutives. **Prévoir `sleep 60` entre chaque deploy** pour éviter le ban.

## Pré-requis (à vérifier en premier — STOP si non remplis)

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git rev-parse main                                              # → b7dfb403b03fcce3619c7b9a916d4e2cabce24b0
git rev-parse --short buyer-dashboard-1-quote-requests           # → 9719fbe
git rev-parse --short mp-notif-3-unsubscribe-page                # → 2c6e706
git rev-parse --short mp-offer-edit-2-visibility-and-batches     # → 5a92da7
git rev-parse --short mp-notif-3-emaillog-admin                  # → 71ae8be
git rev-parse --short b71258a                                    # squash PR #24 sur main (parent indirect du LOT 2b)
git stash list                                                   # → vide
which gh && gh auth status                                       # → gh OK
ssh -o ConnectTimeout=5 rahiss-vps 'echo ok'                     # → ok (sinon attendre levée fail2ban)

# Vérif que l'ancien parent du LOT 2b reste accessible via reflog
git rev-parse 9a12880 2>&1 | head -1                             # → SHA renvoyé (reflog OK)
```

Si l'un échoue, **STOP** + `notes/handoff-cascade-22-stop.md`.

---

## Garde-fous transverses

- **Pas de force-push sur main**. `--force-with-lease` uniquement sur les feature branches après rebase.
- **Pas de `gh pr merge --admin`** sauf CI rouge.
- **`sleep 60` obligatoire entre chaque `./deploy/vps/deploy.sh all`** pour éviter fail2ban.
- **Aucune migration Prisma** : tous les modèles requis sont déjà sur main (cascade #21).
- **Si CI rouge** sur une PR : STOP, capturer dans `notes/handoff-cascade-22-stop.md`. Ne pas forcer.
- **Si SSH `Connection refused`** : c'est probablement fail2ban — attendre 30-45 min avant de retenter, ne pas re-spammer.
- **Aucune modification de `main`** : il avance uniquement par les `gh pr merge --squash` officiels.

---

## Étapes

### Étape 1 — Pre-flight + sync remote

```
git checkout main
git fetch origin --prune
git status --short
git log --oneline origin/main | head -3
```

Confirmer : `origin/main = main = b7dfb40`. Si origin a avancé, **STOP** + signaler.

### Étape 2 — Rebase branche 1 + push + PR #27 (BUYER-DASHBOARD-1)

La branche `buyer-dashboard-1-quote-requests` partait de `4250db2` (avant cascade #21). On la rebase sur le nouveau main `b7dfb40`.

```
git checkout buyer-dashboard-1-quote-requests
git rebase main
```

Conflits attendus : **0** (LOT 1 mandat 20 = frontend pur sur `/buyer/*`, mandat 19 = backend notif). Si conflit inattendu sur `quote-requests.service.ts` ou autre fichier backend : résoudre en gardant la version main (LOT mandat 20 buyer ne touche PAS le backend).

Vérifier vert :
```
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -5
```

```
git push -u origin buyer-dashboard-1-quote-requests --force-with-lease

gh pr create \
  --title "feat(frontend): BUYER-DASHBOARD-1 — pages buyer /quote-requests (list + detail + thread + cancel)" \
  --body "$(cat <<'EOF'
## Résumé

Espace buyer minimal côté frontend pour le rôle `MARKETPLACE_BUYER` — consommation des endpoints RFQ déjà câblés.

### Périmètre
- Layout `/buyer/*` avec role guard `MARKETPLACE_BUYER`.
- Page `/buyer/quote-requests` : liste filtrable (status multi, seller search, période, pagination).
- Page `/buyer/quote-requests/[id]` : détail RFQ + thread messages chronologique + form envoi message + bouton "Annuler la demande" (DRAFT/QUALIFIED → CANCELLED).
- Notes internes (`isInternalNote=true`) masquées côté buyer.
- Helper API `apps/frontend/src/lib/quote-requests.ts` étendu (listMine, getById, listMessages, sendMessage, updateStatus).

### Tests
- 11 nouveaux specs vitest (4 list + 6 detail + 1 layout).

### Hors scope (BUYER-DASHBOARD-2)
- Espace orders, profile company, settings.
- Création RFQ depuis catalogue (existe déjà côté API, UI à venir).
EOF
)" \
  --base main \
  --head buyer-dashboard-1-quote-requests

gh pr checks --watch
```

Si CI rouge → STOP. Sinon :

### Étape 3 — Merge PR #27 + sync + deploy + sleep 60

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

### Étape 4 — Rebase branche 2a + push + PR #28 (MP-NOTIF-3 unsubscribe-page)

La branche `mp-notif-3-unsubscribe-page` partait de `9719fbe` (LOT 1 buyer-dashboard). On la rebase `--onto main` en lui retirant l'ancien parent maintenant intégré dans le squash de PR #27.

```
git checkout mp-notif-3-unsubscribe-page
git rebase --onto main 9719fbe mp-notif-3-unsubscribe-page
```

Conflits attendus : **0** (LOT 2a = page Next.js pure dans `apps/frontend/src/app/unsubscribe/`, indépendante du LOT 1 buyer).

```
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -5
git push -u origin mp-notif-3-unsubscribe-page --force-with-lease

gh pr create \
  --title "feat(frontend): MP-NOTIF-3 phase 2a — page conviviale /unsubscribe (UX HTML pretty)" \
  --body "$(cat <<'EOF'
## Résumé

Page Next.js publique `/unsubscribe?token=...` qui remplace le JSON brut du endpoint API par une UX conviviale.

### Périmètre
- `apps/frontend/src/app/unsubscribe/page.tsx` : server component, lit `searchParams.token`, appelle `GET /api/v1/notif-email/unsubscribe?token=...` côté serveur, affiche page de confirmation FR (titre, email, type, message rassurant) ou erreur (lien invalide/expiré).
- Style minimal, max-width 600px, palette IOX.

### Tests
- 5 specs vitest (sans token, token valide mock fetch, token invalide mock fetch 400, retry handling, accessibility basique).

### Hors scope (MP-NOTIF-3 phase 3+)
- Bouton "Désinscription totale (ALL)" depuis la page (resignature token côté client).
- Préférences granulaires par type d'event.
EOF
)" \
  --base main \
  --head mp-notif-3-unsubscribe-page

gh pr checks --watch
```

### Étape 5 — Merge PR #28 + sync + deploy + sleep 60

```
gh pr merge --squash --delete-branch
git checkout main
git pull --rebase origin main
git log --oneline -3 origin/main

./deploy/vps/deploy.sh all
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print('status:',d['data']['status'])"

# Smoke page unsubscribe (HTML pretty, pas JSON)
curl -sS -w "\nHTTP %{http_code}\n" "https://iox.mycloud.yt/unsubscribe?token=invalid" | head -c 600

echo "💤 sleep 60 (anti-fail2ban) ..."
sleep 60
```

Attendu : HTTP 200 + HTML contenant "Lien invalide" ou équivalent (pas du JSON brut).

### Étape 6 — Rebase branche 3 + push + PR #29 (MP-OFFER-EDIT-2)

```
git checkout mp-offer-edit-2-visibility-and-batches
git rebase --onto main 2c6e706 mp-offer-edit-2-visibility-and-batches
```

Conflits attendus : possibles sur `apps/frontend/src/app/(dashboard)/seller/marketplace-offers/[id]/page.tsx` si MP-OFFER-EDIT-1 ou MP-OFFER-DUPLICATE (mergés dans cascade #18) ont changé la structure. Résoudre en gardant les 2 features (édition visibilityScope + section batches) en plus du visible existant.

```
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -5
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -5

git push -u origin mp-offer-edit-2-visibility-and-batches --force-with-lease

gh pr create \
  --title "feat(marketplace): MP-OFFER-EDIT-2 — édition visibilityScope + UI rattachement batches" \
  --body "$(cat <<'EOF'
## Résumé

Édition de la `visibilityScope` (PRIVATE / BUYERS_ONLY / PUBLIC) et UI de gestion des `MarketplaceOfferBatch` côté seller.

### Périmètre
- Backend : DTO `UpdateMarketplaceOfferInput` étendu pour accepter `visibilityScope`, validation enum.
- Backend : transition `PUBLISHED → PRIVATE` rejetée en 422 (faux retrait du marché interdit).
- Frontend : section "Visibilité" sur la page seller offer detail (3 options FR via select).
- Frontend : section "Lots produits attachés" — list batches existants + bouton "Modifier" (édite quantityAvailable, quantityReserved, exportEligible, qualityStatus, traceabilityStatus) + bouton "Détacher".
- Helpers API `attachBatch`, `updateBatchLink`, `detachBatch` (endpoints backend déjà câblés).

### Tests
- 4 specs jest backend (transitions visibilityScope autorisées + rejetée 422).
- 6 specs vitest frontend (visibilité select submit OK, visibilité PUBLISHED→PRIVATE toast erreur, batches list, modifier, détacher).

### Hors scope (MP-OFFER-EDIT-3)
- UI de création de nouveau batch from scratch (sans ProductBatch existant).
- Endpoint REST de listing ProductBatch côté seller (fallback documenté dans handoff).
EOF
)" \
  --base main \
  --head mp-offer-edit-2-visibility-and-batches

gh pr checks --watch
```

### Étape 7 — Merge PR #29 + sync + deploy + sleep 60

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

### Étape 8 — Rebase branche 2b + push + PR #30 (MP-NOTIF-3 emaillog-admin)

⚠️ **Cas spécial** : cette branche partait de `9a12880` (mandat 19 LOT 1, supprimée en cascade #21). Le SHA `9a12880` reste accessible via reflog (30j par défaut), donc le rebase `--onto main 9a12880 ...` fonctionne. **Si `9a12880` inaccessible** : alternative en utilisant `b71258a` (squash de PR #24) :

```
git checkout mp-notif-3-emaillog-admin
git rebase --onto main 9a12880 mp-notif-3-emaillog-admin

# Si erreur "fatal: bad revision" :
# git rebase --onto main b71258a mp-notif-3-emaillog-admin
# (b71258a est le squash sur main qui contient ce que 9a12880 contenait)
```

Conflits attendus : possibles sur `notif-email.controller.ts`, `notif-email.service.ts`, `templates/footer.ts` si LOT 2 mandat 19 (déjà mergé en cascade #21) a déjà ajouté des routes ou des helpers. Résoudre en gardant l'intégration (l'admin EmailLog endpoint vient en PLUS de l'unsubscribe endpoint déjà mergé).

```
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -5
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -5
pnpm --filter @iox/backend test src/notif-email 2>&1 | tail -10

git push -u origin mp-notif-3-emaillog-admin --force-with-lease

gh pr create \
  --title "feat(notif): MP-NOTIF-3 phase 2b — endpoint admin GET /notif-email/logs + page admin EmailLog" \
  --body "$(cat <<'EOF'
## Résumé

Visualisation admin du registre `EmailLog` (audit trail des emails) — exposé via endpoint sécurisé + page admin.

### Périmètre
- Backend : `GET /api/v1/notif-email/logs?status=&templateId=&recipientEmail=&dateFrom=&dateTo=&page=&limit=` — réservé `ADMIN`, `COORDINATOR`. Pagination + filtres.
- Backend : `NotifEmailService.listLogs(filters)` avec pagination Prisma.
- Frontend : page `/admin/notif-email/logs` — tableau filtrable (status, templateId, recipientEmail, dateFrom/dateTo) + modal détails (errorCode/errorMessage/providerMessageId/metadataJson).
- Helper API `apps/frontend/src/lib/notif-email.ts` (nouveau) : `listLogs(token, params)`.

### Tests
- 5 specs jest backend (listLogs sans filtre, filtres combinés, pagination, permissions).
- 4 specs vitest frontend (rendu liste, filtre status, modal détails, empty state).

### Hors scope (phase 3+)
- Export CSV des logs.
- Statistiques agrégées (sent vs failed vs skipped par jour/template).
- Replay manuel d'un email échoué.
EOF
)" \
  --base main \
  --head mp-notif-3-emaillog-admin

gh pr checks --watch
```

### Étape 9 — Merge PR #30 + sync + deploy

```
gh pr merge --squash --delete-branch
git checkout main
git pull --rebase origin main
git log --oneline -6 origin/main

./deploy/vps/deploy.sh all
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print('status:',d['data']['status'])"
```

(Pas de `sleep 60` après le dernier deploy — c'est le dernier de la cascade.)

### Étape 10 — Smoke fonctionnels post-cascade

```
echo "=== 1. Login smoke-buyer ==="
BUYER_TOKEN=$(curl -sS -X POST https://iox.mycloud.yt/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"smoke-buyer@iox.mch","password":"IoxSmoke2026!"}' | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['accessToken'])")
echo "BUYER_TOKEN len=${#BUYER_TOKEN}"

echo "=== 2. List RFQ smoke-buyer (attendu 2) ==="
curl -sS "https://iox.mycloud.yt/api/v1/marketplace/quote-requests?limit=10" -H "Authorization: Bearer $BUYER_TOKEN" | python3 -c "import json,sys;d=json.load(sys.stdin);print('total:',d['data']['meta']['total'])"

echo "=== 3. Page /buyer/quote-requests render (HTTP 200 + HTML) ==="
curl -sS -o /tmp/_b -w "HTTP %{http_code}, content-type=%{content_type}\n" "https://iox.mycloud.yt/buyer/quote-requests" -H "Cookie: <session>"
# Note : la page est sous role guard, attendu 200 si session valide ou 302/redirect sinon. Tester avec session navigateur.

echo "=== 4. Page /unsubscribe?token=invalid (HTML pretty, pas JSON) ==="
curl -sS -w "\nHTTP %{http_code}\n" "https://iox.mycloud.yt/unsubscribe?token=invalid" | head -c 800

echo "=== 5. Endpoint admin EmailLog (attendu 401 sans auth) ==="
curl -sS -w "\nHTTP %{http_code}\n" "https://iox.mycloud.yt/api/v1/notif-email/logs?limit=5" | head -c 200

echo "=== 6. Login admin (si compte admin smoke disponible) ==="
# À adapter selon comptes admin disponibles. Sinon skip.

echo "=== 7. EmailLog count en DB (peut être >0 si transitions RFQ ont eu lieu) ==="
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T postgres psql -U iox -d iox_prod -c 'SELECT status, count(*) FROM email_logs GROUP BY status'"

echo "=== 8. Test transition RFQ → vérifier EmailLog créé ==="
SELLER_TOKEN=$(curl -sS -X POST https://iox.mycloud.yt/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"smoke-seller@iox.mch","password":"IoxSmoke2026!"}' | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['accessToken'])")

# Récupérer ID d'une RFQ NEW que smoke-seller peut traiter
RFQ_ID=$(curl -sS "https://iox.mycloud.yt/api/v1/marketplace/quote-requests?status=NEW&limit=1" -H "Authorization: Bearer $SELLER_TOKEN" | python3 -c "import json,sys;d=json.load(sys.stdin);data=d['data']['data'];print(data[0]['id'] if data else '')")
if [ -n "$RFQ_ID" ]; then
  echo "Transitionner RFQ $RFQ_ID NEW → QUALIFIED"
  curl -sS -X PATCH "https://iox.mycloud.yt/api/v1/marketplace/quote-requests/$RFQ_ID/status" -H "Content-Type: application/json" -H "Authorization: Bearer $SELLER_TOKEN" -d '{"status":"QUALIFIED","note":"smoke test cascade #22"}' | head -c 300

  sleep 2

  # Vérifier qu'un EmailLog a été créé pour rfq-qualified
  ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T postgres psql -U iox -d iox_prod -c \"SELECT template_id, status, recipient_email, created_at FROM email_logs WHERE template_id='rfq-qualified' ORDER BY created_at DESC LIMIT 3\""
else
  echo "(pas de RFQ status=NEW disponible — smoke transition skipped)"
fi
```

### Étape 11 — Validations finales

```
echo "=== git état final ==="
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git status --short
git log --oneline origin/main | head -7
git branch -a | grep -v origin/HEAD

echo "=== aucune branche mandat 20 résiduelle ==="
git branch | grep -E "buyer-dashboard-1|mp-notif-3-|mp-offer-edit-2-" || echo "OK aucune"

echo "=== bilan final ==="
echo "main = $(git rev-parse --short origin/main)"
echo "lots marketplace mergés cumulés = 30 (= 23 cascade #18 + 3 cascade #21 + 4 cascade #22)"
```

```
git branch -D buyer-dashboard-1-quote-requests mp-notif-3-unsubscribe-page mp-offer-edit-2-visibility-and-batches mp-notif-3-emaillog-admin
```

---

## Preuves anti-hallucination obligatoires (à recopier en fin de rapport)

```
# 1. Les 4 PR mergées (state + checks)
for n in 27 28 29 30; do
  echo "--- PR #$n ---"
  gh pr view $n --json state,mergedAt,statusCheckRollup -q '"state:" + .state + " mergedAt:" + .mergedAt, "checks:", (.statusCheckRollup[] | "  " + .name + " → " + (.conclusion // .status))'
done

# 2. main local + remote
git rev-parse main
git rev-parse origin/main
git log --oneline origin/main | head -7

# 3. Health VPS
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print(d)"

# 4. Page /unsubscribe?token=invalid retourne HTML pretty (pas JSON)
curl -sS "https://iox.mycloud.yt/unsubscribe?token=invalid" -w "\nHTTP %{http_code} content-type=%{content_type}\n" | head -c 300

# 5. Endpoint admin EmailLog protégé (401 sans token)
curl -sS -w "\nHTTP %{http_code}\n" "https://iox.mycloud.yt/api/v1/notif-email/logs?limit=5" | head -c 200

# 6. Branches mandat 20 supprimées
git branch | grep -E "buyer-dashboard-1|mp-notif-3-|mp-offer-edit-2-" || echo "OK aucune"

# 7. Stash list vide
git stash list

# 8. Working tree propre
git status --short

# 9. EmailLog count en DB après smoke transition
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T postgres psql -U iox -d iox_prod -c 'SELECT status, count(*) FROM email_logs GROUP BY status'"

# 10. Transition RFQ → EmailLog rfq-qualified créé
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T postgres psql -U iox -d iox_prod -c \"SELECT template_id, status, recipient_email FROM email_logs WHERE template_id='rfq-qualified' ORDER BY created_at DESC LIMIT 3\""
```

---

## TL;DR rapport attendu

```
Cascade #22 — livrée ✅
- 4 PR (#27 #28 #29 #30) mergées dans l'ordre. CI vert sur les 4.
- 4 deploys VPS OK + healthchecks 4/4 chacun. Pas de fail2ban (sleep 60 intercalé).
- Smoke transition RFQ NEW→QUALIFIED → EmailLog rfq-qualified status=SENT créé en DB.
- Page /unsubscribe?token=invalid retourne HTML pretty (HTTP 200, pas JSON).
- Endpoint admin EmailLog protégé (401 sans token).
- main = <SHA_FINAL> (était b7dfb40), 30 lots marketplace au total.
- 0 branche mandat 20 résiduelle, working tree propre.
```

---

## Notes de sortie

Une fois cascade #22 livrée et validée :

- **30 lots marketplace** sur main, marketplace IOX entièrement démontrable end-to-end (seller → produits → offres → catalog → buyer → RFQ → messages → transitions → emails audit).
- **Chantiers naturels suivants** :
  - Activation Resend en prod (compte + clé + DNS + bascule env var).
  - MP-NOTIF-RESEND-FROM-DOMAIN (vérification DKIM/SPF/DMARC).
  - PAY-1 phase 0 (cadrage juridique paiement en ligne).
  - I18N-1 (FR/EN).
  - CHORE-AUTH-SPECS-FIX-LOCAL (dette tech).
  - BUYER-DASHBOARD-2 (orders, profile company).
- À ce stade, l'archi backend est suffisamment couvrante pour penser sérieusement au paiement.
