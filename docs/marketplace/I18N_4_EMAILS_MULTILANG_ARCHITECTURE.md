# I18N-4 — Architecture emails multi-locale + 1 template EN POC

Refactor du registry templates pour supporter les variantes par locale.
1ère variante EN livrée (`rfq-message-created.en.template.ts`) en POC.
Les 5 autres variantes EN sont reportées à I18N-4 phase 2.

## Architecture

### Avant (MP-NOTIF-1/2)

`templates/index.ts` :
```typescript
const REGISTRY = { 'rfq-message-created': rfqMessageCreatedTemplate };
getTemplate(id) → EmailTemplate
```

### Après (I18N-4)

```typescript
const REGISTRY: Record<string, { fr: EmailTemplate; en?: EmailTemplate }> = {
  'rfq-message-created': { fr: rfqMessageCreatedTemplate, en: rfqMessageCreatedEnTemplate },
  'rfq-qualified': { fr: rfqQualifiedTemplate }, // EN à faire en phase 2
  // ...
};
getTemplate(id, locale?) → EmailTemplate | null
```

### Résolution

- `locale === 'en'` ET variante EN présente → retourne EN.
- Sinon (ou variante EN absente) → fallback FR.
- Id inconnu → `null`.

## Backend

### `SendEmailInput.locale`

Ajout du champ optionnel `locale?: string` (`'fr'` | `'en'`).

### `NotifEmailService.render`

Passe `input.locale` à `getTemplate(id, locale)`.

### `QuoteRequestsService.safeNotify`

Signature étendue `(templateId, to, templateData, locale?)`. Le call site
de `rfq-message-created` passe désormais
`rfq.buyerUser.preferredLocale` (résolu via `User.preferredLocale`
Prisma — I18N-3).

### Query Prisma étendue

`buyerUser.select` inclut désormais `preferredLocale: true`.

## Templates EN livrés

| Template | FR | EN | Status |
|----------|----|----|----|
| `rfq-created-to-seller` | ✓ | — | Phase 2 |
| `rfq-message-created` | ✓ | ✓ | **Livré I18N-4 phase 1** |
| `rfq-qualified` | ✓ | — | Phase 2 |
| `rfq-quoted` | ✓ | — | Phase 2 |
| `rfq-won` | ✓ | — | Phase 2 |
| `rfq-lost` | ✓ | — | Phase 2 |

`rfq-message-created.en.template.ts` mirror le FR (subject "New message
on your quote request — {offerTitle}", greeting "Hello {name}", lang="en").

## Tests

### Backend

- 4 nouveaux specs `rfq-message-created.en.template.spec.ts` (subject,
  html lang+greeting+CTA, text, escape XSS).
- 8 nouveaux specs `registry.spec.ts` (locale resolution, fallback,
  listTemplateIds, listLocalesForTemplate).

Total templates specs : **41 specs passants** (29 + 4 + 8).

Total backend tests : **605 specs passants** (0 régression).

```bash
pnpm --filter @iox/backend exec jest --testPathPattern templates
# Test Suites: 5 passed — Tests: 41 passed
```

## Décisions

- **Migration progressive** : 1 variante EN livrée en phase 1 (le
  template le plus fréquent). Les 5 autres reportées à phase 2 pour
  économiser le volume de PR (12 templates total = beaucoup d'écriture
  pour peu de valeur tant qu'aucun user n'est en EN en prod).
- **Fallback FR auto** : graceful degradation. Un user EN sur un
  template non encore traduit reçoit la version FR (mieux qu'un crash
  ou un email bilingue mélangé).
- **`locale` optionnel** sur `safeNotify` : retro-compatibilité. Les
  call sites RFQ status transitions (qualified, quoted, won, lost)
  continuent à fonctionner sans changement (FR par défaut).
- **Pas de DB-side migration** : aucun nouveau champ Prisma
  (I18N-3 a déjà ajouté `User.preferredLocale`).

## Hors scope (I18N-4 phase 2)

- 5 templates EN restants : `rfq-created-to-seller`, `rfq-qualified`,
  `rfq-quoted`, `rfq-won`, `rfq-lost`.
- Passer `locale` aux call sites des transitions RFQ status (déjà compat
  avec rfq.buyerUser.preferredLocale, pattern identique).
- 1ère version FR/EN du `footer.ts` (texte unsubscribe). Pour l'instant
  le footer est FR uniquement (les utilisateurs EN voient le footer FR
  dans leur email anglais — acceptable transitoire).
- Locales additionnelles (ES, AR, ZH).
- Auto-détection locale au signup depuis `Accept-Language`.
