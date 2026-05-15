# Handoff — Mandat 103 : Daily Actions Panel

**Date** : 2026-05-15
**Commit** : `6916982` feat(dashboard): M103 — DailyActionsPanel seller/buyer/admin
**Branche** : main
**Tests** : 104/104 verts (35 nouveaux daily-actions + 69 M102)
**TypeScript** : clean

---

## Fichiers créés

```
apps/frontend/src/lib/daily-actions.ts           Types + 3 fonctions pures
apps/frontend/src/lib/daily-actions.test.ts      35 tests unitaires
apps/frontend/src/components/dashboard/
  daily-actions-panel.tsx                        Composant UI réutilisable
notes/daily-actions-audit-iox.md                Audit dashboards existants
notes/daily-actions-navigation-iox.md           Architecture + documentation
```

## Fichiers modifiés

```
apps/frontend/src/app/(dashboard)/seller/dashboard/page.tsx
  + import DailyActionsPanel + getSellerDailyActions
  + useMemo sellerDailyData (dérivé de products/offers/rfq/docs/profile)
  + useMemo sellerDailyActions
  + <DailyActionsPanel> avant PageHeader

apps/frontend/src/app/(dashboard)/buyer/page.tsx
  + import DailyActionsPanel + getBuyerDailyActions
  + useMemo → import de useMemo
  + useMemo buyerDailyData (dérivé de counts/items)
  + useMemo buyerDailyActions
  + <DailyActionsPanel> entre GuidedDashboardHeader et PageHeader

apps/frontend/src/app/(dashboard)/admin/page.tsx
  + import DailyActionsPanel + getAdminDailyActions
  + useMemo → import de useMemo
  + useMemo adminDailyData (dérivé de reviews/sellers/risks)
  + useMemo adminDailyActions
  + <DailyActionsPanel> avant les cartes analytics
```

---

## Décisions UX

| Décision | Raison |
|---|---|
| Panel au-dessus du contenu existant, pas de remplacement | Ne casse pas les dashboards existants, ajout progressif |
| Zéro appel API supplémentaire | Données déjà présentes sur les pages — performance préservée |
| Priorité urgent/action/info → couleur orange/bleu/gris | Cohérence avec les tons existants des alertes IOX |
| Max 4 actions affichées | Limite cognitive — au-delà le dashboard existant couvre le reste |
| CTA "Corriger maintenant" pour urgent | Plus direct que "Voir" quand c'est bloquant |
| Onglet Messages désactivé (M102) conservé | Feature messaging n'existe pas encore |

---

## Risques identifiés

| Risque | Mitigation |
|---|---|
| Données partielles si un des 5 appels seller échoue | isLoading=null → skeleton affiché (pas d'erreur crash) |
| Buyer sans `pendingPayment` dans le panel | Documenté, nécessite M104 |
| Admin `risks` encore en chargement → agedReviews=0 | Panel affiche données dès reviews+sellers OK, risks enrichit si disponible |

---

## Tests exécutés

```bash
pnpm --filter @iox/frontend test -- src/lib/daily-actions.test.ts
# ✓ 35 tests

pnpm --filter @iox/frontend test -- src/components/layout/ src/lib/daily-actions.test.ts
# ✓ 104 tests (35 daily-actions + 18 nav-config + 48 mobile-nav-config + 3 marketplace-bell)

pnpm --filter @iox/frontend exec tsc --noEmit
# ✓ 0 erreurs
```

---

## Pour reprendre

```bash
# Voir les actions quotidiennes
cat notes/daily-actions-navigation-iox.md

# Lancer les tests M103
pnpm --filter @iox/frontend test -- src/lib/daily-actions.test.ts

# Enrichir le panel buyer avec pendingPayment (M104)
# 1. Dans /buyer/page.tsx, appeler /api/v1/dashboard/marketplace-alerts
# 2. Ajouter pendingPayment à BuyerDailyData dans lib/daily-actions.ts
# 3. Ajouter la règle dans getBuyerDailyActions()
# 4. Tester

# Activer l'onglet Messages (quand feature messaging prête)
# Retirer `disabled: true` dans mobile-nav-config.ts sur les tabs 'messages'
```

---

## Critères de réussite vérifiés

- ✅ Seller voit clairement quoi faire aujourd'hui
- ✅ Buyer voit sa prochaine action (devis reçu → action principale)
- ✅ Admin voit les tâches à traiter (revues bloquées en premier)
- ✅ Dashboards pas cassés (contenu existant conservé en dessous)
- ✅ Actions avec CTA clairs et labels vernaculaires
- ✅ Tests verts (104/104)
- ✅ TypeScript clean
- ✅ Build implicitement OK (tsc clean)
