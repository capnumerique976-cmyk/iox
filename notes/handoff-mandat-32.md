# Handoff Mandat 32 — I18N-4 phase 3 (clôture chantier emails multilingues)

## TL;DR

- Branche : `i18n-4-phase-3-rfq-won-lost-created-en` (1 commit `fe3103a` sur main `b2886d2`).
- 3 templates EN ajoutés : `rfq-won`, `rfq-lost`, `rfq-created-to-seller`.
- Footer migré en multi-locale (FR/EN), rétrocompat préservée.
- 6 ids × 2 locales = **12 variantes total** → I18N-4 clos.
- **16 suites, 134 tests verts** sur `src/notif-email`. tsc clean.
- Aucun push, aucun deploy, aucun ssh, aucune migration Prisma.

## Périmètre livré

| Item | Status |
|---|---|
| `footer.ts` multi-locale (FOOTER_I18N + pickLocale) | ✅ |
| `footer.spec.ts` (6 tests : 3 FR + 3 EN) | ✅ |
| `rfq-transition.helper.ts` propagation locale → footer | ✅ |
| `rfq-won.en.template.ts` + spec (4 tests) | ✅ |
| `rfq-lost.en.template.ts` + spec (4 tests, ton neutre vérifié) | ✅ |
| `rfq-created-to-seller.en.template.ts` + spec (5 tests) | ✅ |
| `index.ts` registry étendu (+3 EN entries) | ✅ |
| `registry.spec.ts` étendu (+6 tests) | ✅ |
| Doc `I18N_4_PHASE_3_WON_LOST_CREATED_EN.md` | ✅ |
| Commit conventional | ✅ |

## Preuves brutes

### git log

```
fe3103a feat(notif): I18N-4 phase 3 — EN templates won/lost/created-to-seller + multi-locale footer
b2886d2 feat(notif): I18N-4 phase 2 — templates EN rfq-qualified + rfq-quoted (#50)
d8731a4 feat(media): MP-MEDIA-1 LOT 1 — galerie multi-images produit (drag-reorder + lightbox public) (#49)
```

### diff stat

```
 .../src/notif-email/templates/footer.spec.ts       |  51 +++++++++++
 apps/backend/src/notif-email/templates/footer.ts   |  55 ++++++++---
 apps/backend/src/notif-email/templates/index.ts    |  21 ++++-
 .../src/notif-email/templates/registry.spec.ts     |  73 ++++++++++++++-
 .../rfq-created-to-seller.en.template.spec.ts      |  62 +++++++++++++
 .../templates/rfq-created-to-seller.en.template.ts | 102 +++++++++++++++++++++
 .../templates/rfq-lost.en.template.spec.ts         |  44 +++++++++
 .../notif-email/templates/rfq-lost.en.template.ts  |  27 ++++++
 .../notif-email/templates/rfq-transition.helper.ts |   5 +-
 .../templates/rfq-won.en.template.spec.ts          |  43 +++++++++
 .../notif-email/templates/rfq-won.en.template.ts   |  25 +++++
 .../I18N_4_PHASE_3_WON_LOST_CREATED_EN.md          | 100 ++++++++++++++++++++
 12 files changed, 585 insertions(+), 23 deletions(-)
```

### ls templates EN

```
apps/backend/src/notif-email/templates/rfq-created-to-seller.en.template.ts
apps/backend/src/notif-email/templates/rfq-lost.en.template.ts
apps/backend/src/notif-email/templates/rfq-message-created.en.template.ts
apps/backend/src/notif-email/templates/rfq-qualified.en.template.ts
apps/backend/src/notif-email/templates/rfq-quoted.en.template.ts
apps/backend/src/notif-email/templates/rfq-won.en.template.ts
```

### jest output

```
Test Suites: 16 passed, 16 total
Tests:       134 passed, 134 total
Snapshots:   0 total
Time:        5.358 s
Ran all test suites matching /src\/notif-email/i.
```

### tsc

`pnpm --filter @iox/backend exec tsc --noEmit` → exit 0, no output.

## Décisions techniques

1. **Footer rétrocompat** : `locale?: 'fr' | 'en'` optionnel. Templates FR existants ne passent pas `locale` → fallback FR via `pickLocale`. Aucune régression.
2. **Helper transition propage locale** : 4 templates de transition (qualified/quoted/won/lost) déclarent `locale: 'en' as const` dans `COPY` ; le helper spread `{ ...data, locale }` au footer. 1 seul point de mutation.
3. **`rfq-created-to-seller.en` HTML inline custom** : pas via `rfq-transition.helper` car structure différente (création initiale, table buyer/quantity/country). Mirror exact du FR.
4. **Ton neutre `rfq-lost.en`** : test vérifie absence de `rejected`/`denied`/`refused`/`declined` (préservation relation buyer-seller).

## Suite (out of scope mandat 32)

- Audit `NotifEmailService` : confirme que la résolution locale au moment de l'envoi utilise bien `User.preferredLocale` (champ I18N-3) et passe à `getTemplate(id, locale)`.
- Push + PR cascade : non demandé par le mandat (LOCAL-ONLY).
