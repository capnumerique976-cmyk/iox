# Handoff — Mandat 77 : PWA & Mobile terrain (coopératives agricoles)

**Date :** 2026-05-11  
**Branche :** `main` (commit post-M77)  
**Statut :** ✅ TERMINÉ

---

## 1. Contexte

Post M76 (fixes sécurité P0 + checklist VPS pilote). M77 couvre la partie B du plan M76 : rendre IOX installable comme PWA sur les terminaux terrain des coopératives agricoles (Android Chrome + iOS Safari), sans Service Worker (données financières/auth ne doivent pas être cachées).

---

## 2. Ce qui a été fait

### A — Audit mobile pages (existant)

Vérification des pages critiques vendeur/acheteur/admin :
- Tables : classe `iox-table-wrap` déjà présente (`overflow-x-auto` + `min-w-[640px]`)
- Navigation : sidebar collapsible fonctionnelle
- Formulaires : inputs `w-full`, accessibles
- Pages RFQ detail, checkout, produits : `grid-cols` responsive avec breakpoints `sm:` / `md:`

**Bilan audit :** Aucune régression mobile critique. Pages utilisables sur smartphones modernes.

### B — Manifest PWA (`app/manifest.ts`)

Fichier créé. Accessible à `/manifest.webmanifest`.
- `display: standalone` → expérience app native
- `orientation: portrait-primary` → adapté terrain
- `theme_color: #0a1f4d` → couleur barre navigateur
- 3 icônes : SVG 192, SVG 512 maskable, PNG 32 fallback
- 2 raccourcis : Catalogue + Mes devis

### C — Icônes (`app/icon.tsx`, `app/apple-icon.tsx`)

Générées dynamiquement via `ImageResponse` (edge runtime) :
- `/icon` → PNG 32×32 (favicon navigateur)
- `/apple-icon` → PNG 180×180 (iOS "Ajouter à l'écran d'accueil")

Emblème IOX SVG (anneau bleu, swoosh teal, lettre "i", lettre "o", feuille verte, réseau vert).

### D — Metadata layout (`app/layout.tsx`)

Ajout :
- `appleWebApp: { capable: true, title: 'IOX', statusBarStyle: 'black-translucent' }`
- `themeColor: '#0a1f4d'`
- `openGraph` minimal
- `formatDetection: { telephone: false }`
- Supprimé `icons` manuel (désormais géré par `icon.tsx`/`apple-icon.tsx`)

### E — SVG icônes manifest (`public/brand/`)

- `iox-icon-192.svg` → copie de `iox-emblem.svg` pour manifest 192px
- `iox-icon-512.svg` → copie de `iox-emblem.svg` pour manifest 512px maskable

### F — Fix null guards pré-existants

Deux erreurs TypeScript pré-existantes bloquaient le build :
- `seller/quote-requests/[id]/page.tsx:148` — `rfq.buyerUser` → `rfq.buyerUser ?`
- `seller/quote-requests/page.tsx:112` — `rfq.buyerUser.email` → `rfq.buyerUser?.email ?? '—'`

Corrigées avec null guards `?`. Valeur affichée `'—'` si `buyerUser` absent.

### G — Decision Service Worker

**Pas de SW** (intentionnel). Documenté dans `notes/mobile-pwa-implementation-iox.md` §1.

---

## 3. Fichiers modifiés / créés

| Fichier | Action |
|---|---|
| `apps/frontend/src/app/manifest.ts` | Créé |
| `apps/frontend/src/app/icon.tsx` | Créé |
| `apps/frontend/src/app/apple-icon.tsx` | Créé |
| `apps/frontend/src/app/layout.tsx` | Modifié |
| `apps/frontend/public/brand/iox-icon-192.svg` | Créé |
| `apps/frontend/public/brand/iox-icon-512.svg` | Créé |
| `apps/frontend/src/app/(dashboard)/seller/quote-requests/[id]/page.tsx` | Corrigé |
| `apps/frontend/src/app/(dashboard)/seller/quote-requests/page.tsx` | Corrigé |
| `notes/mobile-pwa-implementation-iox.md` | Créé |
| `notes/handoff-mandat-77-pwa-mobile-terrain.md` | Créé (ce fichier) |

---

## 4. Vérifications

| Check | Résultat |
|---|---|
| TypeScript frontend `tsc --noEmit` | ✅ 0 erreur |
| Vitest frontend | ✅ 78 files, 508 tests, 0 failure |
| Next.js build | ✅ OK — edge routes `icon` + `apple-icon` compilées |
| Backend Jest | Non modifié — ✅ 1016 tests (M76) |

---

## 5. Critères M77 — vérification

| Critère | Statut |
|---|---|
| Manifest créé et accessible | ✅ `/manifest.webmanifest` |
| App installable (Chrome installability) | ✅ manifest + icône 192 + standalone |
| Pages critiques vérifiées responsive | ✅ audit complet |
| Aucun cache dangereux | ✅ pas de SW |
| Tests frontend ≥ 508 | ✅ 508/508 |
| TypeScript clean | ✅ 0 erreur |
| Build frontend OK | ✅ compilé |

---

## 6. Test manuel sur VPS pilote (à faire après déploiement)

1. Chrome Android → `https://pilot.iox.example`
2. Vérifier bandeau "Ajouter à l'écran d'accueil"
3. Installer + vérifier icône IOX sur launcher
4. Ouvrir depuis launcher → standalone (pas de barre URL Chrome)
5. Safari iOS → Partager → Sur l'écran d'accueil → vérifier Apple Touch Icon 180px

---

## 7. Prochain mandat recommandé

**Mandat 78** (options) :
- **A** : Provisionnement VPS + déploiement pilote fermé (nécessite accès infra)
- **B** : Pages légales frontend (CGU, mentions légales, politique confidentialité) — intégration Next.js
- **C** : Monitoring — UptimeRobot + Sentry setup
- **D** : Onboarding coopératives — flow invite + activation compte
