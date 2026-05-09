# Méga-orchestrateur stratégie IOX — PAY-2 + MeiliSearch + audit OSS + rapport final

> **Décision IOX validée** : pas de pivot OSS, IOX core reste. Stratégie : IOX + OSS ciblé. Coller dans Claude Code en un seul bloc. ~12-15h cumul. Aucune intervention user requise.
>
> 5 phases enchaînées : PAY-2 (priorité absolue) → MeiliSearch intégration → mini-audit Medusa/Vendure (patterns) → rapport final → cascade PR.

## Pré-requis

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git rev-parse main                                              # → 503859a (ou plus récent)
git stash list                                                   # → vide
which gh && gh auth status                                       # → gh OK
ssh -o ConnectTimeout=5 rahiss-vps 'echo ok'                     # → ok
```

Si pas vert → **ne pas STOP** global, doc + tenter chaque phase indépendamment.

---

## Garde-fous transverses

- 0 force-push main, force-with-lease feature OK après rebase.
- 0 `gh pr merge --admin` sauf CI rouge bloquant après 3 tentatives + doc raison.
- 0 envoi email externe (transport mock).
- 0 modification env vars VPS sauf section Phase 2 (`MEILISEARCH_*`).
- Migrations Prisma additives uniquement.
- ControlMaster SSH actif → sleep 60s entre deploys.
- 0 remplacement modules existants sellers/products/offers/RFQ/payments.
- 0 introduction stack lourde (Java, PHP, Ruby).
- Préserver Prisma + NestJS + Next.js.
- Auto-résolution blocages 3 tentatives + skip+doc, NE JAMAIS STOP global.

---

## PHASE 0 — Migration Prisma urgente (si pas déjà fait) — ~10 min

Vérifier si migration `add-company-postal-code-description` appliquée :

```
git checkout main
git pull --rebase origin main
ls prisma/migrations/ | grep -i "company.*postal" 2>&1 | head -3
```

Si absente :
```
pnpm --filter @iox/backend exec prisma migrate dev --name add-company-postal-code-description
git add prisma/migrations/ prisma/schema.prisma
git commit -m "chore(prisma): add company.postalCode + description (additive)"
git push origin main
./deploy/vps/deploy.sh all
sleep 60
```

Sinon skip.

---

## PHASE 1 — PAY-2 (priorité absolue) — ~5h

**Branche** : `pay-2-refunds-and-email-and-invoices` à partir de main.

### 1.1 Backend refunds

Endpoint `POST /api/v1/payments/:id/refund` :
- Roles ADMIN, COORDINATOR, SELLER (ownership).
- DTO `RefundPaymentDto` : `{ amountCents?: number, reason?: string }` (full ou partial).
- Service `PaymentsService.refund(id, dto, actor)` : valide Payment status=SUCCEEDED, appelle Stripe `refunds.create({ payment_intent, amount?, reason? })` via factory mock, update Payment status=REFUNDED + metadata.refundId, audit log `PAYMENT_REFUNDED`.
- 5 specs.

### 1.2 Backend webhook → email send

Étendre `payments-webhook.service.ts` :
- Sur `payment_intent.succeeded` → `NotifEmailService.send` template `payment-confirmed-to-buyer`.
- Pattern `safeNotify` (try/catch + log warn).
- 3 specs.

### 1.3 Backend factures (migration Invoice additive)

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

Service `InvoicesService` :
- `generateForPayment(paymentId)` — appelé sur `payment_intent.succeeded`.
- `getByPaymentId(paymentId, actor)` ownership.
- `listMine(filters, actor)` paginated.
- Format invoiceNumber `IOX-YYYY-NNNNNN`.
- PDF V1 = stub (501).

4 endpoints + 6 specs.

### 1.4 Frontend pages invoices

`/buyer/invoices` + `/seller/invoices` (list + detail). Helper API `lib/invoices.ts`. 4 specs.

### 1.5 Doc + preuves

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

## PHASE 2 — MeiliSearch intégration — ~5h

**Branche** : `meilisearch-search-engine` à partir de `pay-2-refunds-and-email-and-invoices`.

### 2.1 Backend — installer MeiliSearch SDK + client

```
pnpm --filter @iox/backend add meilisearch
```

Service `apps/backend/src/search/meilisearch-client.factory.ts` :
- Token DI `MEILISEARCH_CLIENT_FACTORY` (pattern factory comme Stripe).
- Lit env : `MEILISEARCH_HOST`, `MEILISEARCH_API_KEY`.
- Si env absent → throw clair (graceful degradation au boot OK).
- Mock injecté en tests.

### 2.2 Migration Prisma — ajouter `searchIndexedAt` aux models indexés

```prisma
model MarketplaceProduct {
  ...
  searchIndexedAt DateTime? @map("search_indexed_at")
  searchIndexHash String?   @map("search_index_hash")  // hash data pour skip si inchangé
  ...
}

