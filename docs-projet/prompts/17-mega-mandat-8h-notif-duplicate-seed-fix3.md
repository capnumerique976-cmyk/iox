# Méga-mandat Claude Code — Run autonome 8h LOCAL-ONLY — MP-NOTIF-1 + MP-OFFER-DUPLICATE + SEED-DEMO-FIX-3

> **Usage** : à coller dans Claude Code juste avant que l'utilisateur sorte ~8h. **Aucun push, aucun merge, aucun deploy, aucun gh, aucun ssh, aucun touch au VPS.**
>
> **Pré-requis (à vérifier en premier — STOP si non remplis)** :
>
> - être sur la machine où le repo IOX est cloné, au chemin `/Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox`
> - working tree clean côté code (untracked `docs-projet/`, `notes/handoff-*`, `notes/archive/` autorisés — tous hors scope)
> - `main` local à `db36db7` ou plus récent — vérifier que `chore(claude): persiste token-economy settings` est bien dans `git log -1 main`
> - `git stash list` doit être **vide**
> - `git branch | wc -l` doit valoir **2** (asterisk + main, pas de branche legacy résiduelle)
> - Node, pnpm, docker compose disponibles ; `pnpm install` déjà exécuté

Si l'un de ces pré-requis n'est pas rempli, **STOP** et écris dans `notes/handoff-megamandat-17-stop.md` ce que tu as constaté.

---

## ⚠️ Garde-fou anti-hallucination — règles obligatoires (utilisateur absent ~8h)

L'utilisateur sera **absent ~8 heures**. Toute invention sera détectée à son retour par `grep`, `ls`, `git log`, `pnpm test`, et un curl en prod. Donc :

1. **Toujours vérifier sur disque** (`ls`, `cat`, `git status`) avant de marquer une étape "finie".
2. **Ne jamais inventer un output**, un test passant, un fichier créé, ou un compte de fixtures. Si tu ne peux pas exécuter une commande, rapporte l'erreur brute.
3. **À la fin de CHAQUE lot**, recopier l'output réel des commandes de preuve dans le handoff (pas de paraphrase).
4. **Si tu détectes que tu es en train de t'inventer une exécution**, stoppe le lot, reviens à un état vert (`git restore`, `git checkout`), documente le blocage dans le handoff, passe au suivant.

Les mandats 9, 11, 13, 14, 15 et 16 ont démontré que ces règles fonctionnent. **Garder cette discipline.**

---

## Contexte canonique IOX (rappel concis)

IOX = "Indian Ocean Xchange". Plateforme B2B marketplace + socle MCH. Stack : monorepo pnpm + Turbo, NestJS + Prisma + PostgreSQL, Next.js (App Router), controlled state, conventional commits, migrations Prisma strict additives.

**Cinq invariants** :

1. `MarketplaceProduct` ≠ `MarketplaceOffer` ≠ `SellerProfile`. **Product = ce que c'est, Offer = comment c'est vendu maintenant.**
2. Projection publique filtrée (catalog/sellers ne renvoient que `PUBLISHED` + champs filtrés).
3. Statuts marketplace ≠ statuts MCH internes.
4. `FP-x` (fonctionnalité produit) ≠ `Lot X` (chantier MCH historique) ≠ `MP-x` (chantier marketplace).
5. `Seller` = rôle marketplace (`MARKETPLACE_SELLER`), pas confondre avec un compte MCH générique.

## État avant ce mandat

