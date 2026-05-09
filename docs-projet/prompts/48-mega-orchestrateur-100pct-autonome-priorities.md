# Méga-orchestrateur 100% autonome — Migration urgente + Stripe verify + PAY-2 + MP-CATEGORY-3 + MP-NOTIF-3 ph8 + BÊTA-PRIVÉE prep

> Coller dans Claude Code en un seul bloc. ~15-17h cumul. **Aucune intervention user requise** — Claude Code diagnostique + résout blocages seul. Si vraiment bloqué : documente + skip + avance suite sans STOP global.

## Pré-requis (vérification puis avance)

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git rev-parse main                                              # → 503859a (ou plus récent)
git stash list                                                   # → vide
which gh && gh auth status                                       # → gh OK
ssh -o ConnectTimeout=5 rahiss-vps 'echo ok'                     # → ok
```

Si pas vert → **ne pas STOP**, documenter dans `notes/handoff-mandat-48-blocage-preflight.md` puis tenter chaque phase quand même. Pré-requis stricts uniquement par phase, pas global.

---

## Garde-fous transverses

- 0 force-push main, force-with-lease feature OK après rebase.
- 0 `gh pr merge --admin` sauf CI rouge bloquant (tester 3 fois CI puis admin merge si nécessaire avec doc raison).
- ControlMaster SSH actif → `sleep 60` (ou 240 si fail2ban) entre deploys.
- 0 envoi email externe (transport mock).
- Migrations Prisma additives uniquement.
- Anti-hallucination strict.
- **Si blocage** : 3 tentatives de fix puis skip + doc, NE PAS arrêter mandat global.

---

## PHASE 0 — Migration Prisma urgente (`add-company-postal-code-description`) — ~10 min

### 0.1 Vérifier état schema

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git checkout main
git pull --rebase origin main
grep -E "postalCode|description" prisma/schema.prisma | head -10
ls prisma/migrations/ | tail -3
```

Si `postalCode` + `description` présents schema mais pas dans dernière migration → créer.

### 0.2 Créer migration

```
pnpm --filter @iox/backend exec prisma migrate dev --name add-company-postal-code-description
```

Vérifier strict additif (CREATE/ALTER ADD COLUMN uniquement, pas DROP/RENAME).

### 0.3 Commit + push direct main

```
git add prisma/migrations/ prisma/schema.prisma
git commit -m "chore(prisma): add migration for company.postalCode + description (additive)"
git push origin main
```

Pas de PR — chore safe direct sur main (pattern déjà fait pour `db36db7` token-economy).

### 0.4 Deploy + vérif prisma-drift

```
./deploy/vps/deploy.sh all
sleep 30
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T postgres psql -U iox -d iox_prod -c '\\d companies' | grep -E 'postal_code|description'"
```

Doit retourner les 2 colonnes ajoutées.

### 0.5 Preuves Phase 0

```
git log --oneline origin/main | head -3
ls prisma/migrations/ | tail -3
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml logs backend --tail=30 | grep -iE 'migrate|prisma'"
```

---

## PHASE 1 — Stripe Connect verification API + smoke onboarding (~30 min)

**Important** : Claude Code ne peut PAS activer Connect dashboard (action user). Mais peut tester via API si déjà activé. Si KO → skip + doc + avance.

### 1.1 Test API direct

```
# Lire .env localement pour récupérer STRIPE_SECRET_KEY
SK=$(grep "^STRIPE_SECRET_KEY=" /opt/apps/iox/.env 2>/dev/null | cut -d= -f2- | tr -d '"' | head -c 200)
# OR via SSH si key pas en local
SK=$(ssh rahiss-vps "grep '^STRIPE_SECRET_KEY=' /opt/apps/iox/.env" | cut -d= -f2- | tr -d '"' | head -c 200)

# Test API direct
echo "=== Stripe accounts.create test ==="
curl -sS https://api.stripe.com/v1/accounts \
  -u "$SK:" \
  -d "type=express" \
  -d "country=FR" \
  -d "email=test-mandat-48@example.com" \
  -d "capabilities[card_payments][requested]=true" \
  -d "capabilities[transfers][requested]=true" 2>&1 | head -c 1000
```

Trois cas :

**Cas A — réponse contient `"id": "acct_..."`** : ✅ Connect activé. Cleanup test account :
```
ACCT_ID=$(... | jq -r .id)
curl -sS -X DELETE "https://api.stripe.com/v1/accounts/$ACCT_ID" -u "$SK:"
```
Phase 1 considérée OK. Lance smoke réel via `./deploy/scripts/smoke-stripe-onboarding.sh`.