model SellerProfile {
  ...
  searchIndexedAt DateTime? @map("search_indexed_at")
  searchIndexHash String?   @map("search_index_hash")
  ...
}
```

```
pnpm --filter @iox/backend exec prisma migrate dev --name meilisearch_indexed_at
```

### 2.3 Backend — module `search`

Créer `apps/backend/src/search/`:

- `search.module.ts` exposant `SearchService` + `SearchIndexerService`.
- `search.service.ts` :
  - `searchProducts(query, filters, page, limit)` — appelle MeiliSearch index `products`. Si MeiliSearch down → fallback Postgres (catalog actuel).
  - `searchSellers(query, filters)` — similaire pour index `sellers`.
- `search-indexer.service.ts` :
  - `indexProduct(productId)` — récupère product Prisma + sérialise + push MeiliSearch.
  - `indexSeller(sellerId)` — idem.
  - `reindexAll()` — batch full reindex.
  - Hash data pour skip no-change.
- `search.controller.ts` :
  - `GET /api/v1/marketplace/search/products?q=&category=&country=&certifications=&saisonalityMonth=&moqMax=&availableOnly=&sellerStatus=&page=&limit=` — endpoint public.
  - `GET /api/v1/marketplace/search/sellers?q=&...` — endpoint public.
  - `POST /api/v1/admin/search/reindex` (admin only) — déclenche `reindexAll`.

### 2.4 Schema MeiliSearch — facettes

Index `products` :
- searchableAttributes : `commercialName`, `subtitle`, `varietySpecies`, `productionMethod`, `description`, `sellerDisplayName`, `categoryName` (FR + EN concat).
- filterableAttributes : `categoryId`, `categorySlug`, `originCountry`, `originRegion`, `qualityAttributes`, `temperatureRequirements`, `availabilityMonths`, `moq`, `availableOnly`, `sellerStatus`, `publicationStatus`, `exportReadinessStatus`.
- sortableAttributes : `featuredRank`, `unitPrice`, `createdAt`.
- typoTolerance enabled (default settings).

Index `sellers` :
- searchableAttributes : `publicDisplayName`, `slug`, `description`, `country`, `region`.
- filterableAttributes : `country`, `region`, `status`.

### 2.5 Sync Prisma → MeiliSearch

Stratégie sync :
- **Sync on save** : hook `onUpdate` Prisma extension OR appel explicite `searchIndexer.indexProduct(id)` après chaque create/update product/seller.
- **Reindex daily** : cron `@Cron(EVERY_DAY_AT_3AM)` qui réindex tout (filet de sécurité).
- **Reindex command** : `pnpm --filter @iox/backend run reindex:meilisearch` script CLI manuel.

### 2.6 Frontend — intégration search avancée

Étendre `apps/frontend/src/app/marketplace/page.tsx` (catalog) :
- Si MeiliSearch dispo (env public flag `NEXT_PUBLIC_SEARCH_BACKEND=meili`) → utilise nouveau endpoint `/search/products` avec auto-completion.
- Sinon → fallback existant catalog Postgres.
- Helper API `apps/frontend/src/lib/search.ts`.

Composant `SearchBar.tsx` avec auto-completion typo-tolerant.

### 2.7 Tests

- Backend `search.service.spec.ts` (8 specs : query, filters, fallback Postgres si MeiliSearch down, ownership scoping public).
- Backend `search-indexer.service.spec.ts` (5 specs : index product, index seller, reindex all, hash skip).
- Backend `search.controller.spec.ts` (4 specs : public endpoint OK, filters combinés, admin reindex).
- Frontend `SearchBar.test.tsx` + `marketplace/page.test.tsx` (4 specs : autocomplete, fallback).

### 2.8 Doc

`docs/marketplace/MEILISEARCH_INTEGRATION.md` :
- Architecture sync Prisma → MeiliSearch.
- Schema indexes products + sellers.
- Fallback Postgres documenté.
- Activation prod : env vars VPS + reindex command.
- TODO future : monitoring Meili, alerting, scaling.

### 2.9 Compose + env vars VPS

Étendre `docker-compose.vps.yml` (gitignored, manual edit) avec service `meilisearch` :
```yaml
meilisearch:
  image: getmeili/meilisearch:v1.10
  container_name: iox_meilisearch
  restart: unless-stopped
  environment:
    MEILI_MASTER_KEY: ${MEILISEARCH_API_KEY}
    MEILI_NO_ANALYTICS: 'true'
    MEILI_ENV: production
  volumes:
    - meili_data:/meili_data
  ports:
    - "127.0.0.1:7700:7700"
  healthcheck:
    test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:7700/health"]
    interval: 5s
    timeout: 3s
    retries: 6
