# BUYER-DASHBOARD-2 — Cockpit + profil buyer

Étend BUYER-DASHBOARD-1 avec :
- Cockpit `/buyer` (compteurs RFQ par status, raccourcis catalogue/profile).
- Page `/buyer/profile` (identité user + companies dont le user est membre).
- Backend : `GET /api/v1/companies/mine` (lecture seule, scope user.companyIds).

Hors scope ce lot : `/buyer/orders` (déférée à PAY-2 quand le modèle `Order`
arrive). Édition profil : aucune (admin-only via `/admin/memberships` ou
`/companies/:id` PATCH).

## Backend

### Service

`CompaniesService.findMine(companyIds: string[])` :
- retourne tableau vide si `companyIds.length === 0` (pas de query inutile)
- sinon `findMany` filtré par `id IN companyIds AND deletedAt IS NULL`
- include `_count` (supplyContracts, inboundBatches, documents)
- ordonné par `name asc`

### Endpoint

`GET /api/v1/companies/mine` — accessible à tous les rôles authentifiés
(pas de `@Roles()` strict). Le scope est intrinsèquement borné par
`user.companyIds` (issu des memberships JWT).

```bash
curl -H "Authorization: Bearer $TOKEN" https://iox.mycloud.yt/api/v1/companies/mine
```

## Frontend

### Helper

`apps/frontend/src/lib/companies.ts` — `companiesApi.findMine(token)` →
`Promise<CompanySummary[]>`.

### Pages

| Route | Composant | Description |
|-------|-----------|-------------|
| `/buyer` | `BuyerCockpitPage` | Compteurs RFQ (NEW/QUALIFIED/QUOTED/NEGOTIATING) + raccourcis catalogue/profile. |
| `/buyer/profile` | `BuyerProfilePage` | Identité user + liste companies (lecture seule). |

Les 2 pages sont sous le layout `/buyer/*` (role guard `MARKETPLACE_BUYER`
+ ADMIN/COORDINATOR pour QA, déjà en place depuis BUYER-DASHBOARD-1).

### Cockpit `/buyer`

- **Compteurs** : 4 cards cliquables (NEW/QUALIFIED/QUOTED/NEGOTIATING) →
  redirigent vers `/buyer/quote-requests?status=...`.
- **Total actif** affiché dans subtitle (somme NEW+QUALIFIED+QUOTED+NEGOTIATING).
- **Bouton Actualiser** : refetch RFQ list.
- **Raccourcis** : 2 cards (catalogue marketplace, profile).

### Profil `/buyer/profile`

- **Section "Compte utilisateur"** : nom, email, rôle, ID.
- **Section "Mon entreprise"** (singulier si 1 company, pluriel si >1) :
  liste cards avec coordonnées (email, phone, adresse, site, n° TVA),
  badge actif/inactif, badges types CompanyType.
- **Empty state** si aucune company rattachée → invite à contacter
  l'admin.
- **Mention édition non disponible** : édition profil/company =
  admin-only en V1.

## Tests

### Backend

`companies.service.spec.ts` — 2 nouveaux specs `findMine` :
- tableau vide si companyIds vide (pas d'appel Prisma)
- où `id IN companyIds AND deletedAt: null`, orderBy name asc

Total companies backend : **7 specs passants** (5 + 2 nouveaux).

### Frontend

| Fichier | Specs | Description |
|---------|-------|-------------|
| `buyer/page.test.tsx` | 5 | Greeting firstName, compteurs RFQ par status, lien "Voir toutes mes demandes", raccourcis catalogue/profile, bouton Actualiser. |
| `buyer/profile/page.test.tsx` | 6 | Identité user, company complète, empty state, badges types, badges actif/inactif. |

Total `/buyer/*` : **22 specs passants** (4 list + 7 detail + 5 cockpit + 6 profile).

```bash
pnpm --filter @iox/frontend exec vitest run "src/app/(dashboard)/buyer"
# Test Files 4 passed — Tests 22 passed
```

## Décisions

- **Pas de mutation** dans cette phase. Édition profil = admin-only via
  `/admin/memberships` ou PATCH `/companies/:id` (backend ADMIN/COORDINATOR).
  Évite onboarding complexe seller-style pour buyer V1.
- **`findMine` plutôt que `findOne` étendu** : plus explicite côté
  frontend (1 call retourne array, gère multi-companies natif), pas de
  cas d'erreur "company pas dans mes memberships" à gérer.
- **`/buyer/orders` reportée** : modèle `Order` absent jusqu'à PAY-2 ;
  ajouter une page vide serait trompeur côté UX.

## Hors-scope (suite)

- `/buyer/orders` → PAY-2 (modèle Order + listing).
- Édition profil buyer (téléphone, email contact) → BUYER-DASHBOARD-3.
- Préférences notifications (opt-out granulaire) → MP-NOTIF-3 phase 3.
- Multi-buyer-company switch UX (si user appartient à plusieurs
  companies en même temps) → BUYER-DASHBOARD-3+.
