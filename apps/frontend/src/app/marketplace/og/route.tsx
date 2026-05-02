import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

/**
 * OG-IMAGE — Dynamic Open Graph image generator for marketplace pages.
 *
 * Usage: /marketplace/og?title=...&subtitle=...&type=product|seller
 *
 * Generates a 1200x630 PNG image with IOX branding, dark gradient
 * background, and text overlay. Used as og:image in metadata.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || 'IOX Marketplace';
  const subtitle = searchParams.get('subtitle') || 'Produits export certifiés — Océan Indien';
  const type = searchParams.get('type') || 'product';

  const accentColor = type === 'seller' ? '#00F5A0' : '#00D4FF';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px 80px',
          background: 'linear-gradient(135deg, #0A0E1A 0%, #12161F 50%, #0A0E1A 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            width: '120px',
            height: '6px',
            borderRadius: '3px',
            background: accentColor,
          }}
        />

        {/* Title area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              fontSize: '56px',
              fontWeight: 800,
              color: '#FFFFFF',
              lineHeight: 1.1,
              maxWidth: '900px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title.length > 60 ? title.slice(0, 57) + '...' : title}
          </div>
          <div
            style={{
              fontSize: '24px',
              color: 'rgba(255, 255, 255, 0.6)',
              maxWidth: '800px',
            }}
          >
            {subtitle.length > 100 ? subtitle.slice(0, 97) + '...' : subtitle}
          </div>
        </div>

        {/* Footer with branding */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: `linear-gradient(135deg, ${accentColor}, #7B61FF)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 800,
                color: '#0A0E1A',
              }}
            >
              IOX
            </div>
            <span style={{ fontSize: '20px', color: 'rgba(255, 255, 255, 0.5)' }}>
              Marketplace B2B
            </span>
          </div>
          <div
            style={{
              fontSize: '16px',
              color: 'rgba(255, 255, 255, 0.3)',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            iox.mycloud.yt
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
