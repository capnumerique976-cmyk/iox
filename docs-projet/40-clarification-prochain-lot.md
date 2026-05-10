# Rapport de clarification — état réel et prochain chantier marketplace

> Investigation au 2026-04-26, post-merge des 5 lots du jour (FP-3, FP-4, FP-2.1, FP-3.1, FP-6). Rapport fondé sur le **code réel** (`main` à `00ac8aa`). Référence canonique : `13-contexte-canonique-marketplace.md`. Référence pilotage : `20-cartographie-expert.md`.

## 1. Audit de clarification

### 1.1 Ce qui est CONFIRMÉ par le code

#### Backend marketplace-products

- Controller `apps/backend/src/marketplace-products/marketplace-products.controller.ts` expose **un CRUD complet authentifié** :
  - `GET /marketplace/products` (liste paginée), `GET /marketplace/products/published`, `GET /marketplace/products/by-slug/:slug`, `GET /marketplace/products/:id`
  - `POST /marketplace/products` (création) — ouvert au rôle `MARKETPLACE_SELLER`
  - `PATCH /marketplace/products/:id` (édition complète) — ouvert au rôle `MARKETPLACE_SELLER`
  - `POST /marketplace/products/:id/submit` / `:id/approve` / `:id/reject` / `:id/publish` / `:id/suspend` / `:id/archive` / `:id/readiness`
  - Modération (`approve/reject/publish/suspend/readiness`) réservée à `ADMIN` + `QUALITY_MANAGER`
  - Création/édition/soumission/archivage : ouverts au seller (`SELLER_EDIT = [ADMIN, COORDINATOR, MARKETPLACE_SELLER]`)
- DTO `Create/UpdateMarketplaceProductDto` couvre déjà tous les champs marketplace existants (FP-1 saisonnalité incluse, FP-6 origine fine incluse).
- **Conclusion clé** : le seller a tous les droits API pour gérer ses produits, mais ne dispose d'**aucune UI** pour le faire.

#### Frontend seller marketplace-products

- 3 pages livrées au total :
  - `/seller/marketplace-products/page.tsx` (154 lignes) — index minimaliste, listing read-only, lien vers saisonnalité et certifs
  - `/seller/marketplace-products/[id]/seasonality/page.tsx` (FP-4)
  - `/seller/marketplace-products/[id]/certifications/page.tsx` (FP-2.1)
- **Aucune page** : pas de `[id]/page.tsx` (détail), pas de `[id]/edit/page.tsx`, pas de `new/page.tsx`.
- **Confirmation absolue** : le seller ne peut pas créer ni éditer un MarketplaceProduct depuis l'UI. Il peut **uniquement** éditer la saisonnalité et les certifications.

#### Frontend admin

- 7 pages admin : `rfq`, `memberships`, `users`, `diagnostics`, `review-queue`, `sellers`, `page.tsx`.
- **Aucune** page `admin/marketplace-products`. Les admins peuvent moderate via la review-queue mais ne peuvent pas non plus créer un produit.
- Les produits actuels en base ont donc nécessairement été créés via API directe (Postman, seed, script).

#### Frontend public

- 5 pages publiques : `/marketplace` (catalogue avec filtres), `/marketplace/products/[slug]`, `/marketplace/sellers/[slug]`, `/marketplace/favorites`, layout.
- **Confirmation** : `/marketplace/sellers` (sans slug) **n'existe pas** comme page Next.js → renvoie un 404 standard du framework. Le 404 vu via Chrome MCP est expliqué.
- Header public (`PublicMarketplaceHeader.tsx`) propose uniquement : Catalogue / Favoris / Espace pro / FR-EN. **Aucun lien vers un annuaire seller**.

#### Backend catalog public

- Controller `marketplace-catalog.controller.ts` expose 3 routes `@Public()` :
  - `GET /marketplace/catalog` (catalogue produit, riche en filtres)
  - `GET /marketplace/catalog/products/:slug`
  - `GET /marketplace/catalog/sellers/:slug` (fiche seller)
