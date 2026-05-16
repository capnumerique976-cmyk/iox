# Handoff — M116B : Menu Principal Métier Mobile IOX

**Date :** 2026-05-16
**Mandat :** M116B — Restructuration du menu mobile en 7 modules métier
**Statut :** ✅ GO — Prêt pour revue et déploiement

---

## 1. Contexte

M115 avait introduit un drawer bottom sheet avec des sections **feature-based** (Mes produits, Mes demandes, Documents...). Cette organisation reflétait les écrans techniques, pas les workflows attendus par les utilisateurs (agriculteurs, acheteurs, opérateurs).

M116B restructure entièrement la configuration du menu mobile en **7 modules métier** communs, filtrés par rôle.

---

## 2. Fichiers modifiés

### Modifiés

| Fichier | Nature |
|---------|--------|
| `apps/frontend/src/components/layout/mobile-menu-config.ts` | **Réécriture complète** — 7 modules métier par rôle |
| `apps/frontend/src/components/layout/mobile-bottom-nav.tsx` | **Mineur** — affichage de `section.description` dans l'en-tête accordéon |
| `apps/frontend/src/components/layout/mobile-menu-config.test.ts` | **Réécriture complète** — tests alignés M116B |

### Inchangés

| Fichier | Raison |
|---------|--------|
| `apps/frontend/src/components/layout/mobile-nav-config.ts` | Bottom nav tabs — hors scope M116B |
| `apps/frontend/src/components/layout/mobile-sidebar.tsx` | Sidebar desktop — hors scope M116B |
| Toute la stack backend | Aucune modification de données ou d'API |

### Créés

| Fichier | Nature |
|---------|--------|
| `notes/menu-principal-metier-mobile-iox.md` | Documentation architecture M116B |
| `notes/handoff-mandat-116B-menu-principal-metier-mobile.md` | Ce fichier |

---

## 3. Ce qui a changé dans `mobile-menu-config.ts`

### Type — ajout de `description`

```typescript
export interface MobileMenuSection {
  id: string;
  label: string;
  description?: string;   // NOUVEAU M116B — affiché dans l'en-tête accordéon
  icon: LucideIcon;
  items: MobileMenuItem[];
  defaultCollapsed?: boolean;
}
```

### Structure par rôle

| Rôle | Modules exposés | Modules cachés |
|------|-----------------|----------------|
| MARKETPLACE_SELLER | 6 (Accueil, Référentiel, Production, Achats, Catalogue, Distribution) | Administration |
| MARKETPLACE_BUYER | 5 (Accueil, Référentiel, Achats, Catalogue, Distribution) | Production + Administration |
| ADMIN | 7 (tous) | — |

### Les 7 modules métier

| ID | Label | Description |
|----|-------|-------------|
| `home` | Accueil | Vos actions du jour et votre tableau de bord. |
| `referentiel` | Référentiel | Vos profils, documents et données de base. |
| `production` | Production | Vos produits, lots et médias. |
| `achats` | Achats | Demandes, devis et commandes. |
| `catalogue` | Catalogue | Recherche, offres et catégories. |
| `distribution` | Distribution | Factures, paiements et suivi. |
| `administration` | Administration | Contrôle, modération et exploitation. |

### Décisions UX

- `home` ouvert par défaut (`defaultCollapsed: false`) pour tous les rôles
- Tous les autres modules fermés par défaut
- Aucune route admin exposée aux seller/buyer
- Labels sans jargon : RFQ → "Demandes", dashboard → "Tableau de bord"
- `description` sur chaque section aide les utilisateurs à comprendre le module sans l'ouvrir

---

## 4. Ce qui a changé dans `mobile-bottom-nav.tsx`

Affichage de la description dans l'en-tête de section accordéon :

```tsx
// AVANT (M115)
<span className={cn('flex-1 text-sm font-semibold', ...)}>
  {section.label}
</span>

// APRÈS (M116B)
<div className="flex-1 min-w-0">
  <span className={cn('text-sm font-semibold', ...)}>
    {section.label}
  </span>
  {section.description && (
    <p className="text-xs text-white/35 leading-snug mt-0.5 truncate">
      {section.description}
    </p>
  )}
</div>
```

---

## 5. Tests

### Résultats

| Métrique | Avant M116B | Après M116B | Delta |
|----------|------------|-------------|-------|
| Tests total | 659 | 678 | +19 |
| Tests passants | 659/659 | 678/678 | ✅ |
| Tests échoués | 0 | 0 | — |

### Couverture des tests ajoutés (`mobile-menu-config.test.ts`)

- `getMobileMenuSections` — routage par rôle (5 cas)
- Structure 7 modules métier — présence des IDs, comptes par rôle (4 cas)
- Structure générique — IDs uniques, label/icon présents, `description` présente (6 cas)
- Module Accueil — ouvert par défaut, route par rôle (6 cas)
- Isolation routes admin — seller/buyer sans `/admin`, admin avec (4 cas)
- Couverture routes seller — 14 routes testées
- Couverture routes buyer — 12 routes testées
- Couverture routes admin — 13 routes testées
- Labels sans jargon — termes interdits (rfq, RFQ, slug, workflow, cockpit...) (1 cas)

---

## 6. TypeScript

```
✅ 0 erreurs TypeScript
```

Commande exécutée : `pnpm --filter frontend tsc --noEmit`

---

## 7. Build Next.js

```
✅ Build réussi — 0 erreurs, 0 warnings critiques
```

Commande exécutée : `pnpm --filter frontend build`

Pages vérifiées dans la sortie build :
- `/seller/dashboard` ✅
- `/seller/marketplace-products` ✅
- `/seller/marketplace-offers` ✅
- `/buyer` ✅
- `/admin` ✅
- `/buyer/invoices/[id]` ✅ (créé M116A)

---

## 8. Risques

| Risque | Niveau | Mitigation |
|--------|--------|------------|
| Régression bottom nav tabs (M115) | Faible | `mobile-nav-config.ts` non modifié, tests M115 toujours verts |
| Régression sidebar desktop | Faible | `mobile-sidebar.tsx` non modifié |
| Confusion UX "Achats" pour seller | Faible | Représente réponses aux RFQ entrants — documenté, label "Demandes reçues" dans le menu |
| Module unique item (Achats/seller, Catalogue/admin) | Faible | Acceptable pour cohérence structurelle |
| Routes futures non liées (messages, traceability) | Aucun | Documentées mais non créées — aucun faux lien |

---

## 9. Décision

| Critère | Statut |
|---------|--------|
| TypeScript | ✅ 0 erreurs |
| Tests | ✅ 678/678 |
| Build | ✅ Succès |
| Régression M115 | ✅ Aucune |
| Routes admin isolées | ✅ Confirmé par tests |
| Faux liens | ✅ Aucun — seules routes existantes |

**→ GO** — Aucune réserve.

---

## 10. Suite recommandée

- **M116C** : Badge de comptage sur modules avec alertes (ex: nb demandes en attente sur "Achats")
- **M116D** : Auto-ouvrir le module actif selon la route courante
- **Futur** : Module messagerie une fois `/messages` implémenté
