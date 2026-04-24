'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * i18n progressive FR / EN — dictionnaire minimal côté marketplace public.
 *
 * Objectif V2 : amorcer l'internationalisation sans casser l'existant.
 * Tout texte non traduit retombe sur la valeur FR (clé).
 * Stockage : `localStorage` (clé `iox:lang`) + event custom pour sync.
 */

export type Lang = 'fr' | 'en';
const STORAGE_KEY = 'iox:lang';

const DICT: Record<Lang, Record<string, string>> = {
  fr: {
    'nav.catalog': 'Catalogue',
    'nav.favorites': 'Favoris',
    'nav.proArea': 'Espace pro',
    'catalog.title': 'Catalogue marketplace',
    'catalog.empty': 'Aucune offre ne correspond à vos filtres.',
    'catalog.unavailable':
      'Le catalogue n’a pas pu être chargé. Rafraîchissez la page dans un instant ; si le problème persiste, nos équipes sont déjà alertées.',
    'product.ask': 'Demander un devis',
    'product.loginRequired': 'Connexion requise pour envoyer une demande',
    'product.primaryOffer': 'Offre principale',
    'product.otherOffers': 'Autres offres publiées',
    'product.publicDocs': 'Documents publics',
    'product.description': 'Description',
    'product.characteristics': 'Caractéristiques',
    'product.shareButton': 'Partager',
    'product.shareCopied': 'Lien copié',
    'product.addFavorite': 'Ajouter aux favoris',
    'product.favorited': 'Favori',
    'product.otherFromSeller': 'Autres produits de',
    'favorites.title': 'Mes favoris marketplace',
    'favorites.empty': "Vous n'avez pas encore de favoris.",
    'favorites.addedOn': 'Ajouté le',
    'favorites.open': 'Ouvrir',
    'favorites.remove': 'Retirer',
    'favorites.explore': 'Explorer le catalogue',
    'pagination.page': 'Page',
    'pagination.prev': 'Précédent',
    'pagination.next': 'Suivant',
    'filters.search': 'Recherche',
    'filters.searchPlaceholder': 'Nom, producteur, variété…',
    'filters.country': "Pays d'origine",
    'filters.readiness': 'Readiness export',
    'filters.priceMode': 'Mode de prix',
    'filters.moqMax': 'MOQ max',
    'filters.availableOnly': 'Disponibles uniquement',
    'filters.sort': 'Trier par',
    'filters.reset': 'Réinitialiser',
    'filters.apply': 'Filtrer',
    'readiness.EXPORT_READY': 'Export prêt',
    'readiness.EXPORT_READY_WITH_CONDITIONS': 'Export sous conditions',
    'readiness.INTERNAL_ONLY': 'Marché local',
    'readiness.PENDING_DOCUMENTS': 'Docs attendus',
    'readiness.PENDING_QUALITY_REVIEW': 'Revue qualité',
    'readiness.NOT_ELIGIBLE': 'Non éligible export',
    'price.quoteOnly': 'Sur devis',
    'price.fromPrice': 'À partir de',
    'product.moq': 'Quantité minimale',
    'product.incoterm': 'Incoterm',
    'product.leadTime': 'Délai de livraison',
    'product.available': 'Disponible',
    'product.unavailable': 'Indisponible',
    'footer.tagline': 'Plateforme IOX — produits vérifiés, traçabilité intégrée.',
  },
  en: {
    'nav.catalog': 'Catalog',
    'nav.favorites': 'Favorites',
    'nav.proArea': 'Pro area',
    'catalog.title': 'Marketplace catalog',
    'catalog.empty': 'No offer matches your filters.',
    'catalog.unavailable': 'The catalog is temporarily unavailable.',
    'product.ask': 'Request a quote',
    'product.loginRequired': 'Login required to send a request',
    'product.primaryOffer': 'Main offer',
    'product.otherOffers': 'Other published offers',
    'product.publicDocs': 'Public documents',
    'product.description': 'Description',
    'product.characteristics': 'Specifications',
    'product.shareButton': 'Share',
    'product.shareCopied': 'Link copied',
    'product.addFavorite': 'Add to favorites',
    'product.favorited': 'Favorited',
    'product.otherFromSeller': 'Other products from',
    'favorites.title': 'My marketplace favorites',
    'favorites.empty': "You don't have any favorites yet.",
    'favorites.addedOn': 'Added on',
    'favorites.open': 'Open',
    'favorites.remove': 'Remove',
    'favorites.explore': 'Browse the catalog',
    'pagination.page': 'Page',
    'pagination.prev': 'Previous',
    'pagination.next': 'Next',
    'filters.search': 'Search',
    'filters.searchPlaceholder': 'Name, producer, variety…',
    'filters.country': 'Origin country',
    'filters.readiness': 'Export readiness',
    'filters.priceMode': 'Price mode',
    'filters.moqMax': 'Max MOQ',
    'filters.availableOnly': 'Available only',
    'filters.sort': 'Sort by',
    'filters.reset': 'Reset',
    'filters.apply': 'Filter',
    'readiness.EXPORT_READY': 'Export ready',
    'readiness.EXPORT_READY_WITH_CONDITIONS': 'Export ready (conditional)',
    'readiness.INTERNAL_ONLY': 'Local market',
    'readiness.PENDING_DOCUMENTS': 'Docs pending',
    'readiness.PENDING_QUALITY_REVIEW': 'Quality review',
    'readiness.NOT_ELIGIBLE': 'Not export eligible',
    'price.quoteOnly': 'On quote',
    'price.fromPrice': 'From',
    'product.moq': 'Minimum order quantity',
    'product.incoterm': 'Incoterm',
    'product.leadTime': 'Lead time',
    'product.available': 'Available',
    'product.unavailable': 'Unavailable',
    'footer.tagline': 'IOX Platform — verified products, built-in traceability.',
  },
};

function readLang(): Lang {
  if (typeof window === 'undefined') return 'fr';
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === 'en' ? 'en' : 'fr';
  } catch {
    return 'fr';
  }
}

export function useLang() {
  const [lang, setLangState] = useState<Lang>('fr');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLangState(readLang());
    setHydrated(true);
    const refresh = () => setLangState(readLang());
    window.addEventListener('iox:lang:changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('iox:lang:changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const setLang = useCallback((next: Lang) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
      window.dispatchEvent(new CustomEvent('iox:lang:changed'));
    } catch {
      /* quota — no-op */
    }
    setLangState(next);
  }, []);

  const t = useCallback(
    (key: string, fallback?: string) => DICT[lang][key] ?? fallback ?? key,
    [lang],
  );

  return { lang, setLang, t, hydrated };
}