```

Backend `environment:` ajouter :
```yaml
MEILISEARCH_HOST: http://meilisearch:7700
MEILISEARCH_API_KEY: ${MEILISEARCH_API_KEY}
```

Volumes : `meili_data: {}`.

`.env` VPS ajouter `MEILISEARCH_API_KEY=<random_64_chars>`.

### 2.10 Preuves Phase 2

```
git log --oneline pay-2-refunds-and-email-and-invoices..meilisearch-search-engine
git diff pay-2-refunds-and-email-and-invoices..meilisearch-search-engine --stat
grep -nE "meilisearch|MeiliSearch" apps/backend/package.json
ls apps/backend/src/search/
grep -n "MEILISEARCH" apps/backend/src/common/config/env.validation.ts
pnpm --filter @iox/backend test src/search 2>&1 | tail -10
pnpm --filter @iox/frontend test marketplace 2>&1 | tail -10
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -3
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
```

---

## PHASE 3 — Mini-audit OSS (Medusa + Vendure) patterns à récupérer — ~2h

**Branche** : `audit-oss-marketplace-patterns` à partir de `meilisearch-search-engine`.

**0 code applicatif** — uniquement docs avec patterns identifiés et adaptations possibles à IOX.

### 3.1 Audit Medusa.js

Lire docs Medusa (https://docs.medusajs.com/) en webfetch, extraire patterns :
- **Vendor dashboard** : structure UI back-office vendeur Medusa (sections : products, orders, payouts, settings).
- **Split order** : Medusa fait split commande multi-vendor en sub-orders. Pattern à analyser pour IOX si offre multi-seller (V2).
- **Commissions** : modèle Medusa marketplace plugin (commission par vendor, par catégorie, par produit).
- **Buyer-seller messaging** : module messaging Medusa Marketplace (thread + attachments).
- **Vendor verification** : workflow KYC/onboarding vendeur Medusa.
- **Payout lifecycle** : Medusa payouts (cron auto + manual + retry).

### 3.2 Audit Vendure

Idem pour Vendure (https://docs.vendure.io/) :
- **Multi-seller plugin** : différences avec Medusa.
- **Custom fields** : patterns extension entité vendor.
- **Promotions** : engine remises Vendure adaptable.
- **Search** : Vendure utilise ElasticSearch officiellement, comparer à MeiliSearch IOX.

### 3.3 Comparaison vs IOX

Tableau pour chaque pattern OSS :
- Présent dans IOX V1 ? oui/partial/non
- Pertinence IOX (B2B agro export) ? élevée/moyenne/faible
- Effort intégration IOX ? petit/moyen/gros
- Verdict : à intégrer V2 / à adapter / non pertinent

### 3.4 Doc

Créer `docs/strategy/OSS_MARKETPLACE_PATTERNS_AUDIT.md` :
- Section Medusa (5-7 patterns).
- Section Vendure (5-7 patterns).
- Tableau comparatif vs IOX.
- 10 actions concrètes recommandées V2-V3 (pattern → adaptation IOX → effort estimé).

Pas de modifs code, juste doc.

### 3.5 Preuves Phase 3

```
git log --oneline meilisearch-search-engine..audit-oss-marketplace-patterns
ls docs/strategy/OSS_MARKETPLACE_PATTERNS_AUDIT.md
wc -l docs/strategy/OSS_MARKETPLACE_PATTERNS_AUDIT.md
```

---

## PHASE 4 — Rapport stratégique final — ~1h

**Branche** : `strategy-report-iox-vs-oss` à partir de `audit-oss-marketplace-patterns`.

### 4.1 Rapport stratégique

Créer `docs/strategy/IOX_VS_OSS_STRATEGY_REPORT.md` :

#### Section 1 — Décision validée
- Pas de pivot OSS complet.
- IOX core reste backbone marketplace.
- OSS = briques ciblées seulement.

#### Section 2 — IOX core (modules à PRESERVER)
Liste détaillée :
- Sellers + SellerProfile + certifications + media (logo/bannière/galerie/vidéo).
- Products + 8 dimensions FP-x agro.
- Offers + cycle de vie complet (DRAFT→IN_REVIEW→PUBLISHED→…).
- RFQ workflow B2B + messaging + transitions notif.
- Payments PAY-1 ph1 (Stripe Connect Express test mode).
- PAY-2 (refunds + invoices + email branchement).
- Notif emails 6 templates EN + FR.
- I18N FR/EN pages publiques.
- Admin moderation media + audit logs.
- Categories admin + UI tree.

#### Section 3 — Modules EXTERNALISÉS
- **Search avancé** → MeiliSearch (Phase 2 livrée).
- **Logistique/shipping** → EasyPost / Shippo si V2.
- **Compta/factures avancées** → Pennylane API si V3.
- **Recommendation engine** → Recombee si V2.

#### Section 4 — Risques techniques
- Stripe Connect non activé dashboard (pendant user action).
- Resend non activé prod (mode mock).
- BÊTA-PRIVÉE setup pas encore fait.
- Specs auth fail local (env-dépendant, CI vert).

#### Section 5 — Checklist déploiement V1
20 items :
- DNS Cloudflare configuré.
- TLS Let's Encrypt actif.
- Stripe Connect activé + webhook configuré.
- Resend domain vérifié + API key set.
- MeiliSearch healthcheck OK.
- 3 sellers MCH onboardés (BÊTA).
- 5 produits demo hydratés.
- Smoke E2E vert.
- Backup DB automatisé.
- Monitoring Loki+Grafana actif.
- ...

#### Section 6 — Tests E2E obligatoires
20 scénarios :
- Login smoke-seller + onboarding Stripe Connect (URL retournée).
- Création produit + publication + visible catalog public.
- Buyer crée RFQ → seller reçoit email mock → seller répond → buyer reçoit notif transition.
- Paiement test Stripe Checkout → webhook → EmailLog SENT → invoice créée DRAFT.
- Refund Payment SUCCEEDED → status REFUNDED.
- Search MeiliSearch query "vanille" → résultats triés.
- Search filtre `qualityAttribute=ORGANIC` → résultats filtrés.
- I18N switch FR↔EN sur catalog → strings traduits.
- Admin moderation : pending media → approve → visible public.
- Admin audit : list logs filtrés par action/entityType.
- Buyer dashboard orders : list RFQ won.
- Seller dashboard payments : status onboarding Stripe.
- ...

#### Section 7 — Roadmap 6 mois post V1
- Mois 1 : V1 launch BÊTA-PRIVÉE 5-10 sellers MCH.
- Mois 2 : feedback + fixes + Resend activation prod.
- Mois 3 : V2 features (vendor messaging amélioré, recommendation, multi-currency basique).
- Mois 4 : V2 launch publique (50+ sellers).
- Mois 5-6 : V3 (factures avancées Pennylane, logistique Shippo, app mobile MVP basée brief 23).

### 4.2 Preuves Phase 4

```
git log --oneline audit-oss-marketplace-patterns..strategy-report-iox-vs-oss
ls docs/strategy/IOX_VS_OSS_STRATEGY_REPORT.md
wc -l docs/strategy/IOX_VS_OSS_STRATEGY_REPORT.md
```

---

## PHASE 5 — Cascade 4 PR (PAY-2 + MeiliSearch + audit + rapport) — ~1h30

```
git checkout main
git fetch origin --prune
git status --short
```

### 5.1 Push #68 PAY-2

```
git checkout pay-2-refunds-and-email-and-invoices
git push -u origin pay-2-refunds-and-email-and-invoices
gh pr create --title "feat(payments): PAY-2 — refunds + webhook→email + factures basiques (migration Invoice)" --body "Mandat 49 phase 1. Refunds endpoint + webhook payment_intent.succeeded → email send + module factures (migration Invoice additive)." --base main --head pay-2-refunds-and-email-and-invoices
gh pr checks --watch
```

⚠️ Surveille `prisma-drift` (migration Invoice). Si rouge 3 tentatives puis admin merge avec doc.

```
gh pr merge --squash --delete-branch
git checkout main && git pull --rebase origin main
./deploy/vps/deploy.sh all
sleep 60
```

### 5.2 Rebase + push #69 MeiliSearch

```
git checkout meilisearch-search-engine
git rebase --onto main pay-2-refunds-and-email-and-invoices meilisearch-search-engine
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -3
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
git push --force-with-lease

