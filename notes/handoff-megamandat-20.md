# Méga-mandat 20 — Handoff

**Date** : 2026-04-27
**Mode** : LOCAL-ONLY (aucun push, aucun merge, aucun deploy, aucun gh)
**Lots livrés** : 3 lots, 4 branches au-dessus de main

## Topologie git après mandat 20

```
main = 4250db2  feat(seed-demo): SEED-DEMO-FIX-3 ... (#23)
│
├── buyer-dashboard-1-quote-requests           (LOT 1 — 9719fbe)
│   ├── chore(notes): plan BUYER-DASHBOARD-1
│   ├── feat(frontend): layout + role guard MARKETPLACE_BUYER
│   ├── feat(frontend): page liste /buyer/quote-requests
│   ├── feat(frontend): page détail /buyer/quote-requests/[id]
│   ├── test(frontend): 11 specs (4 list + 7 detail)
│   └── docs(marketplace): BUYER_DASHBOARD_1
│
└── mp-notif-3-unsubscribe-page                (LOT 2a — 2c6e706)
    └── (chaînée sur LOT 1)
        feat(frontend): page publique /unsubscribe (UX + 5 specs)
        │
        └── mp-offer-edit-2-visibility-and-batches  (LOT 3 — 5a92da7)
            (chaînée sur LOT 2a)
            feat(marketplace): visibilityScope + UI batches (4+6 specs)

mp-notif-2-emaillog-and-resend-flag = 9a12880  (mandat 19, intacte)
│
└── mp-notif-3-emaillog-admin                  (LOT 2b — 71ae8be)
    feat(notif): GET /notif-email/logs + page admin (5+4 specs)
```

### SHAs

| Branche                                      | SHA       | Base                                       |
| -------------------------------------------- | --------- | ------------------------------------------ |
| `main`                                       | `4250db2` | (intacte)                                  |
| `buyer-dashboard-1-quote-requests`           | `9719fbe` | main                                       |
| `mp-notif-3-unsubscribe-page`                | `2c6e706` | buyer-dashboard-1-quote-requests           |
| `mp-offer-edit-2-visibility-and-batches`     | `5a92da7` | mp-notif-3-unsubscribe-page                |
| `mp-notif-2-emaillog-and-resend-flag`        | `9a12880` | (mandat 19, intacte)                       |
| `mp-notif-3-emaillog-admin`                  | `71ae8be` | mp-notif-2-emaillog-and-resend-flag        |

Les 3 branches mandat 19 (`mp-notif-2-emaillog-and-resend-flag`,
`mp-notif-2-unsubscribe`, `mp-notif-2-rfq-status-transitions`) sont
**non modifiées**.

## Lots livrés — synthèse

### LOT 1 — BUYER-DASHBOARD-1 (~3h)

**Branche** : `buyer-dashboard-1-quote-requests` depuis main.

Pages buyer dédiées pour suivre/interagir avec leurs RFQ.

- `apps/frontend/src/app/(dashboard)/buyer/layout.tsx` — role guard
  `MARKETPLACE_BUYER` (+ ADMIN/COORDINATOR pour QA).
- `/buyer/quote-requests` (list) — filtres status (multi),
  vendeur (texte client-side), createdAtAfter, pagination 20.
- `/buyer/quote-requests/[id]` (detail) — récap demande, thread
  messages, form envoi, bouton "Annuler" si NEW/QUALIFIED.
- 11 specs vitest passants (4 liste + 7 détail).
- `docs/marketplace/BUYER_DASHBOARD_1.md`.

### LOT 2a — MP-NOTIF-3 unsubscribe-page (~1h)

**Branche** : `mp-notif-3-unsubscribe-page` depuis LOT 1.

Page publique `/unsubscribe?token=...&email=...` (frontend pur ;
backend prévu en phase 2b après merge mandat 19 LOT 1).

- `apps/frontend/src/app/unsubscribe/page.tsx` — Suspense boundary +
  états idle/loading/success/invalid/error.
- 5 specs vitest passants.
- `docs/marketplace/MP_NOTIF_3_UNSUBSCRIBE_PAGE.md`.

### LOT 2b — MP-NOTIF-3 emaillog-admin (~1h30)

**Branche** : `mp-notif-3-emaillog-admin` depuis
`mp-notif-2-emaillog-and-resend-flag` (mandat 19 LOT 1, qui apporte
`EmailLog` Prisma).

Endpoint `GET /notif-email/logs` (admin/coordinator) + page
`/admin/notif-email/logs`.

- Backend : `NotifEmailController`, `NotifEmailService.listLogs()`,
  `ListEmailLogsQueryDto`. Module mis à jour.
- Frontend : `notifEmailApi.listLogs()`, page admin avec filtres
  (status / templateId / recipientEmail / createdAtAfter), pagination 20.
- 5 specs backend (jest) + 4 specs frontend (vitest).
- `docs/marketplace/MP_NOTIF_3_EMAILLOG_ADMIN.md`.

