# Cascade 3 PR — #54 AUTH-DOC + #55 I18N-5 + #56 RESEND-PROD-PREP

> Push + PR + merge + deploy de 3 branches feature chaînées (mandat 36). ~1h total.

## Branches à push

| PR | Branche | Parent | SHA |
|---|---|---|---|
| #54 | `chore-auth-specs-fix-local` | main `387c6c2` | `6259d0d` |
| #55 | `i18n-5-public-marketplace-en` | `chore-auth-specs-fix-local` | `353b9d7` |
| #56 | `resend-prod-prep-doc-script` | `i18n-5-public-marketplace-en` | `9841b8a` |

3 branches chaînées. Rebase `--onto main` après chaque merge (parent précédent disparaît au squash).

---

## Pré-requis (STOP si non remplis)

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git rev-parse main                                                 # → 387c6c2f88b7868d41d1e14430d90261463c3062
git rev-parse --short chore-auth-specs-fix-local                    # → 6259d0d
git rev-parse --short i18n-5-public-marketplace-en                  # → 353b9d7
git rev-parse --short resend-prod-prep-doc-script                   # → 9841b8a
git stash list                                                      # → vide
which gh && gh auth status                                          # → gh OK
ssh -o ConnectTimeout=5 rahiss-vps 'echo ok'                        # → ok (ControlMaster actif)
```

Si pas vert → STOP + `notes/handoff-cascade-37-stop.md`.

---

## Garde-fous

- ❌ Pas de force-push sur main.
- ❌ Pas de `gh pr merge --admin` sauf CI rouge.
- ✅ ControlMaster SSH actif → fail2ban couvert.
- ✅ Sleep 60s entre deploys.
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

Confirmer `origin/main = main = 387c6c2`. Si avancé → STOP + signaler.

### 2. Push #54 (AUTH-DOC)

```
git checkout chore-auth-specs-fix-local
git push -u origin chore-auth-specs-fix-local

gh pr create \
  --title "docs(auth): document que specs auth backend passent en local sans config" \
  --body "$(cat <<'EOF'
## Résumé

Mandat 36 LOT 1. Découverte : les 25 specs auth historiquement signalées en fail local **passent désormais en local sans config** (28/28 verts). Probable fix collateral d'un mandat antérieur.

### Périmètre
- Doc `docs/dev/AUTH_LOCAL_TESTS.md` (~30 lignes) : état actuel + comment lancer les specs en local + variables d'env requises (.env.test).
- Aucun changement code.
- Aucune migration Prisma.

### Validation
- `pnpm --filter @iox/backend test src/auth` → 28/28 verts.
- TypeScript strict ✅.
EOF
)" \
  --base main \
  --head chore-auth-specs-fix-local

gh pr checks --watch
```

Si CI rouge → STOP. Sinon :

### 3. Merge #54 + sync + deploy + sleep

```
gh pr merge --squash --delete-branch
git checkout main
git pull --rebase origin main
git log --oneline -3 origin/main

./deploy/vps/deploy.sh all
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print('status:',d['data']['status'])"

echo "💤 sleep 60 ..."
sleep 60
```

Capturer SHA squash.

### 4. Rebase #55 + push + PR (I18N-5)

```
git checkout i18n-5-public-marketplace-en
git rebase --onto main chore-auth-specs-fix-local i18n-5-public-marketplace-en
```

Conflits attendus : 0 (LOT 1 = doc-only, LOT 2 = i18n frontend disjoint).

```
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
git push -u origin i18n-5-public-marketplace-en --force-with-lease

gh pr create \
  --title "feat(i18n): I18N-5 phase 1 — frontend public marketplace EN (fiche produit + namespaces seller + parity helper)" \
  --body "$(cat <<'EOF'
## Résumé

Mandat 36 LOT 2. Étend la couverture i18n EN au frontend public marketplace.