gh pr create --title "feat(search): MeiliSearch integration — index products+sellers + facettes + fallback Postgres" --body "Mandat 49 phase 2. Module search backend MeiliSearch SDK + factory DI + indexer + reindex command + fallback Postgres si Meili down + frontend SearchBar. Migration searchIndexedAt additive. Service compose Meilisearch ajouté docker-compose.vps.yml (gitignored)." --base main --head meilisearch-search-engine
gh pr checks --watch
gh pr merge --squash --delete-branch
git checkout main && git pull --rebase origin main
./deploy/vps/deploy.sh all
sleep 60
```

### 5.3 Rebase + push #70 audit OSS

```
git checkout audit-oss-marketplace-patterns
git rebase --onto main meilisearch-search-engine audit-oss-marketplace-patterns
git push --force-with-lease
gh pr create --title "docs(strategy): audit OSS marketplace patterns Medusa + Vendure" --body "Mandat 49 phase 3. Doc only — patterns OSS extraits + comparaison vs IOX + 10 actions V2-V3 recommandées." --base main --head audit-oss-marketplace-patterns
gh pr checks --watch
gh pr merge --squash --delete-branch
git checkout main && git pull --rebase origin main
sleep 30
```

### 5.4 Rebase + push #71 rapport stratégique

```
git checkout strategy-report-iox-vs-oss
git rebase --onto main audit-oss-marketplace-patterns strategy-report-iox-vs-oss
git push --force-with-lease
gh pr create --title "docs(strategy): rapport stratégique IOX vs OSS + checklist V1 + roadmap 6 mois" --body "Mandat 49 phase 4. Rapport final — modules IOX preserved + modules externalisés + checklist déploiement V1 + 20 tests E2E obligatoires + roadmap 6 mois post V1." --base main --head strategy-report-iox-vs-oss
gh pr checks --watch
gh pr merge --squash --delete-branch
git checkout main && git pull --rebase origin main
```

### 5.5 Smoke combiné

```
echo "=== Health ==="
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print('status:',d['data']['status'])"