**Cas B — réponse contient "signed up for Connect"** : ❌ pas activé. Skip Phase 1, doc :
```
echo "Stripe Connect activation pending user action" >> notes/handoff-mandat-48.md
```
Continue Phase 2.

**Cas C — autre erreur** : doc erreur précise, skip. Continue.

### 1.2 Si Cas A — test smoke onboarding

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
./deploy/scripts/smoke-stripe-onboarding.sh 2>&1 | tail -10
```

Doit retourner URL `connect.stripe.com/express/...`. Si oui → Stripe pleinement opérationnel.

### 1.3 Preuves Phase 1

```
echo "=== Phase 1 status ==="
echo "API direct test : <résultat Cas A/B/C>"
echo "Smoke onboarding : <URL retournée ou erreur>"
```

---

## PHASE 2 — PAY-2 (refunds + webhook→email + factures basiques) — ~5h

**Branche** : `pay-2-refunds-and-email-and-invoices` à partir de main (post-phase-0).

### 2.1 Backend refunds

Endpoint `POST /api/v1/payments/:id/refund` :
- Roles ADMIN, COORDINATOR, SELLER (ownership).
- DTO `RefundPaymentDto` : `{ amountCents?: number, reason?: string }`.
- Service `PaymentsService.refund(id, dto, actor)` :
  - Validate Payment status=SUCCEEDED sinon BadRequestException.
  - Appelle Stripe `refunds.create({ payment_intent: payment.stripePaymentIntentId, amount?, reason? })` via factory.
  - Update Payment status=REFUNDED + metadata.refundId.
  - Audit log `PAYMENT_REFUNDED`.
- 5 specs.

### 2.2 Backend webhook → email send

Étendre `payments-webhook.service.ts` :
- Sur `payment_intent.succeeded` → `NotifEmailService.send` template `payment-confirmed-to-buyer`.
- Pattern `safeNotify`.
- 3 specs.

### 2.3 Backend module factures (migration Invoice additive)

```prisma
enum InvoiceStatus { DRAFT ISSUED PAID CANCELED }

