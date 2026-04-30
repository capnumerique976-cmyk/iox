# I18N-4 phase 3 — Templates emails EN : `rfq-won`, `rfq-lost`, `rfq-created-to-seller` + footer multi-locale

## TL;DR

Clôt entièrement le chantier I18N-4 (emails marketplace multilingues FR/EN). Ajoute les 3 dernières variantes EN manquantes après la phase 2 (`rfq-qualified`, `rfq-quoted`) et migre le footer commun en multi-locale.

Branche : `i18n-4-phase-3-rfq-won-lost-created-en` (depuis main `b2886d2`).

## Périmètre

| Template | Locale | Avant | Après |
|---|---|---|---|
| `rfq-message-created` | fr+en | ✅ phase 1 | ✅ |
| `rfq-qualified` | fr+en | ✅ phase 2 | ✅ |
| `rfq-quoted` | fr+en | ✅ phase 2 | ✅ |
| `rfq-won` | fr only → fr+en | ✅ FR | ✅ **+EN** |
| `rfq-lost` | fr only → fr+en | ✅ FR | ✅ **+EN** |
| `rfq-created-to-seller` | fr only → fr+en | ✅ FR | ✅ **+EN** |

État final : **6 ids × 2 locales = 12 variantes**.

## Architecture

### Footer multi-locale (`footer.ts`)

Avant : strings FR hardcodées.

Après : dictionnaire `FOOTER_I18N = { fr: {...}, en: {...} }` + helper `pickLocale(data: FooterData)` qui retourne `'fr'` (défaut) ou `'en'` selon `data.locale`. Rétrocompat : si `locale` absent → `'fr'`. Aucun template existant cassé.

### Propagation locale via helper de transition (`rfq-transition.helper.ts`)

`renderTransitionText` et `renderTransitionHtml` propagent le `locale` du `TransitionCopy` vers le footer via `{ ...data, locale }`. Les 4 templates de transition (qualified, quoted, won, lost) déclarent `locale: 'en' as const` dans leur `COPY` ; le footer suit automatiquement.

### Template `rfq-created-to-seller.en.template.ts`

Pas via `rfq-transition.helper` (création initiale, structure différente avec table buyer/quantity/country). HTML inline custom mirror du FR. Footer appelé directement avec `{ ...data, locale: 'en' }`.

## Fichiers touchés

```
M  apps/backend/src/notif-email/templates/footer.ts
A  apps/backend/src/notif-email/templates/footer.spec.ts
M  apps/backend/src/notif-email/templates/rfq-transition.helper.ts
A  apps/backend/src/notif-email/templates/rfq-won.en.template.ts
A  apps/backend/src/notif-email/templates/rfq-won.en.template.spec.ts
A  apps/backend/src/notif-email/templates/rfq-lost.en.template.ts
A  apps/backend/src/notif-email/templates/rfq-lost.en.template.spec.ts
A  apps/backend/src/notif-email/templates/rfq-created-to-seller.en.template.ts
A  apps/backend/src/notif-email/templates/rfq-created-to-seller.en.template.spec.ts
M  apps/backend/src/notif-email/templates/index.ts
M  apps/backend/src/notif-email/templates/registry.spec.ts
A  docs/marketplace/I18N_4_PHASE_3_WON_LOST_CREATED_EN.md
```

## Copywriting EN

### `rfq-won`
- Subject : `Good news, your request is confirmed — {offerTitle}`
- Title : `Good news, your request is confirmed`
- Intro : `{senderDisplayName} has confirmed your order on offer "{offerTitle}". Next steps (contracting, logistics) will be communicated shortly.`
- CTA : `View my order`
- Accent : `#10b981` (vert positif)

### `rfq-lost`
- Subject : `Update on your request — {offerTitle}`
- Title : `Update on your request`
- Intro : `{senderDisplayName} has closed your quote request on offer "{offerTitle}" without being able to fulfill it this time. Feel free to browse other offers in the catalog.`
- CTA : `Browse catalog`
- Accent : `#6b7280` (gris neutre)
- **Ton neutre** vérifié par test : zero occurrence de `rejected`/`denied`/`refused`/`declined`.

### `rfq-created-to-seller`
- Subject : `New quote request for: {offerTitle}`
- Greeting : `Hello {sellerDisplayName}`
- Table : `Buyer` / `Quantity` / `Delivery country` (avec fallback `Not specified`)
- CTA : `View and reply`

### Footer EN
- Tagline : `IOX — Indian Ocean Xchange`
- Note transactionnelle : `You're receiving this email because your account is linked to this request.`
- Unsub link : `Unsubscribe from these notifications`

## Tests

**16 suites, 134 tests verts** sur `pnpm --filter @iox/backend test src/notif-email`.

Nouveaux tests (15) :
- `footer.spec.ts` (6) : 3 FR + 3 EN
- `rfq-won.en.template.spec.ts` (4)
- `rfq-lost.en.template.spec.ts` (4)
- `rfq-created-to-seller.en.template.spec.ts` (5)
- `registry.spec.ts` étendu : +6 tests (3 getTemplate EN + 3 listLocalesForTemplate)

## Régressions

Aucune. Les specs FR existantes (rfq-transitions, rfq-message-created, rfq-created-to-seller, rfq-qualified, rfq-quoted) restent vertes : la propagation `locale` au footer dans le helper est rétrocompatible (locale `undefined` → fallback FR).

## Suite

I18N-4 est désormais complet. Prochaine étape éventuelle : exposer le choix de locale côté préférences utilisateur (déjà couvert par I18N-3 — `User.preferredLocale`) et brancher `NotifEmailService` sur cette préférence pour résoudre la locale au moment de l'envoi (audit à faire).
