# Prompt 18 — Push-cascade 3 branches du méga-mandat 17 + activation seed VPS

## Contexte

Le méga-mandat 17 a livré 3 branches chaînées localement (par-dessus `main = db36db7`). On les pousse dans l'ordre, on les merge, on déploie après chaque merge, et on active le seed actualisé sur le VPS pour faire apparaître les 4 documents PUBLIC, les 2 RFQ démo et le compte smoke-buyer.

```
main (db36db7)
   │
   ▼
mp-notif-1-transactional-emails-phase1 (8f94458) ─→ PR #21
   │
   ▼
mp-offer-duplicate-1-seller-clone      (27a55ce) ─→ PR #22 (rebase --onto main)
   │
   ▼
seed-demo-fix-3-public-docs-and-rfq    (0d47467) ─→ PR #23 (rebase --onto main)
                                                    + activation seed VPS
```

**État vérifié avant ce prompt** :
- `main = db36db70197e701ee9d2947d7694bd34f0e91821`
- 3 branches en attente, working tree propre côté code (untracked = `docs-projet/`, `notes/`, `notes/archive/`).
- CI sur PR récentes (#19, #20) : tous les checks `SUCCESS` (Install + Prisma drift + Backend + Frontend + E2E + Summary). **Pas d'override admin attendu**.
- Note dette technique : ~25 fails locaux dans `auth.service.spec.ts` + `auth.controller.spec.ts` depuis `39bfbd0` qui PASSENT en CI (env-dépendants). Hors scope de cette cascade.

## Pré-requis (à vérifier en premier — STOP si non remplis)

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git rev-parse main                                    # → db36db70197e701ee9d2947d7694bd34f0e91821
git rev-parse --short mp-notif-1-transactional-emails-phase1   # → 8f94458
git rev-parse --short mp-offer-duplicate-1-seller-clone        # → 27a55ce
git rev-parse --short seed-demo-fix-3-public-docs-and-rfq      # → 0d47467
git stash list                                        # → vide
which gh && gh auth status                            # → gh OK, logged in
ssh -o ConnectTimeout=5 rahiss-vps 'echo ok'          # → ok
```

Si l'un échoue, **STOP** et écris dans `notes/handoff-cascade-18-stop.md`.

---

## Étapes

### Étape 1 — Pré-flight + sync remote

```
git checkout main
git fetch origin --prune
git status --short
git log --oneline origin/main | head -3
```

Confirmer : `origin/main = main = db36db7`. Si origin a avancé entre-temps, **STOP** et signaler.

### Étape 2 — Push branche 1 + PR #21 (MP-NOTIF-1 phase 1)

```
git checkout mp-notif-1-transactional-emails-phase1
git push -u origin mp-notif-1-transactional-emails-phase1

gh pr create \
  --title "feat(notif): MP-NOTIF-1 phase 1 — emails transactionnels (infra + 2 templates RFQ)" \
  --body "$(cat <<'EOF'
## Résumé

MP-NOTIF-1 phase 1 — pose l'infra emails transactionnels côté backend + 2 templates RFQ critiques.

### Périmètre
- Module `notif-email` : service + types + factory + 2 transports (`mock` par défaut, `smtp-stream` sans socket).
- 2 templates : `rfq-created-to-seller` et `rfq-message-created` (FR, HTML inline-styles + version texte brut).
- Branchements `safeNotify` non-bloquants dans `QuoteRequestsService.create` et `addMessage`.
- Config env : `NOTIF_EMAIL_TRANSPORT` (default `mock`), `NOTIF_EMAIL_FROM`, `NOTIF_EMAIL_REPLY_TO`.
- Documentation : `docs/marketplace/MP_NOTIF_1_PHASE_1.md`.

### Tests
- Backend : 17 specs notif (templates + service) + 39 specs quote-requests (incl. assertions notif).
- TypeScript strict (cast ciblé `as unknown as Parameters<typeof createTransport>[0]` pour `streamTransport` documenté).

### Hors scope (phase 2 = MP-NOTIF-2)
- EmailLog persisté en DB
- Provider réel (Resend / SES / Mailgun)
- Désinscription
- Notifications sur transitions status RFQ (qualified/quoted/won/lost)

### Décisions notables
- Aucun envoi réseau en LOCAL ni en VPS (transport `mock` par défaut).
- `safeNotify` try/catch silencieux + log warn : un email en échec ne casse pas la création RFQ.
EOF
)" \
  --base main \
  --head mp-notif-1-transactional-emails-phase1