### Périmètre
- **+52 nouvelles clés EN** (cumul 70 → 122, fr.json + en.json à 170 lignes chacun).
- Fiche produit publique `/marketplace/products/[slug]` convertie à `getTranslations`.
- Namespaces : `marketplace.catalog.*`, `marketplace.product.*`, `marketplace.seller.*`, `common.*`.
- Helper `apps/frontend/src/lib/i18n-parity.test.ts` : valide parité FR↔EN (recursive walk JSON).
- Doc `docs/marketplace/I18N_5_PUBLIC_MARKETPLACE_EN.md` (3231 bytes).

### Tests
- i18n parity : 6/6 verts.
- TypeScript strict ✅ frontend.

### Hors scope (V2)
- Auth pages `/login` `/signup`.
- Buyer dashboard.
- Admin dashboard (FR pro).
- Multi-currency.
- RTL (arabe).

### Migration Prisma
Aucune.
EOF
)" \
  --base main \
  --head i18n-5-public-marketplace-en

gh pr checks --watch
```

### 5. Merge #55 + sync + deploy + sleep

```
gh pr merge --squash --delete-branch
git checkout main
git pull --rebase origin main
git log --oneline -3 origin/main

./deploy/vps/deploy.sh all
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print('status:',d['data']['status'])"

echo "💤 sleep 60 ..."
sleep 60
```

### 6. Rebase #56 + push + PR (RESEND-PROD-PREP)

```
git checkout resend-prod-prep-doc-script
git rebase --onto main i18n-5-public-marketplace-en resend-prod-prep-doc-script
```

Conflits attendus : 0 (LOT 3 = doc + scripts shell, disjoint i18n).

```
git push -u origin resend-prod-prep-doc-script --force-with-lease

gh pr create \
  --title "chore(ops): RESEND-PROD-PREP — doc activation prod + scripts shell bascule" \
  --body "$(cat <<'EOF'
## Résumé

Mandat 36 LOT 3. Préparation bascule Resend en prod. **Aucun touchage VPS dans cette PR** — user exécutera scripts manuellement quand compte Resend créé + DNS propagés.

### Périmètre
- **Doc `docs/ops/RESEND_PROD_ACTIVATION.md`** (179 lignes / 5067 bytes) : 7 sections (pré-requis compte Resend, DKIM/SPF/DMARC records exacts, test envoi initial, bascule env VPS, smoke post-bascule, rollback, coût).
- **Script `deploy/scripts/activate-resend.sh`** (exec, bash syntax OK) : bascule SSH ControlMaster, backup .env, update NOTIF_EMAIL_TRANSPORT=resend + RESEND_API_KEY, restart backend, healthcheck.
- **Script `deploy/scripts/smoke-resend.sh`** (exec, bash syntax OK) : login smoke-buyer, créa RFQ test, vérifie EmailLog SENT + provider_message_id non null.

### Tests
- `bash -n` syntax check OK sur les 2 scripts.
- Aucun test jest/vitest (code shell ops).

### Migration Prisma
Aucune.

### Activation effective
Reste à user :
1. Créer compte Resend.
2. Ajouter domaine `iox.mch` côté Resend.
3. Configurer DNS DKIM + SPF + DMARC.
4. Récupérer `RESEND_API_KEY`.
5. `export RESEND_API_KEY=re_xxx && ./deploy/scripts/activate-resend.sh`.
6. `./deploy/scripts/smoke-resend.sh`.
EOF
)" \
  --base main \
  --head resend-prod-prep-doc-script

gh pr checks --watch
```

### 7. Merge #56 + sync + deploy

```
gh pr merge --squash --delete-branch
git checkout main
git pull --rebase origin main
git log --oneline -5 origin/main

./deploy/vps/deploy.sh all
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print('status:',d['data']['status'])"
```

Capturer SHA final.

### 8. Smoke fonctionnels combinés

```
echo "=== 1. Page publique fiche produit (smoke #55 i18n) ==="
curl -sS -o /tmp/_p -w "HTTP %{http_code}\n" "https://iox.mycloud.yt/marketplace/products/demo-vanille-poudre"

echo "=== 2. Doc auth présente dans dist ==="
ssh rahiss-vps "cd /opt/apps/iox && ls -la docs/dev/AUTH_LOCAL_TESTS.md 2>/dev/null"