- `main` à `db36db7` (20 lots marketplace mergés + chore token-economy). Schema enrichi avec FP-1/3.1/5/6/7/8. Filtres MP-FILTERS-1 actifs (`qualityAttribute=ORGANIC`=4, `=FAIR_TRADE`=2, `temperatureRequirements=frozen`=1, `seasonalityMonth=APR`=7).
- VPS aligné, base peuplée. Catalog `total: 8`, sellers `total: 4`. Smoke seller `smoke-seller@iox.mch / IoxSmoke2026!` opérationnel.
- Backend `marketplace-offers` couvre toute la machine d'état (DRAFT → IN_REVIEW → APPROVED → PUBLISHED → SUSPENDED → ARCHIVED). **Endpoint `duplicate` MANQUE.**
- Modèle `QuoteRequest` + `QuoteRequestMessage` câblés (status NEW/QUALIFIED/QUOTED/NEGOTIATING/WON/LOST/CANCELLED) avec endpoints CRUD. **Aucune notification email** sortante côté RFQ ni côté offer.publish.
- Aucun module `notif-email` / `mailer` côté backend. Aucun template, aucun provider, aucune dépendance nodemailer/resend installée. **Vrai chantier neuf.**
- `MarketplaceDocument.visibility=PUBLIC` existe au schema, mais le seed-demo n'en crée aucun. Filtre `hasPublicDocs=true → 0` confirmé en prod. Aucune `QuoteRequest` demo dans le seed.

## Mandat global

Empiler **3 lots** par-dessus `main`, en branches chaînées strictement locales. Au retour, l'utilisateur arbitre quoi pousser.

```
main  (db36db7, intact, ne bouge pas)
   │
   ▼
mp-notif-1-transactional-emails-phase1     ← LOT 1
   │
   ▼
mp-offer-duplicate-1-seller-clone          ← LOT 2 (si LOT 1 fini propre)
   │
   ▼
seed-demo-fix-3-public-docs-and-rfq        ← LOT 3 (si LOT 2 fini propre)
```

Si un lot capote, **garder la branche en l'état** (commits intermédiaires OK), passer au suivant en partant de la branche précédente verte (ou de `main` en dernier recours), et documenter dans le handoff. **Ne pas forcer un lot rouge à passer.**

---

## ❌ Règles absolues — interdictions strictes

- **AUCUN `git push`**.
- **AUCUN `gh ...`** (pr create, pr merge, pr checks, etc.).
- **AUCUN `git fetch origin`** ni `git pull` : main local ne doit pas bouger.
- **AUCUN merge sur main local**. Main reste à `db36db7`.
- **AUCUN `./deploy/vps/deploy.sh`** ni autre script ops.
- **AUCUN `ssh rahiss-vps ...`** ni interaction avec le VPS.
- **AUCUN force-push même local**.
- **AUCUNE suppression** de branche ou de tag existant.
- **Aucune installation système** (`brew`, `apt`, etc.). Les dépendances passent par `pnpm install`.
- **Aucune connexion réseau sortante d'application** : pas de SMTP réel, pas de Resend API key live. Le LOT 1 utilise un **transport mock** (nodemailer `sendmail: false` + `streamTransport: true` ou un mock injecté via DI) — on doit pouvoir asserter le contenu envoyé sans rien envoyer dehors.

## ✅ Règles absolues — exigences techniques transverses

- **Migrations Prisma** : strict additives. **Pas de `DROP`, pas de `RENAME`**. Si une nouvelle table/colonne est requise, créer un fichier `apps/backend/prisma/migrations/<timestamp>_<name>/migration.sql` et lancer `pnpm prisma migrate dev --name <name>` localement. **Aucun `migrate reset`**.
- **Conventional commits** : un commit par sous-étape (`feat(notif): ...`, `feat(marketplace): ...`, `feat(seed-demo): ...`, `test(notif): ...`, `chore(notif): ...`, `docs(...): ...`).
- **Controlled state** : pas de react-hook-form. Form fields contrôlés via `useState` + helpers existants.
- **TypeScript strict** : aucun `any`, aucun `// @ts-ignore`, aucune assertion `as unknown as X` non justifiée. Si un cast est nécessaire, le justifier en commentaire.
- **DTOs** : `class-validator` + `class-transformer`. Les `Update*Input` doivent **rejeter en TS** les champs non-éditables (TS2353). Vérifier qu'on n'expose pas via PATCH des champs `slug`, `categoryId`, `sellerProfileId`, etc.
- **Tests** : chaque fonctionnalité backend a un fichier `.spec.ts` avec au moins 3 cases (happy + 2 edge). Frontend : 1 fichier `.test.tsx` par page. Cible Jest backend = vert intégral, vitest frontend = vert intégral. Aucun `it.skip` ajouté.
- **Logs** : `Logger` Nest, **jamais** `console.log` en production. En tests, `expect(loggerMock.debug).toHaveBeenCalledWith(...)`.
- **i18n** : tous les textes UI seller en français, pas d'anglais hardcodé.

