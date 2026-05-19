# Handoff — Mandat 115 : Navigation Mobile Complète (Menu Principal)

**Date** : 2026-05-15
**Branche** : main
**Commits** : f0d31f7 → 5f3f075 → 9aabc89 → 52dee36
**Tests** : 657/657 ✅ (609 baseline + 48 nouveaux)
**TypeScript** : 0 erreur ✅

---

## Fichiers créés

| Fichier | Rôle |
|---|---|
| `apps/frontend/src/components/layout/mobile-menu-config.ts` | Types MobileMenuItem/MobileMenuSection + sections seller/buyer/admin |
| `apps/frontend/src/components/layout/mobile-menu-config.test.ts` | 48 tests : couverture routes + structure |
| `notes/mobile-main-menu-audit-iox.md` | Audit UX routes inaccessibles avant M115 |
| `notes/mobile-main-menu-navigation-iox.md` | Doc navigation M115 |
| `notes/handoff-mandat-115-mobile-main-menu.md` | Ce fichier |

## Fichiers modifiés

| Fichier | Changement |
|---|---|
| `apps/frontend/src/components/layout/mobile-bottom-nav.tsx` | Drawer sections accordéon, bouton Plus→Menu, user header |

## Fichiers NON modifiés

| Fichier | Raison |
|---|---|
| `apps/frontend/src/components/layout/mobile-nav-config.ts` | Tests existants verts, aucun changement nécessaire |
| `apps/frontend/src/lib/daily-actions.ts` | M103/M104 inchangé |

---

## Routes ajoutées à la navigation mobile

### Seller (absentes avant M115)
- `/seller/profile/edit` — modifier profil vendeur
- `/seller/profile/certifications` — certifications
- `/seller/marketplace-products/new` — créer produit (maintenant dans menu ET contextual action)
- `/seller/marketplace-offers/new` — créer offre (idem)

### Buyer (absentes avant M115)
- `/buyer/payments` — hub paiements
- `/buyer/profile/edit` — modifier profil
- `/marketplace/favorites` — favoris
- `/marketplace/categories` — catégories
- `/quote-requests/new` — nouvelle demande

### Admin (absent avant M115)
- `/admin/memberships` — rattachements

---

## Architecture technique

```
mobile-menu-config.ts          ← données pures (types + constantes)
  MobileMenuItem               ← id, label, href, icon, description?, badge?, disabled?, disabledNote?
  MobileMenuSection            ← id, label, icon, items[], defaultCollapsed?
  getMobileMenuSections(role)  ← SELLER | BUYER | ADMIN | null

mobile-bottom-nav.tsx          ← composant React
  MobileBottomNav()            ← composant principal (inchangé en signature)
  MenuSection()                ← composant interne accordéon (nouveau)
```

---

## Tests

| Fichier | Tests | Statut |
|---|---|---|
| `mobile-menu-config.test.ts` | 48 nouveaux | ✅ |
| `mobile-nav-config.test.ts` | 48 (inchangés) | ✅ |
| `daily-actions.test.ts` | 47 (inchangés) | ✅ |
| `marketplace-bell.test.tsx` | 3 (inchangés) | ✅ |
| Tous (657 total) | 657/657 | ✅ |

---

## Risques restants

| Risque | Impact | Mitigation |
|---|---|---|
| Scroll Sheet sur iOS (bounce) | UX dégradée | `overflow-y-auto` + `max-h-[90vh]` — testé visuellement |
| Sections ouvertes reset à chaque ouverture | Attendu | État géré dans le composant, reset voulu |
| Route `/messages` absente | Utilisateur confus | Note explicative dans "Mes demandes" : "Accessible dans chaque demande" |

---

## Décision finale

**✅ GO**

Navigation mobile complète :
- Bottom nav simple conservée (4 onglets + Menu)
- Menu principal avec accordéon par sections
- Seller / Buyer / Admin couverts
- Routes importantes toutes accessibles
- Tests 657/657 verts
- TypeScript clean
- Daily Actions inchangées
- PWA non cassée
