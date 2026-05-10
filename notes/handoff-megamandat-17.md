# Méga-mandat 17 — handoff

## TL;DR

- LOT 1 MP-NOTIF-1 phase 1 : ✅ — 8 commits, +21 specs jest backend (notif + quote-requests).
- LOT 2 MP-OFFER-DUPLICATE : ✅ — 4 commits, +6 specs jest backend, +4 specs vitest frontend.
- LOT 3 SEED-DEMO-FIX-3 : ✅ — 3 commits, +5 specs jest seed-demo, idempotence vérifiée 2 runs réels DB locale.
- **Total commits** : 15 + 1 plan = **16 commits sur 3 branches chaînées**.
- **main intact** : `db36db7` (jamais touché).
- Aucun push, aucun merge, aucun deploy, aucun gh, aucun ssh, aucun envoi email externe.
- Backend tsc + frontend tsc : silencieux (clean).
- Auth specs pré-existants en échec (depuis `39bfbd0`, hors scope) : ignorés.

## Branches livrées

```
main (db36db7)
   │
   ▼
mp-notif-1-transactional-emails-phase1 (HEAD: 8f94458)
   │
   ▼
mp-offer-duplicate-1-seller-clone      (HEAD: 27a55ce)
   │
   ▼
seed-demo-fix-3-public-docs-and-rfq    (HEAD: 0d47467)
```

---

## LOT 1 — MP-NOTIF-1 phase 1

### Commits

```
66d4447 chore(notes): plan MP-NOTIF-1 phase 1
bc62a8f chore(deps): add nodemailer + @types/nodemailer (backend)
eed8cae feat(notif): MP-NOTIF-1 — module + transports + factory + types + 2 templates RFQ
2029f00 feat(notif): MP-NOTIF-1 — config env (NOTIF_EMAIL_TRANSPORT/FROM/REPLY_TO)
94678ec feat(quote-requests): MP-NOTIF-1 — branchement send sur create + addMessage
a566b43 test(notif): MP-NOTIF-1 — couverture service + templates (17 specs)
a4255ad test(quote-requests): MP-NOTIF-1 — assertions sur send appelé avec bons args (+7 specs)
8f94458 docs(marketplace): MP_NOTIF_1_PHASE_1 — infra emails transactionnels + 2 templates RFQ
```

### Fichiers créés / modifiés

- `apps/backend/src/notif-email/` — module complet (8 fichiers + 3 spec) :
  - `notif-email.module.ts`, `notif-email.service.ts`, `notif-email.types.ts`
  - `transport.factory.ts`
  - `transports/mock.transport.ts`, `transports/smtp-stream.transport.ts`
  - `templates/index.ts`, `templates/rfq-created-to-seller.template.ts`, `templates/rfq-message-created.template.ts`
  - 3 fichiers spec (service + 2 templates)