model Invoice {
  id              String        @id @default(uuid())
  paymentId       String        @unique @map("payment_id")
  sellerProfileId String        @map("seller_profile_id")
  buyerCompanyId  String        @map("buyer_company_id")
  invoiceNumber   String        @unique @map("invoice_number")
  amountCents     Int           @map("amount_cents")
  currency        String        @default("EUR")
  status          InvoiceStatus @default(DRAFT)
  pdfStorageKey   String?       @map("pdf_storage_key")
  issuedAt        DateTime?     @map("issued_at")
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")
  @@index([sellerProfileId, createdAt])
  @@index([buyerCompanyId, createdAt])
  @@map("invoices")
}
```

```
pnpm --filter @iox/backend exec prisma migrate dev --name pay_2_invoices
```

Service + 4 endpoints + invoiceNumber `IOX-YYYY-NNNNNN` séquentiel + PDF stub V1 501.

### 2.4 Frontend pages invoices

`/buyer/invoices` + `/seller/invoices` (list + detail). Helper API. 4 specs.

### 2.5 Doc + preuves

`docs/marketplace/PAY_2_REFUNDS_INVOICES_EMAIL.md`.

```
git log --oneline main..pay-2-refunds-and-email-and-invoices
git diff main..pay-2-refunds-and-email-and-invoices --stat
ls prisma/migrations/ | tail -3
grep -nE "model Invoice" prisma/schema.prisma
pnpm --filter @iox/backend test src/payments src/notif-email 2>&1 | tail -10
pnpm --filter @iox/frontend test invoices 2>&1 | tail -10
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -3
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
```

---

## PHASE 3 — MP-CATEGORY-3 (front public catégories filtres) — ~3h

**Branche** : `mp-category-3-public-filters` à partir de `pay-2-refunds-and-email-and-invoices`.

### 3.1 Backend — endpoint catalog filtré par category

Vérifier endpoint catalog existant accepte filtre `?categoryId=` ou `?categorySlug=`. Si pas câblé → étendre `marketplace-catalog/dto/catalog-query.dto.ts` + service `buildCatalogWhere`.

3 specs (filter category, slug+id alternatives, parent → enfants flatten via tree).

### 3.2 Backend — endpoint public catégories tree

`GET /api/v1/marketplace/categories` (public, pas admin) :
- Retour : tree `MarketplaceCategory.isActive=true` sortByOrder.
- Pas de pagination (catalog complet, ~50 max).

3 specs.

### 3.3 Frontend — page `/marketplace/categories`

Page index publique catégories avec breadcrumb tree.

Sélection category → redirect `/marketplace?categoryId=...`.

5 specs.

### 3.4 Frontend — composant CategoryFilter

Étendre `CatalogFilters.tsx` avec dropdown tree categories (multi-niveaux).

3 specs.

### 3.5 i18n

Externaliser nouveaux strings (FR + EN). Parity test.

### 3.6 Doc + preuves

`docs/marketplace/MP_CATEGORY_3_PUBLIC_FILTERS.md`.

```
git log --oneline pay-2-refunds-and-email-and-invoices..mp-category-3-public-filters
ls apps/frontend/src/app/marketplace/categories/ 2>&1
grep -nE "categoryId|categorySlug" apps/backend/src/marketplace-catalog/dto/ -r 2>&1 | head -5
pnpm --filter @iox/backend test src/marketplace-catalog src/marketplace-categories 2>&1 | tail -10
pnpm --filter @iox/frontend test marketplace/categories 2>&1 | tail -10
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -3
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
```

---

## PHASE 4 — MP-NOTIF-3 phase 8 (export CSV stats + dashboard alertes) — ~3h

**Branche** : `mp-notif-3-ph8-csv-export-alerts` à partir de `mp-category-3-public-filters`.

### 4.1 Backend — export CSV stats

`GET /api/v1/notif-email/logs/stats/export.csv` (admin/coordinator) :
- Query params identiques `/stats` endpoint existant.
- Réponse : `Content-Type: text/csv` avec headers + rows.
- Service `NotifEmailService.exportStatsCsv(filters)` qui génère CSV via `csv-stringify` (déjà dispo) ou string manual.

3 specs.

### 4.2 Backend — alertes seuils

Service `NotifEmailAlertsService` :
- Méthode `checkErrorRate()` — query EmailLog 1h derniers.
- Si `failed / total > 0.20` (20%) → log warn + créer audit log `NOTIF_EMAIL_ERROR_RATE_HIGH` avec details.
- Cron `@Cron(EVERY_HOUR)`.
- Pattern safeNotify.

3 specs (rate sous seuil, rate au-dessus, pas de logs → skip).

### 4.3 Frontend — bouton export CSV + dashboard alertes

Page `/admin/notif-email/logs` étendue :
- Bouton "Exporter CSV" → triggers download.
- Section "Alertes récentes" : list audit logs `NOTIF_EMAIL_ERROR_RATE_HIGH` 7 derniers jours.

4 specs.

### 4.4 Doc + preuves

```
git log --oneline mp-category-3-public-filters..mp-notif-3-ph8-csv-export-alerts
grep -nE "exportStatsCsv|NotifEmailAlertsService" apps/backend/src/notif-email/ -r 2>&1 | head -5
pnpm --filter @iox/backend test src/notif-email 2>&1 | tail -10
pnpm --filter @iox/frontend test admin/notif-email 2>&1 | tail -10
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -3
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
```

---

## PHASE 5 — BÊTA-PRIVÉE prep (~2h)

**Branche** : `beta-privee-prep-fixtures-doc` à partir de `mp-notif-3-ph8-csv-export-alerts`.

**Important** : Claude Code ne peut PAS créer de vrais comptes seller MCH. Génère uniquement seeds + docs + templates.

### 5.1 Seed étendu BÊTA-PRIVÉE

Étendre `apps/backend/src/seed-demo/dataset.ts` :
- 5-10 sellers réels MCH (anonymisés : "Coopérative Vanille Mahoraise A", "Producteur Mangues Mahorais B", etc.).
- 1-2 produits par seller avec photos placeholder.
- 1-2 offres par produit.
- Total : ~15 produits, ~15 offres, ~10 sellers.

Idempotence respectée (upsert via slug seed-key).

5 specs (counts, idempotence).

### 5.2 Doc onboarding agent MCH

Créer `docs/ops/BETA_PRIVEE_ONBOARDING_AGENT_MCH.md` :
- Flow : agent rencontre seller terrain → photo CNI + RIB + KBIS → créé compte via `/admin/users` → seller reçoit invite → onboarding self-service via `/seller/profile/edit`.
- Checklist 10 points par seller.
- Templates email accueil seller (FR + EN).
- Templates SMS welcome (FR + Shimaoré).

### 5.3 Templates emails accueil seller

Créer `apps/backend/src/notif-email/templates/seller-welcome.template.ts` (FR + EN).

3 specs.

### 5.4 Script génération invite seller

Créer `deploy/scripts/generate-seller-invite.sh` :
- Input : email seller + nom + slug.
- Output : URL invite avec token JWT 24h + lien onboarding.
- Pas d'envoi email réel (output console pour copier-coller manuel par agent MCH).

### 5.5 Checklist beta launch

`docs/ops/BETA_LAUNCH_CHECKLIST.md` :
- Pré-conditions tech (DNS, Stripe activated, Resend activated, etc.).
- 20 sellers cibles.
- Communication interne MCH.
- Smoke en J0 + J3 + J7.

### 5.6 Doc + preuves

```
git log --oneline mp-notif-3-ph8-csv-export-alerts..beta-privee-prep-fixtures-doc
ls deploy/scripts/generate-seller-invite.sh docs/ops/BETA_PRIVEE_ONBOARDING_AGENT_MCH.md docs/ops/BETA_LAUNCH_CHECKLIST.md
ls apps/backend/src/notif-email/templates/seller-welcome*
pnpm --filter @iox/backend test src/seed-demo src/notif-email 2>&1 | tail -10
bash -n deploy/scripts/generate-seller-invite.sh && echo "syntax OK"
```

---

## PHASE 6 — Cascade 4 PR (PAY-2 + MP-CATEGORY-3 + MP-NOTIF-3-PH8 + BETA-PREP) — ~1h30

```
git checkout main
git fetch origin --prune
git status --short
```

### 6.1 Push #68 PAY-2

```
git checkout pay-2-refunds-and-email-and-invoices
git push -u origin pay-2-refunds-and-email-and-invoices