- **Aucun endpoint `GET /marketplace/catalog/sellers` (liste)**. Pour MP-S-INDEX, il faudra créer cet endpoint **et** la page frontend.

#### Filtres catalog publics

- `CatalogQueryDto` expose 12 paramètres : `q`, `categoryId`, `categorySlug`, `originCountry`, `originRegion`, `sellerSlug`, `readiness`, `priceMode`, `moqMax`, `productionMethod`, `hasPublicDocs`, `availableOnly`, plus `sort` (7 options).
- Le frontend public exposait précédemment 6 filtres (vérifié sur `https://iox.mycloud.yt/marketplace`) : recherche, pays, readiness, priceMode, moqMax, "disponibles uniquement", tri.
- **Filtres backend non exposés à l'UI publique** : `categoryId/Slug`, `productionMethod`, `hasPublicDocs`, `sellerSlug`, `originRegion`. C'est un gap UX, pas un gap backend.

#### Modèle Prisma

- `MarketplaceProduct` actuel (post FP-6) couvre : identité, slug, origine pays/région/locality/altitude/GPS, packaging text libre, defaultUnit + minimumOrderQuantity (champs simples), descriptions, tips, allergen, nutrition JSON, saisonnalité FP-1, certifications (table polymorphe FP-2), médias (table polymorphe), documents (table polymorphe).
- **Manquent** dans le schéma : `annualProductionCapacity`, `restockFrequency`, `qualityAttributes` structurés, `technicalSpecifications` structurés, `packagingFormats[]`, `temperatureRequirements`, `grossWeight/netWeight/palletization`. Ces champs sont attendus par la fiche produit v2.

#### Tests et CI

- Backend : 453 tests jest (33 suites), tsc strict clean.
- Frontend : 140 tests vitest (>=20 suites), lint clean, tsc strict clean.
- E2E : 7 specs Playwright marketplace (`marketplace-documents`, `marketplace-global`, `marketplace-publication`, `marketplace-review-media`, `marketplace-rfq`, `market-release-decision`, `create-product-batch`).
- **Aucune E2E** ne couvre les parcours seller `/seller/profile/edit`, `/seller/profile/certifications`, `/seller/marketplace-products` ou `[id]/seasonality` ou `[id]/certifications`. Couverture E2E très axée parcours admin et publication, faible côté seller.

#### Ops et déploiement

- `scripts/smoke-check.sh` : smoke public 4 surfaces (liveness, readiness, frontend HTML, metrics).
- `scripts/smoke-authenticated.sh` : smoke authentifié avec auto-détection Lot 7. Modèle "tiered" required/optional. **Pas de smoke explicite** des routes ajoutées par FP-2.1, FP-3.1, FP-6, FP-3, FP-4 — il faudrait étendre ce script pour blinder les nouveaux endpoints en prod.
- `deploy/vps/` : `deploy.sh`, `backup.sh`, `restore.sh`, `dr-drill.sh`, `rollback.sh`.
- `ops/` : Prometheus, Grafana, Loki, Alertmanager, Datadog (configs présentes).

### 1.2 Ce qui reste INCERTAIN sur la base du code seul

- **Le state du déploiement actuel sur le VPS de test** : on sait que main contient les 5 nouveaux lots, mais on ignore si le pipeline CI/CD a déjà déployé `00ac8aa` sur `iox.mycloud.yt`. La dernière fois que j'ai visité le VPS via Chrome MCP, c'était avant ces merges — il n'y avait pas encore les écrans `/seller/profile/certifications`, `/seller/marketplace-products/[id]/certifications`, ni la section "Origine détaillée" sur la fiche produit publique.
- **L'existence d'un job auto-deploy** sur ce repo. Présence probable (CI verte sur PR + merge sur main = déclenchement vraisemblable), mais non vérifié dans les fichiers visibles.
- **Le contenu actuel de la base** : aucune offre n'était visible publiquement lors de la dernière visite (`0 offre disponibles`). On ne sait pas si c'est dû à : pas de seed, ou des produits bien créés mais qui n'ont pas passé les gates de publication.
- **Les comptes de test**, leur peuplement, et leurs permissions effectives sur le déployé.

