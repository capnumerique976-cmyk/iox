# Handoff — Méga-mandat autonome 2026-05-02

## Résumé

3 LOTs développés, 2 PRs créées et mergées, déploiement VPS OK.

## Phase 1 — Cascade 4 PRs (déjà complétée session précédente)

| PR   | Titre                                      | Status   |
|------|--------------------------------------------|----------|
| #61  | Stripe prep (sans PAY)                     | Merged   |
| #62  | I18N-6 sellers index + seller detail EN    | Merged   |
| #65  | MP-CATEGORY-1 CRUD admin catégories        | Merged   |
| #64  | I18N-7/8 + MP-CATEGORY-2                   | Merged   |

SHA main post-cascade : `3f78469`

## Phase 2 — 3 LOTs nouveau dev

### LOT A — MP-NOTIF-3 phase 7 (PR #66)

**Scope** : replay endpoint + retry cron + admin UI button

**Backend :**
- `POST /notif-email/logs/:id/replay` — admin rejoue un email FAILED
- `NotifEmailRetryService` — cron `@Cron(EVERY_30_MINUTES)`, batch 50, max 3 retries, skip UNSUBSCRIBED/OPTED_OUT
- 10 nouveaux tests (150 total notif-email)

**Frontend :**
- Bouton "Rejouer" avec spinner sur lignes FAILED dans `/admin/notif-email/logs`
- 3 tests frontend

**Fichiers :**
- `apps/backend/src/notif-email/notif-email-retry.service.ts` (nouveau)
- `apps/backend/src/notif-email/notif-email-retry.service.spec.ts` (nouveau)
- `apps/backend/src/notif-email/notif-email.service.ts` (replayFailedLog method)
- `apps/backend/src/notif-email/notif-email.service.spec.ts` (3 tests ajoutés)
- `apps/backend/src/notif-email/notif-email.controller.ts` (POST replay endpoint)
- `apps/backend/src/notif-email/notif-email.module.ts` (ScheduleModule + RetryService)
- `apps/frontend/src/lib/notif-email.ts` (replayLog method)
- `apps/frontend/src/app/(dashboard)/admin/notif-email/logs/page.tsx` (replay button)
- `apps/frontend/src/app/(dashboard)/admin/notif-email/logs/page.test.tsx` (3 tests)

### LOT B — BUYER-DASHBOARD-2 (PR #67)

**Scope** : orders page + profile company avancé + notification stubs

**Feature 1 — Orders page :**
- `/buyer/orders` — vue filtrée RFQ status=WON comme "commandes"
- Table avec offre, vendeur, quantité, date de clôture, lien détail
- Pagination, empty state, accent emerald
- 3 tests

**Feature 2 — Profile company extensions :**
- Prisma : `postalCode String?` + `description String? @db.Text` (additive)
- Edit form : champs code postal + description (textarea)
- Profile page : section "Présentation" affichant description

**Feature 3 — Notification stubs :**
- 3 types "Bientôt" : ORDER_SHIPPED, PRICE_CHANGE, NEW_PRODUCTS
- Badge "(Bientôt)" + toggle désactivé
- Aucun appel API pour ces types

**Feature 4 — Cockpit :**
- Compteur WON dans la grille
- Carte raccourci "Mes commandes" → /buyer/orders

**Fichiers :**
- `prisma/schema.prisma` (+2 champs Company)
- `apps/frontend/src/lib/companies.ts` (types étendus)
- `apps/frontend/src/app/(dashboard)/buyer/orders/page.tsx` (nouveau)
- `apps/frontend/src/app/(dashboard)/buyer/orders/page.test.tsx` (nouveau)
- `apps/frontend/src/app/(dashboard)/buyer/page.tsx` (cockpit étendu)
- `apps/frontend/src/app/(dashboard)/buyer/preferences/page.tsx` (stubs notifs)
- `apps/frontend/src/app/(dashboard)/buyer/profile/page.tsx` (description display)
- `apps/frontend/src/app/(dashboard)/buyer/profile/edit/page.tsx` (nouveaux champs)

### LOT C — ADMIN-AUDIT-VIEWER (PR #67, même PR que LOT B)

**Scope** : page admin consultation journal d'audit

- `/admin/audit-logs` — page complète avec :
  - Filtres : entityType (select 19 types), action (texte), userId, plage dates
  - Table : date, action (badge), type entité (badge coloré), entity ID (tronqué), utilisateur, notes
  - Modal détail : JSON previousData/newData pretty-printed, IP, user-agent
  - Pagination 50/page
- Labels français pour les 19 EntityType
- 4 tests frontend

**Fichiers :**
- `apps/frontend/src/lib/audit.ts` (nouveau)
- `apps/frontend/src/app/(dashboard)/admin/audit-logs/page.tsx` (nouveau)
- `apps/frontend/src/app/(dashboard)/admin/audit-logs/page.test.tsx` (nouveau)
- `apps/frontend/src/app/(dashboard)/admin/page.tsx` (lien corrigé + icône Shield)

## Phase 3 — Merge + Deploy

| PR   | Titre                                                | Status  |
|------|------------------------------------------------------|---------|
| #66  | MP-NOTIF-3 ph7 — replay + retry + admin UI          | Merged  |
| #67  | BUYER-DASHBOARD-2 + ADMIN-AUDIT-VIEWER               | Merged  |

SHA main final : `503859a`

**Deploy VPS** : OK — 2026-05-02T04:31:42Z
- HTTPS / → 307
- HTTPS /login → 200
- API /api/v1/health → 200
- API /api/v1/health/live → 200

## Guardrails respectés

- 0 force-push main
- 0 Stripe real calls
- 0 PAY module modification
- 0 env var changes
- 0 external emails
- Prisma additive only (2 nullable columns)
- tsc clean backend + frontend
- 150 backend notif-email tests + 39 buyer tests + 4 audit tests + 22 notif-email frontend tests = all pass

## Migration Prisma en attente

`postalCode` et `description` ajoutés au model Company. `prisma generate` fait, mais `prisma migrate dev` non exécuté. À faire manuellement :
```bash
pnpm --filter @iox/backend exec prisma migrate dev --name add-company-postal-code-description
```

## Notes

- LOT C (audit-viewer) a été inclus dans PR #67 avec LOT B car les commits étaient chaînés sur la même branche. Le squash merge contient les deux LOTs.
- Le retry service utilise `metadataJson.retryCount` (pas de migration schema nécessaire).
- Les 3 types de notification stubs (ORDER_SHIPPED, PRICE_CHANGE, NEW_PRODUCTS) sont frontend-only. Backend EmailUnsubscribeType enum non modifié.