```

Récupérer le numéro de PR retourné (probablement #21). Attendre les checks CI :

```
gh pr checks --watch
```

Si CI rouge → STOP + diagnostic dans `notes/handoff-cascade-18-stop.md` avec sortie `gh pr checks` complète. Ne pas merger.

### Étape 3 — Merge PR #21 + sync main local + redeploy VPS

```
gh pr merge --squash --delete-branch
git checkout main
git pull --rebase origin main
git log --oneline -3 origin/main         # nouveau commit squash visible
```

Capturer le SHA squash sur main (sera référencé pour rebase --onto suivant).

Deploy VPS :

```
./deploy/vps/deploy.sh all
```

Attendre fin du deploy. Smoke health :

```
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print('status:',d['data']['status'])"
```

Attendu : `status: ok`.

### Étape 4 — Rebase branche 2 sur main + push + PR #22 (MP-OFFER-DUPLICATE)

```
git checkout mp-offer-duplicate-1-seller-clone
git rebase --onto main mp-notif-1-transactional-emails-phase1 mp-offer-duplicate-1-seller-clone
```

(Rebase l'arrière-plan de la branche pour qu'elle parte de main au lieu de l'ancienne mp-notif-1.)

Si conflit : résoudre en gardant la version "ours" pour les fichiers du LOT 2 (offer service/controller/page seller). Lancer `pnpm --filter @iox/backend exec tsc --noEmit` pour vérifier.

```
git push -u origin mp-offer-duplicate-1-seller-clone --force-with-lease

gh pr create \
  --title "feat(marketplace): MP-OFFER-DUPLICATE — clone offre seller en DRAFT" \
  --body "$(cat <<'EOF'
## Résumé

Endpoint `POST /marketplace/offers/:id/duplicate` + bouton "Dupliquer" sur la page seller détail offre.

### Comportement
- Crée une offre cloné en DRAFT, title = "(copie) " + source tronqué à 92 chars max (total ≤ 100).
- Reset complet du cycle de vie : `publicationStatus=DRAFT`, `exportReadinessStatus=PENDING_QUALITY_REVIEW`, dates `submittedAt/approvedAt/publishedAt/suspendedAt = null`, `featuredRank = null`, `rejectionReason = null`.
- Pas de duplication des `MarketplaceOfferBatch` (V1 — V2 plus tard).
- Audit log `MARKETPLACE_OFFER_DUPLICATED` enregistré.
- Permissions : ADMIN, COORDINATOR, SELLER (ownership guard sur SELLER).

### Tests
- Backend : 6 nouveaux specs service (happy path, ownership rejet, 404, troncage 95 chars, no batch cloning, all fields cloned).
- Frontend : 4 nouveaux specs (rendu bouton, confirm OK→redirect, confirm refusé, erreur API toast).
EOF
)" \
  --base main \
  --head mp-offer-duplicate-1-seller-clone

gh pr checks --watch
```

Si CI rouge → STOP. Sinon :

### Étape 5 — Merge PR #22 + sync + redeploy

```
gh pr merge --squash --delete-branch
git checkout main
git pull --rebase origin main
git log --oneline -3 origin/main

