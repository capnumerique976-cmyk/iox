import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { AuthProvider } from '@/contexts/auth.context';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'IOX — Indian Ocean Xchange',
    template: '%s · IOX',
  },
  description:
    'Plateforme B2B pour producteurs, vendeurs et acheteurs professionnels de l\'océan Indien.',
  applicationName: 'IOX',
  // themeColor : repris par le manifest PWA (manifest.ts). Déclaré ici aussi
  // pour les navigateurs qui lisent la meta tag directement (Safari iOS).
  themeColor: '#0a1f4d',
  // PWA / Mobile — M77
  // Les icônes sont gérées via app/icon.tsx (favicon PNG 32px) et
  // app/apple-icon.tsx (Apple Touch PNG 180px). Le manifest est dans app/manifest.ts.
  // apple-mobile-web-app metadata pour iOS Safari "Ajouter à l'écran d'accueil"
  appleWebApp: {
    capable: true,
    title: 'IOX',
    statusBarStyle: 'black-translucent',
  },
  // Manifest lié automatiquement par Next.js depuis app/manifest.ts
  // Open Graph minimal pour partage réseaux sociaux
  openGraph: {
    type: 'website',
    siteName: 'IOX — Indian Ocean Xchange',
    title: 'IOX — Indian Ocean Xchange',
    description: 'Plateforme B2B pour producteurs et acheteurs professionnels de l\'océan Indien.',
  },
  formatDetection: {
    telephone: false,
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // I18N-1 phase 1 — résolution locale + messages côté serveur via next-intl.
  // `getLocale()` lit la valeur produite par `src/i18n/request.ts`.
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={inter.className}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider>{children}</AuthProvider>
        </NextIntlClientProvider>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
