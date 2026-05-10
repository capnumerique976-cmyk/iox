# M73 — Readiness PWA & Mobile — IOX Frontend

> Audit réalisé le 2026-05-10. Base : `apps/frontend/` — Next.js 14 (App Router), Tailwind CSS 3.

---

## 1. État actuel PWA

### Ce qui est déjà en place

| Élément | Statut | Détail |
|---------|--------|--------|
| `themeColor` | Présent | `#0a1f4d` dans `layout.tsx` via `metadata.themeColor` |
| `applicationName` | Présent | `"IOX"` dans `metadata` |
| Favicon SVG | Présent | `/brand/iox-emblem.svg` (icon, shortcut, apple) |
| Security headers | Présent | `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy` |
| `output: 'standalone'` | Présent | Optimisé pour le déploiement Docker / VPS |
| Viewport meta | Implicite | Next.js 14 injecte `<meta name="viewport">` automatiquement |
| HTTPS (prod) | Probable | Reverse-proxy Nginx sur VPS ; à confirmer |
| `reactStrictMode: true` | Présent | Bonne pratique |
| Tailwind CSS | Présent | Design responsive partiel (voir §4) |

### Ce qui est absent

| Élément | Impact |
|---------|--------|
| `manifest.json` / `manifest.webmanifest` | Critique — sans manifest, le navigateur ne propose pas "Ajouter à l'écran d'accueil" |
| Icônes PNG 192×192 et 512×512 | Critique — requis par la spec PWA |
| Service Worker | Critique — sans SW, pas de cache offline |
| Page de fallback offline | Recommandé |
| Package `next-pwa` ou `@ducanh2912/next-pwa` | Absent de `package.json` |
| `Cache-Control` / stale-while-revalidate headers | Absent des rewrites actuels |
| `display: standalone` dans le manifest | À créer |
| `start_url` dans le manifest | À créer |

---

## 2. Score Lighthouse estimé (sans SW ni manifest)

| Catégorie | Score estimé | Raison principale |
|-----------|-------------|-------------------|
| Performance | 65–75 | Pas de service worker, pas de cache stratégique |
| Accessibility | 70–80 | Radix UI utilisé (bonne base) ; audit complet requis |
| Best Practices | 75–85 | Security headers en place, mais pas de HTTPS garanti localement |
| SEO | 75–85 | Metadata title/description présents, pas de sitemap connu |
| **PWA** | **0–30** | Pas de manifest installable, pas de SW |

> Pour atteindre le badge PWA Lighthouse (score 100), il faut : manifest valide + SW actif + HTTPS.

---

## 3. Checklist PWA basique

### 3.1 `manifest.json`

Créer `/apps/frontend/public/manifest.json` :

```json
{
  "name": "IOX — Indian Ocean Xchange",
  "short_name": "IOX",
  "description": "Plateforme B2B marketplace océan Indien",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0a1f4d",
  "lang": "fr",
  "icons": [
    {
      "src": "/brand/iox-icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/brand/iox-icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

Ajouter dans `metadata` (layout.tsx) :

```ts
manifest: '/manifest.json',
```

### 3.2 Service Worker (next-pwa)

Installer le package (voir §7 pour les commandes exactes), puis wrapper dans `next.config.mjs` :

```js
import withPWA from '@ducanh2912/next-pwa';

const nextConfig = { /* config actuelle */ };

