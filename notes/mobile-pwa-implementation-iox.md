# PWA & Mobile — Implémentation IOX (M77)

**Date :** 2026-05-11  
**Branche :** `main` (commit post-M77)

---

## 1. Décision architecture PWA

### Manifest uniquement — pas de Service Worker

**Raison :** Les données IOX (tokens JWT, RFQ, factures, paiements Stripe) ne doivent **pas** être mises en cache offline. Un SW avec stratégie cache-first ou stale-while-revalidate risquerait de servir des données périmées à des coopératives agricoles lors de transactions commerciales.

**Ce qui est implémenté (M77) :**
- Manifest PWA → installable sur Android (Chrome) et iOS (Safari "Ajouter à l'écran d'accueil")
- Icônes PNG (ImageResponse Next.js) + SVG (manifest)
- Metadata Apple Web App (iOS Safari)
- Aucun Service Worker

**Roadmap offline (post-pilote) :**
- Si besoin hors-ligne identifié sur le terrain → SW avec stratégie network-first uniquement sur pages statiques (ex: `/login`, `/marketplace` lecture seule)
- Jamais de cache sur : `/buyer/quote-requests`, `/buyer/payments`, `/seller/quote-requests`, `/admin/*`

---

## 2. Fichiers créés / modifiés

| Fichier | Action | Description |
|---|---|---|
| `apps/frontend/src/app/manifest.ts` | Créé | Web App Manifest PWA |
| `apps/frontend/src/app/icon.tsx` | Créé | Favicon PNG 32×32 via ImageResponse |
| `apps/frontend/src/app/apple-icon.tsx` | Créé | Apple Touch Icon PNG 180×180 via ImageResponse |
| `apps/frontend/src/app/layout.tsx` | Modifié | Metadata appleWebApp, openGraph, themeColor |
| `apps/frontend/public/brand/iox-icon-192.svg` | Créé | Icône SVG 192×192 pour manifest |
| `apps/frontend/public/brand/iox-icon-512.svg` | Créé | Icône SVG 512×512 maskable pour manifest |
| `apps/frontend/src/app/(dashboard)/seller/quote-requests/[id]/page.tsx` | Corrigé | `buyerUser` null guard |
| `apps/frontend/src/app/(dashboard)/seller/quote-requests/page.tsx` | Corrigé | `buyerUser?.email` null guard |

---

## 3. Manifest PWA

**URL :** `/manifest.webmanifest` (généré par Next.js depuis `app/manifest.ts`)

```
name: IOX — Indian Ocean Xchange
short_name: IOX
display: standalone
orientation: portrait-primary
theme_color: #0a1f4d
background_color: #0a1f4d
start_url: /
```

**Icônes manifest :**
- `/brand/iox-icon-192.svg` — 192×192 SVG (Chrome 100+ Android)
- `/brand/iox-icon-512.svg` — 512×512 SVG maskable (Chrome Android)
- `/icon` — PNG 32×32 fallback (old Android)

**Critères Chrome installability :**
- ✅ `name` + `short_name`
- ✅ `start_url`
- ✅ `display: standalone`
- ✅ Icône ≥ 192px

**Raccourcis (shortcuts) :**
- Catalogue → `/marketplace`
- Mes devis → `/buyer/quote-requests`

---

## 4. Icônes dynamiques (Next.js App Router)

### Favicon (`app/icon.tsx`)
- Runtime : `edge` (requis pour `ImageResponse`)
- Taille : 32×32 PNG
- Rendu : emblème IOX (anneau bleu + "i" blanc + "o" blanc) sur fond `#0a1f4d`
- URL auto-générée : `/icon`

### Apple Touch Icon (`app/apple-icon.tsx`)
- Runtime : `edge`
- Taille : 180×180 PNG
- Rendu : emblème IOX complet (anneau, swoosh teal, feuille verte, réseau vert, `borderRadius: 40px`)
- URL auto-générée : `/apple-icon`

---

## 5. Metadata iOS (layout.tsx)

```typescript
appleWebApp: {
  capable: true,          // <meta name="apple-mobile-web-app-capable" content="yes">
  title: 'IOX',           // Nom affiché sur l'écran d'accueil iOS
  statusBarStyle: 'black-translucent', // Barre de statut transparente
},
themeColor: '#0a1f4d',   // Barre navigateur Android Chrome + Safari iOS
```

---

## 6. Audit mobile pages — résultat

### Pages vérifiées

| Page | Tables scrollables | Responsive | Verdict |
|---|---|---|---|
| `/marketplace` | `iox-table-wrap` ✅ | `sm:` `md:` ✅ | OK |
| `/buyer/quote-requests` | `iox-table-wrap` ✅ | `sm:` `md:` ✅ | OK |
| `/buyer/quote-requests/[id]` | `grid-cols-2 md:grid-cols-4` ✅ | OK | OK |
| `/buyer/payments/checkout/[rfqId]` | `grid-cols-2` ✅ | `w-full` ✅ | OK |
| `/seller/quote-requests` | `sm:grid-cols-4` ✅ | OK | OK |
| `/seller/quote-requests/[id]` | `grid-cols-2 md:grid-cols-4` ✅ | `sm:text-2xl` ✅ | OK |
| `/seller/marketplace-products/new` | `w-full rounded-md` ✅ | OK | OK |
| `/seller/payments` | `sm:grid-cols-4` ✅ | OK | OK |

### Infrastructure responsive existante
- Classe `iox-table-wrap` : `overflow-x-auto` + `min-w-[640px]` → tables scrollent sur mobile
- Navigation : sidebar collapsible (état persisté en localStorage)
- Formulaires : inputs `w-full`, labels accessibles

**Aucune régression critique identifiée.** Pages utilisables sur mobile Android/iOS moderne.

---

## 7. Vérifications finales

| Check | Résultat |
|---|---|
| TypeScript frontend | ✅ 0 erreur (après null guard buyerUser) |
| Vitest frontend | ✅ 78 files, 508 tests, 0 failure |
| Next.js build | ✅ Compilé, aucune erreur |
| `icon.tsx` ImageResponse | ✅ Inclus dans build (edge runtime) |
| `apple-icon.tsx` ImageResponse | ✅ Inclus dans build (edge runtime) |
| `manifest.ts` | ✅ Route `/manifest.webmanifest` générée |

---

## 8. Test manuel recommandé (sur VPS pilote)

1. Ouvrir Chrome Android → `https://pilot.iox.example`
2. Vérifier bannière "Ajouter à l'écran d'accueil" (installability)
3. Installer l'app → vérifier icône + nom "IOX" sur launcher
4. Ouvrir depuis launcher → vérifier `display: standalone` (pas de barre URL)
5. Safari iOS → "Partager" → "Sur l'écran d'accueil" → vérifier Apple Touch Icon

---

## 9. Limites connues

- SVG dans manifest : Chrome 100+ uniquement. Anciens Android utilisent le PNG 32×32 fallback.
- Pas de splash screen custom (non critique pour pilote).
- Pas d'offline (intentionnel — voir §1).
- `themeColor` dans `layout.tsx` génère un avertissement de dépréciation Next.js (mineur — Next.js 15 migre vers `viewport` export).
