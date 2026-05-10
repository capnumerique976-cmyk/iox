# Méga-mandat Claude Code — Run autonome 5h LOCAL-ONLY — MP-NOTIF-2 phase 2

> **Usage** : à coller dans Claude Code pour un run de ~5h. **Aucun push, aucun merge, aucun deploy, aucun gh, aucun ssh, aucun envoi email externe.**
>
> **Pré-requis (à vérifier en premier — STOP si non remplis)** :
>
> - être au chemin `/Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox`
> - working tree clean côté code (untracked autorisés : `docs-projet/`, `notes/handoff-*`, `notes/archive/`)
> - `main` local à `4250db2` ou plus récent — vérifier que `feat(seed-demo): SEED-DEMO-FIX-3` est bien dans `git log -1 main`
> - `git stash list` doit être **vide**
> - `git branch | wc -l` doit valoir **2** (asterisk + main, pas de branche en cours)
> - Node, pnpm, docker compose disponibles ; `pnpm install` déjà exécuté
> - Module `notif-email` mergé sur main (LOTs 1 du mandat 17), 2 templates RFQ existants, 0 modèle EmailLog/EmailUnsubscribe au schéma Prisma

Si l'un n'est pas rempli, **STOP** et écris dans `notes/handoff-megamandat-19-stop.md`.

---

## ⚠️ Garde-fou anti-hallucination — règles obligatoires (utilisateur absent ~5h)

1. **Toujours vérifier sur disque** (`ls`, `cat`, `git status`, `pnpm test`) avant de marquer une étape "finie".
2. **Ne jamais inventer un output**, un test passant, une migration créée. Si tu ne peux pas exécuter une commande, rapporte l'erreur brute.
3. **À la fin de CHAQUE lot**, recopier l'output réel des commandes de preuve dans le handoff.
4. **Si tu détectes que tu inventes**, stoppe le lot, reviens à un état vert, documente dans le handoff, passe au suivant.

---

## Contexte canonique IOX (rappel concis)

IOX = "Indian Ocean Xchange". Plateforme B2B marketplace + socle MCH. Stack : monorepo pnpm + Turbo, NestJS + Prisma + PostgreSQL, Next.js (App Router), controlled state, conventional commits, migrations Prisma strict additives.

**Cinq invariants** :
1. `MarketplaceProduct` ≠ `MarketplaceOffer` ≠ `SellerProfile`.
2. Projection publique filtrée.
3. Statuts marketplace ≠ statuts MCH internes.
4. `FP-x` ≠ `Lot X` ≠ `MP-x`.
5. `Seller` = rôle marketplace.

## État avant ce mandat

- `main = 4250db2` (23 lots marketplace mergés).
- Module `notif-email` actif : `mock` + `smtp-stream` transports, 2 templates (`rfq-created-to-seller`, `rfq-message-created`), `safeNotify` non-bloquant dans `QuoteRequestsService.create` + `addMessage`.
- VPS prod aligné : 8 produits, 2 RFQ demo, 4 messages, smoke-buyer + smoke-seller en base.
- **Schéma Prisma** : `./prisma/schema.prisma` (pas `apps/backend/prisma/schema.prisma`). Aucun modèle `EmailLog` ni `EmailUnsubscribe` à ce jour.
- **`QuoteRequestStatus` enum** : `NEW`, `QUALIFIED`, `QUOTED`, `NEGOTIATING`, `WON`, `LOST`, `CANCELLED`.
- **`QuoteRequestsService.updateStatus(id, dto, actor)`** à `apps/backend/src/quote-requests/quote-requests.service.ts:415` — c'est ici que les transitions sont persistées via DTO `UpdateQuoteRequestStatusDto` (champ `status`).
- Endpoint correspondant : `PATCH /api/v1/marketplace/quote-requests/:id/status`.

## Mandat global

Empiler **3 lots** par-dessus `main`, en branches chaînées strictement locales. Au retour, l'utilisateur arbitre quoi pousser.

