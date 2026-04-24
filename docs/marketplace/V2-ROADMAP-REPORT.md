# Marketplace V2 — Rapport final

Exécution de la roadmap V2 en 3 sprints sur la base du MVP clôturé.
Règles respectées : ADN IOX conservé (conformité, traçabilité, documents, lots,
export-ready), aucune refonte, zéro module transactionnel/paiement, validation
typecheck + lint + tests après chaque lot.

---

## Sprint 1 — Buyer experience

**Fichiers créés**

- `apps/frontend/src/components/marketplace/Pagination.tsx`
- `apps/frontend/src/components/marketplace/FavoriteButton.tsx`
- `apps/frontend/src/components/marketplace/ShareButton.tsx`
- `apps/frontend/src/lib/marketplace/favorites.ts` — hook `useFavorites` sur localStorage
- `apps/frontend/src/app/marketplace/favorites/page.tsx`

**Fichiers modifiés**

- `apps/frontend/src/app/marketplace/page.tsx` — pagination SSR intégrée
- `apps/frontend/src/app/marketplace/products/[slug]/page.tsx` — favori + partage + section « Autres produits du vendeur »
- `apps/frontend/src/components/marketplace/ProductCard.tsx` — bouton cœur en overlay
- `apps/frontend/src/app/marketplace/layout.tsx` — entrée Favoris

**Choix d'architecture**

- Favoris stockés localement (clé `iox:marketplace:favorites:v1`) — évite une
  migration Prisma et permet aux visiteurs anonymes d'en bénéficier. Event custom
  `iox:favorites:changed` + événement `storage` pour la synchro multi-onglets.
- Partage via `navigator.share` quand dispo (mobile) puis fallback presse-papier
  avec feedback 2 s.
- Section « Autres produits du vendeur » best-effort : si `fetchSellerBySlug`
  échoue, la section est simplement masquée — pas de régression pour la fiche.

---

## Sprint 2 — Cockpit vendeur

**Fichiers créés**

- `apps/frontend/src/app/(dashboard)/seller/dashboard/page.tsx`

**Fichiers modifiés**

- `apps/frontend/src/components/layout/sidebar.tsx` — entrée « Cockpit vendeur »

**Ce que le cockpit livre**

- État du profil vendeur rattaché (statut + lien fiche publique).
- 3 StatCards en parallèle (Produits, Offres, RFQ) ventilés par statut
  (PUBLISHED / IN_REVIEW / DRAFT ou NEW / NEGOTIATING / WON).
- 2 AlertBlocks documents : expirent sous 90 jours + non vérifiés (PENDING /
  REJECTED).
- 3 QuickLinks (RFQ, documents, catalogue public).
- Pattern `LoadState<T>` par bloc — un bloc en erreur ne casse pas les autres.

**Pourquoi pas de nouveau endpoint ?** Toutes les listes utilisées sont déjà
scopées côté service par `ownership.scopeSellerProfileFilter(actor)` pour le
rôle `MARKETPLACE_SELLER`. Le cockpit ne fait qu'agréger côté client : zéro
migration, zéro nouveau contrat d'API.

---

## Sprint 3 — Admin power tools + i18n

**Bulk approve file de revue** — `admin/review-queue/page.tsx`

- Case à cocher par ligne PENDING + case maître « tout sélectionner PENDING ».
- Bouton « Approuver la sélection (N) » visible dès qu'au moins 1 item est
  sélectionné.
- Séquentiel avec progress counter, tolère les échecs partiels (message
  « N approbations ont échoué, les autres ont été appliquées »).
- Garde `canDecide` inchangée (ADMIN + QUALITY_MANAGER).

**i18n progressive FR / EN**

- `apps/frontend/src/lib/i18n.ts` — hook `useLang` + dictionnaire inline.
- `apps/frontend/src/components/marketplace/LangSwitcher.tsx` — toggle 2 boutons.
- `apps/frontend/src/components/marketplace/PublicMarketplaceHeader.tsx` — header
  et footer traduits, consommés par le layout marketplace public.
- Storage : `localStorage[iox:lang]`, event `iox:lang:changed`. Fallback FR
  quand la clé manque.
- **Portée volontairement limitée au marketplace public** pour V2 — la
  traduction des espaces authentifiés (RFQ, cockpit, admin) est laissée à une
  itération ultérieure. Les clés existantes servent de socle.

---

## Validation finale

| Étape                        | Résultat                                                            |
| ---------------------------- | ------------------------------------------------------------------- |
| `tsc --noEmit` frontend      | ✅ clean                                                            |
| `next lint --max-warnings=0` | ✅ No warnings or errors                                            |
| `vitest run`                 | ✅ 52 / 52                                                          |
| `next build`                 | ✅ 41 routes (dont `/marketplace/favorites` et `/seller/dashboard`) |

Tous les lots validés avant d'enchaîner sur le suivant.

---

## Ce qui n'a volontairement pas été touché

- **Pas de filtre catégorie sur le catalogue** : le backend accepte
  `categorySlug` mais aucun endpoint de listing des catégories n'existe.
  Implémenter le filtre imposerait soit un `distinct` en SQL soit un nouveau
  controller — réservé à une itération dédiée.
- **Pas de favoris côté serveur** : décision assumée pour V2. Si un besoin
  buyer CRM émerge, la clé localStorage sert de seed pour migrer vers une table
  `MarketplaceBookmark` sans perte d'historique utilisateur.
- **i18n non étendue aux espaces internes** : 15 composants consommeraient
  ~300 clés supplémentaires — livrer la mécanique (hook + toggle + dictionnaire
  extensible) est déjà un gain, le peuplement est itératif.
- **Pas de refonte de l'existant** : review queue, diagnostics et admin
  dashboard MVP restent la base ; seul le bulk approve a été greffé.

---

## Fichiers récap

```
NEW
  apps/frontend/src/components/marketplace/Pagination.tsx
  apps/frontend/src/components/marketplace/FavoriteButton.tsx
  apps/frontend/src/components/marketplace/ShareButton.tsx
  apps/frontend/src/components/marketplace/LangSwitcher.tsx
  apps/frontend/src/components/marketplace/PublicMarketplaceHeader.tsx
  apps/frontend/src/lib/marketplace/favorites.ts
  apps/frontend/src/lib/i18n.ts
  apps/frontend/src/app/marketplace/favorites/page.tsx
  apps/frontend/src/app/(dashboard)/seller/dashboard/page.tsx
  docs/marketplace/V2-ROADMAP-REPORT.md

MODIFIED
  apps/frontend/src/app/marketplace/page.tsx
  apps/frontend/src/app/marketplace/layout.tsx
  apps/frontend/src/app/marketplace/products/[slug]/page.tsx
  apps/frontend/src/components/marketplace/ProductCard.tsx
  apps/frontend/src/components/layout/sidebar.tsx
  apps/frontend/src/app/(dashboard)/admin/review-queue/page.tsx
```

---

## Verdict

**🟢 Roadmap V2 exécutée dans son périmètre « rentable ».**

Les 3 sprints ont livré un gain UX et opérationnel immédiat :

- Buyer : browsing réellement utilisable (pagination, favoris, partage, fiche
  vendeur enrichie).
- Seller : cockpit 1-écran, zéro navigation multi-pages pour le suivi courant.
- Admin : traitement en lot de la file de revue, i18n amorcée.

Aucune régression : tests passent, build OK, lint zéro warning.
