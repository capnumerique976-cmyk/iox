# MP-CATEGORY-1 — Gestion catégories marketplace (admin CRUD)

## TL;DR

CRUD admin sur le modèle `MarketplaceCategory` (déjà présent au schema). Tree view avec parent → children, soft delete intelligent (si products ou children attachés → `isActive=false` au lieu de hard delete), et UI admin dédiée.

État final :
- 4 endpoints `/admin/marketplace/categories/*` (ADMIN + COORDINATOR pour list, ADMIN seul pour create/update/delete).
- Page admin `/admin/marketplace/categories` avec tree view + modal create/edit.
- 12 specs backend + 6 specs frontend verts.

## Modèle

`MarketplaceCategory` existait déjà au schema (pas de migration nécessaire) :

```prisma
model MarketplaceCategory {
  id          String   @id @default(uuid())
  parentId    String?
  nameFr      String
  nameEn      String?
  slug        String   @unique
  description String?
  sortOrder   Int      @default(0)
  isActive    Boolean  @default(true)
  parent      MarketplaceCategory? @relation("MarketplaceCategoryTree", ...)
  children    MarketplaceCategory[]
  marketplaceProducts MarketplaceProduct[]
}
```

V1 : pas de `descriptionFr`/`descriptionEn` séparés (single `description` field). À étendre en V2 si besoin i18n description.

## Endpoints

| Méthode | URL | Rôle | Action |
|---|---|---|---|
| GET | `/admin/marketplace/categories?includeInactive=bool` | ADMIN, COORDINATOR | Liste arborescente (tree avec children récursifs + productsCount) |
| GET | `/admin/marketplace/categories/:id` | ADMIN, COORDINATOR | Fiche catégorie |
| POST | `/admin/marketplace/categories` | ADMIN | Créer (slug unique, parentId optionnel) |
| PATCH | `/admin/marketplace/categories/:id` | ADMIN | Update (nameFr/nameEn/desc/parentId/sortOrder/isActive) |
| DELETE | `/admin/marketplace/categories/:id` | ADMIN | Hard delete si pas de products ni children, sinon soft (isActive=false) |

## Soft delete logique

- Si `productsCount > 0` OU `childrenCount > 0` → `isActive=false`, audit `MARKETPLACE_CATEGORY_DEACTIVATED` avec `reason: 'has_products_or_children'`.
- Sinon → hard delete + audit `MARKETPLACE_CATEGORY_DELETED`.

Empêche orphelinage côté products. UI affiche badge "Inactif" + filtre `includeInactive` checkbox.

## Tree builder

`findAllTree(includeInactive)` :
1. Query plate avec `findMany` + `_count.marketplaceProducts`.
2. Construit `Map<id, CategoryNode>` puis link parent-children.
3. Retourne uniquement les roots (parentId=null) avec children récursifs.

Si parent inactif filtré (includeInactive=false), child orphan devient root pour ne pas perdre son rendu.

## Validation create

- `slug` lowercase + tirets uniquement (regex `^[a-z0-9]+(?:-[a-z0-9]+)*$`).
- `slug` unique → ConflictException 409 si dup.
- `parentId` doit exister sinon BadRequestException 400.
- `nameFr` + `nameEn` requis (min 2, max 120 chars).

## Validation update

- `parentId === id` → BadRequestException (cycle self).
- V1 : pas de check cycle profond (parent → grandparent → self). À ajouter en V2 si arbres profonds.

## Frontend

`/admin/marketplace/categories/page.tsx` (client component) :
- Tree view récursif (`CategoryRow` rendre + récurse children).
- Indentation visuelle via `paddingLeft: 12 + depth * 24px`.
- Modal create/edit avec :
  - Slug visible uniquement à create (immutable après).
  - NameFr + NameEn requis.
  - Description optionnelle, sortOrder int, isActive checkbox.
- Boutons par row : "+" (sous-catégorie), "Edit" (modifier), "Trash" (delete avec confirm).
- Confirmation delete adapté : message différent si products/children attachés.

## Audit

3 actions auditées :
- `MARKETPLACE_CATEGORY_CREATED` (newData : slug, nameFr, parentId).
- `MARKETPLACE_CATEGORY_UPDATED` (previousData/newData : nameFr, parentId, isActive).
- `MARKETPLACE_CATEGORY_DEACTIVATED` (newData : reason, productsCount, childrenCount).
- `MARKETPLACE_CATEGORY_DELETED` (previousData : slug, nameFr).

## Tests

```
$ pnpm --filter @iox/backend test src/marketplace-categories
PASS src/marketplace-categories/marketplace-categories.service.spec.ts
Test Suites: 1 passed, 1 total
Tests:       12 passed, 12 total

$ pnpm --filter @iox/frontend test -- admin/marketplace/categories --run
✓ src/app/(dashboard)/admin/marketplace/categories/page.test.tsx (6 tests) 195ms
Test Files  1 passed (1)
Tests  6 passed (6)
```

12 specs backend (findAllTree x3, create x3, update x2, delete x4) + 6 specs frontend (rendu, empty, toggle inactive, modal create, modal edit, create flow).

Backend tsc clean. Frontend tsc clean.

## TODO V2

- Drag-reorder côté UI (HTML5 native drag) — actuellement reorder via `sortOrder` int input modal seulement.
- Description i18n (descriptionFr / descriptionEn) si besoin.
- Cycle check profond (parent → grandparent → self) si arbres deviennent profonds (V1 = 1 niveau visible UI).
- Bulk import CSV.
- Page publique `/marketplace/categories` avec affichage hiérarchique.
- Préfixe parent dans le slug (`epices/vanille`) pour SEO.