---

## LOT 1 — MP-NOTIF-1 phase 1 — Infra emails transactionnels + 2 events RFQ

**Branche** : `mp-notif-1-transactional-emails-phase1` à partir de `main` (`git checkout main && git checkout -b mp-notif-1-transactional-emails-phase1`).

**Objectif** : poser l'infrastructure email côté backend (provider abstrait + nodemailer + transport mock pour tests), templater 2 emails critiques RFQ, brancher les hooks aux services existants. **Aucun envoi externe**. **Aucune migration Prisma** (le LOT 1 ne stocke pas les emails — phase 1, pas de `EmailLog`).

### 1.1 Installer la dépendance

```
pnpm --filter @iox/backend add nodemailer
pnpm --filter @iox/backend add -D @types/nodemailer
```

Vérifier : `cat apps/backend/package.json | grep nodemailer`.

### 1.2 Créer le module `notif-email`

Fichiers à créer :

- `apps/backend/src/notif-email/notif-email.module.ts` — `@Module` exposant `NotifEmailService`.
- `apps/backend/src/notif-email/notif-email.service.ts` — service avec une méthode publique `send(input: SendEmailInput): Promise<SendEmailResult>`.
- `apps/backend/src/notif-email/notif-email.types.ts` — types : `SendEmailInput { to, subject, html, text, templateId, templateData }`, `SendEmailResult { success, messageId, transport, error? }`.
- `apps/backend/src/notif-email/transports/mock.transport.ts` — implémente `EmailTransport` interface, accumule les sends en mémoire (`getSent()`, `clear()`), retourne un `messageId` deterministe (`mock-${counter}`).
- `apps/backend/src/notif-email/transports/smtp.transport.ts` — wrapper nodemailer, **mais en LOCAL toujours en mode `streamTransport: true, jsonTransport: false, buffer: false`** ; on n'envoie PAS sur réseau.
- `apps/backend/src/notif-email/transport.factory.ts` — sélectionne le transport selon `process.env.NOTIF_EMAIL_TRANSPORT` (default `mock`, valeurs autorisées `mock` / `smtp-stream`).

Configuration env :

- `apps/backend/src/config/env.validation.ts` — ajouter validations Joi/Zod pour `NOTIF_EMAIL_TRANSPORT` (default `mock`), `NOTIF_EMAIL_FROM` (default `noreply@iox.mch`), `NOTIF_EMAIL_REPLY_TO` (optional).

### 1.3 Templates emails (2 templates pour phase 1)

Créer un dossier `apps/backend/src/notif-email/templates/`.

Convention template = fichier TypeScript exportant `{ subject(data), html(data), text(data) }` :

- `rfq-created-to-seller.template.ts` — déclenché quand un buyer crée une `QuoteRequest`. Template prend `{ sellerDisplayName, buyerCompanyName, offerTitle, requestedQuantity, requestedUnit, deliveryCountry, message, ctaUrl }`. Sujet FR : `"Nouvelle demande de devis pour : {offerTitle}"`. HTML simple (table inline-styles, pas de framework). CTA vers `https://iox.mycloud.yt/seller/quote-requests/{id}`.
- `rfq-message-created.template.ts` — déclenché quand un participant ajoute un `QuoteRequestMessage`. Template prend `{ recipientDisplayName, senderDisplayName, offerTitle, messageBody, ctaUrl }`. Sujet FR : `"Nouveau message sur votre demande de devis — {offerTitle}"`.