### LOT 3 — MP-OFFER-EDIT-2 (~2h30)

**Branche** : `mp-offer-edit-2-visibility-and-batches` depuis LOT 2a.

Édition `visibilityScope` + UI batches sur la page seller offer.

- Backend :
  - `MarketplaceOffersService.update()` — rejette `PUBLISHED → PRIVATE`
    avec `BadRequestException`.
  - `listOfferBatches(offerId)` — nouvelle méthode + endpoint
    `GET /marketplace/offers/:id/batches`.
- Frontend :
  - `marketplaceOffersApi` étendu : `listBatches`, `attachBatch`,
    `updateBatch`, `detachBatch`. `UpdateMarketplaceOfferInput` accepte
    `visibilityScope`.
  - Section "Visibilité" en mode édition : `<select>` (PRIVATE
    désactivé si PUBLISHED).
  - Nouvelle section "Lots rattachés" : list, attach (form),
    detach (confirm), toggle exportEligible.
- 4 specs backend (jest, total marketplace-offers : 43 passants) + 6
  specs frontend (vitest, total seller offer detail : 19 passants).
- `docs/marketplace/MP_OFFER_EDIT_2.md`.

## Preuves brutes

Toutes capturées dans `notes/preuves-megamandat-20/` :

- `lot1-commits.txt` — 6 commits buyer-dashboard-1 (`9719fbe..05ccc34`)
- `lot1-tests.txt` — 11 vitest passants
- `lot1-diffstat.txt` — diff vs main
- `lot2a-commits.txt` — 1 commit unsubscribe (`2c6e706`)
- `lot2a-tests.txt` — 5 vitest passants
- `lot2b-commits.txt` — 1 commit emaillog-admin (`71ae8be`)
- `lot2b-backend-tests.txt` — 34 jest passants (notif-email module)
- `lot2b-frontend-tests.txt` — 4 vitest passants
- `lot3-commits.txt` — 1 commit MP-OFFER-EDIT-2 (`5a92da7`)
- `lot3-backend-tests.txt` — 43 jest passants (marketplace-offers)
- `lot3-frontend-tests.txt` — 25 vitest passants (3 fichiers offers)

Typecheck `tsc --noEmit` : ✅ vert sur backend et frontend pour chaque
branche au moment du commit final.

## Blocages — aucun

Tous les lots aboutissent. Pas de migration Prisma créée (LOT 2a et
LOT 3 ne le requièrent pas ; LOT 2b s'appuie sur la migration
existante de mandat 19 LOT 1).

## Notes pour push / merge cascade

L'utilisateur veut `LOCAL-ONLY` pendant ce mandat. Pour la cascade :

### Ordre de push recommandé

1. **buyer-dashboard-1-quote-requests** → PR contre `main`. Aucune
   dépendance.
2. **mp-notif-3-unsubscribe-page** → après merge de #1 sur main, soit
   le rebase tient déjà (aucun fichier en commun), soit `git rebase
   --onto main buyer-dashboard-1-quote-requests mp-notif-3-unsubscribe-page`.
3. **mp-offer-edit-2-visibility-and-batches** → après merge de #2,
   `git rebase --onto main mp-notif-3-unsubscribe-page mp-offer-edit-2-visibility-and-batches`.
4. **mp-notif-3-emaillog-admin** → dépend de mandat 19 LOT 1 (`EmailLog`
   Prisma model). À pusher **après** que `mp-notif-2-emaillog-and-resend-flag`
   soit mergé sur main. Rebase :
   `git rebase --onto main mp-notif-2-emaillog-and-resend-flag mp-notif-3-emaillog-admin`.

### Conflits potentiels

- `apps/backend/src/notif-email/notif-email.module.ts` — modifié dans
  mandat 19 LOT 1 (ajoute Resend + DatabaseModule) et à nouveau dans
  LOT 2b (ajoute le controller). Le rebase devrait s'appliquer
  proprement car LOT 2b est chaîné directement sur mandat 19.
- `apps/backend/src/notif-email/notif-email.service.spec.ts` — étendu
  par mandat 19 (specs persistance EmailLog) et par LOT 2b (specs
  listLogs). Pas de conflit attendu.
- Aucun conflit prévu pour LOT 1, LOT 2a, LOT 3 (chaque lot touche
  des fichiers distincts ou disjoints des autres branches).

### Aucun conflit attendu avec les autres branches mandat 19

`mp-notif-2-unsubscribe` et `mp-notif-2-rfq-status-transitions` ne
touchent aucun des fichiers modifiés par les lots du mandat 20.

## Mandat 20 — terminé

Total commits : 9 (6 + 1 + 1 + 1 sur les chaînes main → LOT 3, et un
seul commit sur LOT 2b chaîné sur mandat 19).
Total specs ajoutées : 35 (11 + 5 + 5 + 4 + 4 + 6).