echo "=== 3. Scripts Resend présents (smoke #56) ==="
ssh rahiss-vps "cd /opt/apps/iox && ls -la deploy/scripts/activate-resend.sh deploy/scripts/smoke-resend.sh 2>/dev/null"

echo "=== 4. NOTIF_EMAIL_TRANSPORT toujours mock (Resend pas encore activé) ==="
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T backend printenv NOTIF_EMAIL_TRANSPORT || echo unset/default"

echo "=== 5. Locale switching public (test EN) ==="
curl -sS -o /tmp/_pen -w "HTTP %{http_code}\n" "https://iox.mycloud.yt/marketplace/products/demo-vanille-poudre" -H "Cookie: NEXT_LOCALE=en"
grep -ic "english\|en-" /tmp/_pen 2>&1 || echo "(grep 0 — markup peut être minifié)"
```

Attendus :
- Page publique HTTP 200.
- Doc auth présente dans repo VPS.
- 2 scripts Resend présents et exec dans repo VPS.
- `NOTIF_EMAIL_TRANSPORT` reste mock (pas encore activé).
- Page EN renvoie HTTP 200 (locale switch fonctionne).

### 9. Validations finales

```
echo "=== git état final ==="
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git status --short
git log --oneline origin/main | head -7

echo "=== aucune branche mandat 36 résiduelle ==="
git branch | grep -E "chore-auth-specs|i18n-5-public|resend-prod-prep" || echo "OK aucune"

echo "=== bilan ==="
echo "main = $(git rev-parse --short origin/main)"
echo "Total squash PR cumulés:"
git log --oneline main --grep="(#" | wc -l
```

```
git branch -D chore-auth-specs-fix-local i18n-5-public-marketplace-en resend-prod-prep-doc-script 2>/dev/null || echo "(déjà nettoyées par gh pr merge --delete-branch)"
```

---

## Preuves anti-hallucination obligatoires

```
# 1. Les 3 PR mergées
for n in 54 55 56; do
  echo "--- PR #$n ---"
  gh pr view $n --json state,mergedAt,statusCheckRollup -q '"state:" + .state + " mergedAt:" + .mergedAt, "checks:", (.statusCheckRollup[] | "  " + .name + " → " + (.conclusion // .status))'
done

# 2. main local + remote
git rev-parse main
git rev-parse origin/main
git log --oneline origin/main | head -5

# 3. Health VPS
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print(d)"

# 4. Page publique HTTP 200
curl -sS -o /dev/null -w "HTTP %{http_code}\n" "https://iox.mycloud.yt/marketplace/products/demo-vanille-poudre"

# 5. Page EN HTTP 200
curl -sS -o /dev/null -w "HTTP %{http_code}\n" "https://iox.mycloud.yt/marketplace/products/demo-vanille-poudre" -H "Cookie: NEXT_LOCALE=en"

# 6. NOTIF_EMAIL_TRANSPORT mock (Resend pas activé)
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T backend printenv NOTIF_EMAIL_TRANSPORT || echo unset"

# 7. Scripts Resend présents et exec VPS
ssh rahiss-vps "cd /opt/apps/iox && ls -la deploy/scripts/activate-resend.sh deploy/scripts/smoke-resend.sh"

# 8. Branches mandat 36 supprimées
git branch | grep -E "chore-auth-specs|i18n-5-public|resend-prod-prep" || echo "OK aucune"

# 9. Stash list vide
git stash list

# 10. Working tree propre
git status --short
```

---

## TL;DR rapport attendu

```
Cascade 3 PR — livrée ✅
- PR #54 + #55 + #56 mergées dans l'ordre. CI vert sur les 3.
- 3 deploys VPS OK + healthchecks 3/3.
- Smoke : page publique HTTP 200 (FR + EN), scripts Resend présents VPS, transport reste mock.
- main = <SHA_FINAL> (était 387c6c2), 54 lots cumulés (51 + 3).
- 0 branche mandat 36 résiduelle, working tree propre.
- 0 migration Prisma appliquée.
- Resend reste désactivé (mock par défaut). User exécutera activate-resend.sh quand prêt.
```

Caveman resume off pour ce livrable car prompt opérationnel.
