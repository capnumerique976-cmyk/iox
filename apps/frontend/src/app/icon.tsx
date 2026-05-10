import { ImageResponse } from 'next/og';

/**
 * Favicon PWA — M77
 * Généré dynamiquement via Next.js App Router (app/icon.tsx).
 * PNG 32×32 accessible à `/icon`.
 * Rendu : emblème IOX (I•o avec anneau) sur fond bleu marine.
 */
export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
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
          borderRadius: '4px',
        }}
      >
        {/* Emblème IOX simplifié : anneau + lettre i + lettre o */}
        <svg
          width="24"
          height="24"
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
          {/* Lettre i */}
          <rect x="44" y="43" width="6" height="25" rx="1.2" fill="#ffffff" />
          <rect x="44" y="33" width="6" height="6" rx="1" fill="#2d9cdb" />
          {/* Lettre o */}
          <circle cx="64" cy="55" r="12" fill="none" stroke="#ffffff" strokeWidth="5.5" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
