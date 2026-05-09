# Mandat 3h LOCAL-ONLY — I18N-4 phase 3 (rfq-won.en + rfq-lost.en + rfq-created-to-seller.en + footer EN)

> Coller dans Claude Code pour run autonome ~3h. Standalone. Clôt entièrement le chantier I18N-4 emails (4 templates EN au total).
>
> **Aucun push, deploy, gh, ssh, envoi externe.**

## Pré-requis (STOP si non remplis)

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git rev-parse main                                              # → b2886d20bc62b528c15db57aa94aec9bb393d4a0
git stash list                                                   # → vide
git branch | wc -l                                               # → 2 (main + asterisk uniquement)
pnpm install --frozen-lockfile 2>&1 | tail -3
pnpm --filter @iox/backend exec prisma generate 2>&1 | tail -3
```

Si pas vert → STOP + `notes/handoff-mandat-32-stop.md`.

---

## Garde-fous anti-hallucination

User absent ~3h. Toute invention détectée par grep / git log / pnpm test à retour.

1. Toujours vérifier disque (`ls`, `cat`, `git status`) avant marquer fini.
2. Jamais inventer output / test / fichier. Si commande échoue → erreur brute.
3. Fin lot, recopier output réel des preuves dans handoff.
4. Si tu détectes invention → STOP, revert, doc.

---

## Contexte

- main `b2886d2` (48 lots cumulés).
- I18N-4 phase 1 (#48) = architecture multi-locale + 1 POC EN (`rfq-message-created.en`).
- I18N-4 phase 2 (#50) = `rfq-qualified.en` + `rfq-quoted.en` + helper `rfq-transition.helper.ts` étendu avec dictionnaire i18n interne (greeting, sellerNote).
- Templates FR existants : `rfq-created-to-seller`, `rfq-message-created`, `rfq-qualified`, `rfq-quoted`, `rfq-won`, `rfq-lost` — tous fonctionnels.
- Templates EN existants : `rfq-message-created.en`, `rfq-qualified.en`, `rfq-quoted.en`.

**Manques phase 3 (à combler)** :
- `rfq-won.en` (transition WON, ton positif)
- `rfq-lost.en` (transition LOST, ton neutre — préserver relation buyer-seller)
- `rfq-created-to-seller.en` (notification seller à création RFQ par buyer)
- Footer EN commun (texte + lien désinscription `Unsubscribe`)

---

## Périmètre

**Branche unique** : `i18n-4-phase-3-rfq-won-lost-created-en` à partir de main `b2886d2`.

**Hors scope** :
- Locales ES / AR / ZH (futur).
- Frontend public marketplace EN (chantier I18N-5 séparé).
- Mécanisme de bascule auto FR/EN basé sur `User.preferredLocale` (déjà câblé phase 1, à vérifier seulement).

---

## Règles absolues

- AUCUN `git push`, `gh`, `git fetch origin`, `git pull`.
- AUCUN merge sur main local. Main reste `b2886d2`.
- AUCUN deploy / ssh / VPS.
- AUCUN force-push.
- AUCUNE migration Prisma (pas requise).
- AUCUNE installation système.

## Exigences techniques

- Conventional commits : `feat(notif)`, `test(notif)`, `docs(notif)`.
- TypeScript strict : pas de `any`, casts justifiés.
- Tests : `.spec.ts` jest. Cible jest backend = vert intégral pour nouveaux specs.
- Logs : `Logger` Nest, jamais `console.log`.
- i18n : textes EN naturels, ton aligné FR (positif WON, neutre LOST, professionnel CREATED).
- Pas de moteur template externe. TypeScript strings.
- Échappement HTML manuel sur champs utilisateur (déjà pattern existant dans rfq-message-created).

---

## Étapes

### 1. Lire l'état actuel des helpers + registry

Lire :
- `apps/backend/src/notif-email/templates/rfq-transition.helper.ts` (dictionnaire I18N_STRINGS FR/EN, `pickLocale`, greeting/sellerNote — étendu phase 2)
- `apps/backend/src/notif-email/templates/footer.ts` (footer commun FR — vérifier état actuel, peut être déjà avec `lang` param)
- `apps/backend/src/notif-email/templates/index.ts` (registry — chercher entrées EN existantes : `rfq-message-created.en`, `rfq-qualified.en`, `rfq-quoted.en`)
- 1 template EN existant pour copier le pattern (`rfq-qualified.en.template.ts` recommandé)

### 2. Étendre le footer i18n

Modifier `apps/backend/src/notif-email/templates/footer.ts` :

- Étendre signature : `renderFooter({ unsubscribeUrl, locale })` où `locale: 'fr' | 'en'`.
- Dictionnaire :
  ```typescript
  const FOOTER_I18N = {
    fr: {
      tagline: 'IOX — Indian Ocean Xchange',
      unsubLabel: 'Pour ne plus recevoir ces notifications :',
      transactionalNote: "Vous recevez cet email car vous êtes inscrit sur IOX.",
    },
    en: {
      tagline: 'IOX — Indian Ocean Xchange',
      unsubLabel: 'To stop receiving these notifications:',
      transactionalNote: "You're receiving this email because you're registered on IOX.",
    },
  } as const;
  ```
- HTML + texte : version EN miroir de la version FR.
- Tests `footer.spec.ts` : 4 specs (FR baseline, EN baseline, lien unsub présent FR + EN, transactionalNote rendu correct par locale).

### 3. Étendre `rfq-transition.helper.ts` (si nécessaire)

Vérifier que le helper supporte déjà tous les ton/strings des 4 templates manquants :
- `rfq-won` : ton positif → strings type "Bonne nouvelle" / "Good news".
- `rfq-lost` : ton neutre → "Mise à jour" / "Update".
- `rfq-created-to-seller` : pas une transition mais une création → utiliser un autre helper ou inline.

Si manques → étendre le dictionnaire `I18N_STRINGS` avec :
```typescript
fr: {
  ...,
  goodNews: 'Bonne nouvelle',
  update: 'Mise à jour',
  newRfq: 'Nouvelle demande de devis',
},
en: {
  ...,
  goodNews: 'Good news',
  update: 'Update',
  newRfq: 'New quote request',
},
```

Alternative : mettre les strings spécifiques dans chaque template directement (moins DRY mais plus explicite). À toi de choisir selon la convention déjà posée dans phase 2.

### 4. Créer `rfq-won.en.template.ts`

Mirror EN de `rfq-won.template.ts` :

- Sujet EN : `"Good news, your request is confirmed — {offerTitle}"`.
- HTML inline-styles + texte brut.
- Greeting "Hello {recipientDisplayName}," (via helper).
- Body : confirmation positive de la transition WON, mentionne `senderDisplayName`.
- Note seller optionnelle (si `note` fourni → display avec label "Seller's note:").
- CTA "View request →" pointant vers `ctaUrl`.
- Footer : `renderFooter({ unsubscribeUrl, locale: 'en' })`.

Spec `rfq-won.en.template.spec.ts` : 3 tests minimum (sujet, HTML contient ctaUrl, footer EN présent).

### 5. Créer `rfq-lost.en.template.ts`

Mirror EN de `rfq-lost.template.ts`. Ton neutre :

- Sujet EN : `"Update on your request — {offerTitle}"`.
- HTML + texte.
- Greeting "Hello {recipientDisplayName},".
- Body : ton neutre, pas de "rejected" ou "denied". Plutôt "We're unable to move forward with this request at this time. Thank you for your interest."
- Note seller si fournie.
- CTA "View request →".
- Footer EN.

Spec : 3 tests (sujet, ton neutre vérifié par absence de mots négatifs, footer EN).

### 6. Créer `rfq-created-to-seller.en.template.ts`

Mirror EN de `rfq-created-to-seller.template.ts` :

- Sujet EN : `"New quote request for: {offerTitle}"`.
- HTML + texte.
- Greeting "Hello {sellerDisplayName},".
- Body : présentation buyer (`buyerCompanyName`), quantité demandée (`requestedQuantity` + `requestedUnit`), pays livraison (`deliveryCountry`), message initial buyer (`message`).
- CTA "View request →" vers `ctaUrl` seller.
- Footer EN avec unsubscribeUrl signé pour le seller.

Spec : 3 tests (sujet, body contient `buyerCompanyName` + `requestedQuantity`, footer EN).

### 7. Étendre registry templates

`apps/backend/src/notif-email/templates/index.ts` :
- Ajouter 3 nouvelles entrées :
  ```typescript
  'rfq-won.en': RfqWonEnTemplate,
  'rfq-lost.en': RfqLostEnTemplate,
  'rfq-created-to-seller.en': RfqCreatedToSellerEnTemplate,
  ```
- Vérifier que la fonction de résolution (probablement basée sur `templateId + locale`) trouve les variantes EN si `locale === 'en'`, sinon fallback FR.

Spec `registry.spec.ts` étendu : 3 tests (rfq-won.en chargé, rfq-lost.en chargé, rfq-created-to-seller.en chargé, fallback FR si locale absente).

### 8. Tests d'intégration NotifEmailService (optionnel mais recommandé)

Si pas déjà fait phase 2 : `notif-email.service.spec.ts` extension :
- send `rfq-won` avec recipient `User.preferredLocale='en'` → utilise `rfq-won.en` template.
- send `rfq-lost` avec recipient `preferredLocale='fr'` → utilise FR baseline.
- send `rfq-created-to-seller` avec seller `preferredLocale='en'` → utilise `.en`.

(Skipper si déjà couvert phase 2 — vérifier d'abord.)

### 9. Documentation

Créer `docs/marketplace/I18N_4_PHASE_3_WON_LOST_CREATED_EN.md` :
- Liste 4 templates EN au total après phase 3 (created + message + qualified + quoted + won + lost = 6 templates × 2 langues = 12 mais on a en fait 6 FR + 6 EN, soit 12 au total après phase 3 si tous existent).
- Confirmer : phase 1 = 1 EN POC, phase 2 = 2 EN, phase 3 = 3 EN (won + lost + created) → **6 EN au total**, miroirs des 6 FR.
- Pattern de fallback (locale FR si EN absent).
- Tests cumul : ~63+ specs templates totaux.
- TODO phase 4 : ES / AR / ZH.

### 10. Smoke local (manuel)

```
pnpm --filter @iox/backend test src/notif-email 2>&1 | tail -15
```

Cible : 0 régression, +X nouveaux specs verts.

```
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -5
```

Cible : tsc clean.

---

## Preuves anti-hallucination obligatoires

```
git log --oneline main..i18n-4-phase-3-rfq-won-lost-created-en
git diff main..i18n-4-phase-3-rfq-won-lost-created-en --stat
ls apps/backend/src/notif-email/templates/ | grep "\.en\.template\.ts$"
grep -nE "rfq-won.en|rfq-lost.en|rfq-created-to-seller.en" apps/backend/src/notif-email/templates/index.ts
grep -nE "FOOTER_I18N|locale.*'en'" apps/backend/src/notif-email/templates/footer.ts
pnpm --filter @iox/backend test src/notif-email 2>&1 | tail -15
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -3
ls docs/marketplace/I18N_4_PHASE_3_WON_LOST_CREATED_EN.md
```

---

## Format rapport final attendu (`notes/handoff-mandat-32.md`)

```
# Mandat 32 — handoff I18N-4 phase 3 (rfq-won + rfq-lost + rfq-created-to-seller + footer EN)