echo "=== Tables Prisma post-cascade ==="
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T postgres psql -U iox -d iox_prod -c '\\dt invoices'"
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T postgres psql -U iox -d iox_prod -c '\\d marketplace_products' | grep -E 'search_indexed_at|search_index_hash'"

echo "=== Endpoints PAY-2 ==="
curl -sS -w "\nHTTP %{http_code}\n" "https://iox.mycloud.yt/api/v1/invoices" | head -c 200
curl -sS -w "\nHTTP %{http_code}\n" -X POST "https://iox.mycloud.yt/api/v1/payments/00000000-0000-0000-0000-000000000000/refund" | head -c 200

echo "=== Endpoints search ==="
curl -sS -w "\nHTTP %{http_code}\n" "https://iox.mycloud.yt/api/v1/marketplace/search/products?q=vanille&limit=5" | head -c 400

echo "=== Docs strategy présents ==="
ssh rahiss-vps "cd /opt/apps/iox && ls docs/strategy/"
```

### 5.6 Validations finales

```
git status --short
git log --oneline origin/main | head -10
git branch | grep -vE "^\* main$" || echo "OK aucune"
echo "Total squash PR cumulés:"
git log --oneline main --grep="(#" | wc -l
```

```
git branch -D pay-2-refunds-and-email-and-invoices meilisearch-search-engine audit-oss-marketplace-patterns strategy-report-iox-vs-oss 2>/dev/null
```

---

## Préventif blocages — résolution autonome

Pareil que mandat 48 :
- CI rouge → 3 tentatives fix + admin merge si nécessaire avec doc.
- Rebase conflit → 3 tentatives intelligentes + skip+doc si stuck.
- Fail2ban SSH → sleep 300/600 → skip phase deploy + doc.
- MeiliSearch dispo VPS → si compose pas patché manual user action requis (skip Phase 2 deploy mais code mergé OK pour next deploy).

---

## Format rapport final attendu (`notes/handoff-mandat-49.md`)

```
# Méga-mandat 49 stratégie IOX — handoff