Conventions HTML :
- doctype HTML, charset UTF-8, max-width 600px, fonts system, pas d'images externes en phase 1 (pas de logo dans les emails — ajouté plus tard).
- chaque template inclut une version texte brut équivalente (accessibilité + clients sans HTML).
- le pied de page mentionne `IOX — Indian Ocean Xchange`, `Vous recevez cet email parce que ...`, lien désinscription en TODO (placeholder `# TODO MP-NOTIF-2`).

### 1.4 Branchements dans les services existants

- `apps/backend/src/quote-requests/quote-requests.service.ts` :
  - dans `create(...)`, après la persistance réussie de la `QuoteRequest`, charger le `MarketplaceOffer` + `SellerProfile` + `BuyerCompany`, puis appeler `NotifEmailService.send({ templateId: 'rfq-created-to-seller', templateData: { ... }, to: sellerEmail })`. **Mais** : ne pas planter la création de la RFQ si l'email échoue — wrapper dans un try/catch et logger en `error` (event critique pour MP-NOTIF-2 mais pas bloquant).
  - dans `addMessage(...)` (ou méthode équivalente — chercher la méthode qui crée un `QuoteRequestMessage`), après persistance, déterminer le destinataire (l'autre partie : si l'auteur est seller → notify buyer, sinon → notify seller), charger l'email destinataire, appeler `NotifEmailService.send({ templateId: 'rfq-message-created', ... })`. Mêmes règles try/catch.

Important : injecter `NotifEmailService` dans `QuoteRequestsModule` via `imports: [NotifEmailModule]`. Pas de circular dependency (NotifEmailModule ne dépend pas de QuoteRequestsModule).

### 1.5 Tests

- `apps/backend/src/notif-email/notif-email.service.spec.ts` — 4 cases : send mock OK, send avec template inexistant → erreur typée, send sans `to` → erreur DTO, transport factory respecte `NOTIF_EMAIL_TRANSPORT`.
- `apps/backend/src/notif-email/templates/rfq-created-to-seller.template.spec.ts` — 2 cases : subject contient `offerTitle`, HTML contient `ctaUrl`.
- `apps/backend/src/notif-email/templates/rfq-message-created.template.spec.ts` — idem, 2 cases.
- `apps/backend/src/quote-requests/quote-requests.service.spec.ts` — étendre les tests existants : `create()` appelle bien `NotifEmailService.send` une fois avec les bons args ; `addMessage()` notifie la bonne partie.

Cible : tous les jest backend verts.

### 1.6 Documentation

Créer `docs/marketplace/MP_NOTIF_1_PHASE_1.md` avec :
- liste des events couverts (2)
- shape des `templateData` par event
- comment ajouter un nouveau template (procédure 5 étapes)
- TODO phase 2 : EmailLog table, retry, désinscription, providers réels (Resend/Mailgun/SES)

### 1.7 Preuves anti-hallucination LOT 1

À recopier dans le handoff :

```
git log --oneline main..mp-notif-1-transactional-emails-phase1
git diff main..mp-notif-1-transactional-emails-phase1 --stat
ls -la apps/backend/src/notif-email/
ls -la apps/backend/src/notif-email/transports/
ls -la apps/backend/src/notif-email/templates/
grep -rn "NotifEmailService" apps/backend/src/quote-requests/
pnpm --filter @iox/backend test src/notif-email 2>&1 | tail -20
pnpm --filter @iox/backend test src/quote-requests 2>&1 | tail -20
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -5
cat apps/backend/package.json | grep nodemailer
```

---

## LOT 2 — MP-OFFER-DUPLICATE — Clone offre côté seller

**Branche** : `mp-offer-duplicate-1-seller-clone` à partir de `mp-notif-1-transactional-emails-phase1` (LOT 1 doit être vert).

**Objectif** : permettre à un seller de dupliquer une de ses offres (quel que soit le statut source) en un nouveau brouillon (`DRAFT`) éditable, avec reset complet du cycle de vie. Pas de duplication des `MarketplaceOfferBatch` (V1 — V2 pourra cloner les liens ; documenter le choix).

### 2.1 Backend endpoint

