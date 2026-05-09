# Prompt 21 — Push-cascade 3 branches du méga-mandat 19 (MP-NOTIF-2 phase 2)

## Contexte

Le méga-mandat 19 a livré 3 branches chaînées localement (par-dessus `main = 4250db2`). On les pousse dans l'ordre, on les merge, on déploie après chaque merge. **Cette cascade est partielle** : les 4 branches mandat 20 (BUYER-DASHBOARD + MP-NOTIF-3 + MP-OFFER-EDIT-2) seront poussées dans une cascade séparée (#22) après validation en prod de mandat 19.

```
main (4250db2)
   │
   ▼
mp-notif-2-emaillog-and-resend-flag (9a12880) ─→ PR #24
   │
   ▼
mp-notif-2-unsubscribe              (2aa40d7) ─→ PR #25 (rebase --onto main)
   │
   ▼
mp-notif-2-rfq-status-transitions   (1b8533b) ─→ PR #26 (rebase --onto main)
```

**État vérifié avant ce prompt** :
- `main = 4250db27c1e71797272a55e2a831ffed7d4ec74c`
- 3 branches mandat 19 + 4 branches mandat 20 en attente, working tree propre côté code.
- CI : option α confirmée (Backend SUCCESS sur PR récentes — pas d'override admin attendu).
- Resend : la cascade laisse `NOTIF_EMAIL_TRANSPORT=mock` par défaut côté VPS. **Pas d'activation Resend dans cette cascade** — chantier ops séparé.

## Pré-requis (à vérifier en premier — STOP si non remplis)

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git rev-parse main                                              # → 4250db27c1e71797272a55e2a831ffed7d4ec74c
git rev-parse --short mp-notif-2-emaillog-and-resend-flag        # → 9a12880
git rev-parse --short mp-notif-2-unsubscribe                     # → 2aa40d7
git rev-parse --short mp-notif-2-rfq-status-transitions          # → 1b8533b
git stash list                                                   # → vide
which gh && gh auth status                                       # → gh OK
ssh -o ConnectTimeout=5 rahiss-vps 'echo ok'                     # → ok

# Vérif que les 4 branches mandat 20 existent (on n'y touche pas)
for b in buyer-dashboard-1-quote-requests mp-notif-3-unsubscribe-page mp-offer-edit-2-visibility-and-batches mp-notif-3-emaillog-admin; do
  git rev-parse --short "$b" 2>&1 | head -1
done
```

Si l'un échoue, **STOP** + `notes/handoff-cascade-21-stop.md`.

---

## Garde-fous transverses

- **Pas de force-push sur main**. `--force-with-lease` uniquement sur les feature branches après rebase --onto.
- **Pas de `gh pr merge --admin`** sauf CI rouge (rare au vu de l'historique).
- **Pas de modification des branches mandat 20** : elles doivent rester intactes (SHAs préservés).
- **Pas d'activation Resend** : laisser `NOTIF_EMAIL_TRANSPORT=mock` côté VPS — pas de `RESEND_API_KEY` ajouté à cette étape.
- **Migrations Prisma** : 2 migrations additives seront appliquées en prod par la pipeline CI/CD côté VPS au moment du deploy. Vérifier qu'elles passent (`docker compose logs backend | grep migrate`).
- **Si CI rouge** sur une PR : STOP, capture `gh pr checks` + `gh pr view --json` dans `notes/handoff-cascade-21-stop.md`. Ne pas forcer le merge.
- **Si un deploy plante** : ne pas continuer la cascade. Diagnostiquer via logs.

---

## Étapes

### Étape 1 — Pré-flight + sync remote

```
git checkout main
git fetch origin --prune
git status --short
git log --oneline origin/main | head -3
```

Confirmer : `origin/main = main = 4250db2`. Si origin a avancé, **STOP** + signaler.

### Étape 2 — Push branche 1 + PR #24 (MP-NOTIF-2 LOT 1)

```
git checkout mp-notif-2-emaillog-and-resend-flag
git push -u origin mp-notif-2-emaillog-and-resend-flag

gh pr create \
  --title "feat(notif): MP-NOTIF-2 phase 2 LOT 1 — EmailLog persistence + Resend transport (feature flag)" \
  --body "$(cat <<'EOF'
## Résumé

LOT 1 du mandat 19 — pose l'audit trail des emails (table `email_logs`) et ajoute un transport Resend derrière feature flag, sans rien envoyer en LOCAL ni en VPS.

### Périmètre
- **Migration Prisma additive** : table `email_logs` + enum `EmailLogStatus` (SENT/FAILED/SKIPPED) + 3 indexes.
- `NotifEmailService.send` persiste après chaque tentative (success / échec / skipped). Persistance non-bloquante : si la DB est down, log warn + return.
- Transport `resend.transport.ts` derrière flag `NOTIF_EMAIL_TRANSPORT=resend` + env `RESEND_API_KEY` requis si activé. **Reste sur `mock` par défaut.**
- Pattern DI : `RESEND_CLIENT_FACTORY` token injecté → mocking propre en tests sans `jest.mock`.
- Tests : 13 nouveaux specs (EmailLog persistence, ResendTransport, factory).

### Hors scope (LOTs suivants)
- Désinscription : LOT 2 (PR #25)
- Transitions RFQ : LOT 3 (PR #26)
- Page admin EmailLog : mandat 20 LOT 2b (cascade #22)

### Décisions notables
- Aucun envoi réseau réel : SDK Resend mocké en tests.
- EmailLog échoue silencieusement (warn log) pour ne pas casser le flow métier.

### Migration appliquée à la prod
- `prisma/migrations/20260427170417_mp_notif_2_email_logs/migration.sql` — strict additif, CREATE TABLE + INDEX uniquement.
EOF
)" \
  --base main \
  --head mp-notif-2-emaillog-and-resend-flag

gh pr checks --watch
```

Si CI rouge → STOP. Sinon :

### Étape 3 — Merge PR #24 + sync + redeploy

```
gh pr merge --squash --delete-branch
git checkout main
git pull --rebase origin main
git log --oneline -3 origin/main      # nouveau squash visible
```

Capturer le SHA squash (utile pour rebase --onto suivant).

Deploy VPS :
```
./deploy/vps/deploy.sh all
```

Attendre fin du deploy. Vérifier que la migration `email_logs` est bien appliquée :
```
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml logs backend --tail=100 | grep -E 'migrate|email_log'"
```

Smoke health :
```
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print('status:',d['data']['status'])"
```

Vérifier l'existence de la table `email_logs` côté DB :
```
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T postgres psql -U iox -d iox_prod -c '\dt email_logs'"
```

Attendu : la table existe.

### Étape 4 — Rebase branche 2 sur main + push + PR #25 (MP-NOTIF-2 LOT 2)

```
git checkout mp-notif-2-unsubscribe
git rebase --onto main mp-notif-2-emaillog-and-resend-flag mp-notif-2-unsubscribe
```

Si conflit (attendu sur `notif-email.service.ts` ou `env.validation.ts`) : résoudre en gardant la version intégrée (les 2 LOTs additionnent leur diff). Lancer `pnpm --filter @iox/backend exec tsc --noEmit` pour vérifier.

```
git push -u origin mp-notif-2-unsubscribe --force-with-lease

gh pr create \
  --title "feat(notif): MP-NOTIF-2 phase 2 LOT 2 — désinscription (table + JWT signé + endpoint public + footer)" \
  --body "$(cat <<'EOF'
## Résumé

LOT 2 du mandat 19 — système de désinscription email opérationnel côté backend.

### Périmètre
- **Migration Prisma additive** : table `email_unsubscribes` + enum `EmailUnsubscribeType` (ALL / RFQ_NOTIFICATIONS / TRANSACTIONAL) + unique constraint `(email, unsubscribe_type)` + index.
- Service `UnsubscribeService` : `generateToken(email, type, '90d')` + `validateToken(token)` + `register(email, type, userId?)` + `isUnsubscribed(email, type)`.
- Endpoint public `GET /api/v1/notif-email/unsubscribe?token=<jwt>` :
  - Token invalide/expiré → 400.
  - Token valide → upsert + 200 JSON `{success:true, data:{email, type, unsubscribedAt}}`.
- `NotifEmailService.send` vérifie `isUnsubscribed` avant transport.send → si désinscrit : skip + EmailLog `status=SKIPPED, errorCode=UNSUBSCRIBED`.
- Templates `rfq-created-to-seller` et `rfq-message-created` étendus avec footer `unsubscribeUrl` (généré dynamiquement par le service).
- Email normalisé (lowercase + trim) au sign + check.

### Env vars
- `UNSUBSCRIBE_JWT_SECRET` (optionnel, fallback `${JWT_SECRET}-unsub`).

### Hors scope
- Page Next.js conviviale `/unsubscribe?token=...` : mandat 20 LOT 2a (cascade #22).

### Tests
- `unsubscribe.service.spec.ts` : 7 specs (roundtrip JWT, expired, invalid signature, register, isUnsubscribed, type=ALL).
- `unsubscribe.controller.spec.ts` : 3 specs (400 sans token, 400 invalide, 200 valide).
- `notif-email.service.spec.ts` étendu : send vers email désinscrit → transport NOT called.
- Templates spec étendus : `unsubscribeUrl` présent dans HTML + texte.
EOF
)" \
  --base main \
  --head mp-notif-2-unsubscribe

gh pr checks --watch
```

Si CI rouge → STOP. Sinon :

### Étape 5 — Merge PR #25 + sync + redeploy

```
gh pr merge --squash --delete-branch
git checkout main
git pull --rebase origin main
git log --oneline -3 origin/main

./deploy/vps/deploy.sh all

# Vérifier la migration email_unsubscribes
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T postgres psql -U iox -d iox_prod -c '\dt email_unsubscribes'"

curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print('status:',d['data']['status'])"
```

Smoke endpoint unsubscribe (token invalide → 400) :
```
curl -sS -w "\nHTTP %{http_code}\n" "https://iox.mycloud.yt/api/v1/notif-email/unsubscribe?token=invalid"
```

Attendu : `HTTP 400` + JSON `{success:false, error:{code:'INVALID_TOKEN'}}`.

### Étape 6 — Rebase branche 3 sur main + push + PR #26 (MP-NOTIF-2 LOT 3)

```
git checkout mp-notif-2-rfq-status-transitions
git rebase --onto main mp-notif-2-unsubscribe mp-notif-2-rfq-status-transitions
```

Conflits attendus sur `quote-requests.service.ts` (extension `updateStatus`) et `templates/index.ts` (ajout 4 templates) — résoudre en gardant l'intégration (LOTs additifs).

```
git push -u origin mp-notif-2-rfq-status-transitions --force-with-lease

gh pr create \
  --title "feat(notif): MP-NOTIF-2 phase 2 LOT 3 — notifications transitions RFQ status (QUALIFIED/QUOTED/WON/LOST)" \
  --body "$(cat <<'EOF'
## Résumé

LOT 3 du mandat 19 — 4 emails transactionnels sur les transitions de status RFQ critiques.

### Périmètre
- 4 nouveaux templates : `rfq-qualified`, `rfq-quoted`, `rfq-won`, `rfq-lost` (FR, HTML inline + texte brut, footer commun extrait dans `templates/footer.ts` + helper `rfq-transition.helper.ts` pour factorisation).
- Branchement `safeNotify` dans `QuoteRequestsService.updateStatus` :
  - `QUALIFIED` → buyer reçoit `rfq-qualified`.
  - `QUOTED` → buyer reçoit `rfq-quoted`.
  - `WON` → buyer reçoit `rfq-won`.
  - `LOST` → buyer reçoit `rfq-lost` (ton neutre pour préserver la relation).
  - `NEGOTIATING` / `CANCELLED` → pas de notif (phase 3+ si besoin).
- Skip silencieux si `marketplaceOffer.title` ou `buyerUser.email` manquent (compat tests legacy).
- Tous les emails portent le footer dynamique avec lien unsubscribe signé JWT 90j.

### 6 events couverts au total (récap)
| Event | Template | Destinataire |
|---|---|---|
| RFQ créée | rfq-created-to-seller | seller |
| Message public | rfq-message-created | autre partie |
| Status → QUALIFIED | rfq-qualified | buyer |
| Status → QUOTED | rfq-quoted | buyer |
| Status → WON | rfq-won | buyer |
| Status → LOST | rfq-lost | buyer |

### Tests
- 27 nouveaux specs (4 templates + branchement updateStatus + skip cases).
- Aucune régression : `quote-requests.service.spec.ts` 39 → 46 specs.
EOF
)" \
  --base main \
  --head mp-notif-2-rfq-status-transitions

gh pr checks --watch
```

Si CI rouge → STOP. Sinon :

### Étape 7 — Merge PR #26 + sync + redeploy

```
gh pr merge --squash --delete-branch
git checkout main
git pull --rebase origin main
git log --oneline -5 origin/main

./deploy/vps/deploy.sh all
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print('status:',d['data']['status'])"
```

### Étape 8 — Smoke tests fonctionnels post-cascade

```
echo "=== 1. Tables Prisma applied ==="
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T postgres psql -U iox -d iox_prod -c \"\\dt email_logs email_unsubscribes\""

echo "=== 2. NOTIF_EMAIL_TRANSPORT en prod (doit être mock par défaut) ==="
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T backend printenv NOTIF_EMAIL_TRANSPORT || echo 'unset (default mock)'"

echo "=== 3. Login smoke-buyer (créé en cascade #18) ==="
BUYER_TOKEN=$(curl -sS -X POST https://iox.mycloud.yt/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"smoke-buyer@iox.mch","password":"IoxSmoke2026!"}' | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['accessToken'])")
echo "Token len: ${#BUYER_TOKEN}"

echo "=== 4. List RFQ existants smoke-buyer ==="
curl -sS "https://iox.mycloud.yt/api/v1/marketplace/quote-requests?limit=5" -H "Authorization: Bearer $BUYER_TOKEN" | python3 -c "import json,sys;d=json.load(sys.stdin);print('total:',d['data']['meta']['total'])"

echo "=== 5. Endpoint unsubscribe — test token invalide (attendu HTTP 400) ==="
curl -sS -w "\nHTTP %{http_code}\n" "https://iox.mycloud.yt/api/v1/notif-email/unsubscribe?token=invalid" | head -c 300

echo "=== 6. Logs backend récents — chercher trace notif-email ==="
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml logs backend --tail=200 | grep -i 'notif-email\|email_log\|email_unsubscribe' | tail -10"

echo "=== 7. Count EmailLog en DB (peut être 0 si aucun event déclenché depuis deploy) ==="
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T postgres psql -U iox -d iox_prod -c 'SELECT count(*) FROM email_logs'"
```

Attendus :
- Tables `email_logs` + `email_unsubscribes` présentes.
- `NOTIF_EMAIL_TRANSPORT` unset ou `mock`.
- smoke-buyer login OK.
- List RFQ smoke-buyer = 1 (la RFQ #1 vanille créée en cascade #18).
- Endpoint unsubscribe retourne 400 sur token invalide.
- Pas d'erreur notif-email dans les logs.
- count email_logs = 0 ou plus (selon activité).

### Étape 9 — Validations finales

```
echo "=== git état final ==="
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git status --short
git log --oneline origin/main | head -5
git branch -a | grep -v origin/HEAD

echo "=== aucune branche mandat 19 résiduelle ==="
git branch | grep -E "mp-notif-2-" || echo "OK aucune"

echo "=== branches mandat 20 intactes ==="
for b in buyer-dashboard-1-quote-requests mp-notif-3-unsubscribe-page mp-offer-edit-2-visibility-and-batches mp-notif-3-emaillog-admin; do
  printf "%-50s : %s\n" "$b" "$(git rev-parse --short "$b" 2>&1)"
done
```

Attendus :
- Working tree propre côté trackés.
- 3 nouveaux squash sur main : `b03fcc8` (#21 NOTIF-1, déjà présent), nouveaux squash #24/#25/#26 ajoutés.
- 0 branche mandat 19 résiduelle.
- 4 branches mandat 20 SHAs identiques au pré-flight (9719fbe, 2c6e706, 5a92da7, 71ae8be).

```
git branch -D mp-notif-2-emaillog-and-resend-flag mp-notif-2-unsubscribe mp-notif-2-rfq-status-transitions
```

⚠️ **Important** : avant de supprimer ces branches localement, vérifier que `mp-notif-3-emaillog-admin` (mandat 20 LOT 2b, branche enfant) reste opérationnelle. Le commit `71ae8be` a `9a12880` (mandat 19 LOT 1) comme parent — cette ref reste vivante via le commit cible, donc safe.

Vérifier :
```
git log --oneline mp-notif-3-emaillog-admin | head -5
```

Attendu : voir les commits mandat 19 LOT 1 + le commit `71ae8be` du LOT 2b.

---

## Preuves anti-hallucination obligatoires (à recopier en fin de rapport)

```
# 1. Les 3 PR mergées (state + checks)
for n in 24 25 26; do
  echo "--- PR #$n ---"
  gh pr view $n --json state,mergedAt,statusCheckRollup -q '"state:" + .state + " mergedAt:" + .mergedAt, "checks:", (.statusCheckRollup[] | "  " + .name + " → " + (.conclusion // .status))'
done

# 2. main local + remote
git rev-parse main
git rev-parse origin/main
git log --oneline origin/main | head -5

# 3. Health VPS
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print(d)"

# 4. Tables Prisma appliquées
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T postgres psql -U iox -d iox_prod -c '\\dt email_logs email_unsubscribes'"

# 5. Endpoint unsubscribe répond 400 sur token invalide
curl -sS -w "\nHTTP %{http_code}\n" "https://iox.mycloud.yt/api/v1/notif-email/unsubscribe?token=invalid" | head -c 200

# 6. Branches mandat 19 supprimées localement
git branch | grep -E "mp-notif-2-" || echo "OK aucune"

# 7. Branches mandat 20 intactes (SHAs)
for b in buyer-dashboard-1-quote-requests mp-notif-3-unsubscribe-page mp-offer-edit-2-visibility-and-batches mp-notif-3-emaillog-admin; do
  printf "%-50s : %s\n" "$b" "$(git rev-parse --short "$b")"
done

# 8. Stash list vide
git stash list

# 9. Working tree propre
git status --short

# 10. NOTIF_EMAIL_TRANSPORT en prod (doit être unset / mock)
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T backend printenv NOTIF_EMAIL_TRANSPORT || echo unset"
```

---

## TL;DR rapport attendu

```
Cascade #21 — livrée ✅
- 3 PR (#24 #25 #26) mergées dans l'ordre. CI vert sur les 3.
- 3 deploys VPS OK + 2 migrations Prisma additives appliquées (email_logs, email_unsubscribes).
- Smoke endpoint unsubscribe retourne 400 sur token invalide.
- NOTIF_EMAIL_TRANSPORT reste à mock par défaut (Resend non activé).
- main = <SHA_FINAL> (était 4250db2), 26 lots marketplace au total (23 + 3 mandat 19).
- 0 branche mandat 19 résiduelle, 4 branches mandat 20 intactes (SHAs préservés), working tree propre.
```

---

## Notes pour la cascade #22 (mandat 20)

Une fois cette cascade #21 validée en prod, on lance cascade #22 = push-cascade des 4 branches mandat 20 :
1. PR #27 buyer-dashboard-1-quote-requests
2. PR #28 mp-notif-3-unsubscribe-page (rebase --onto main)
3. PR #29 mp-notif-3-emaillog-admin (rebase --onto main — sa base actuelle `9a12880` aura été remplacée par le squash #24)
4. PR #30 mp-offer-edit-2-visibility-and-batches (rebase --onto main)

Le rebase `--onto main` de #29 est le plus délicat car cette branche partait de `mp-notif-2-emaillog-and-resend-flag` (`9a12880`) — ce SHA disparaît au merge squash, donc rebase sur le squash `<SHA_FINAL_PR_24>` directement.

Pas de migration Prisma supplémentaire à prévoir en cascade #22 (les modèles requis sont dans cette cascade #21).
