// ADR-0004 — MarketplaceVisibilityFilter domain module.
//
// Single source of truth pour les règles de visibilité publique marketplace,
// documentées dans `docs/MARKETPLACE.md` (4 projections officielles + media).
//
// Chaque méthode retourne un `WhereInput` Prisma partiel et composable.
// Le caller compose avec ses propres filtres (`AND`, `OR`, ou étalement).
//
// Aucun changement comportement vs implémentation procédurale précédente —
// extraction pure des règles dispersées.

import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  MarketplaceDocumentVisibility,
  MarketplacePublicationStatus,
  MarketplaceVerificationStatus,
  MarketplaceVisibilityScope,
  MediaModerationStatus,
  SellerProfileStatus,
} from '@iox/shared';

@Injectable()
export class MarketplaceVisibilityFilter {
  /**
   * **Offer public** : visible dans le catalogue public.
   *
   * Règles :
   *  - `publicationStatus = PUBLISHED`
   *  - `visibilityScope ≠ PRIVATE` (inclut PUBLIC + BUYERS_ONLY)
   *
   * Note : la règle "seller du produit n'est pas SUSPENDED" doit être
   * appliquée par le caller via `publicProductWhere()` au niveau
   * `marketplaceProduct` ou par sub-where Prisma.
   */
  publicOfferWhere(): Prisma.MarketplaceOfferWhereInput {
    return {
      publicationStatus: MarketplacePublicationStatus.PUBLISHED,
      visibilityScope: { not: MarketplaceVisibilityScope.PRIVATE },
    };
  }

  /**
   * **Product public** : produit éligible au catalogue public.
   *
   * Règles :
   *  - `publicationStatus ∈ {APPROVED, PUBLISHED}`
   *  - `sellerProfile.status = APPROVED`
   *
   * Note : la règle "≥ 1 MediaAsset PRIMARY APPROVED" est polymorphique
   * (pas de back-relation Prisma). Le caller doit composer via une
   * pré-requête + filtre `id: { in: [...] }`. Voir
   * `MarketplaceCatalogService.findProductsWithPrimaryMedia()`.
   */
  publicProductWhere(): Prisma.MarketplaceProductWhereInput {
    return {
      publicationStatus: {
        in: [
          MarketplacePublicationStatus.APPROVED,
          MarketplacePublicationStatus.PUBLISHED,
        ],
      },
      sellerProfile: this.publicSellerWhere(),
    };
  }

  /**
   * **Seller public** : profil vendeur visible publiquement.
   *
   * Règle : `status = APPROVED`. Couvre la règle dérivée "seller
   * SUSPENDED ne leak pas" : un seller non-APPROVED disqualifie toute
   * sa hiérarchie (produits, offres, médias).
   */
  publicSellerWhere(): Prisma.SellerProfileWhereInput {
    return {
      status: SellerProfileStatus.APPROVED,
    };
  }

  /**
   * **Document public** : document attaché visible sur fiche produit /
   * fiche seller public.
   *
   * Règles :
   *  - `visibility = PUBLIC`
   *  - `verificationStatus = VERIFIED`
   *  - `validUntil` null OU `validUntil > now`
   *
   * Le paramètre `now` est injectable pour tests d'expiration.
   */
  publicDocumentWhere(
    now: Date = new Date(),
  ): Prisma.MarketplaceDocumentWhereInput {
    return {
      visibility: MarketplaceDocumentVisibility.PUBLIC,
      verificationStatus: MarketplaceVerificationStatus.VERIFIED,
      OR: [{ validUntil: null }, { validUntil: { gt: now } }],
    };
  }

  /**
   * **Media public** : média (image / vidéo) exposable sur fiche
   * publique.
   *
   * Règle : `moderationStatus = APPROVED`. Un média REJECTED ou PENDING
   * reste invisible côté public — le frontend affiche le placeholder.
   */
  publicMediaWhere(): Prisma.MediaAssetWhereInput {
    return {
      moderationStatus: MediaModerationStatus.APPROVED,
    };
  }
}