```
main (4250db2, intact)
   │
   ▼
mp-notif-2-emaillog-and-resend-flag       ← LOT 1
   │
   ▼
mp-notif-2-unsubscribe                    ← LOT 2 (si LOT 1 fini propre)
   │
   ▼
mp-notif-2-rfq-status-transitions         ← LOT 3 (si LOT 2 fini propre)
```

Si un lot capote, garder la branche en l'état, passer au suivant en partant de la branche précédente verte (ou de main en dernier recours), documenter.

---

## ❌ Règles absolues

- **AUCUN `git push`**, **AUCUN `gh ...`**, **AUCUN `git fetch origin`** ni `pull`.
- **AUCUN merge sur main local**. Main reste à `4250db2`.
- **AUCUN deploy / ssh / VPS**.
- **Aucun envoi email externe** : transport `mock` par défaut, `resend` (LOT 1) configurable via env mais **non utilisé par défaut**, les tests `resend` injectent un mock du SDK Resend.
- **AUCUN force-push** même local.
- **AUCUNE installation système** (`brew`, `apt`).

## ✅ Exigences techniques transverses

- **Migrations Prisma strict additives** : nouvelles tables `email_logs`, `email_unsubscribes`. Pas de `DROP`, pas de `RENAME`. Lancer `pnpm prisma migrate dev --name <name>` localement.
- **Conventional commits** : `feat(notif): ...`, `feat(prisma): ...`, `test(notif): ...`, `chore(notif): ...`, `docs(notif): ...`.
- **TypeScript strict** : pas de `any`, pas de `// @ts-ignore`. Cast justifiés en commentaire.
- **DTOs class-validator** : whitelist + forbidNonWhitelisted respectés.
- **Tests** : chaque feature backend a un fichier `.spec.ts`. Cible Jest backend = vert intégral pour les nouveaux specs (les pre-existing auth fails locaux sont hors scope, ignorés).
- **Logs** : `Logger` Nest, jamais `console.log`.
- **i18n** : textes UI/email FR uniquement.
- **Sécurité** : tokens unsubscribe signés JWT avec secret dédié (`UNSUBSCRIBE_JWT_SECRET`) et expiration courte (90 jours) ; vérifier signature + expiration côté endpoint.

---

## LOT 1 — EmailLog persistence + Provider Resend feature flag (~2h)

**Branche** : `mp-notif-2-emaillog-and-resend-flag` à partir de `main`.

**Objectif** : persister chaque tentative d'envoi email en DB pour audit + ajouter un transport `resend` (production-ready) derrière feature flag — sans rien envoyer en LOCAL.

### 1.1 Migration Prisma — table `email_logs`

Modèle Prisma à ajouter dans `./prisma/schema.prisma` :

```prisma
enum EmailLogStatus {
  SENT
  FAILED
  SKIPPED   // unsubscribed, dry-run, etc.
}

model EmailLog {
  id                String         @id @default(uuid())
  transport         String         // "mock" | "smtp-stream" | "resend"
  templateId        String         @map("template_id")
  recipientEmail    String         @map("recipient_email")
  recipientUserId   String?        @map("recipient_user_id")
  subject           String
  status            EmailLogStatus
  errorCode         String?        @map("error_code")
  errorMessage      String?        @map("error_message")
  providerMessageId String?        @map("provider_message_id")
  metadataJson      Json?          @map("metadata_json")
  createdAt         DateTime       @default(now()) @map("created_at")

  @@index([recipientEmail, createdAt])
  @@index([templateId, status])
  @@index([createdAt])
  @@map("email_logs")
}
```

Lancer :
```
pnpm --filter @iox/backend exec prisma migrate dev --name mp_notif_2_email_logs
```

Vérifier que la migration générée est purement additive (CREATE TABLE + CREATE INDEX, aucun DROP/ALTER existant).

### 1.2 Service `NotifEmailService.send` — persistance