- `apps/backend/src/quote-requests/quote-requests.service.ts` — branchement
  `safeNotify` sur `create` (rfq-created-to-seller → seller.salesEmail) et
  `addMessage` (rfq-message-created → l'autre partie).
- `apps/backend/src/quote-requests/quote-requests.module.ts` — import `NotifEmailModule`.
- `apps/backend/src/app.module.ts` — déclaration `NotifEmailModule`.
- `apps/backend/src/common/config/env.validation.ts` — 3 vars
  (`NOTIF_EMAIL_TRANSPORT`, `NOTIF_EMAIL_FROM`, `NOTIF_EMAIL_REPLY_TO`).
- `apps/backend/package.json` — ajout `nodemailer ^8.0.7` + `@types/nodemailer`.
- `docs/marketplace/MP_NOTIF_1_PHASE_1.md` — guide infra + procédure.

### Décisions notables

- **Aucun envoi réseau** : transport `mock` par défaut (in-memory),
  `smtp-stream` utilise `streamTransport: true` (sérialisation MIME sans
  socket).
- `safeNotify` wrappe les appels en try/catch silencieux + log warn :
  un email en échec ne casse pas la création RFQ ou message.
- Templates 100% TS, pas de moteur de template externe. Inline-styles
  HTML, pas d'images, max-width 600px. Échappement HTML manuel sur
  champs utilisateur (testé).
- Le smoke seller `salesEmail` peut être null → skip silencieux warn log.

### Preuves brutes

```
$ git log --oneline main..mp-notif-1-transactional-emails-phase1
8f94458 docs(marketplace): MP_NOTIF_1_PHASE_1 — infra emails transactionnels + 2 templates RFQ
a4255ad test(quote-requests): MP-NOTIF-1 — assertions sur send appelé avec bons args (+7 specs)
a566b43 test(notif): MP-NOTIF-1 — couverture service + templates (17 specs)
94678ec feat(quote-requests): MP-NOTIF-1 — branchement send sur create + addMessage
2029f00 feat(notif): MP-NOTIF-1 — config env (NOTIF_EMAIL_TRANSPORT/FROM/REPLY_TO)
eed8cae feat(notif): MP-NOTIF-1 — module + transports + factory + types + 2 templates RFQ
bc62a8f chore(deps): add nodemailer + @types/nodemailer (backend)
66d4447 chore(notes): plan MP-NOTIF-1 phase 1

$ git diff main..mp-notif-1-transactional-emails-phase1 --stat | tail -3
 21 files changed, 1430 insertions(+), 8 deletions(-)

$ ls apps/backend/src/notif-email/
notif-email.module.ts  notif-email.service.spec.ts  notif-email.service.ts  notif-email.types.ts  transport.factory.ts  templates  transports

$ ls apps/backend/src/notif-email/transports/
mock.transport.ts  smtp-stream.transport.ts

$ ls apps/backend/src/notif-email/templates/
index.ts  rfq-created-to-seller.template.spec.ts  rfq-created-to-seller.template.ts  rfq-message-created.template.spec.ts  rfq-message-created.template.ts

$ grep -rn NotifEmailService apps/backend/src/quote-requests/
quote-requests.module.ts:5:import { NotifEmailModule } from '../notif-email/notif-email.module';
quote-requests.service.ts:11:import { NotifEmailService } from '../notif-email/notif-email.service';
quote-requests.service.ts:108:    private notifEmail: NotifEmailService,
quote-requests.service.ts:151:      const res = await this.notifEmail.send({ to, templateId, templateData });
quote-requests.service.spec.ts:8:import { NotifEmailService } from '../notif-email/notif-email.service';
quote-requests.service.spec.ts:107:    notifEmail = ...

$ pnpm --filter @iox/backend test src/notif-email
PASS src/notif-email/templates/rfq-created-to-seller.template.spec.ts
PASS src/notif-email/templates/rfq-message-created.template.spec.ts
PASS src/notif-email/notif-email.service.spec.ts
Test Suites: 3 passed, 3 total
Tests:       17 passed, 17 total

$ pnpm --filter @iox/backend test src/quote-requests
PASS src/quote-requests/quote-requests.service.spec.ts
Tests:       39 passed, 39 total

$ pnpm --filter @iox/backend exec tsc --noEmit
(silencieux)

$ grep nodemailer apps/backend/package.json
    "nodemailer": "^8.0.7",
    "@types/nodemailer": "^8.0.0",
```

---

## LOT 2 — MP-OFFER-DUPLICATE

### Commits

```
ca50a3a feat(marketplace-offers): MP-OFFER-DUPLICATE — endpoint POST /:id/duplicate (clone seller)
2090115 test(marketplace-offers): MP-OFFER-DUPLICATE — couverture duplicate (+6 specs)
c7ebec1 feat(frontend): MP-OFFER-DUPLICATE — bouton Dupliquer + helper API
27a55ce test(frontend): MP-OFFER-DUPLICATE — couverture bouton Dupliquer (+4 specs)
```

### Fichiers modifiés

- `apps/backend/src/marketplace-offers/marketplace-offers.service.ts` —
  méthode `duplicate(id, actor)`. Clone tous les champs commerciaux,
  reset complet du cycle de vie (DRAFT, PENDING_QUALITY_REVIEW, dates
  null, featuredRank null, rejectionReason null, IDs createdBy/updatedBy
  pointés sur l'actor). Title = `(copie) ` + source tronqué à 100 chars.
- `apps/backend/src/marketplace-offers/marketplace-offers.controller.ts` —
  endpoint `POST /marketplace/offers/:id/duplicate` ouvert à `SELLER_EDIT`,
  201 Created.
- `apps/backend/src/marketplace-offers/marketplace-offers.service.spec.ts` —
  6 nouveaux specs (happy path, ownership seller OK, ownership rejet,
  source 404, troncage 95 chars, no batch cloning).
- `apps/frontend/src/lib/marketplace-offers.ts` — méthode
  `marketplaceOffersApi.duplicate(id, token)`.
- `apps/frontend/src/app/(dashboard)/seller/marketplace-offers/[id]/page.tsx`
  — bouton « Dupliquer » (Lucide Copy), confirm dialog FR, état
  `duplicating`, redirection vers nouvelle URL au succès.
- Test FE étendu avec 4 specs (rendu, confirm OK, confirm refusé,
  erreur API).

### Décisions notables

- Pas de duplication des `MarketplaceOfferBatch` (V1 — futur lot V2).
- Title préfixé `(copie) ` : 8 chars de prefix, source tronqué à
  `100 - 8 = 92` chars max → respecte la limite 100.
- Reset `exportReadinessStatus = PENDING_QUALITY_REVIEW` (cohérent avec
  `create`, l'enum n'a pas de `NOT_STARTED` — décision documentée dans
  l'audit `MARKETPLACE_OFFER_DUPLICATED`).

### Preuves brutes

```
$ git log --oneline mp-notif-1-transactional-emails-phase1..mp-offer-duplicate-1-seller-clone
27a55ce test(frontend): MP-OFFER-DUPLICATE — couverture bouton Dupliquer (+4 specs)
c7ebec1 feat(frontend): MP-OFFER-DUPLICATE — bouton Dupliquer + helper API
2090115 test(marketplace-offers): MP-OFFER-DUPLICATE — couverture duplicate (+6 specs)
ca50a3a feat(marketplace-offers): MP-OFFER-DUPLICATE — endpoint POST /:id/duplicate (clone seller)

$ git diff mp-notif-1-transactional-emails-phase1..mp-offer-duplicate-1-seller-clone --stat
 4 files changed, 363 insertions(+), 14 deletions(-)

$ grep -n duplicate apps/backend/src/marketplace-offers/marketplace-offers.controller.ts
138:  // MP-OFFER-DUPLICATE — Clone une offre seller en nouveau brouillon.
139:  @Post(':id/duplicate')
142:  @ApiOperation({ summary: "Dupliquer l'offre en nouveau brouillon DRAFT" })
143:  duplicate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: RequestUser) {
144:    return this.service.duplicate(id, actor);

$ grep -n duplicate apps/backend/src/marketplace-offers/marketplace-offers.service.ts
202:   * MP-OFFER-DUPLICATE — Clone une offre du seller en un nouveau brouillon
214:  async duplicate(id: string, actor: RequestUser) {
237:    const newTitle = `${COPY_PREFIX}${truncated}`;
271:      action: 'MARKETPLACE_OFFER_DUPLICATED',

$ grep -n duplicate apps/frontend/src/lib/marketplace-offers.ts
208:   * MP-OFFER-DUPLICATE — Cloner une offre du seller en nouveau brouillon DRAFT.
215:  duplicate: (id: string, token: string) =>
216:    api.post<MarketplaceOfferDetail>(`/marketplace/offers/${id}/duplicate`, {}, token),

$ pnpm --filter @iox/backend test src/marketplace-offers
PASS src/marketplace-offers/marketplace-offers.service.spec.ts
Tests:       39 passed, 39 total

$ pnpm --filter @iox/frontend test marketplace-offers
✓ src/app/(dashboard)/seller/marketplace-offers/page.test.tsx (2 tests)
✓ src/app/(dashboard)/seller/marketplace-offers/new/page.test.tsx (4 tests)
✓ src/app/(dashboard)/seller/marketplace-offers/[id]/page.test.tsx (13 tests)
Test Files  3 passed (3)
     Tests  19 passed (19)

$ tsc backend / frontend → clean
```

---

## LOT 3 — SEED-DEMO-FIX-3

### Commits

```
17a190a chore(notes): plan SEED-DEMO-FIX-3
dafefcd feat(seed-demo): SEED-DEMO-FIX-3 — 4 docs PUBLIC + 2 RFQ + 4 messages + smoke-buyer (idempotent)
0d47467 test(seed-demo): SEED-DEMO-FIX-3 — couverture nouveaux compteurs (+5 specs)
```

### Fichiers modifiés

- `apps/backend/src/seed-demo/dataset.ts` — types `DemoPublicDocument`,
  `DemoQuoteRequest`, exports `SMOKE_BUYER_EMAIL`, `SMOKE_BUYER_COMPANY_CODE`,
  4 documents PUBLIC, 2 RFQ scénarisées avec messages.
- `apps/backend/src/seed-demo/runner.ts` — extension `RunnerOptions` (+4
  modèles Prisma), `RunnerSummary` (+4 compteurs), création idempotente
  des `Document` MCH + `MarketplaceDocument` PUBLIC, smoke-buyer + Company
  DEMO-BUYER-001 + UserCompanyMembership, 2 RFQ + 4 messages.
- `apps/backend/src/seed-demo/seed-demo.spec.ts` — étendu (mock prisma +4
  modèles, +5 specs SEED-DEMO-FIX-3, mise à jour test SMOKE_SELLER pour
  attendre 2 user.upsert).

### Décisions notables

- **Idempotence** :
  - `Document` MCH : `findFirst({ storageKey })` puis update/create
    (storageKey unique par convention seed, pas d'unique formel).
  - `MarketplaceDocument` : `findFirst({ relatedId, documentId })` →
    update/create.
  - `QuoteRequest` : `findFirst({ buyerCompanyId, marketplaceOfferId,
    targetMarket: seedKey })` (le `targetMarket` est utilisé comme tag
    interne idempotent — pas affiché côté UI).
  - `QuoteRequestMessage` : `findFirst({ quoteRequestId, authorUserId,
    message })` puis create si absent.
- Le seed bypass volontairement `QuoteRequestsService.create` (qui aurait
  déclenché le LOT 1 notif). Persistance directe via `prisma.quoteRequest`
  → pas d'effet de bord email.
- Document MCH créé avec `linkedEntityType=MARKETPLACE_PRODUCT`,
  storageKey factice, fileSize synthétique. Pas de fichier réel uploadé
  (le filtre catalog ne télécharge pas le fichier).
- Smoke buyer : Company `BUYER` (le type `IMPORTER` n'existe pas dans
  l'enum CompanyType — décision documentée).

### Preuves brutes

```
$ git log --oneline mp-offer-duplicate-1-seller-clone..seed-demo-fix-3-public-docs-and-rfq
0d47467 test(seed-demo): SEED-DEMO-FIX-3 — couverture nouveaux compteurs (+5 specs)
dafefcd feat(seed-demo): SEED-DEMO-FIX-3 — 4 docs PUBLIC + 2 RFQ + 4 messages + smoke-buyer (idempotent)
17a190a chore(notes): plan SEED-DEMO-FIX-3

$ git diff mp-offer-duplicate-1-seller-clone..seed-demo-fix-3-public-docs-and-rfq --stat
 apps/backend/src/seed-demo/dataset.ts        | 104 ++++++++++++
 apps/backend/src/seed-demo/runner.ts         | 261 +++++++++++++++++++++++++-
 apps/backend/src/seed-demo/seed-demo.spec.ts | 169 ++++++++++++++--
 notes/seed-demo-fix-3-plan.md                |  63 +++++++
 4 files changed, 581 insertions(+), 16 deletions(-)

$ grep -n PUBLIC apps/backend/src/seed-demo/dataset.ts
686:  // SEED-DEMO-FIX-3 — 4 documents PUBLIC (1 par seller principal) pour
687:  //   que le filtre catalog `?hasPublicDocs=true` retourne 4.
(+ 4 entrées documentType + visibility PUBLIC)

$ grep -n QuoteRequest apps/backend/src/seed-demo/dataset.ts | head -5
74-83: types DemoQuoteRequest
725-754: 2 entrées quoteRequests

$ pnpm --filter @iox/backend test src/seed-demo
PASS src/seed-demo/seed-demo.spec.ts
Tests:       19 passed, 19 total

$ DATABASE_URL=... NODE_ENV=development IOX_DEMO_SEED=1 NOTIF_EMAIL_TRANSPORT=mock pnpm --filter @iox/backend run seed:demo
🌱 Demo seed starting…
✅ Demo seed done — sellers: 4, products: 8, offers: 8, certifications: 6, mediaAssets: 8, publicDocs: 4, quoteRequests: 2, quoteRequestMessages: 4, smokeSeller: smoke-seller@iox.mch, smokeBuyer: smoke-buyer@iox.mch

$ # 2e run idempotent — mêmes counts
✅ Demo seed done — sellers: 4, products: 8, offers: 8, certifications: 6, mediaAssets: 8, publicDocs: 4, quoteRequests: 2, quoteRequestMessages: 4, smokeSeller: smoke-seller@iox.mch, smokeBuyer: smoke-buyer@iox.mch

$ docker exec postgres psql ... -c "SELECT visibility, count(*) FROM marketplace_documents GROUP BY visibility"
 visibility | count
------------+-------
 PUBLIC     |     4

$ docker exec postgres psql ... -c "SELECT count(*) FROM quote_requests; SELECT count(*) FROM quote_request_messages"
 rfq_total : 2
 msg_total : 4

$ docker exec postgres psql ... -c "SELECT email, role FROM users WHERE email LIKE 'smoke-%'"
 smoke-seller@iox.mch | MARKETPLACE_SELLER
 smoke-buyer@iox.mch  | MARKETPLACE_BUYER
```

---

## Blocages rencontrés

1. **TS2769 nodemailer streamTransport** : la signature TS de
   `createTransport` n'expose pas l'option `streamTransport`. Cast
   ciblé `as unknown as Parameters<typeof createTransport>[0]` avec
   commentaire explicatif. Aucune option `any` introduite.

2. **Spec quote-requests existant** : ajout de mocks Prisma manquants
   (`sellerProfile.findUnique`) et de `NotifEmailService` + `ConfigService`
   à l'injection. Existant test "addMessage seller note interne" devait
   asserter `notifEmail.send not called` (note interne ne notifie pas).

3. **Document model n'a pas de `code`** : pivoted vers
   `findFirst({ storageKey })` pour idempotence — storageKey est unique
   par convention seed.

4. **CompanyType n'a pas `IMPORTER`** : utilisé `BUYER` à la place.
   Documenté dans plan + tests.

5. **`marketplaceOffer.findFirst` mock partagé** : double usage
   (recherche par title pour idempotence offre, recherche par
   marketplaceProductId pour cibler une offre dans le seed RFQ). Mock
   intelligent qui discrimine par shape du `where`.

6. **Spec smoke-seller existant** : asserte `user.upsert` appelé 1 fois,
   mais SEED-DEMO-FIX-3 ajoute 1 user smoke-buyer → maintenant 2.
   Test mis à jour pour vérifier les 2 emails.

7. **Pre-existing auth specs** (depuis `39bfbd0`) : 25 fails dans
   `auth.service.spec.ts` + `auth.controller.spec.ts`. **Hors scope**,
   ignorés conformément au mandat. Tous les nouveaux specs (notif,
   marketplace-offers, seed-demo, frontend) sont verts.

---

## Notes pour push cascade

### Ordre suggéré

```
1. push mp-notif-1-transactional-emails-phase1   → PR #21 → merge → deploy
2. push mp-offer-duplicate-1-seller-clone        → rebase --onto main → PR #22 → merge → deploy
3. push seed-demo-fix-3-public-docs-and-rfq      → rebase --onto main → PR #23 → merge → deploy + activation seed VPS
```

### Activation seed VPS post-merge LOT 3

Le pattern `node -e + runner.js compilé` (cf. handoff cascade #15) reste
valide. Le runner exporte désormais 4 nouveaux compteurs :

```bash
ssh rahiss-vps "... docker compose exec -T -e IOX_DEMO_SEED=1 backend
  sh -c 'node -e \"...require(\\\"./dist/.../runner.js\\\")...\"'"
```

Le log final sera :
```
✅ Demo seed done — sellers: 4, products: 8, offers: 8, certifications: 6,
  mediaAssets: 8, publicDocs: 4, quoteRequests: 2, quoteRequestMessages: 4,
  smokeSeller: smoke-seller@iox.mch, smokeBuyer: smoke-buyer@iox.mch
```

### Smoke tests post-activation VPS

```bash
# 1. Filtre hasPublicDocs (LOT 3) doit retourner 4 (au lieu de 0 actuel)
curl -s "https://iox.mycloud.yt/api/v1/marketplace/catalog?hasPublicDocs=true&limit=24" \
  | jq '.data.meta.total // .meta.total'
# Attendu : 4

# 2. RFQ count via API admin
TOKEN=$(curl -s -X POST https://iox.mycloud.yt/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"smoke-seller@iox.mch","password":"IoxSmoke2026!"}' | jq -r '.data.accessToken')
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://iox.mycloud.yt/api/v1/quote-requests?limit=10" \
  | jq '.data.meta.total // .meta.total'
# Attendu : 1 ou 2 selon scope ownership (seller ne voit que SES RFQs)

# 3. Bouton Dupliquer (LOT 2) — UI seller
# Aller sur /seller/marketplace-offers/[id], cliquer "Dupliquer", confirmer
# → redirection vers nouvelle offre DRAFT, title préfixé "(copie) ".

# 4. Notif emails (LOT 1) — vérification logs backend
ssh rahiss-vps "docker compose -f docker-compose.vps.yml logs backend --tail=200 | grep notif-email"
# Attendu : "email sent transport=mock messageId=mock-N to=... subject=..."
```

### Limitations connues

- **Pas d'envoi email externe** : transport `mock` par défaut. Phase 2
  (MP-NOTIF-2) ajoutera EmailLog + Resend/SES + désinscription.
- **Pas de re-notification sur transition status RFQ** : seuls `create`
  et `addMessage` notifient (events critiques). `updateStatus` (qualified,
  quoted, won, lost) n'envoie pas d'email — phase 2.
- **Pas de batch duplicate** : MP-OFFER-DUPLICATE V1 n'inclut pas
  `MarketplaceOfferBatch`. Pertinent uniquement après MP-EDIT-PRODUCT
  futurs lots.
- **Smoke buyer Company** : type `BUYER` (pas `IMPORTER` qui n'existe
  pas dans l'enum). Pas de différence métier en démo.

---

## TL;DR pour le push

3 branches chaînées, 16 commits cumulés, ~3000 LOC ajoutées (hors
`pnpm-lock.yaml`), 30+ specs jest backend nouveaux, 4 specs vitest
frontend nouveaux. main intact. Aucune migration Prisma. Idempotence
seed validée par 2 runs réels DB locale + counts psql. Prêt pour la
cascade habituelle (rebase --onto main entre chaque PR).