./deploy/vps/deploy.sh all
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print('status:',d['data']['status'])"
```

Smoke endpoint duplicate (avec smoke-seller token) :

```
TOKEN=$(curl -sS -X POST https://iox.mycloud.yt/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"smoke-seller@iox.mch","password":"IoxSmoke2026!"}' | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['accessToken'])")

# Récupérer l'id d'une offre du seller
OFFER_ID=$(curl -sS "https://iox.mycloud.yt/api/v1/marketplace/offers?limit=1" -H "Authorization: Bearer $TOKEN" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['data'][0]['id'])")
echo "OFFER_ID=$OFFER_ID"

# Tester duplicate
curl -sS -w "\nHTTP %{http_code}\n" -X POST "https://iox.mycloud.yt/api/v1/marketplace/offers/$OFFER_ID/duplicate" -H "Authorization: Bearer $TOKEN" | head -c 600
```

Attendu : `HTTP 201` + JSON contenant `"title": "(copie) ..."` + `"publicationStatus": "DRAFT"`.

### Étape 6 — Rebase branche 3 sur main + push + PR #23 (SEED-DEMO-FIX-3)

```
git checkout seed-demo-fix-3-public-docs-and-rfq
git rebase --onto main mp-offer-duplicate-1-seller-clone seed-demo-fix-3-public-docs-and-rfq
```

Si conflit dans `dataset.ts` ou `runner.ts` : résoudre en gardant la version locale (mandat 17).

```
git push -u origin seed-demo-fix-3-public-docs-and-rfq --force-with-lease

gh pr create \
  --title "feat(seed-demo): SEED-DEMO-FIX-3 — 4 docs PUBLIC + 2 RFQ + 4 messages + smoke-buyer" \
  --body "$(cat <<'EOF'
## Résumé

Hydrate le seed-demo idempotent avec :
- 4 `MarketplaceDocument` PUBLIC (1 par seller principal) → débloque le filtre catalog `?hasPublicDocs=true`.
- Compte `smoke-buyer@iox.mch` (mot de passe `IoxSmoke2026!`, role `MARKETPLACE_BUYER`) + Company `DEMO-BUYER-001` (type BUYER).
- 2 `QuoteRequest` demo entre smoke-buyer et 2 sellers (vanille + mangues).
- 4 `QuoteRequestMessage` (2 par RFQ : initial buyer + réponse seller).

### Idempotence
- `Document` MCH : `findFirst({ storageKey })` + update/create (storageKey unique par convention seed).
- `MarketplaceDocument` : `findFirst({ relatedId, documentId })`.
- `QuoteRequest` : `findFirst({ buyerCompanyId, marketplaceOfferId, targetMarket: seedKey })` (targetMarket utilisé comme tag interne idempotent).
- `QuoteRequestMessage` : `findFirst({ quoteRequestId, authorUserId, message })`.
- 2 runs réels DB locale → counts identiques (vérifié dans handoff mandat 17).

### Choix techniques
- Le seed bypass `QuoteRequestsService.create` (persistance directe Prisma) → pas d'effet de bord email lors du seed.
- Smoke-buyer Company type `BUYER` (l'enum `CompanyType` n'a pas `IMPORTER`).

### Tests
- 5 nouveaux specs jest seed-demo (counts attendus + idempotence + role buyer + Company type).
- Run réel local validé : `publicDocs: 4, quoteRequests: 2, quoteRequestMessages: 4, smokeBuyer: smoke-buyer@iox.mch`.

### Activation VPS
- Le runner exporte 4 nouveaux compteurs.
- Activation manuelle post-merge via `node -e + runner.js compilé` (pattern connu — handoff cascade #15).
EOF
)" \
  --base main \
  --head seed-demo-fix-3-public-docs-and-rfq

gh pr checks --watch
```

Si CI rouge → STOP. Sinon :

### Étape 7 — Merge PR #23 + sync + redeploy

```
gh pr merge --squash --delete-branch
git checkout main
git pull --rebase origin main
git log --oneline -4 origin/main

./deploy/vps/deploy.sh all
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print('status:',d['data']['status'])"
```

Capturer le SHA final de main (devrait être le squash de #23).

### Étape 8 — Activation seed VPS (CRITIQUE)

Le seed VPS doit être ré-exécuté pour matérialiser les 4 docs PUBLIC + 2 RFQ + smoke-buyer. Le pattern `node -e + runner.js compilé` reste le plus robuste (le container backend n'a pas pnpm/tsx) :

```
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T -e IOX_DEMO_SEED=1 -e NOTIF_EMAIL_TRANSPORT=mock backend node -e \"
  require('reflect-metadata');
  const { runDemoSeed } = require('./apps/backend/dist/seed-demo/runner.js');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  runDemoSeed(prisma).then(s => { console.log('seed result:', JSON.stringify(s)); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });
\""
```

Attendu (log JSON sur la dernière ligne) :

```
{"sellers":4,"products":8,"offers":8,"certifications":6,"mediaAssets":8,"publicDocs":4,"quoteRequests":2,"quoteRequestMessages":4,"smokeSeller":"smoke-seller@iox.mch","smokeBuyer":"smoke-buyer@iox.mch"}
```

Si le pattern de chemin diff (`./apps/backend/dist/seed-demo/runner.js` vs autre) → adapter selon le `Dockerfile` backend. Vérifier d'abord :

```
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T backend find . -name 'runner.js' -path '*seed-demo*' 2>/dev/null"
```

### Étape 9 — Validations curl post-activation

Tester les 4 marqueurs critiques :

```
echo "=== 1. hasPublicDocs filter (devait être 0, doit devenir 4) ==="
curl -sS "https://iox.mycloud.yt/api/v1/marketplace/catalog?hasPublicDocs=true&limit=1" \
  | python3 -c "import json,sys;print('total:',json.load(sys.stdin)['data']['meta']['total'])"

echo "=== 2. smoke-buyer login ==="
curl -sS -X POST https://iox.mycloud.yt/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke-buyer@iox.mch","password":"IoxSmoke2026!"}' \
  | python3 -c "import json,sys;d=json.load(sys.stdin);print('success:',d['success'],'role:',d['data']['user']['role'] if d['success'] else 'N/A')"

echo "=== 3. RFQ count via smoke-seller (attendu 1 — il ne voit que ses RFQs) ==="
SELLER_TOKEN=$(curl -sS -X POST https://iox.mycloud.yt/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"smoke-seller@iox.mch","password":"IoxSmoke2026!"}' | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['accessToken'])")
curl -sS "https://iox.mycloud.yt/api/v1/quote-requests?limit=10" -H "Authorization: Bearer $SELLER_TOKEN" \
  | python3 -c "import json,sys;d=json.load(sys.stdin);print('total:',d['data']['meta']['total'])"

echo "=== 4. Logs notif-email backend (vérifier logs récents) ==="
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml logs backend --tail=200 | grep -i notif-email | tail -5"
```

Attendus :
- `hasPublicDocs total: 4`
- `smoke-buyer success: True role: MARKETPLACE_BUYER`
- `RFQ total: 1` (smoke-seller dans coop-vanille ne voit que RFQ #1)
- Logs notif-email : éventuellement quelques entrées si des emails ont été envoyés (mock transport accumule en mémoire, mais le seed bypass volontairement la création des RFQ via service donc 0 envoi attendu pour le seed).

### Étape 10 — Validations finales

```
echo "=== git état final ==="
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git status --short
git log --oneline origin/main | head -5
git branch -a | grep -v origin/HEAD

echo "=== aucune branche mandat 17 résiduelle ==="
git branch | grep -E "mp-notif-1|mp-offer-duplicate|seed-demo-fix-3" || echo "OK aucune"
```

Working tree propre côté trackés. Branches mandat 17 supprimées localement (le `--delete-branch` du `gh pr merge` les a supprimées remote ; localement c'est à `git branch -D` après le pull).

```
git branch -D mp-notif-1-transactional-emails-phase1 mp-offer-duplicate-1-seller-clone seed-demo-fix-3-public-docs-and-rfq
```

---

## Preuves anti-hallucination obligatoires (à recopier en fin de rapport)

```
# 1. Les 3 PR mergées (state + mergedAt + checks)
for n in 21 22 23; do
  echo "--- PR #$n ---"
  gh pr view $n --json state,mergedAt,statusCheckRollup -q '"state:" + .state + " mergedAt:" + .mergedAt, "checks:", (.statusCheckRollup[] | "  " + .name + " → " + (.conclusion // .status))'
done

# 2. Main local + remote
git rev-parse main
git rev-parse origin/main
git log --oneline origin/main | head -5

# 3. Health VPS
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print(d)"

# 4. hasPublicDocs filter passe de 0 → 4
curl -s "https://iox.mycloud.yt/api/v1/marketplace/catalog?hasPublicDocs=true&limit=1" | python3 -c "import json,sys;print('total:',json.load(sys.stdin)['data']['meta']['total'])"

# 5. smoke-buyer en base
curl -s -X POST https://iox.mycloud.yt/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"smoke-buyer@iox.mch","password":"IoxSmoke2026!"}' | python3 -c "import json,sys;d=json.load(sys.stdin);print('success:',d['success'])"

# 6. RFQ count smoke-seller = 1
curl -s "https://iox.mycloud.yt/api/v1/quote-requests?limit=10" -H "Authorization: Bearer $SELLER_TOKEN" | python3 -c "import json,sys;d=json.load(sys.stdin);print('total:',d['data']['meta']['total'])"

# 7. duplicate endpoint répond 201
curl -sS -w "\nHTTP %{http_code}\n" -X POST "https://iox.mycloud.yt/api/v1/marketplace/offers/$OFFER_ID/duplicate" -H "Authorization: Bearer $SELLER_TOKEN" | head -c 200

# 8. Branches mandat 17 supprimées
git branch | grep -E "mp-notif-1|mp-offer-duplicate|seed-demo-fix-3" || echo "OK aucune"

# 9. Stash list vide
git stash list

# 10. Working tree propre
git status --short

# 11. Activation seed VPS counts
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml logs backend --tail=50 | grep -i 'demo seed done'"
```

---

## Contraintes / règles absolues

- **Pas de force-push sur main**. Force-with-lease uniquement sur les branches feature après rebase --onto.
- **Pas de `git push --no-verify`** (laisser les hooks pre-push tourner).
- **Pas de `gh pr merge --admin`** sauf si CI vert sur tous les checks (option α confirmée par PR #19/#20).
- **Pas de modification du code applicatif** pendant la cascade (sauf résolution de conflit rebase si nécessaire — minimale).
- **Si une CI plante** sur une PR : STOP, capturer la sortie complète `gh pr checks` + `gh pr view --json` dans `notes/handoff-cascade-18-stop.md`. Ne PAS forcer le merge. Ne PAS passer à la PR suivante avant arbitrage.
- **Si le deploy plante** : ne pas activer le seed. Diagnostiquer via `ssh rahiss-vps "docker compose -f docker-compose.vps.yml logs backend --tail=200"`.
- **Si le seed plante côté VPS** : ne pas le re-essayer plus de 2 fois. Documenter l'erreur et passer à l'étape suivante (les autres validations fonctionnent même sans seed-fix-3 actif — juste hasPublicDocs reste à 0).

---

## TL;DR rapport attendu

```
Cascade #18 — livrée ✅
- 3 PR (#21 #22 #23) mergées dans l'ordre. CI vert sur les 3.
- 3 deploys VPS OK + healthchecks 4/4 chacun.
- Seed VPS activé : publicDocs=4, quoteRequests=2, quoteRequestMessages=4.
- 4 marqueurs validés : hasPublicDocs=4, smoke-buyer login OK, RFQ smoke-seller=1, endpoint duplicate=201.
- main = <SHA_FINAL> (était db36db7), 23 lots marketplace au total.
- 0 branche mandat 17 résiduelle, working tree propre.
```
