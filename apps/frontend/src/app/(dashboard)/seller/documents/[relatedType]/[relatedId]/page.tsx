'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { MarketplaceRelatedEntityType, UserRole } from '@iox/shared';
import { useAuth } from '@/contexts/auth.context';
import { MarketplaceDocumentsPanel } from '@/components/marketplace/MarketplaceDocumentsPanel';

const RELATED_LABEL: Record<MarketplaceRelatedEntityType, string> = {
  [MarketplaceRelatedEntityType.SELLER_PROFILE]: 'Profil vendeur',
  [MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT]: 'Produit marketplace',
  [MarketplaceRelatedEntityType.MARKETPLACE_OFFER]: 'Offre marketplace',
  [MarketplaceRelatedEntityType.PRODUCT_BATCH]: 'Lot produit',
};

/**
 * Le source EntityType utilisé pour filtrer les Documents disponibles.
 * Pour PRODUCT_BATCH c'est 1:1 avec EntityType.PRODUCT_BATCH ; pour les entités
 * purement marketplace, on utilise le même nom d'enum (pas de FK dédiée, filtre
 * purement textuel sur `linkedEntityType`).
 */
const SOURCE_ENTITY_TYPE: Record<MarketplaceRelatedEntityType, string> = {
  [MarketplaceRelatedEntityType.SELLER_PROFILE]: 'SELLER_PROFILE',
  [MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT]: 'MARKETPLACE_PRODUCT',
  [MarketplaceRelatedEntityType.MARKETPLACE_OFFER]: 'MARKETPLACE_OFFER',
  [MarketplaceRelatedEntityType.PRODUCT_BATCH]: 'PRODUCT_BATCH',
};

const CAN_VIEW = [
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.QUALITY_MANAGER,
  UserRole.AUDITOR,
  UserRole.MARKETPLACE_SELLER,
];

function isValidRelatedType(v: string): v is MarketplaceRelatedEntityType {
  return (Object.values(MarketplaceRelatedEntityType) as string[]).includes(v);
}

export default function SellerDocumentsPage() {
  const { user } = useAuth();
  const params = useParams<{ relatedType: string; relatedId: string }>();
  const rawType = decodeURIComponent(params?.relatedType ?? '');
  const relatedId = params?.relatedId ?? '';

  if (user && !CAN_VIEW.includes(user.role)) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Votre rôle ne permet pas d'accéder à la gestion documentaire marketplace.
      </div>
    );
  }

  if (!isValidRelatedType(rawType)) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Type d'entité <code>{rawType}</code> non reconnu. Valeurs attendues :{' '}
        {Object.values(MarketplaceRelatedEntityType).join(', ')}.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft className="h-3 w-3" /> Retour
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Documents marketplace</h1>
        <p className="text-sm text-gray-600">
          {RELATED_LABEL[rawType]} — <code className="rounded bg-gray-100 px-1">{relatedId}</code>
        </p>
      </div>

      <MarketplaceDocumentsPanel
        relatedType={rawType}
        relatedId={relatedId}
        sourceEntityType={SOURCE_ENTITY_TYPE[rawType]}
      />
    </div>
  );
}