## TL;DR
- Décision validée : IOX core preserved, pas de pivot OSS. ✅
- Phase 0 migration Prisma : ✅ / 🟡 / déjà fait
- Phase 1 PAY-2 : ✅ / 🟡 / ❌
- Phase 2 MeiliSearch intégration : ✅ / 🟡 / ❌
- Phase 3 audit OSS patterns : ✅ / 🟡 / ❌
- Phase 4 rapport stratégique : ✅ / 🟡 / ❌
- Phase 5 cascade 4 PR (#68 #69 #70 #71) : ✅ / 🟡 / ❌
- main = <SHA_FINAL>
- 4 PR mergées au total

## Branches livrées
[recopier liste avec SHAs]

## Phases preuves brutes
[recopier sortie commandes anti-hallucination par phase]

## Stratégie validée — résumé
- IOX = backbone marketplace B2B agro export.
- OSS ciblé : MeiliSearch (search), Recombee (recommendation V2), Pennylane (factures V3), Shippo (logistique V2).
- Patterns Medusa/Vendure récupérés en doc pour V2-V3.

## Reste à faire (post-mandat)
- Activer Stripe Connect dashboard (action user 5 min)
- Activer Resend prod (chantier ops)
- Setup BÊTA-PRIVÉE sellers MCH réels (action MCH terrain)
- Patch docker-compose.vps.yml VPS pour service meilisearch (si pas déjà fait par script auto)
- Reindex initial : `pnpm --filter @iox/backend run reindex:meilisearch`
```

---

## TL;DR pour Claude Code

5 phases enchaînées 100% autonomes. ~12-15h cumul. **Aucune intervention user requise.** Si blocage : 3 tentatives + skip + doc + avance suite. **NE JAMAIS STOP global.**

**Principe** : préférer livrer 5 phases / 5 ou 4/5 avec 1 skip que bloquer global sur 1.

Caveman resume off pour ce livrable car prompt opérationnel.
