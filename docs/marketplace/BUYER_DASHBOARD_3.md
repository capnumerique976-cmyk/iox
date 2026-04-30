# BUYER-DASHBOARD-3 — Édition self-service profil buyer

Étend BUYER-DASHBOARD-2 (cockpit + profile lecture seule) avec édition
des champs identité/contact d'une company dont le user est membre.

## Backend

### Endpoint

`PATCH /api/v1/companies/mine/:id` — accessible à tous les rôles
authentifiés. Scope intrinsèque par `user.companyIds`. DTO restreint
(pas de `types`, pas de `isActive`).

### Service

`CompaniesService.updateMine(id, actorCompanyIds, actorId, dto)` :
- ForbiddenException si `id` pas dans `actorCompanyIds`.
- NotFoundException si company introuvable / soft-deleted.
- Update Prisma + audit log `COMPANY_UPDATED_SELF` (différent de
  `COMPANY_UPDATED` admin pour traçabilité).

### DTO

`UpdateMyCompanyDto` (strict) :
- `name?` (min 2 chars)
- `email?` (`@IsEmail`)
- `phone?` (string)
- `address?`, `city?`, `country?`, `vatNumber?`, `website?` (`@IsUrl`)
- **PAS** : `types`, `isActive`, `notes`, `code`, etc.

## Frontend

### Helper

`apps/frontend/src/lib/companies.ts` ajoute :
- `UpdateMyCompanyInput` type
- `companiesApi.updateMine(id, dto, token)`

### Pages

| Route | Description |
|-------|-------------|
| `/buyer/profile` (existant) | + bouton **Modifier** par company → `/buyer/profile/edit?id=...` |
| `/buyer/profile/edit` | Form contrôlé, validation client, redirect vers `/buyer/profile` au save |

Form : 8 champs (name required, email, phone, address, city, country
ISO, vatNumber, website url). Sélecteur multi-companies si user appartient
à plusieurs.

PATCH par diff minimal (seuls les champs modifiés sont envoyés).

## Tests

### Backend

`companies.service.spec.ts` — 3 nouveaux specs `updateMine` :
- ForbiddenException si id pas dans actorCompanyIds
- NotFoundException si company inexistante
- happy path : update + audit `COMPANY_UPDATED_SELF`

Total `companies.service.spec` : **10 specs passants** (7 + 3 nouveaux).

### Frontend

`page.test.tsx` (edit) — 6 specs :
- charge company + pre-remplit form
- Save désactivé si pas dirty
- modif phone → save envoie diff + push `/buyer/profile`
- validation client name < 2 chars
- multi-companies sélecteur visible
- empty state si aucune company

Total `/buyer/*` : **28 specs passants** (4 list + 7 detail + 5 cockpit
+ 6 profile + 6 edit).

```bash
pnpm --filter @iox/backend exec jest --testPathPattern companies
# Tests: 10 passed

pnpm --filter @iox/frontend exec vitest run "src/app/(dashboard)/buyer"
# Test Files 5 passed — Tests 28 passed
```

## Décisions

- **Endpoint séparé `/companies/mine/:id`** plutôt que tweak de
  `/companies/:id` admin : permission boundary explicite + DTO restreint
  + audit action différenciée (`COMPANY_UPDATED_SELF` vs
  `COMPANY_UPDATED`).
- **`@Roles` non posé** sur `updateMine` : l'endpoint est accessible à
  tout user authentifié, le scope vient de `actor.companyIds`.
- **Diff minimal** côté frontend : évite d'envoyer des fields non
  modifiés (audit log plus propre, payload plus léger).
- **Validation `@IsUrl()`** stricte sur website : peut bloquer un user
  saisissant `acme.fr` sans `https://` — on accepte le tradeoff (UX
  moindre vs sécurité contre injection).

## Hors scope (suite)

- BUYER-DASHBOARD-4 : préférences notifications (opt-out granulaire).
- Édition de l'utilisateur lui-même (firstName, lastName, email user).
- Ajout d'une nouvelle company par le user (pour l'instant admin only).
- Désactivation self-service (probablement laissée admin only).