gh pr create --title "feat(payments): PAY-2 — refunds + webhook→email + factures basiques" --body "Mandat 48 phase 2. Refunds endpoint + webhook payment_intent.succeeded → email send + module factures (migration Invoice additive)." --base main --head pay-2-refunds-and-email-and-invoices

gh pr checks --watch
```

⚠️ Surveille `prisma-drift` (migration Invoice). Si rouge → diagnose 3 tentatives puis admin merge avec doc raison.

```
gh pr merge --squash --delete-branch
git checkout main && git pull --rebase origin main
./deploy/vps/deploy.sh all
sleep 60
```

### 6.2 Rebase + push #69 MP-CATEGORY-3

```
git checkout mp-category-3-public-filters
git rebase --onto main pay-2-refunds-and-email-and-invoices mp-category-3-public-filters

pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -3
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
git push --force-with-lease

gh pr create --title "feat(marketplace): MP-CATEGORY-3 — front public catégories filtres + page index" --body "Mandat 48 phase 3. Endpoint catalog filtré par categoryId/Slug + endpoint public categories tree + page /marketplace/categories + filter component CatalogFilters." --base main --head mp-category-3-public-filters
gh pr checks --watch
gh pr merge --squash --delete-branch
git checkout main && git pull --rebase origin main
./deploy/vps/deploy.sh all
sleep 60
```

### 6.3 Rebase + push #70 MP-NOTIF-3 ph8

```
git checkout mp-notif-3-ph8-csv-export-alerts
git rebase --onto main mp-category-3-public-filters mp-notif-3-ph8-csv-export-alerts

pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -3
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
git push --force-with-lease

gh pr create --title "feat(notif): MP-NOTIF-3 phase 8 — export CSV stats + dashboard alertes" --body "Mandat 48 phase 4. Endpoint export CSV stats EmailLog + cron alertes seuil 20% error rate + bouton CSV + section alertes admin UI." --base main --head mp-notif-3-ph8-csv-export-alerts
gh pr checks --watch
gh pr merge --squash --delete-branch
git checkout main && git pull --rebase origin main
./deploy/vps/deploy.sh all
sleep 60
```

### 6.4 Rebase + push #71 BETA-PREP

```
git checkout beta-privee-prep-fixtures-doc
git rebase --onto main mp-notif-3-ph8-csv-export-alerts beta-privee-prep-fixtures-doc

pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -3
git push --force-with-lease

gh pr create --title "chore(ops): BÊTA-PRIVÉE-PREP — seed étendu + onboarding agent MCH + templates + checklist" --body "Mandat 48 phase 5. Seed-demo étendu 10 sellers + 15 produits, doc onboarding MCH 10 points, templates email seller-welcome FR+EN, script generate-seller-invite, checklist beta launch." --base main --head beta-privee-prep-fixtures-doc
gh pr checks --watch
gh pr merge --squash --delete-branch
git checkout main && git pull --rebase origin main
./deploy/vps/deploy.sh all
```

### 6.5 Smoke combiné final

```
echo "=== Health ==="
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print('status:',d['data']['status'])"

echo "=== Tables Prisma post-cascade ==="
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T postgres psql -U iox -d iox_prod -c '\\dt invoices marketplace_categories'"