export default withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})(nextConfig);
```

### 3.3 Page de fallback offline

Créer `apps/frontend/public/offline.html` (page statique simple) et référencer dans la config next-pwa :

```js
fallbacks: {
  document: '/offline.html',
},
```

### 3.4 Meta viewport

Next.js 14 App Router injecte automatiquement :

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

Aucune action requise. Vérifier qu'aucune page ne surcharge ce comportement.

### 3.5 HTTPS en production

Le VPS utilise Nginx comme reverse-proxy. S'assurer que :
- Le certificat SSL est actif (Let's Encrypt recommandé)
- Nginx redirige le port 80 → 443
- L'en-tête `Strict-Transport-Security` est ajouté côté Nginx

---

## 4. Audit responsive mobile

### Utilisation des breakpoints Tailwind

Fichiers avec classes `sm:` / `md:` / `lg:` detectés :

| Fichier | Breakpoints utilisés |
|---------|---------------------|
| `seller/dashboard/page.tsx` | `sm:flex-row`, `sm:grid-cols-2`, `md:grid-cols-2`, `md:grid-cols-3`, `lg:grid-cols-3` |
| `buyer/quote-requests/page.tsx` | `md:hidden` (cartes mobile), `md:block` (tableau desktop) |
| `buyer/page.tsx` | `sm:grid-cols-5`, `md:grid-cols-2`, `lg:grid-cols-4` |
| `admin/page.tsx` | `sm:grid-cols-2`, `xl:grid-cols-4`, `md:grid-cols-4`, `md:grid-cols-2` |
| `marketplace/page.tsx` | `sm:` / `md:` présents |
| `marketplace/layout.tsx` | `sm:` / `md:` présents |

### Observations

- Les pages clés (buyer, seller dashboard, admin) ont un layout responsive basique avec breakpoints Tailwind.
- La page `buyer/quote-requests` implémente une double vue (cartes sur mobile, tableau sur desktop), bonne pratique.
- Les formulaires (seller/marketplace-products/new, offres) ne sont pas auditionnés dans ce scan — à vérifier manuellement sur mobile étroit (375px).
- Aucune classe `touch-action`, `overscroll-behavior` ou `-webkit-overflow-scrolling` détectée — peut causer des frictions sur iOS Safari.

---

## 5. Effort estimé

### PWA basique (Next.js existant)

| Tâche | Heures |
|-------|--------|
| Générer icônes PNG 192/512 (à partir du SVG existant) | 0.5 h |
| Créer `manifest.json` | 0.5 h |
| Installer et configurer `@ducanh2912/next-pwa` | 1 h |
| Créer page offline fallback | 1 h |
| Ajouter link manifest dans layout | 0.25 h |
| Configurer HTTPS Nginx (si pas déjà fait) | 1 h |
| Tests Lighthouse + ajustements | 2 h |
| **Total PWA basique** | **6–8 h** |

### Application React Native

| Tâche | Heures |
|-------|--------|
| Setup Expo / RN + navigation | 8–16 h |
| Portage des écrans principaux (buyer, seller, marketplace) | 40–80 h |
| Intégration API (même backend REST) | 8–16 h |
| Auth (token storage sécurisé) | 4–8 h |
| Tests iOS + Android | 8–16 h |
| Publication App Store / Play Store | 4–8 h |
| **Total React Native MVP** | **72–144 h** |

---

## 6. Recommandation

**Recommandation : PWA first.**

Pour IOX en phase pre-launch, la PWA est la voie prioritaire :

- **Délai** : 1–2 sprints vs 6–12 semaines pour React Native
- **Maintenance** : une seule codebase partagée avec le web
- **Fonctionnalités suffisantes** : les flux B2B (RFQ, catalogue, dashboard) sont adaptés à la PWA
- **Distribution** : pas de soumission App Store ; lien direct depuis l'espace acheteur/vendeur

React Native serait pertinent si IOX développe des fonctionnalités nécessitant des capteurs natifs (camera pour scan de documents, notifications push avancées, offline-first complexe), ou si les retours utilisateurs post-lancement indiquent un usage mobile intensif.

---

## 7. Commandes pour ajouter next-pwa

### Avec pnpm (utilisé dans le monorepo)

```bash
# Depuis la racine du monorepo
pnpm --filter @iox/frontend add @ducanh2912/next-pwa

# Ou depuis apps/frontend/
cd apps/frontend
pnpm add @ducanh2912/next-pwa
```

### Avec npm

```bash
cd apps/frontend
npm install @ducanh2912/next-pwa
```

### Modifier `next.config.mjs`

```js
import createNextIntlPlugin from 'next-intl/plugin';
import withPWA from '@ducanh2912/next-pwa';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@iox/shared'],
  output: 'standalone',
  // ... headers, rewrites, etc.
};

const withPWAConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  fallbacks: {
    document: '/offline.html',
  },
});

export default withNextIntl(withPWAConfig(nextConfig));
```

### Ajouter au `.gitignore`

```
# next-pwa generated files
/apps/frontend/public/sw.js
/apps/frontend/public/workbox-*.js
/apps/frontend/public/sw.js.map
/apps/frontend/public/workbox-*.js.map
```

### Vérification post-installation

```bash
# Build de production
pnpm --filter @iox/frontend build

# Vérifier la présence du SW généré
ls apps/frontend/public/sw.js

# Lancer en prod local
pnpm --filter @iox/frontend start

# Ouvrir Chrome DevTools > Application > Service Workers
```

---

*Fichier généré pour le mandat M73. Référencer dans le prochain sprint PWA.*
