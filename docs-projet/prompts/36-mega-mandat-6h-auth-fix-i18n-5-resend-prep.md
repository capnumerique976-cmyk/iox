# Méga-mandat 6h LOCAL-ONLY — AUTH-FIX-LOCAL + I18N-5 + RESEND-PROD-PREP

> Coller dans Claude Code pour run autonome ~6h. **Aucun push, deploy, gh, ssh, envoi externe.**
>
> 3 LOTs : 1 dette tech + 1 feature i18n + 1 préparation ops (sans toucher VPS).

## Pré-requis (STOP si non remplis)

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git rev-parse main                                              # → 387c6c2f88b7868d41d1e14430d90261463c3062
git stash list                                                   # → vide
git branch | wc -l                                               # → 2
pnpm install --frozen-lockfile 2>&1 | tail -3
pnpm --filter @iox/backend exec prisma generate 2>&1 | tail -3
```

Si pas vert → STOP + `notes/handoff-megamandat-36-stop.md`.

---

## Garde-fous anti-hallucination

User absent ~6h. Toute invention détectée par grep / git log / pnpm test à retour.

1. Toujours vérifier disque (`ls`, `cat`, `git status`) avant marquer fini.
2. Jamais inventer output / test / fichier. Erreur brute si commande échoue.
3. Fin chaque lot, recopier output réel des preuves dans handoff.
4. Si tu détectes invention → STOP, revert, doc, passe au suivant.

---

## Contexte canonique IOX

Stack : monorepo pnpm + Turbo, NestJS + Prisma + PostgreSQL, Next.js App Router, controlled state, conventional commits, migrations Prisma additives.

5 invariants : Product ≠ Offer ≠ SellerProfile / projection publique filtrée / statuts marketplace ≠ MCH / FP ≠ Lot ≠ MP / Seller = `MARKETPLACE_SELLER`.

---

## État avant ce mandat

- main = `387c6c2` (51 lots cumulés, MP-MEDIA-1 entièrement clos).
- VPS aligné. MinIO + PostgreSQL + Docker Compose.
- next-intl câblé : `apps/frontend/messages/{fr,en}.json` + `lib/i18n.ts` + `i18n/request.ts` + bridge useLang phase 1 (#36).
- 6 templates EN actifs (chantier I18N-4 emails clos).
- Resend transport câblé en LOCAL et en prod (mais `NOTIF_EMAIL_TRANSPORT=mock` par défaut, `RESEND_API_KEY` non set).
- Specs auth : `auth.service.spec.ts` + `refresh.dto.spec.ts`. **Fail local historique** depuis `39bfbd0` (~25 specs rouges en local mais SUCCESS en CI sur PR #19/#20+ — env-dépendant).

**Manques V1** :
- LOT 1 : Specs auth ne passent pas en local → friction dev quotidienne (mandats locaux ignorent ce fail).
- LOT 2 : I18N couverture EN partielle. Frontend public marketplace = strings hardcoded FR à beaucoup d'endroits. Switch FR/EN incomplet.
- LOT 3 : Resend transport prêt mais pas activable sereinement — manque doc complète (DKIM/SPF/DMARC), checklist user, script bascule.

---

## Mandat global

3 lots branches chaînées sur main.

```
main (387c6c2, intact)
   │
   ▼
chore-auth-specs-fix-local           ← LOT 1 (~1-2h)
   │
   ▼
i18n-5-public-marketplace-en         ← LOT 2 (~3h)
   │
   ▼