echo "=== Endpoints nouveaux 401 sans auth ==="
curl -sS -w "\nHTTP %{http_code}\n" "https://iox.mycloud.yt/api/v1/payments/00000000-0000-0000-0000-000000000000/refund" -X POST | head -c 200
curl -sS -w "\nHTTP %{http_code}\n" "https://iox.mycloud.yt/api/v1/invoices" | head -c 200
curl -sS -w "\nHTTP %{http_code}\n" "https://iox.mycloud.yt/api/v1/notif-email/logs/stats/export.csv" | head -c 200

echo "=== Endpoints publiques 200 ==="
curl -sS -o /dev/null -w "categories tree %{http_code}\n" "https://iox.mycloud.yt/api/v1/marketplace/categories"
curl -sS -o /dev/null -w "page categories %{http_code}\n" "https://iox.mycloud.yt/marketplace/categories"

echo "=== Templates seller-welcome dist ==="
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T backend find /app/apps/backend/dist/notif-email/templates -name 'seller-welcome*' 2>/dev/null"
```

### 6.6 Validations finales

```
git status --short
git log --oneline origin/main | head -10
git branch | grep -vE "^\* main$" || echo "OK aucune"
echo "Total squash PR cumulés:"
git log --oneline main --grep="(#" | wc -l
```

```
git branch -D pay-2-refunds-and-email-and-invoices mp-category-3-public-filters mp-notif-3-ph8-csv-export-alerts beta-privee-prep-fixtures-doc 2>/dev/null
```

---

## Préventif blocages — résolution autonome

### Blocage CI rouge

1. `gh pr checks` détaillé → identifie job rouge.
2. `gh pr view <N> --json statusCheckRollup` → URL logs.
3. Si lint/format → fix + push.
4. Si test rouge → analyse, fix, push.
5. Si prisma-drift → `prisma migrate diff` côté local + ajuster.
6. Si après 3 tentatives toujours rouge → `gh pr merge --admin --squash` avec commit message expliquant override.

### Blocage rebase conflit

1. Lire les conflits, identifier zones (souvent imports).
2. Garder feature branch côté + intégrer main côté pour fichiers communs.
3. `pnpm --filter @iox/backend exec tsc --noEmit` après résolution.
4. Si bloqué après 3 tentatives → garder branche en l'état + doc + skip.

### Blocage fail2ban SSH

1. `sleep 300` (5 min).
2. Retry SSH `echo ok`.
3. Si encore ko, `sleep 600` puis retry.
4. Si toujours ko après 15 min → skip phase deploy + doc + avance.

### Blocage Stripe Connect (Phase 1)

Skip immédiat sans tentative répétée. User-only action.

---

## Format rapport final attendu (`notes/handoff-mandat-48.md`)

```
# Méga-mandat 48 100% autonome — handoff

## TL;DR
- Phase 0 migration Prisma : ✅ / 🟡 / ❌
- Phase 1 Stripe verification : ✅ Connect activé / ⚠️ Connect pending user action / ❌ erreur
- Phase 2 PAY-2 : ✅ / 🟡 / ❌
- Phase 3 MP-CATEGORY-3 : ✅ / 🟡 / ❌
- Phase 4 MP-NOTIF-3 ph8 : ✅ / 🟡 / ❌
- Phase 5 BÊTA-PRIVÉE-PREP : ✅ / 🟡 / ❌
- Phase 6 cascade 4 PR (#68 #69 #70 #71) : ✅ / 🟡 / ❌
- main = <SHA_FINAL>
- 4 PR mergées au total ce mandat (+ 1 commit chore migration Prisma)

## Branches livrées
[recopier liste avec SHAs]

## Phases preuves brutes
[recopier sortie commandes anti-hallucination par phase]

## Blocages rencontrés et résolutions
[liste exhaustive : si Stripe Connect pas activé, fail2ban triggered, etc.]

## Reste à faire (post-mandat)
- Activer Stripe Connect dashboard (action user 5 min) — déjà testé et fait, ou pendant
- Setup BÊTA-PRIVÉE réelle (création comptes seller MCH par agent terrain)
- Activer Resend prod si désiré (chantier ops)
```

---

## TL;DR pour Claude Code

6 phases enchaînées 100% autonomes. ~15-17h cumul. **Aucune intervention user requise.** Si blocage : 3 tentatives de fix + skip + doc + avance suite. Ne jamais STOP global.

**Principe** : preferer livrer 5 phases sur 6 que bloquer global sur 1.

Caveman resume off pour ce livrable car prompt opérationnel.