- Ajouter `POST /marketplace/offers/:id/duplicate` dans `apps/backend/src/marketplace-offers/marketplace-offers.controller.ts`.
- Permissions : `ADMIN`, `COORDINATOR`, `SELLER` (le seller doit être propriétaire — vérifier via guard ownership existant).
- Service `MarketplaceOffersService.duplicate(id, userId)` :
  - Charge l'offer source (404 si absente, 403 si pas propriétaire).
  - Crée une nouvelle offer avec :
    - `title = "(copie) " + source.title` (max 100 chars, tronquer si besoin)
    - `marketplaceProductId`, `sellerProfileId`, `priceMode`, `unitPrice`, `currency`, `moq`, `availableQuantity`, `leadTimeDays`, `incoterm`, `departureLocation`, `destinationMarketsJson`, `shortDescription`, `visibilityScope` → identiques à la source.
    - `availabilityStart = null`, `availabilityEnd = null` (les dates de saison sont contextuelles, on reset).
    - `publicationStatus = 'DRAFT'`.
    - `exportReadinessStatus = 'NOT_STARTED'` (forcé : la review export ne se duplique pas).
    - `featuredRank = null`, `rejectionReason = null`.
    - `submittedAt = approvedAt = publishedAt = suspendedAt = null`.
    - `createdById = userId`, `updatedById = userId`.
  - Retourne la nouvelle offre.
- DTO réponse : `MarketplaceOfferDto` existant (réutiliser).

### 2.2 Tests backend

`apps/backend/src/marketplace-offers/marketplace-offers.service.spec.ts` (extension) :
- duplicate happy path : source PUBLISHED → DRAFT, title préfixé, dates reset, IDs nouveaux.
- duplicate par non-propriétaire → 403.
- duplicate offer inexistante → 404.
- title source de 95 chars : title cloné tronqué à 100 max, vérifier pas de troncage cassé.
- duplicate ne crée **pas** de `MarketplaceOfferBatch` lien (count batches = 0 sur la copie).

`apps/backend/src/marketplace-offers/marketplace-offers.controller.spec.ts` : 1 case happy + 1 case 403.

### 2.3 Frontend bouton "Dupliquer"

- Page : `apps/frontend/src/app/(dashboard)/seller/marketplace-offers/[id]/page.tsx`.
- Ajouter un bouton "Dupliquer cette offre" (variant secondary, à côté du bouton edit).
- Au clic : confirm dialog ("Voulez-vous créer une copie en brouillon ?"), puis appel API `POST /marketplace/offers/:id/duplicate`, puis redirect vers `/seller/marketplace-offers/<newId>`.
- État chargement (`isDuplicating`), gestion erreur (toast).
- Helper API : `apps/frontend/src/lib/marketplace-offers.ts` → ajouter `duplicate(id, token)`.

### 2.4 Tests frontend

`apps/frontend/src/app/(dashboard)/seller/marketplace-offers/[id]/page.test.tsx` (extension) :
- bouton Dupliquer visible sur page detail.
- clic → confirm dialog → API call → router.push vers nouvelle URL.
- erreur API → toast erreur, pas de redirect.

### 2.5 Preuves anti-hallucination LOT 2

```
git log --oneline mp-notif-1-transactional-emails-phase1..mp-offer-duplicate-1-seller-clone
git diff mp-notif-1-transactional-emails-phase1..mp-offer-duplicate-1-seller-clone --stat
grep -n "duplicate" apps/backend/src/marketplace-offers/marketplace-offers.controller.ts
grep -n "duplicate" apps/backend/src/marketplace-offers/marketplace-offers.service.ts
grep -n "duplicate" apps/frontend/src/lib/marketplace-offers.ts
pnpm --filter @iox/backend test src/marketplace-offers 2>&1 | tail -20
pnpm --filter @iox/frontend test marketplace-offers 2>&1 | tail -20
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -5
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -5
```

---

## LOT 3 — SEED-DEMO-FIX-3 — MarketplaceDocument PUBLIC + RFQ demo

**Branche** : `seed-demo-fix-3-public-docs-and-rfq` à partir de `mp-offer-duplicate-1-seller-clone` (LOT 2 doit être vert).

