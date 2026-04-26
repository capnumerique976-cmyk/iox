# Handoff — MP-EDIT-PRODUCT.1 (édition seller produit marketplace)

Date : 2026-04-26
Branche : `mp-edit-product-1-seller-edit-safe-fields` (5 commits au-dessus de
`main` à `9f9fddd` ; ce handoff sera ajouté en commit 6).
Statut : **prêt à pousser** — aucun push, aucune PR, aucun merge effectué.

## État final

- Branche : `mp-edit-product-1-seller-edit-safe-fields`
- 5 commits (le commit du présent handoff sera ajouté juste après) :
  - `8a75a58` docs: MP-EDIT-PRODUCT.1 — runbook édition seller produit marketplace
  - `3d27e27` feat(frontend): MP-EDIT-PRODUCT.1 — lien Détails dans index seller produits
  - `71237e4` feat(frontend): MP-EDIT-PRODUCT.1 — page seller détail+édition produit marketplace
  - `5b167f1` feat(frontend): MP-EDIT-PRODUCT.1 — étendre helper marketplace-products
  - `1cafd5a` chore(notes): plan MP-EDIT-PRODUCT.1
- main reste à `9f9fddd`. Aucun fichier backend modifié.

## Fichiers livrés

### Créés

```
apps/frontend/src/app/(dashboard)/seller/marketplace-products/[id]/page.tsx       (28 545 B)
apps/frontend/src/app/(dashboard)/seller/marketplace-products/[id]/page.test.tsx  (8 tests)
docs/marketplace/MARKETPLACE_PRODUCT_EDIT.md                                      (runbook)
notes/mp-edit-product-1-plan.md                                                   (plan)
notes/handoff-2026-04-26-mp-edit-product-1.md                                     (ce fichier)
```

### Modifiés

```
apps/frontend/src/lib/marketplace-products.ts                                     (+ update + types)
apps/frontend/src/app/(dashboard)/seller/marketplace-products/page.tsx            (+ lien Détails)
```

### Non touchés (volontairement)

- `apps/frontend/src/app/(dashboard)/seller/marketplace-products/[id]/seasonality/page.tsx`
- `apps/frontend/src/app/(dashboard)/seller/marketplace-products/[id]/certifications/page.tsx`
- `apps/frontend/src/components/marketplace/SellerCertificationsManager.tsx`
- `apps/frontend/src/components/marketplace/SeasonalityPicker.tsx`
- Tout fichier backend.

## Décisions techniques

1. **Pattern miroir `/seller/profile/edit/page.tsx`** : client component,
   controlled state, `dirty` via `JSON.stringify(initial) !== JSON.stringify(form)`,
   `buildPayload(initial, current)` ne renvoie que le diff. Pas de RHF.
   Helpers `Section` + `Field` réutilisés tels quels.
2. **Type `UpdateMarketplaceProductInput` strict** : exclut **délibérément**
   les champs interdits (slug, categoryId, productId, sellerProfileId,
   mainMediaId, harvestMonths, availabilityMonths, isYearRound,
   minimumOrderQuantity, defaultUnit, nutritionInfoJson, publicationStatus,
   submittedAt, approvedAt, publishedAt, rejectionReason,
   exportReadinessStatus, completionScore, complianceStatusSnapshot).
   Vérifié à la compilation par `tsc` (cf. preuve 6).
3. **Validation client miroir DTO backend** : maxLength alignées
   (commercialName 2–255, originLocality 160, altitudeMeters 0–9000, lat
   ±90, lng ±180), **pair GPS imposée côté UI** avant submit pour éviter
   un aller-retour 400.
4. **Banner re-revue conditionnel** : `publicationStatus ∈ {APPROVED, PUBLISHED}`
   ET `dirty`. DRAFT → pas de banner même dirty (test explicite).
5. **Champs lecture seule affichés** : badge statut, slug (info), saisonnalité
   (avec lien vers `/seasonality`), MOQ + unité. Pas de bouton de submit
   workflow → MP-EDIT-PRODUCT.2.
6. **`altitudeMeters` non effaçable** : DTO accepte `number`, pas `null`.
   Vider l'input → on n'envoie pas le champ. Documenté dans le runbook.
7. **GPS string|number toléré** : Prisma sérialise les Decimal en string ;
   `gpsToString` normalise pour l'input contrôlé.

## Limites volontaires

- Pas de mode création (`/new`) → MP-EDIT-PRODUCT.2.
- Pas d'`InlineMediaUploader` pour `mainMediaId` → MP-EDIT-PRODUCT.3.
- Pas d'éditeur `nutritionInfoJson` → futur lot dédié.
- Pas d'édition `categoryId` ni `slug` → réservés staff.
- Pas d'édition MOQ/`defaultUnit` → FP-5.
- Pas d'effacement explicite d'`altitudeMeters` (cf. décision 6).
- Pas d'E2E Playwright (couvert par 8 vitest).

## Preuves brutes (anti-hallucination)

