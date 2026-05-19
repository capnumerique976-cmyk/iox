import type { MetadataRoute } from 'next';

/**
 * PWA Manifest — M77
 *
 * Généré dynamiquement via Next.js App Router (app/manifest.ts).
 * Accessible à `/manifest.webmanifest`.
 *
 * Icônes :
 *  - /brand/iox-icon-192.svg : 192×192 SVG (scalable, Chrome 100+ Android)
 *  - /brand/iox-icon-512.svg : 512×512 SVG (masquable)
 *  - /icon     : PNG favicon généré par Next.js (app/icon.tsx)
 *  - /apple-icon : PNG 180×180 généré par Next.js (app/apple-icon.tsx)
 *
 * Chrome installability requirements (met) :
 *  - name + short_name ✓
 *  - start_url ✓
 *  - display: standalone ✓
 *  - at least one icon ≥ 192px ✓ (SVG + PNG via Next.js icon.tsx)
 *
 * Offline / Service Worker : intentionnellement absent (M77).
 *  Les données RFQ, auth, factures ne doivent pas être mises en cache.
 *  Stratégie offline documentée dans notes/mobile-pwa-implementation-iox.md.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'IOX — Indian Ocean Xchange',
    short_name: 'IOX',
    description:
      'Plateforme B2B pour producteurs, vendeurs et acheteurs professionnels de l\'océan Indien.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#0a1f4d',
    theme_color: '#0a1f4d',
    lang: 'fr',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/brand/iox-icon-192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
      },
      {
        src: '/brand/iox-icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
      // PNG via Next.js icon.tsx — serve comme fallback pour navigateurs
      // qui n'acceptent pas SVG dans les manifests (anciens Android).
      {
        src: '/icon',
        sizes: '32x32',
        type: 'image/png',
      },
    ],
    shortcuts: [
      {
        name: 'Catalogue',
        short_name: 'Catalogue',
        url: '/marketplace',
        description: 'Parcourir les produits disponibles',
      },
      {
        name: 'Mes produits',
        short_name: 'Produits',
        url: '/seller/marketplace-products',
        description: 'Gérer mes produits en vente',
      },
      {
        name: 'Mes devis',
        short_name: 'Devis',
        url: '/buyer/quote-requests',
        description: 'Voir mes demandes de devis',
      },
    ],
  };
}