**Objectif** : enrichir le seed-demo idempotent avec :
1. **4 `MarketplaceDocument` PUBLIC** (1 par seller principal, type "fiche technique" ou "certificat sanitaire") attachés à 4 produits demo, pour que le filtre `hasPublicDocs=true` retourne 4 au lieu de 0.
2. **2 `QuoteRequest` demo** + 4 `QuoteRequestMessage` au total (2 par RFQ : 1 buyer puis 1 seller) entre `smoke-buyer@iox.mch` et `smoke-seller@iox.mch` sur 2 offres differentes — pour démontrer le flow RFQ end-to-end.

### 3.1 Lire l'état actuel du seed

- Fichier source : `apps/backend/src/seed-demo/dataset.ts` (selon mandat 13/SEED-DEMO-FIX-2).
- Identifier où sont créés les `MarketplaceDocument` aujourd'hui (probablement aucun PUBLIC).
- Vérifier l'existence d'un compte `smoke-buyer@iox.mch` (sinon le créer en seed avec mot de passe `IoxSmoke2026!`, role `MARKETPLACE_BUYER`, lié à une `BuyerCompany` demo).

### 3.2 Hydrater 4 MarketplaceDocument PUBLIC

Pour chacun des 4 sellers principaux (à confirmer via `dataset.ts`), créer 1 `MarketplaceDocument` :