### 1. Branche + commits

```
mp-edit-product-1-seller-edit-safe-fields
8a75a58 docs: MP-EDIT-PRODUCT.1 — runbook édition seller produit marketplace
3d27e27 feat(frontend): MP-EDIT-PRODUCT.1 — lien Détails dans index seller produits
71237e4 feat(frontend): MP-EDIT-PRODUCT.1 — page seller détail+édition produit marketplace
5b167f1 feat(frontend): MP-EDIT-PRODUCT.1 — étendre helper marketplace-products
1cafd5a chore(notes): plan MP-EDIT-PRODUCT.1
```

### 2. Fichiers sur disque

```
-rw-r--r--@ 1 ahmedabdoullahi  staff   7927 Apr 26 23:37 apps/frontend/src/app/(dashboard)/seller/marketplace-products/[id]/page.test.tsx
-rw-r--r--@ 1 ahmedabdoullahi  staff  28545 Apr 26 23:37 apps/frontend/src/app/(dashboard)/seller/marketplace-products/[id]/page.tsx
-rw-r--r--@ 1 ahmedabdoullahi  staff   8008 Apr 26 23:39 docs/marketplace/MARKETPLACE_PRODUCT_EDIT.md
-rw-r--r--@ 1 ahmedabdoullahi  staff   2487 Apr 26 23:34 notes/mp-edit-product-1-plan.md
```

(le handoff `notes/handoff-2026-04-26-mp-edit-product-1.md` est créé par
le présent commit, donc absent de cet `ls` exécuté à mi-parcours.)

### 3. Diff `marketplace-products.ts` (head 80 lignes)

```diff
diff --git a/apps/frontend/src/lib/marketplace-products.ts b/apps/frontend/src/lib/marketplace-products.ts
index e82b470..645746b 100644
--- a/apps/frontend/src/lib/marketplace-products.ts
+++ b/apps/frontend/src/lib/marketplace-products.ts
@@ -1,13 +1,17 @@
-// FP-4 — Helper API authentifié pour les produits marketplace côté seller.
+// Helper API authentifié pour les produits marketplace côté seller.
 //
-// Couvre uniquement la partie nécessaire à l'édition seller (lot FP-4) :
-//   - lister les produits du vendeur connecté (le backend applique
-//     automatiquement le filtre `scopeSellerProfileFilter` sur le rôle
-//     MARKETPLACE_SELLER, on n'a donc pas besoin de passer `sellerProfileId`)
-//   - récupérer un produit par id
-//   - PATCH ciblé sur la saisonnalité (FP-1) — le backend accepte
-//     `harvestMonths`, `availabilityMonths`, `isYearRound` via
-//     `UpdateMarketplaceProductDto`.
+// Étendu pour MP-EDIT-PRODUCT.1 — édition des champs textuels sûrs.
+// Le type `UpdateMarketplaceProductInput` n'expose **délibérément** que les
+// champs autorisés au seller. Tenter d'envoyer `slug`, `categoryId`,
+// `mainMediaId`, `publicationStatus` etc. via `update()` sera rejeté par
+// `tsc` à la compilation — défense en profondeur en plus du whitelist
+// backend.
+//
+// Couvre :
+//   - lister les produits du vendeur connecté
+//   - récupérer un produit par id (projection riche pour l'écran d'édition)
+//   - PATCH ciblé saisonnalité (FP-1, conservé)
+//   - PATCH ciblé édition de contenu (MP-EDIT-PRODUCT.1)

 import { api } from './api';
 import type { SeasonalityMonth } from './marketplace/types';
@@ -21,23 +25,56 @@ export type MarketplacePublicationStatus =
   | 'SUSPENDED'
   | 'ARCHIVED';

-/** Projection minimale renvoyée par GET /marketplace/products[/:id]. */
+/**
+ * Projection seller renvoyée par GET /marketplace/products[/:id].
+ *
+ * Tous les champs « sûrs » éditables MP-EDIT-PRODUCT.1 sont déclarés
+ * optionnels (le backend renvoie `null` quand non renseigné). gpsLat/gpsLng
+ * arrivent typiquement en string (Decimal Prisma sérialisé) ou number selon
+ * la version de Prisma — on accepte les deux et on parse côté UI.
+ */
 export interface SellerMarketplaceProduct {
   id: string;
   slug: string;
   commercialName: string;
   publicationStatus: MarketplacePublicationStatus;
+
+  // Identité publique
+  regulatoryName?: string | null;
+  subtitle?: string | null;
+
+  // Origine
   originCountry: string;
-  originRegion: string | null;
-  // FP-6 — origine fine (tous optionnels). gpsLat/gpsLng arrivent en string
-  // depuis Prisma (Decimal sérialisé), à parser côté UI si besoin numérique.
+  originRegion?: string | null;
   originLocality?: string | null;
   altitudeMeters?: number | null;
   gpsLat?: string | number | null;
   gpsLng?: string | number | null;
+
+  // Variétés et méthode
+  varietySpecies?: string | null;
+  productionMethod?: string | null;
+
+  // Descriptions
+  descriptionShort?: string | null;
+  descriptionLong?: string | null;
+  usageTips?: string | null;
+
+  // Conservation
+  packagingDescription?: string | null;
+  storageConditions?: string | null;
+  shelfLifeInfo?: string | null;
+  allergenInfo?: string | null;
+
```