### 1.3 Ce qui DÉPEND du runtime VPS / hors repo

- Confirmation visuelle que les 3 nouveaux écrans seller (`profile/certifications`, `marketplace-products/[id]/certifications`, et l'uploader inline `profile/edit`) sont accessibles authentifiés.
- Confirmation que la migration FP-6 (`add_marketplace_product_fine_origin`) a été appliquée sur la base de données du VPS.
- Confirmation que la section "Origine détaillée" s'affiche sur la fiche produit publique d'un produit ayant des coordonnées.
- Validation des smoke tests fonctionnels documentés dans le handoff push (`notes/handoff-2026-04-26-push-fp2-1-fp3-1-fp6.md`).

**Vérifications minimales recommandées sur le VPS, par ordre** :

1. `curl https://iox.mycloud.yt/api/v1/health` → readiness OK.
2. `BASE_URL=https://iox.mycloud.yt SMOKE_EMAIL=... SMOKE_PASSWORD=... ./scripts/smoke-authenticated.sh` (le script existant suffit pour 90 % du parcours).
3. Visite Chrome MCP de `https://iox.mycloud.yt/seller/profile/edit` après login → vérifier la présence des 2 uploaders inline (LOGO, BANNER) ajoutés par FP-3.1.
4. Visite de `https://iox.mycloud.yt/seller/profile/certifications` → vérifier que la page existe et n'est pas en 404.
5. Si possible, créer 1 produit test via API avec coords GPS et visiter `https://iox.mycloud.yt/marketplace/products/<slug>` → vérifier que la section "Origine détaillée" s'affiche avec lien Maps.

## 2. Analyse comparative des prochains chantiers

Notation : valeur produit (1-5), effort (S/M/L/XL), risque technique (faible/moyen/élevé), intérêt démo (1-5).

### 2.1 FP-5 — Volumes et capacités produit

- **Périmètre** : ajouter `annualProductionCapacity` + unité, `restockFrequency`, refacto `defaultUnit` et `minimumOrderQuantity` vers un tuple typé (clarifier MOQ producteur vs MOQ offre), backend DTO + service + projection publique, **et** UI seller pour saisir.
- **Valeur produit** : 4/5. Capacité annuelle = info essentielle pour acheteur B2B export.
- **Dépendances** : MP-EDIT-PRODUCT (sinon le seller ne peut saisir ces champs, ils restent invisibles).
- **Risque technique** : moyen. Refacto de champs existants (`defaultUnit`, `minimumOrderQuantity`) demande prudence, possible breaking pour les produits déjà créés.
- **Effort** : M (2-4 jours). Migration + DTO + service + projection + UI.
- **Intérêt démo / GTM** : 3/5. Visible sur fiche publique mais ne change pas la dynamique d'usage.

### 2.2 FP-7 — Qualité structurée

- **Périmètre** : `qualityAttributes[]` (enum à définir : "non-OGM", "fait main", "biologique", "tradition", etc., ou table polymorphe), structuration de `technicalSpecifications` (texte libre actuellement), backend + projection publique + UI seller.
- **Valeur produit** : 3/5. Permet filtrage et badges qualité, mais redondant en partie avec les certifications structurées (FP-2).
- **Dépendances** : MP-EDIT-PRODUCT, possiblement FP-5 (ordre de saisie).
- **Risque technique** : moyen-élevé. Le choix du modèle (enum vs table) est structurant pour la suite ; mauvais choix = refacto.
- **Effort** : M-L (3-6 jours). Modèle à designer + back + front + tests.
- **Intérêt démo / GTM** : 2/5. Améliore la fiche produit mais pas un game-changer visuel.

### 2.3 FP-8 — Logistique structurée

- **Périmètre** : `packagingFormats[]` (déclinaisons de conditionnement : "carton 12x500g", "palette 500kg"…), `temperatureRequirements` (chaîne du froid), `grossWeight`/`netWeight`/`palletization`. Backend + projection publique + UI seller.
- **Valeur produit** : 4/5. Information logistique critique pour l'export (douane, transport). Concrétise l'aspect "B2B export" de la marketplace.
- **Dépendances** : MP-EDIT-PRODUCT.
- **Risque technique** : faible. Modèle plat (colonnes nullables additionnelles + un JSON pour formats), pas de sous-tables.
- **Effort** : M (2-4 jours).
- **Intérêt démo / GTM** : 3/5. Visible publiquement, valorise l'export.

### 2.4 MP-S-INDEX — Annuaire seller public

- **Périmètre** : créer endpoint backend `GET /marketplace/catalog/sellers` (liste paginée avec filtres `country`, `region`, `productionMethod`, `q`, peut-être `certificationType`). Créer page frontend `/marketplace/sellers/page.tsx` (listing avec cards seller, lien vers fiche détail). Ajouter lien "Producteurs" au header public.
- **Valeur produit** : 4/5. Résout un 404 visible publiquement, donne accès à l'autre dimension de la marketplace (les producteurs, pas seulement les produits), met en valeur les profils enrichis par FP-3 (auto-édition) et FP-3.1 (logo/bannière).
- **Dépendances** : aucune (backend `SellerProfile` complet, fiche détail publique déjà existante en `[slug]`).
- **Risque technique** : faible. Pattern reproductible du catalog produit existant. Pas de migration. Pas de modèle nouveau.
- **Effort** : **S-M (1.5-3 jours)**. Backend endpoint + page Next.js + 2 composants réutilisables (`SellerCard`) + tests.
- **Intérêt démo / GTM** : **5/5**. Page visible immédiatement, fait disparaître le 404, complète l'expérience publique sans effort de création de contenu (utilise les profils existants).

### 2.5 MP-EDIT-PRODUCT — Édition produit complète seller

- **Périmètre** : page `/seller/marketplace-products/new` (création), page `/seller/marketplace-products/[id]/page.tsx` (lecture détaillée), page `/seller/marketplace-products/[id]/edit/page.tsx` (édition complète). Formulaire couvrant **tous les champs `MarketplaceProduct`** déjà présents en backend (identité, origine fine, descriptions, packaging texte, defaultUnit, minimumOrderQuantity, allergens/nutrition JSON, etc.). Workflow soumission review (`/submit`), retour brouillon, archivage. Composant formulaire multi-sections probablement à découper (identité, origine, descriptions, contenu, logistique, statut/actions).
- **Valeur produit** : **5/5**. Débloque toute l'autonomie seller. Sans cet écran, FP-5/FP-7/FP-8 ne sont visibles qu'en API → seller dépend toujours de l'admin pour créer ses produits.
- **Dépendances** : aucune (backend complet). Mais c'est **prérequis** à FP-5/7/8 pour qu'ils aient une UI seller.
- **Risque technique** : moyen. UI complexe à designer correctement (sections, validations, bonnes UX d'édition pour ~25 champs). Pas de risque côté modèle/API.
- **Effort** : **L (5-8 jours)** si livré d'un seul coup. Possible de découper en sous-lots (ex. : MP-EDIT-PRODUCT-1 = lecture détaillée + édition champs identité/origine/descriptions ; MP-EDIT-PRODUCT-2 = création + workflow soumission/archivage).
- **Intérêt démo / GTM** : 4/5. Excellent pour validation onboarding seller, moyennement immédiat publiquement (le résultat se voit indirectement via plus de contenu publié).

### 2.6 Synthèse comparative

| Lot                 | Valeur  | Effort  | Risque      | Démo    | Dépendances                      |
| ------------------- | ------- | ------- | ----------- | ------- | -------------------------------- |
| **MP-S-INDEX**      | 4/5     | **S-M** | faible      | **5/5** | aucune                           |
| **MP-EDIT-PRODUCT** | **5/5** | L       | moyen       | 4/5     | aucune (mais prérequis aux FP-x) |
| FP-5                | 4/5     | M       | moyen       | 3/5     | MP-EDIT-PRODUCT                  |
| FP-8                | 4/5     | M       | faible      | 3/5     | MP-EDIT-PRODUCT                  |
| FP-7                | 3/5     | M-L     | moyen-élevé | 2/5     | MP-EDIT-PRODUCT, idéalement FP-5 |

## 3. Recommandation priorisée

**Ordre recommandé** : MP-S-INDEX → MP-EDIT-PRODUCT → FP-8 → FP-5 → FP-7.

**Justification** :

1. **MP-S-INDEX en premier** : c'est le meilleur ratio valeur/effort/risque du backlog. Le 404 actuel est un signal négatif visible publiquement. Le lot capitalise sur les enrichissements seller récemment livrés (FP-3 auto-édition + FP-3.1 logo/bannière) en leur donnant **un point d'entrée public**. Aucune dépendance, faible risque, démo immédiate. C'est un **quick win** dans le sens premier du terme.

2. **MP-EDIT-PRODUCT ensuite** : c'est le verrou du chantier marketplace. Sans cet écran, tous les enrichissements de la fiche produit v2 (FP-5, FP-7, FP-8 + ce qui est déjà câblé en backend depuis FP-1/FP-6) restent invisibles côté seller. Tant que le seller ne peut pas créer/éditer ses produits, on entretient une dépendance opérationnelle à l'admin/staff pour le seeding — ça plafonne la traction marketplace.

3. **FP-8 (logistique structurée) ensuite** : effort raisonnable, faible risque (modèle plat additif), valeur claire pour B2B export. Vient compléter la fiche produit côté commercial export (avec FP-6 origine fine déjà livré).

4. **FP-5 (volumes/capacités)** : moyen risque (refacto de champs existants), donc à faire après que MP-EDIT-PRODUCT ait stabilisé les patterns d'édition seller.

5. **FP-7 (qualité structurée)** : à faire en dernier des FP-x car le choix de modèle (enum vs table polymorphe) est le plus délicat, et la valeur additionnelle est moindre une fois que FP-2 (certifications) est en place.

**À reprogrammer dans la même vague** :

- **Filtres catalog publics manquants** (catégorie, productionMethod, hasPublicDocs, originRegion) : peuvent être ajoutés dans un mini-lot CAT-FILTERS de 1-2 jours en parallèle ou juste après MP-S-INDEX.
- **Quick wins doc 31** : `@ArrayMaxSize` DTO, Open Graph SEO, email RFQ, page "comment ça marche".

## 4. Stratégie de delivery

**Recommandation** : **PR courtes par lot**, avec une exception ciblée pour MP-EDIT-PRODUCT.

**Argumentation** :

- Le pattern "PR courte par lot" a fait ses preuves sur les 5 lots récents : revues focalisées, CI claire, hotfixes localisés, historique lisible. Pas de raison de changer.
- **Exception MP-EDIT-PRODUCT** : ce lot est gros (L). Le livrer d'un seul coup conduit à une PR de 1500-2500 lignes que personne ne sait reviewer correctement. Mieux vaut le découper en 2-3 sous-lots :
  - **MP-EDIT-PRODUCT.1** : lecture détaillée seller (page `[id]/page.tsx`) + édition d'un sous-ensemble de champs sûrs (identité, descriptions, origine fine FP-6, packaging texte). PR courte, ~3 jours.
  - **MP-EDIT-PRODUCT.2** : création (`/new` + flow choix Product source) + workflow submit/archive. PR moyenne, ~3 jours.
  - **MP-EDIT-PRODUCT.3** : édition des champs sensibles (allergens/nutrition JSON, defaultUnit/MOQ) si besoin de finition. Optionnel selon le résultat des deux précédents.
- Pas de regroupement de lots indépendants. Garder MP-S-INDEX et MP-EDIT-PRODUCT.1 dans deux PRs distinctes facilite la revue et permet de merger MP-S-INDEX rapidement (faible risque) avant la PR plus longue.

**Cadence** :

- **Pas de méga-mandat 6h** pour cette vague. La dernière session a montré que c'est efficace pour empiler des lots indépendants additifs (FP-2.1 + FP-3.1 + FP-6) qui ne se chevauchent pas. MP-S-INDEX et MP-EDIT-PRODUCT touchent à des fichiers proches (header public, `marketplace/sellers/`, `seller/marketplace-products/`) et bénéficieront d'un tour de boucle humain entre chaque (revue, ajustement UX, smoke test sur le déployé).
- **Cadence proposée** : 1 lot à la fois, push + PR + merge + smoke check VPS, puis lot suivant. ~2-3 lots par semaine.

## 5. Position sur PAY-1 (paiement en ligne)

**Recommandation : reporter PAY-1 d'au moins 1 trimestre.**

**Justification** :

1. **Pré-requis business non tranchés.** Les 8 arbitrages stratégiques que j'ai listés dans `30-etude-paiement-en-ligne-marketplace.md` (modèle économique, flux, PSP, moyens, devises, capture, géo, avocat) ne sont pas tranchés. Les ouvrir maintenant ralentit le delivery technique en cours.
2. **Masse critique catalog non atteinte.** Sur la dernière visite VPS, le compteur indiquait `0 offre disponibles`. Ouvrir un système de paiement sur une marketplace sans inventaire publié est prématuré. Il faut d'abord **atteindre une masse critique de 30+ offres publiées** (cf. doc 31, recommandation finale).
3. **Boucle seller incomplète.** Tant que MP-EDIT-PRODUCT n'est pas livré, le seller ne peut pas alimenter la marketplace en autonomie. Sans alimentation autonome, pas de masse critique, pas de raison d'engager le paiement.
4. **Coût d'opportunité.** PAY-1 phase 0 (cadrage juridique + choix PSP) = ~2 semaines impossibles à parallèliser avec le delivery technique. Phase 1+ = >12 semaines. Pendant ce temps, MP-EDIT-PRODUCT + FP-5/7/8 + MP-S-INDEX se livrent en ~5-6 semaines et délivrent une valeur immédiate.
5. **Les pré-requis techniques de PAY-1 sont mieux préparés ainsi.** Avoir une vraie boucle seller fonctionnelle aide à designer Order/Payment correctement (on sait quels champs commerciaux comptent, quels MOQ/incoterms sont effectivement utilisés).

**Quand engager PAY-1** : quand **deux conditions cumulatives** sont remplies :

- 30+ offres publiées sur la marketplace (visibles publiquement avec `MarketplacePublicationStatus = PUBLISHED`).
- Plus de 5 sellers actifs avec profil complet (auto-édité, logo, certifs vérifiées).

Tant que ces deux seuils ne sont pas atteints, capitaliser sur l'enrichissement marketplace et la traction.

**À faire dès maintenant côté PAY-1, sans engagement de delivery** : commencer à **chiffrer les options PSP** avec les commerciaux Mangopay et Lemonway (devis, conditions). C'est un travail business à faire en arrière-plan, qui prépare le moment où on engagera la phase 0.

## 6. Prochain chantier recommandé : MP-S-INDEX

**Branche suggérée** : `mp-s-index-public-seller-directory`

**Périmètre exact** :

### Backend (`apps/backend/src/marketplace-catalog/`)

1. **DTO** `apps/backend/src/marketplace-catalog/dto/sellers-query.dto.ts` (nouveau) :
   - `page?: number` (default 1), `limit?: number` (default 20, max 100)
   - `q?: string` (recherche sur `publicDisplayName`, `cityOrZone`)
   - `country?: string` (code ISO)
   - `region?: string`
   - `featured?: boolean` (filtrer `isFeatured = true`)
   - `sort?: enum` (`featured`, `recent`, `name_asc`)
2. **Service** `marketplace-catalog.service.ts` : nouvelle méthode `listSellers(query)` :
   - Filtre dur `status = APPROVED` (toujours).
   - Applique les filtres optionnels `q`, `country`, `region`, `featured`.
   - Tri selon `sort` (default `featured` → `[isFeatured desc, approvedAt desc]`).
   - Retourne `{ data, meta }` paginé.
   - Projection publique filtrée : `id`, `slug`, `publicDisplayName`, `country`, `region`, `cityOrZone`, `descriptionShort`, `logoMediaId` (à transformer en URL via `getMediaSignedUrl` si applicable, ou laisser ID au front), `bannerMediaId`, `averageLeadTimeDays`, `destinationsServed`, `supportedIncoterms`, `isFeatured`, `_count: { marketplaceProducts: { where: PUBLISHED } }`.
   - **Aucune** projection : `legalName`, `companyId`, `salesEmail`, `salesPhone`, `rejectionReason`, `suspendedAt`, `createdById`, etc.
3. **Controller** `marketplace-catalog.controller.ts` : nouvelle route `@Public() @Get('sellers') listSellers(@Query() query: SellersQueryDto)`.
4. **Tests** `marketplace-catalog.service.spec.ts` :
   - Filtre `status = APPROVED` strict (un DRAFT/SUSPENDED/REJECTED n'apparaît jamais).
   - Filtre `country` fonctionne.
   - Filtre `featured = true` retourne d'abord les sellers featured.
   - Pagination correcte.
   - Aucune fuite de champ privé (`legalName`, `salesEmail` absents de la réponse).

### Frontend (`apps/frontend/src/`)

5. **Helper API** `apps/frontend/src/lib/marketplace/api.ts` : ajouter `fetchSellers(params)` (équivalent de `fetchCatalog` mais pour `/marketplace/catalog/sellers`).
6. **Page** `apps/frontend/src/app/marketplace/sellers/page.tsx` : page server-side (Next.js App Router), récupère la liste via `fetchSellers`, applique searchParams pour les filtres.
7. **Composant** `apps/frontend/src/components/marketplace/SellerCard.tsx` : carte cliquable avec logo, nom, pays, description courte, badge `isFeatured`, compteur produits publiés. Lien vers `/marketplace/sellers/[slug]`.
8. **Composant** `apps/frontend/src/components/marketplace/SellersFilters.tsx` (peut être inspiré de `CatalogFilters.tsx`) : filtres UI (recherche, pays, featured).
9. **Header public** `apps/frontend/src/components/marketplace/PublicMarketplaceHeader.tsx` : ajouter un lien "Producteurs" entre "Catalogue" et "Favoris".
10. **Tests** `apps/frontend/src/app/marketplace/sellers/page.test.tsx` (snapshot léger ou rendu) :
    - Affichage liste avec sellers
    - État vide ("aucun producteur")
    - Filtres présents
    - Lien vers fiche détail

### Documentation

11. `docs/marketplace/MARKETPLACE_SELLERS_PUBLIC_INDEX.md` (nouveau) : objectif, schéma de réponse API, projection publique, hors-scope.
12. `notes/mp-s-index-plan.md` : plan court avant code (5-10 lignes).

### Validations à rejouer

- `pnpm install --frozen-lockfile`
- `pnpm --filter @iox/backend exec tsc --noEmit`
- `pnpm --filter @iox/backend test`
- `pnpm --filter @iox/frontend exec tsc --noEmit`
- `pnpm --filter @iox/frontend exec next lint`
- `pnpm --filter @iox/frontend exec vitest run`

### Effort estimé

- Backend : 0.5 jour
- Frontend : 1 jour
- Tests + doc : 0.5 jour
- **Total : 1.5 à 2 jours d'effort cumulé.**

### Hors scope volontaire (à différer)

- Pagination cursor-based (offset-based suffit au MVP).
- Filtres avancés (par certification, par catégorie de produits, par incoterm). À ajouter dans un futur lot CAT-FILTERS.
- Recherche full-text (`tsvector`). À ajouter dans MP-SEARCH-1.
- i18n EN du contenu seller (déféré).
- Carte interactive géographique. Déféré.

## 7. Prompt prêt à l'emploi (à coller dans Claude Code)

Voir `prompts/05-mp-s-index-public-seller-directory.md`.

Le prompt contient : pré-requis (gh, working tree clean, main à jour), contexte canonique, périmètre détaillé section par section, règles absolues (pas de refacto large, pas de modif backend hors scope, projection publique stricte), méthodologie (lecture avant code, mini-plan, boucle courte, santé), critères de succès, gestion des blocages, format du handoff attendu.
