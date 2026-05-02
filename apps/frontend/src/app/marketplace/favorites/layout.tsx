import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mes favoris — IOX Marketplace',
  description: 'Retrouvez vos produits sauvegardés en un clic.',
};

export default function FavoritesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
