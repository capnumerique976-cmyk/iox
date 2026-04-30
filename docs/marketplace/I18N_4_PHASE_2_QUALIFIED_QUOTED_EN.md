# I18N-4 phase 2 — Templates EN rfq-qualified + rfq-quoted

Étend I18N-4 phase 1 (1 template EN livré : `rfq-message-created`)
avec 2 templates supplémentaires : `rfq-qualified` et `rfq-quoted`.
Refactor du helper transition pour supporter le `lang` HTML attribut +
greeting + label "note du vendeur" par locale.

## Périmètre

### Helper `rfq-transition.helper.ts` étendu

- `TransitionCopy` ajoute `locale?: 'fr' | 'en'` (défaut FR).
- Dictionnaire `I18N_STRINGS` interne :
  - `fr.greeting` = "Bonjour" / `en.greeting` = "Hello"
  - `fr.sellerNote` = "Note du vendeur :" / `en.sellerNote` = "Seller's note:"
- HTML `<html lang="${locale}">` pris depuis le copy.

### Templates EN ajoutés

| Template | Subject EN | CTA EN |
|----------|-----------|--------|
| `rfq-qualified.en.template.ts` | "Your quote request has been qualified — {offerTitle}" | "Track my request" |
| `rfq-quoted.en.template.ts` | "Quote available for your request — {offerTitle}" | "Review quote" |

### Registry mis à jour

```typescript
'rfq-qualified': { fr: rfqQualifiedTemplate, en: rfqQualifiedEnTemplate },
'rfq-quoted':    { fr: rfqQuotedTemplate,    en: rfqQuotedEnTemplate },
'rfq-won':       { fr: rfqWonTemplate },     // EN phase 3
'rfq-lost':      { fr: rfqLostTemplate },    // EN phase 3
```

## Tests

| Fichier | Specs | Description |
|---------|-------|-------------|
| `rfq-qualified.en.template.spec.ts` | 4 | subject EN, html lang+greeting+CTA, text greeting+CTA, note seller label EN |
| `rfq-quoted.en.template.spec.ts` | 4 | subject EN, html lang+greeting+CTA "Review quote", text greeting, XSS escape sender |
| `registry.spec.ts` | +3 modifs | qualified EN ajouté, quoted EN ajouté, fallback rfq-won (au lieu de rfq-qualified), listLocalesForTemplate qualified [fr,en], won [fr] |

Templates total : **52 specs verts** (41 + 11).
Backend total : **628 specs verts** (0 régression).

```bash
pnpm --filter @iox/backend exec jest --testPathPattern templates
# Test Suites: 7 passed — Tests: 52 passed
```

## Décisions

- **Helper avec dictionnaire interne** plutôt que `TransitionCopy.greeting/sellerNote` exposés : moins de duplication côté templates EN. 1 seul endroit pour ajouter une 3ème locale (ES/AR/ZH).
- **`locale` optionnel sur `TransitionCopy`** : défaut FR pour rétrocompat (tous les templates FR existants n'ont pas le champ → fallback `'fr'`).
- **Phase 2 partielle** : seulement 2 templates EN livrés (les 2 plus importants pour onboarding buyer EN). `rfq-won` + `rfq-lost` EN reportés à phase 3.
- **Templates won/lost gardent fallback FR** auto via `getTemplate(id, 'en')` qui retourne FR si `en` absent.

## Hors scope (phase 3)

- `rfq-won.en.template.ts`
- `rfq-lost.en.template.ts`
- `rfq-created-to-seller.en.template.ts` (envoyé au seller, locale seller utile pour multi-pays)
- Footer EN (`templates/footer.ts`).
- Locales additionnelles (ES, AR, ZH).
- Auto-détection locale au signup depuis `Accept-Language`.