### 4. tsc strict frontend

```
(aucune sortie — tsc --noEmit clean)
```

Code de retour : `0`.

### 5. Vitest count + green

```
 ✓ src/lib/utils.test.ts (5 tests) 5ms
 ✓ src/app/(dashboard)/incidents/new/page.test.tsx (3 tests) 336ms

 Test Files  27 passed (27)
      Tests  159 passed (159)
   Start at  23:39:26
   Duration  6.36s
```

Baseline avant ce lot : **151** tests / 26 fichiers. Après : **159** tests
/ 27 fichiers (+8 vitest). Cible ≥ 157 ✅ atteinte.

### 6. Type-check de l'interdiction « champ slug » (et 3 autres champs interdits)

La commande exacte du prompt (`/tmp/check-forbidden.ts`) ne résout pas le
chemin d'import `./apps/frontend/...` quand exécutée depuis `apps/frontend`,
ce qui rend la sortie vide non-conclusive. Probe équivalente exécutée
**dans** le projet (`apps/frontend/src/__check_forbidden__.ts`, supprimé
après) :

```ts
import { marketplaceProductsApi } from './lib/marketplace-products';
// @ts-expect-error — slug doit être interdit
marketplaceProductsApi.update('…', { slug: 'forbidden' }, 'tok');
// @ts-expect-error — categoryId doit être interdit
marketplaceProductsApi.update('…', { categoryId: 'c' }, 'tok');
// @ts-expect-error — mainMediaId doit être interdit
marketplaceProductsApi.update('…', { mainMediaId: 'm' }, 'tok');
// @ts-expect-error — publicationStatus doit être interdit
marketplaceProductsApi.update('…', { publicationStatus: 'PUBLISHED' }, 'tok');
// Sanity : champ autorisé compile sans erreur
marketplaceProductsApi.update('…', { commercialName: 'OK' }, 'tok');
```

Exécution :

```
tsc exit code: 0 (0 = tous les @ts-expect-error ont matché une erreur réelle)
(probe file removed)
```

`tsc --noEmit` retourne `0` → les 4 `@ts-expect-error` ont **bien**
intercepté une vraie erreur de type sur chacun des 4 champs interdits, ET
le champ autorisé `commercialName` compile sans erreur. Si l'un des champs
n'avait pas été rejeté, `@ts-expect-error` aurait lui-même produit une
erreur (`Unused @ts-expect-error directive`) et `tsc` aurait échoué.

## Smoke tests à effectuer après merge sur le déployé

(rappel — non exécutés dans ce lot, restent à valider post-PR.)

- [ ] Login `smoke-seller@iox.mch` → naviguer `/seller/marketplace-products`
      → liste OK (4 produits du seed `DEMO-SUP-001`).
- [ ] Click **Détails** d'un produit → page édition rendue avec valeurs hydratées.
- [ ] Modifier `descriptionShort` → bouton **Enregistrer** s'active → submit OK.
- [ ] Saisir `gpsLat` seul (sans `gpsLng`) → erreur côté UI (`validation-error`)
      avant submit ; saisir aussi `gpsLng` → submit OK.
- [ ] Sur un produit `APPROVED`/`PUBLISHED`, vérifier le banner re-revue
      dès la 1ʳᵉ frappe.
- [ ] Avec un compte non-seller (buyer / public) : `GET /:id` → 403 (déjà
      couvert backend).

## Plan de push proposé (pour l'utilisateur)

```bash
git push -u origin mp-edit-product-1-seller-edit-safe-fields
gh pr create --base main \
  --title "feat: MP-EDIT-PRODUCT.1 — édition seller produit marketplace (champs sûrs)" \
  --body "$(cat <<'EOF'
## Summary
- Page seller `/seller/marketplace-products/[id]` (détail + édition).
- 16 champs sûrs éditables (identité / origine / variétés / descriptions /
  conservation), tous alignés `UpdateMarketplaceProductDto`.
- Type `UpdateMarketplaceProductInput` strictement typé pour rejeter à la
  compilation toute tentative d'édition de slug, categoryId, mainMediaId,
  publicationStatus, saisonnalité, MOQ, defaultUnit, nutrition.
- Banner re-revue (APPROVED/PUBLISHED + dirty) ; validation client miroir DTO.
- Lien **Détails** ajouté dans l'index `/seller/marketplace-products`.
- Aucun changement backend.

## Test plan
- [x] Frontend tsc clean
- [x] Vitest 159/159 (+8)
- [x] Backend test 464/464 (intact)
- [ ] Smoke seller post-merge (cf. handoff)
EOF
)"
```
