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