resend-prod-prep-doc-script          ← LOT 3 (~1h)
```

Si LOT capote → garder, passer suivant.

---

## Règles absolues

- AUCUN `git push`, `gh`, `git fetch origin`, `git pull`.
- AUCUN merge sur main local. Main reste `387c6c2`.
- AUCUN deploy / ssh / VPS / DNS.
- AUCUN compte externe créé (Resend / autres).
- AUCUN force-push.
- AUCUN envoi email externe (transport mock obligatoire en tests).
- AUCUNE migration Prisma (pas requise V1 ces 3 lots).

## Exigences techniques transverses

- Conventional commits.
- TypeScript strict : pas de `any`, casts justifiés.
- Tests : `.spec.ts` jest backend, `.test.tsx` vitest frontend. Cible verts.
- Logs : `Logger` Nest, jamais `console.log`.
- Controlled state : pas de react-hook-form.

---

## LOT 1 — AUTH-FIX-LOCAL — ~1-2h

**Branche** : `chore-auth-specs-fix-local` à partir de `main`.

**Objectif** : faire passer les 25 specs auth en local (alignement CI). Probablement env vars manquantes ou mocks Prisma à mettre à jour suite à `39bfbd0` (L9-5 metrics auth instrumentation).

### 1.1 Diagnostic

```
pnpm --filter @iox/backend test src/auth 2>&1 | tee /tmp/auth-fail.log | tail -50
```

Identifier les patterns d'erreur :
- `Cannot find module ...` → import manquant
- `expected X to be Y` → assertion fail (mock data ?)
- `Database connection refused` → env DATABASE_URL_TEST manquante ?
- `JWT_SECRET undefined` → env vars test manquantes ?

### 1.2 Lire l'état actuel

- `apps/backend/src/auth/auth.service.spec.ts`
- `apps/backend/src/auth/dto/refresh.dto.spec.ts`
- `apps/backend/test/setup.ts` ou `jest.config.ts` ou `jest.setup.ts` (si existe)
- `.env.test` ou `.env.example` (vérifier vars requises)
- Comparer avec workflow CI `.github/workflows/ci.yml` job backend (env vars setées ?)

### 1.3 Identifier la cause

Hypothèses prioritaires :
1. **Mocks Prisma incomplets** : `39bfbd0` a ajouté `MetricsService` qui appelle Prisma → mock manquant pour les nouvelles méthodes.
2. **Env vars test manquantes** : `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`, `BCRYPT_ROUNDS`, etc.
3. **`MetricsService` nécessite injection** : `auth.service.spec.ts` n'a pas le provider mocké.

### 1.4 Fix

Selon diagnostic :
- Étendre `.env.test` (créer si absent) avec les vars manquantes (valeurs dummy non-secrètes).
- Étendre les `providers: [...]` des `Test.createTestingModule` pour mocker `MetricsService` ou `PrismaService`.
- Si `auth.service.spec.ts` a 25 fails identiques par missing mock → créer un helper `createAuthTestingModule(overrides?)` réutilisable.

Tests à passer : `pnpm --filter @iox/backend test src/auth` → tous verts (target 25/25 ou similaire).

### 1.5 Vérifier non-régression

```
pnpm --filter @iox/backend test 2>&1 | tail -10
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -3
```

Aucun spec ailleurs ne doit régresser.

### 1.6 Documentation

Créer `docs/dev/AUTH_LOCAL_TESTS.md` (court, ~30 lignes) :
- Cause du fail historique
- Fix appliqué
- Comment lancer les specs auth en local
- Variables d'env requises (`.env.test`)

### 1.7 Preuves anti-hallucination LOT 1

```
git log --oneline main..chore-auth-specs-fix-local
git diff main..chore-auth-specs-fix-local --stat
ls .env.test 2>/dev/null || echo "(.env.test absent ou pas créé)"
pnpm --filter @iox/backend test src/auth 2>&1 | tail -15
pnpm --filter @iox/backend test 2>&1 | tail -5
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -3
ls docs/dev/AUTH_LOCAL_TESTS.md
```

---

## LOT 2 — I18N-5 phase 1 — Frontend public marketplace EN — ~3h

**Branche** : `i18n-5-public-marketplace-en` à partir de `chore-auth-specs-fix-local`.

**Objectif** : étendre la couverture i18n EN au frontend public marketplace (catalog, fiche produit, fiche seller, page sellers index).

### 2.1 Lire l'état actuel

- `apps/frontend/messages/fr.json` et `en.json` : voir les clés actuelles (probablement ~70 clés depuis I18N-2 #41).
- Pages publiques marketplace : `apps/frontend/src/app/marketplace/**/*.tsx`.
- Identifier les strings hardcoded FR à externaliser.

### 2.2 Identifier zones à i18n

Pages cibles V1 :
- `/marketplace` (catalog public + filtres + facets)
- `/marketplace/products/[slug]` (fiche produit avec gallery + vidéo)
- `/marketplace/sellers` (annuaire)
- `/marketplace/sellers/[slug]` (fiche seller)
- Composants partagés : `LocaleSwitcher`, header public, footer public, badges status

Zones à laisser FR-only V1 (hors scope) :
- Dashboard seller `/seller/*` (back-office, FR pro)
- Dashboard buyer `/buyer/*` (compte créé après inscription, peut être V2)
- Dashboard admin `/admin/*` (FR pro)
- Pages auth `/login` `/signup` (V1 FR only, V2 EN)

### 2.3 Externaliser strings

Pour chaque page cible :
- Identifier strings hardcoded.
- Ajouter clés dans `messages/fr.json` (default) + `messages/en.json`.
- Remplacer hardcoded par `t('clé')` via `useTranslations(namespace)`.
- Convention namespace : `marketplace.catalog.*`, `marketplace.product.*`, `marketplace.seller.*`, `common.*`.

Cible volume V1 : **+70 nouvelles clés** environ (cumul ~140 total).

### 2.4 Tests

- Spec snapshot `messages/fr.json` et `en.json` cohérents (pas de clé manquante côté EN).
- Helper `validateLocaleParity()` (recursive walk JSON, compare keys FR vs EN).
- Spec `apps/frontend/src/lib/i18n-parity.test.ts` (nouveau) :
  - Toutes clés FR → présentes en EN.
  - Toutes clés EN → présentes en FR.
- Spec sur 1-2 pages cible : rendu page en FR + EN, vérifie strings traduits visibles.

### 2.5 LocaleSwitcher

Vérifier que `LocaleSwitcher` existe (phase 1 #36 en parlait). Si présent dans dashboard top-bar, l'exposer aussi dans header public (page `/marketplace`).

### 2.6 Documentation

Créer `docs/marketplace/I18N_5_PUBLIC_MARKETPLACE_EN.md` :
- Périmètre couvert (4 pages publiques).
- Convention namespacing.
- Helper parity FR↔EN.
- Volume +70 clés (total ~140).
- TODO V2 : auth pages, buyer dashboard, multi-currency, RTL si arabe.

### 2.7 Preuves anti-hallucination LOT 2

```
git log --oneline chore-auth-specs-fix-local..i18n-5-public-marketplace-en
git diff chore-auth-specs-fix-local..i18n-5-public-marketplace-en --stat
wc -l apps/frontend/messages/fr.json apps/frontend/messages/en.json
grep -c '"' apps/frontend/messages/fr.json
grep -c '"' apps/frontend/messages/en.json
grep -rn "useTranslations\|t(" apps/frontend/src/app/marketplace/ --include="*.tsx" 2>/dev/null | wc -l
ls apps/frontend/src/lib/i18n-parity.test.ts 2>&1
pnpm --filter @iox/frontend test i18n 2>&1 | tail -10
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
ls docs/marketplace/I18N_5_PUBLIC_MARKETPLACE_EN.md
```

---

## LOT 3 — RESEND-PROD-PREP — ~1h

**Branche** : `resend-prod-prep-doc-script` à partir de `i18n-5-public-marketplace-en`.

**Objectif** : préparer la bascule Resend en prod **sans toucher VPS ni créer compte**. Livrer doc complète + checklist + script bascule + smoke post-bascule. User exécutera lui-même quand prêt.

### 3.1 Documentation activation Resend

Créer `docs/ops/RESEND_PROD_ACTIVATION.md` :

Sections :
1. **Pré-requis** :
   - Compte Resend créé (https://resend.com)
   - Domaine `iox.mch` ajouté côté Resend
   - DNS modifiable côté `iox.mch` (récupérer accès)
2. **DKIM + SPF + DMARC** :
   - Records exacts à ajouter (Resend fournit dans dashboard).
   - SPF baseline : `v=spf1 include:resend.com -all`.
   - DKIM : record fourni par Resend (selector + clé publique).
   - DMARC : `v=DMARC1; p=quarantine; rua=mailto:dmarc@iox.mch; pct=100`.
   - Vérification : `dig TXT iox.mch` après propagation (24h max).
3. **Test envoi initial** :
   - Resend dashboard → test send to ops@iox.mch
   - Vérifier delivered status.
4. **Bascule env VPS** :
   - Ajouter `RESEND_API_KEY=<key>` à `/opt/apps/iox/docker-compose.vps.yml` env backend (ou via secret Docker).
   - Bascule `NOTIF_EMAIL_TRANSPORT=resend`.
   - Restart backend container : `docker compose restart backend`.
5. **Smoke post-bascule** :
   - Login smoke-buyer + crée RFQ test → vérifier email_log SENT + provider_message_id non null.
   - Vérifier delivery côté Resend dashboard.
   - Si SENT mais pas delivered : vérifier DNS DKIM.
6. **Rollback** :
   - Bascule `NOTIF_EMAIL_TRANSPORT=mock` + restart → comportement V0 immédiat.
   - 0 perte (EmailLog persistent même en mock).
7. **Coût** :
   - Resend free tier 3000 emails/mois + 100/jour.
   - Plan Pro 20 USD/mois pour 50k emails (V2 si volume).

### 3.2 Script bascule

Créer `deploy/scripts/activate-resend.sh` (exécutable, à lancer manuellement par user) :

```bash
#!/usr/bin/env bash
set -euo pipefail

# Pré-requis : RESEND_API_KEY env var setée localement avant exécution
if [ -z "${RESEND_API_KEY:-}" ]; then
  echo "❌ RESEND_API_KEY manquant. Export avant exécution."
  exit 1
fi

# Bascule via SSH (1 connexion ControlMaster)
ssh rahiss-vps bash <<EOF
set -euo pipefail
cd /opt/apps/iox

# Backup .env actuel
cp .env .env.backup-\$(date +%Y%m%d-%H%M%S)

# Update .env avec Resend
sed -i 's/^NOTIF_EMAIL_TRANSPORT=.*/NOTIF_EMAIL_TRANSPORT=resend/' .env || echo "NOTIF_EMAIL_TRANSPORT=resend" >> .env
grep -q "^RESEND_API_KEY=" .env && sed -i 's/^RESEND_API_KEY=.*/RESEND_API_KEY=${RESEND_API_KEY}/' .env || echo "RESEND_API_KEY=${RESEND_API_KEY}" >> .env