## TL;DR
- Statut : ✅ / 🟡 / ❌
- N commits, M nouveaux specs
- main intact (b2886d2)
- 0 migration Prisma
- branche `i18n-4-phase-3-rfq-won-lost-created-en` (HEAD: ...)
- 6 templates EN au total (cumul phases 1+2+3)

## Périmètre livré
- Footer EN (renderFooter avec param locale)
- 3 nouveaux templates EN (won, lost, created-to-seller)
- Registry étendu avec 3 entrées EN
- Doc I18N_4_PHASE_3_WON_LOST_CREATED_EN.md

## Preuves brutes
[recopier sortie 8 commandes anti-hallucination]

## Blocages rencontrés
[liste exhaustive]

## Notes pour push cascade
- branche prête à push (rebase --onto main pas requis tant que main reste b2886d2)
- 0 migration Prisma → cascade safe
- env vars VPS inchangés
- smoke post-deploy : envoyer RFQ NEW→WON depuis smoke-seller, vérifier email_log avec template_id=rfq-won.en si buyer.preferredLocale=en
```

---

## TL;DR pour Claude Code

1 lot, ~3h, 1 branche locale, 0 migration Prisma, ~15-20 nouveaux specs, aucun envoi externe. Si doute, STOP + doc.

Caveman resume off pour ce livrable car prompt opérationnel.
