import { ImageResponse } from 'next/og';

/**
 * Apple Touch Icon — M77
 * Généré dynamiquement via Next.js App Router (app/apple-icon.tsx).
 * PNG 180×180 accessible à `/apple-icon`.
 * Utilisé par iOS Safari pour "Ajouter à l'écran d'accueil".
 */
export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0a1f4d',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '40px',
        }}
      >
        <svg
          width="130"
          height="130"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Anneau principal */}
          <circle
            cx="50"
            cy="52"
            r="40"
            fill="none"
            stroke="#1a3a7d"
            strokeWidth="6"
          />
          {/* Swoosh teal */}
          <path
            d="M 14 58 A 40 40 0 0 1 86 58"
            fill="none"
            stroke="#2d9cdb"
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          {/* Feuille verte */}
          <path
            d="M 26 66 Q 31 42 48 35 Q 41 57 32 72 Q 28 72 26 66 Z"
            fill="#27ae60"
          />
          {/* Lettre i */}
          <rect x="44" y="43" width="6" height="25" rx="1.2" fill="#ffffff" />
          <rect x="44" y="33" width="6" height="6" rx="1" fill="#2d9cdb" />
          {/* Lettre o */}
          <circle cx="64" cy="55" r="12" fill="none" stroke="#ffffff" strokeWidth="5.5" />
          {/* Réseau vert */}
          <g transform="translate(82, 20)">
            <line x1="0" y1="0" x2="-7" y2="7" stroke="#27ae60" strokeWidth="1.6" />
            <line x1="0" y1="0" x2="8" y2="-4" stroke="#27ae60" strokeWidth="1.6" />
            <line x1="0" y1="0" x2="6" y2="9" stroke="#27ae60" strokeWidth="1.6" />
            <circle cx="0" cy="0" r="2.8" fill="#27ae60" />
            <circle cx="-7" cy="7" r="2.2" fill="#27ae60" />
            <circle cx="8" cy="-4" r="2.2" fill="#27ae60" />
            <circle cx="6" cy="9" r="2.2" fill="#27ae60" />
          </g>
        </svg>
      </div>
    ),
    { ...size },
  );
}