# Restart backend
docker compose -f docker-compose.vps.yml restart backend

# Healthcheck
sleep 5
curl -s http://localhost:3001/api/v1/health | head -c 200
EOF

echo "✅ Bascule Resend appliquée. Vérifier email_log post-trigger RFQ."
```

### 3.3 Script smoke post-bascule

Créer `deploy/scripts/smoke-resend.sh` :

```bash
#!/usr/bin/env bash
set -euo pipefail

# Smoke : login smoke-buyer, crée RFQ test, vérifie EmailLog SENT avec provider_message_id non null
BUYER_TOKEN=$(curl -sS -X POST https://iox.mycloud.yt/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"smoke-buyer@iox.mch","password":"IoxSmoke2026!"}' | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['accessToken'])")

# Trouver une offre publique
OFFER_ID=$(curl -sS "https://iox.mycloud.yt/api/v1/marketplace/catalog?limit=1" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['data'][0]['offerId'])")

# Créer RFQ test
curl -sS -X POST "https://iox.mycloud.yt/api/v1/marketplace/quote-requests" -H "Content-Type: application/json" -H "Authorization: Bearer $BUYER_TOKEN" -d "{\"marketplaceOfferId\":\"$OFFER_ID\",\"requestedQuantity\":1,\"requestedUnit\":\"kg\",\"deliveryCountry\":\"FR\",\"message\":\"smoke-resend-test\"}" | head -c 300

sleep 3

# Vérifier dernier EmailLog
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T postgres psql -U iox -d iox_prod -c \"SELECT template_id, status, provider_message_id, recipient_email, created_at FROM email_logs ORDER BY created_at DESC LIMIT 3\""
```

### 3.4 Update doc principale

Étendre `docs/marketplace/MP_NOTIF_2_PHASE_2.md` (existante) avec section "Activation production Resend" pointant vers la nouvelle doc + scripts.

### 3.5 Tests

- Pas de tests jest/vitest pour ce LOT (code shell ops).
- Vérifier que les 2 scripts shell ont la perm exec : `chmod +x deploy/scripts/*.sh`.
- Vérifier syntaxe shell : `bash -n deploy/scripts/activate-resend.sh && bash -n deploy/scripts/smoke-resend.sh`.

### 3.6 Preuves anti-hallucination LOT 3

```
git log --oneline i18n-5-public-marketplace-en..resend-prod-prep-doc-script
git diff i18n-5-public-marketplace-en..resend-prod-prep-doc-script --stat
ls -la deploy/scripts/activate-resend.sh deploy/scripts/smoke-resend.sh
bash -n deploy/scripts/activate-resend.sh && echo "syntax OK activate"
bash -n deploy/scripts/smoke-resend.sh && echo "syntax OK smoke"
ls docs/ops/RESEND_PROD_ACTIVATION.md
wc -l docs/ops/RESEND_PROD_ACTIVATION.md
```

---

## Pre-flight checks (avant LOT 1)

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git status --short
git log --oneline -1 main                                        # → 387c6c2
git stash list                                                   # → vide
git branch | wc -l                                               # → 2
pnpm install --frozen-lockfile 2>&1 | tail -3
pnpm --filter @iox/backend exec prisma generate 2>&1 | tail -3
docker compose ps 2>&1 | head -5
```

Tout vert → démarrer LOT 1. Sinon STOP + handoff.

---

## Format rapport final attendu (`notes/handoff-megamandat-36.md`)

```
# Méga-mandat 36 — handoff AUTH-FIX + I18N-5 + RESEND-PROD-PREP

## TL;DR
- LOT 1 AUTH-FIX-LOCAL : ✅ / 🟡 / ❌ — N commits, M specs verts
- LOT 2 I18N-5 ph1 : ✅ / 🟡 / ❌ — +X clés EN, total Y clés
- LOT 3 RESEND-PROD-PREP : ✅ / 🟡 / ❌ — doc + 2 scripts shell
- main intact (387c6c2)
- 0 migration Prisma

## Branches livrées
- chore-auth-specs-fix-local (HEAD: ...)
- i18n-5-public-marketplace-en (HEAD: ...)
- resend-prod-prep-doc-script (HEAD: ...)

## LOT 1 — preuves brutes
[recopier sortie 7 commandes]

## LOT 2 — preuves brutes
[recopier sortie 9 commandes]

## LOT 3 — preuves brutes
[recopier sortie 6 commandes]

## Blocages rencontrés
[liste exhaustive]

## Notes pour push cascade
- ordre : auth-fix → i18n-5 → resend-prep (chaînés)
- 0 migration Prisma → cascade safe
- LOT 3 : aucune action ops effective tant que user n'exécute pas activate-resend.sh manuellement
- env vars VPS inchangés
- smoke post-deploy : auth specs verts en CI (déjà cas), parity FR/EN intacte, scripts shell présents
```

---

## TL;DR pour Claude Code

3 lots, ~6h, branches chaînées locales, 0 migration Prisma, ~30+ specs jest+vitest nouveaux, aucun envoi externe, aucun touchage ops effectif. Si doute, STOP + doc.

Caveman resume off pour ce livrable car prompt opérationnel.