- `relatedType = 'MARKETPLACE_PRODUCT'`
- `relatedId = <id du produit principal du seller>`
- `visibility = 'PUBLIC'`
- `documentType = 'TECHNICAL_DATA_SHEET'` ou `'PHYTOSANITARY_CERTIFICATE'` (varier).
- `title` parlant : ex `"Fiche technique — Vanille Bourbon Grade A"`, `"Certificat phytosanitaire — Mangues Mahoraises"`, etc.
- `fileUrl` : placeholder type `https://placehold.co/PDF/fiche-vanille-bourbon.pdf` (pas de vrai PDF — c'est de la démo).
- `mimeType = 'application/pdf'`, `fileSize = 12345` (placeholder).
- Idempotence : utiliser un `slug` déterministe ou un `upsert` avec `where: { relatedId_documentType: ... }` (vérifier l'unique index sur le modèle).

### 3.3 Hydrater 2 QuoteRequest + 4 QuoteRequestMessage

- Si `smoke-buyer@iox.mch` n'existe pas : créer compte + `BuyerCompany` `demo-buyer-co` (siège FR, 5 employés, etc.)
- RFQ #1 : buyer → seller `demo-coop-vanille`, sur l'offre `demo-vanille-poudre-offre-principale`. `requestedQuantity=10`, `deliveryCountry=FR`, message initial `"Bonjour, intéressé par 10 kg pour début juin. Possibilité d'envoi échantillon ?"`. Status `NEW`.
  - Message 1 (buyer) : le message ci-dessus.
  - Message 2 (seller) : `"Bonjour, merci pour votre intérêt. Échantillon possible 250g. Je vous fais un devis ferme dans la journée."`. Status passe à `QUALIFIED`.
- RFQ #2 : buyer → seller `demo-coop-mangues` sur une offre frozen. `requestedQuantity=500`, status `QUOTED`.
  - Message 1 (buyer) : `"Demande de devis pour 500 kg, livraison Marseille fin mai."`.
  - Message 2 (seller) : `"Devis 1850 EUR/tonne CIF Marseille, MOQ 500kg respecté. Validité 30j."`.

Idempotence : upsert sur clé déterministe (ex `slug` du buyer + `marketplaceOfferId` + `createdAtSeed`). Si `addMessage` du service back-end est utilisé, attention : il déclenchera l'envoi du LOT 1 — utiliser le **transport mock** explicitement via env `NOTIF_EMAIL_TRANSPORT=mock` lors du seed (sinon planter la première fois). Documenter dans le handoff.

### 3.4 Tests jest seed-demo

Étendre `apps/backend/src/seed-demo/dataset.spec.ts` (ou équivalent) :
- count `MarketplaceDocument` visibility=PUBLIC = 4.
- count `QuoteRequest` = 2.
- count `QuoteRequestMessage` = 4.
- idempotence : double run du seed → mêmes counts (pas de duplication).
- compte `smoke-buyer@iox.mch` créé avec role MARKETPLACE_BUYER.

### 3.5 Run réel du seed sur DB locale

- Lancer `IOX_DEMO_SEED=1 pnpm --filter @iox/backend db:seed:demo` 2 fois pour valider l'idempotence.
- Vérifier via `psql` ou `pnpm prisma studio` côté local :
  - 4 docs PUBLIC.
  - 2 RFQ.
  - 4 messages.
- **NE PAS toucher au VPS**. C'est la DB locale uniquement.

### 3.6 Preuves anti-hallucination LOT 3

```
git log --oneline mp-offer-duplicate-1-seller-clone..seed-demo-fix-3-public-docs-and-rfq
git diff mp-offer-duplicate-1-seller-clone..seed-demo-fix-3-public-docs-and-rfq --stat
grep -n "PUBLIC" apps/backend/src/seed-demo/dataset.ts | head -10
grep -n "QuoteRequest" apps/backend/src/seed-demo/dataset.ts | head -5
pnpm --filter @iox/backend test src/seed-demo 2>&1 | tail -20
IOX_DEMO_SEED=1 NOTIF_EMAIL_TRANSPORT=mock pnpm --filter @iox/backend db:seed:demo 2>&1 | tail -10
IOX_DEMO_SEED=1 NOTIF_EMAIL_TRANSPORT=mock pnpm --filter @iox/backend db:seed:demo 2>&1 | tail -10
# (le 2e run doit montrer les mêmes counts sans erreur d'unique key)
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -5
```

---

## Pre-flight checks (à faire AVANT de démarrer le LOT 1)

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git status --short
git log --oneline -1 main
git stash list
git branch | wc -l
pnpm install --frozen-lockfile 2>&1 | tail -3
pnpm --filter @iox/backend exec prisma generate 2>&1 | tail -3
docker compose ps 2>&1 | head -5
```

Si tout est vert : démarrer LOT 1. Sinon : STOP, écrire `notes/handoff-megamandat-17-stop.md`.

---

## Format du rapport final attendu (à écrire dans `notes/handoff-megamandat-17.md`)

Structure :

```
# Méga-mandat 17 — handoff

## TL;DR
- LOT 1 MP-NOTIF-1 phase 1 : ✅ / 🟡 / ❌ — N commits, M tests
- LOT 2 MP-OFFER-DUPLICATE : ✅ / 🟡 / ❌ — ...
- LOT 3 SEED-DEMO-FIX-3 : ✅ / 🟡 / ❌ — ...
- Total commits : X
- main intact : oui (db36db7)

## Branches livrées
- mp-notif-1-transactional-emails-phase1 (HEAD: ...)
- mp-offer-duplicate-1-seller-clone (HEAD: ...)
- seed-demo-fix-3-public-docs-and-rfq (HEAD: ...)

## LOT 1 — preuves brutes
[recopier la sortie des 10 commandes preuve LOT 1]

## LOT 2 — preuves brutes
[recopier la sortie des 9 commandes preuve LOT 2]

## LOT 3 — preuves brutes
[recopier la sortie des 7 commandes preuve LOT 3]

## Blocages rencontrés
[liste exhaustive — ne rien omettre]

## Notes pour push cascade
- prochaines étapes recommandées
- ordre de cascade suggéré
- éventuels patchs post-rebase à prévoir
```

---

## TL;DR pour Claude Code

Tu vas livrer 3 lots en 8h max, en branches chaînées locales, sans push, sans deploy, sans VPS, sans réseau email externe. Tu commits petit, tu testes vert, tu recopies les preuves brutes. Si tu doutes, tu STOPpes et tu documentes. À mon retour je vérifie tout avec grep / git log / pnpm test. Bon courage.