Étendre `apps/backend/src/notif-email/notif-email.service.ts` :
- Injecter `PrismaService` dans le constructeur.
- Après chaque tentative `transport.send(rendered)` (succès, échec, ou erreur transport) :
  - Persister une `EmailLog` (transport, templateId, recipientEmail, recipientUserId si fourni dans `SendEmailInput`, subject, status, providerMessageId, errorCode/Message si échec, metadataJson optionnel).
  - **Ne pas casser le contrat actuel** : si la persistance EmailLog échoue, log warn + continue (la persistance ne doit pas faire planter la chaîne d'envoi).

Étendre `SendEmailInput` (types) :
- `recipientUserId?: string` (optionnel, pour traçabilité).

### 1.3 Transport Resend (feature flag)

Ajouter dépendance :
```
pnpm --filter @iox/backend add resend
```

Créer `apps/backend/src/notif-email/transports/resend.transport.ts` :
- Implémente `EmailTransport` interface.
- Utilise `import { Resend } from 'resend'`.
- Constructeur : prend `apiKey: string` (depuis `process.env.RESEND_API_KEY`).
- Méthode `send(rendered)` :
  - Si `apiKey` est falsy → throw `Error('RESEND_API_KEY missing')` (la factory doit fallback ou STOP).
  - Sinon `await this.client.emails.send({ from, to, subject, html, text, replyTo? })` et retourne `{ messageId: result.data?.id ?? null, raw: result }`.
  - Sur erreur SDK : throw avec `code` et `message`.

**En tests** : injecter un mock du SDK Resend (`jest.mock('resend', ...)`) — pas d'appel réseau réel.

### 1.4 Transport factory — sélection par env

Étendre `transport.factory.ts` :
- Ajouter `'resend'` à la whitelist.
- Si `NOTIF_EMAIL_TRANSPORT=resend` mais `RESEND_API_KEY` absent → throw au boot (`Cannot construct ResendTransport: RESEND_API_KEY missing`).
- Garder `mock` comme défaut.

Mise à jour `env.validation.ts` :
- `NOTIF_EMAIL_TRANSPORT` whitelist : `'mock' | 'smtp-stream' | 'resend'`.
- `RESEND_API_KEY` (optionnel, requis seulement si transport=resend).

### 1.5 Tests

- `apps/backend/src/notif-email/notif-email.service.spec.ts` (extension) :
  - send mock OK → EmailLog SENT créé avec bons champs.
  - send échec transport → EmailLog FAILED créé avec errorCode/errorMessage.
  - persist EmailLog échoue → log warn, return success quand même.
- `apps/backend/src/notif-email/transports/resend.transport.spec.ts` (nouveau) :
  - apiKey absent → throw au constructeur.
  - send OK avec mock SDK → retourne `messageId` du SDK.
  - send échec SDK → throw avec code+message.
- `apps/backend/src/notif-email/transport.factory.spec.ts` (nouveau ou étendu) :
  - factory(`resend`) sans `RESEND_API_KEY` → throw au boot.
  - factory(`resend`) avec key fixture → retourne instance ResendTransport.

### 1.6 Documentation

Mettre à jour `docs/marketplace/MP_NOTIF_1_PHASE_1.md` ou créer `docs/marketplace/MP_NOTIF_2_PHASE_2.md` :
- Présence de la table `email_logs` (audit trail), schéma + index.
- Provider Resend derrière flag `NOTIF_EMAIL_TRANSPORT=resend` + env `RESEND_API_KEY`.
- Section "Activation production" : étapes pour basculer le VPS sur Resend (env vars, validation, rollback).

### 1.7 Preuves anti-hallucination LOT 1

```
git log --oneline main..mp-notif-2-emaillog-and-resend-flag
git diff main..mp-notif-2-emaillog-and-resend-flag --stat
ls prisma/migrations/ | tail -3
grep -n "EmailLog\|email_logs" prisma/schema.prisma
ls apps/backend/src/notif-email/transports/
grep -n "resend\|RESEND" apps/backend/src/common/config/env.validation.ts
grep -n "resend" apps/backend/package.json
pnpm --filter @iox/backend test src/notif-email 2>&1 | tail -20
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -5
```

---

## LOT 2 — Unsubscribe (~1h30)

**Branche** : `mp-notif-2-unsubscribe` à partir de `mp-notif-2-emaillog-and-resend-flag`.

**Objectif** : permettre à un destinataire de se désinscrire d'une catégorie de notifications via un lien signé. Avant chaque envoi, vérifier l'unsubscribe.

### 2.1 Migration Prisma — table `email_unsubscribes`

```prisma
enum EmailUnsubscribeType {
  ALL
  RFQ_NOTIFICATIONS
  TRANSACTIONAL
}

model EmailUnsubscribe {
  id            String                @id @default(uuid())
  email         String
  unsubscribeType EmailUnsubscribeType @map("unsubscribe_type")
  userId        String?               @map("user_id")
  reason        String?
  createdAt     DateTime              @default(now()) @map("created_at")

  @@unique([email, unsubscribeType], name: "email_unsubscribes_email_type_uq")
  @@index([email])
  @@map("email_unsubscribes")
}
```

```
pnpm --filter @iox/backend exec prisma migrate dev --name mp_notif_2_email_unsubscribes
```

### 2.2 Service unsubscribe + intégration NotifEmailService

Créer `apps/backend/src/notif-email/unsubscribe.service.ts` :
- `generateToken(email, type, expiresIn = '90d')` — utilise `JwtService` Nest avec secret `process.env.UNSUBSCRIBE_JWT_SECRET`.
- `validateToken(token)` — vérifie signature + exp ; retourne `{email, type}` ou throw.
- `register(email, type, userId?, reason?)` — upsert `EmailUnsubscribe`.
- `isUnsubscribed(email, type)` — query DB ; retourne `boolean`. Inclut aussi `type=ALL`.

Étendre `NotifEmailService.send` :
- Avant le `transport.send` : appeler `unsubscribeService.isUnsubscribed(input.to, input.unsubscribeType ?? 'TRANSACTIONAL')`.
- Si désinscrit : persister `EmailLog` avec `status=SKIPPED` + `errorCode='UNSUBSCRIBED'`, retourner success silencieux (pas d'envoi).
- Étendre `SendEmailInput` : `unsubscribeType?: EmailUnsubscribeType` (default `TRANSACTIONAL`).

Étendre `env.validation.ts` :
- `UNSUBSCRIBE_JWT_SECRET` (string, optionnel mais avec default fallback `${JWT_SECRET}-unsub`).

### 2.3 Endpoint public désinscription

Créer `apps/backend/src/notif-email/unsubscribe.controller.ts` :
- `GET /api/v1/notif-email/unsubscribe?token=<jwt>` — public (`@Public()` decorator).
- Valide le token. Si invalide/expiré → 400 + JSON `{success:false, error:{code:'INVALID_TOKEN'}}`.
- Si valide → enregistre l'unsubscribe (upsert), retourne 200 + JSON `{success:true, data:{email, type, unsubscribedAt}}`.
- **Pas de page HTML** dans cette phase — un endpoint JSON suffit. Le frontend (page conviviale `/unsubscribe?token=...`) sera fait en MP-NOTIF-3.

### 2.4 Footer templates

Étendre les 2 templates existants (`rfq-created-to-seller`, `rfq-message-created`) :
- Le service génère un `unsubscribeUrl` (via `unsubscribeService.generateToken(to, 'RFQ_NOTIFICATIONS')`) et l'injecte dans `templateData`.
- Les templates ajoutent un footer HTML + texte avec le lien :
  ```
  Pour ne plus recevoir ces notifications :
  https://iox.mycloud.yt/api/v1/notif-email/unsubscribe?token=...
  ```
- Le `from` reste `noreply@iox.mch`. `replyTo` reste optionnel.

### 2.5 Tests

- `unsubscribe.service.spec.ts` (nouveau) :
  - generateToken puis validateToken → roundtrip OK.
  - validateToken token expiré → throw expired.
  - validateToken token signé avec mauvais secret → throw invalid.
  - register + isUnsubscribed → true.
  - isUnsubscribed retourne true si type=ALL existe pour cet email.
- `unsubscribe.controller.spec.ts` (nouveau) :
  - GET sans token → 400.
  - GET token invalide → 400.
  - GET token valide → 200 + persistence vérifiée.
- `notif-email.service.spec.ts` (extension) :
  - send vers email désinscrit (type RFQ_NOTIFICATIONS) → transport NOT called, EmailLog SKIPPED créé.
  - send vers email désinscrit ALL → transport NOT called.
  - send vers email non-désinscrit → transport called normalement.
- Templates specs étendus : présence du `unsubscribeUrl` dans HTML + texte, échappement OK.

### 2.6 Preuves anti-hallucination LOT 2

```
git log --oneline mp-notif-2-emaillog-and-resend-flag..mp-notif-2-unsubscribe
git diff mp-notif-2-emaillog-and-resend-flag..mp-notif-2-unsubscribe --stat
ls prisma/migrations/ | tail -3
grep -n "EmailUnsubscribe\|email_unsubscribes" prisma/schema.prisma
grep -rn "unsubscribe" apps/backend/src/notif-email/ | head -10
pnpm --filter @iox/backend test src/notif-email 2>&1 | tail -20
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -5
```

---

## LOT 3 — Notifications transitions status RFQ (~1h30)

**Branche** : `mp-notif-2-rfq-status-transitions` à partir de `mp-notif-2-unsubscribe`.

**Objectif** : envoyer un email au buyer quand le seller transitionne le RFQ vers `QUALIFIED`, `QUOTED`, `WON`, ou `LOST`. Pas de notif sur `NEGOTIATING` ni `CANCELLED` (phase 3+ si besoin).

### 3.1 Templates (4 nouveaux)

Créer dans `apps/backend/src/notif-email/templates/` :

- `rfq-qualified.template.ts` — sujet FR : `"Votre demande de devis a été qualifiée — {offerTitle}"`. Données : `recipientDisplayName`, `senderDisplayName`, `offerTitle`, `note?`, `ctaUrl`, `unsubscribeUrl`.
- `rfq-quoted.template.ts` — sujet : `"Devis disponible pour votre demande — {offerTitle}"`.
- `rfq-won.template.ts` — sujet : `"Bonne nouvelle, votre demande est confirmée — {offerTitle}"`.
- `rfq-lost.template.ts` — sujet : `"Mise à jour sur votre demande — {offerTitle}"` (ton neutre).

Chacun :
- Sujet + HTML inline-styles + texte brut.
- Footer commun (extrait dans un helper `renderFooter(unsubscribeUrl)` partagé entre templates si pas déjà fait).
- Référence le `templateId` correspondant dans `templates/index.ts`.

Tests `*.spec.ts` pour chaque template (sujet + HTML + footer présent).

### 3.2 Branchement updateStatus

Dans `apps/backend/src/quote-requests/quote-requests.service.ts:415` (`updateStatus`) :
- Après le `prisma.quoteRequest.update`, déterminer le templateId selon `dto.status` :
  - `QUALIFIED` → `rfq-qualified`
  - `QUOTED` → `rfq-quoted`
  - `WON` → `rfq-won`
  - `LOST` → `rfq-lost`
  - autres → pas de notif (skip).
- Charger l'email du buyer (`rfq.buyerUser.email` — à confirmer via la signature actuelle de `findUnique` à la ligne 416).
- Construire `templateData` : `recipientDisplayName=buyer.displayName`, `senderDisplayName=seller.publicDisplayName`, `offerTitle=rfq.marketplaceOffer.title`, `note=dto.note`, `ctaUrl=https://iox.mycloud.yt/quote-requests/{id}` (path buyer-side).
- `unsubscribeUrl` est généré par `NotifEmailService` lui-même (pas besoin de l'inclure dans templateData manuellement — le service l'ajoute systématiquement).
- Appeler `safeNotify` (helper existant) — try/catch silencieux + log warn.

### 3.3 Tests

- `quote-requests.service.spec.ts` (extension) :
  - updateStatus → QUALIFIED : `notifEmail.send` appelé avec `templateId='rfq-qualified'`, `to=buyer.email`.
  - updateStatus → QUOTED : `templateId='rfq-quoted'`.
  - updateStatus → WON : `templateId='rfq-won'`.
  - updateStatus → LOST : `templateId='rfq-lost'`.
  - updateStatus → NEGOTIATING : `notifEmail.send` PAS appelé.
  - updateStatus → CANCELLED : `notifEmail.send` PAS appelé.
  - safeNotify catch : si `notifEmail.send` throw → la transition status est tout de même persistée, l'audit log enregistre l'échec.

### 3.4 Documentation

Mettre à jour `docs/marketplace/MP_NOTIF_2_PHASE_2.md` :
- Liste des 6 events couverts (2 phase 1 + 4 transitions phase 2).
- Tableau : event → templateId → destinataire → unsubscribeType.
- TODO phase 3+ : NEGOTIATING, CANCELLED, ASSIGNED (si pertinent).

### 3.5 Preuves anti-hallucination LOT 3

```
git log --oneline mp-notif-2-unsubscribe..mp-notif-2-rfq-status-transitions
git diff mp-notif-2-unsubscribe..mp-notif-2-rfq-status-transitions --stat
ls apps/backend/src/notif-email/templates/ | grep -E "rfq-(qualified|quoted|won|lost)"
grep -n "rfq-qualified\|rfq-quoted\|rfq-won\|rfq-lost" apps/backend/src/notif-email/templates/index.ts
grep -n "templateId" apps/backend/src/quote-requests/quote-requests.service.ts | head -10
pnpm --filter @iox/backend test src/notif-email 2>&1 | tail -20
pnpm --filter @iox/backend test src/quote-requests 2>&1 | tail -20
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -5
```

---

## Pre-flight checks (avant LOT 1)

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

Tout vert → démarrer LOT 1. Sinon STOP + handoff.

---

## Format du rapport final attendu (`notes/handoff-megamandat-19.md`)

```
# Méga-mandat 19 — handoff

## TL;DR
- LOT 1 EmailLog + Resend flag : ✅ / 🟡 / ❌ — N commits, M specs
- LOT 2 Unsubscribe : ✅ / 🟡 / ❌ — ...
- LOT 3 Transitions RFQ : ✅ / 🟡 / ❌ — ...
- Total commits : X
- main intact : oui (4250db2)
- 2 migrations Prisma additives créées (email_logs, email_unsubscribes)

## Branches livrées
- mp-notif-2-emaillog-and-resend-flag (HEAD: ...)
- mp-notif-2-unsubscribe (HEAD: ...)
- mp-notif-2-rfq-status-transitions (HEAD: ...)

## LOT 1 — preuves brutes
[recopier sortie des 9 commandes preuve]

## LOT 2 — preuves brutes
[recopier sortie des 7 commandes preuve]

## LOT 3 — preuves brutes
[recopier sortie des 8 commandes preuve]

## Blocages rencontrés
[liste exhaustive]

## Notes pour push cascade
- ordre de cascade suggéré
- env vars à configurer côté VPS post-merge LOT 1 (NOTIF_EMAIL_TRANSPORT, RESEND_API_KEY si activation Resend, UNSUBSCRIBE_JWT_SECRET)
- smoke tests post-deploy : créer RFQ → vérifier EmailLog SENT, transitionner status → vérifier EmailLog SENT, GET unsubscribe?token → 200 OK
```

---

## TL;DR pour Claude Code

3 lots, 5h, branches chaînées locales, 2 migrations Prisma additives, ~30 nouveaux specs jest, aucun envoi externe (transport mock par défaut, resend mocké en tests). Si tu doutes, tu STOPpes et tu documentes. À mon retour je vérifie tout via grep / git log / pnpm test / inspection schema.prisma.
