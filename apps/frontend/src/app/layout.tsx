import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/auth.context';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'IOX — Indian Ocean Xchange',
    template: '%s · IOX',
  },
  description:
    'Plateforme B2B de structuration, conformité, traçabilité, logistique et mise en marché — océan Indien.',
  icons: {
    // SVG favicon (supporté Chrome/Firefox/Safari 16+). L'emblème seul est plus
    // lisible en 16×16 que le lockup horizontal.
    icon: [{ url: '/brand/iox-emblem.svg', type: 'image/svg+xml' }],
    shortcut: '/brand/iox-emblem.svg',
    apple: '/brand/iox-emblem.svg',
  },
  applicationName: 'IOX',
  themeColor: '#0a1f4d',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
