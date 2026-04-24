import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MarketplaceRelatedEntityType, RequestUser, UserRole } from '@iox/shared';

/**
 * V2 — Service central d'enforcement d'ownership côté marketplace.
 *
 * Règle générale :
 *  - les rôles "staff" (ADMIN, COORDINATOR, QUALITY_MANAGER, AUDITOR) bypassent
 *    systématiquement la vérification : leur périmètre d'accès est transverse ;
 *  - le rôle MARKETPLACE_SELLER ne peut agir que sur les ressources rattachées
 *    à un `SellerProfile` présent dans son `sellerProfileIds` (résolu au JWT
 *    via la table `UserCompanyMembership`) ;
 *  - tout autre rôle (BUYER, BENEFICIARY, …) est refusé d'office sur les
 *    endpoints seller-scope — la couche Roles() du controller bloque en amont,
 *    mais on maintient une défense en profondeur ici.
 *
 * Les méthodes `assert*` lèvent `ForbiddenException` / `NotFoundException`.
 * Les méthodes `getScopedSellerProfileIds*` renvoient un filtre Prisma à appliquer
 * directement dans les `where` des lectures seller (listing scoping).
 */

const STAFF_ROLES = new Set<UserRole>([
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.QUALITY_MANAGER,
  UserRole.AUDITOR,
]);

@Injectable()
export class SellerOwnershipService {
  constructor(private prisma: PrismaService) {}

  isStaff(actor: RequestUser): boolean {
    return STAFF_ROLES.has(actor.role);
  }

  isSeller(actor: RequestUser): boolean {
    return actor.role === UserRole.MARKETPLACE_SELLER;
  }

  /**
   * Renvoie un filtre Prisma à merger dans le `where` d'un listing seller-scope.
   *
   *  - staff : `{}` (pas de restriction)
   *  - seller : `{ sellerProfileId: { in: [...] } }` ou un tableau vide si le
   *             seller n'a aucun periscope (retourne donc zéro résultat)
   *  - autres : force `{ sellerProfileId: { in: [] } }` (zero résultat, défense
   *             en profondeur par-dessus RolesGuard).
   */
  scopeSellerProfileFilter(actor: RequestUser): { sellerProfileId?: { in: string[] } } {
    if (this.isStaff(actor)) return {};
    const ids = actor.sellerProfileIds ?? [];
    return { sellerProfileId: { in: ids } };
  }

  /** Variante pour les MediaAsset / MarketplaceDocument scopés par (relatedType, relatedId). */
  async scopeRelatedEntityFilter(actor: RequestUser) {
    if (this.isStaff(actor)) return {} as const;
    if (!this.isSeller(actor)) {
      // Refuse tout listing côté media/doc si pas staff/seller (défense en profondeur)
      return { relatedId: { in: [] as string[] } } as const;
    }
    const sellerIds = actor.sellerProfileIds ?? [];
    if (sellerIds.length === 0) {
      return { relatedId: { in: [] as string[] } } as const;
    }
    // Expansion : on résout l'ensemble des relatedId possibles (profils + produits + offres)
    // appartenant aux seller du user. On exclut les product_batch pour l'instant (pas
    // seller-scope directement dans le MVP marketplace).
    const [products, offers] = await Promise.all([
      this.prisma.marketplaceProduct.findMany({
        where: { sellerProfileId: { in: sellerIds } },
        select: { id: true },
      }),
      this.prisma.marketplaceOffer.findMany({
        where: { sellerProfileId: { in: sellerIds } },
        select: { id: true },
      }),
    ]);
    const productIds = products.map((p) => p.id);
    const offerIds = offers.map((o) => o.id);

    return {
      OR: [
        {
          relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
          relatedId: { in: sellerIds },
        },
        {
          relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
          relatedId: { in: productIds },
        },
        {
          relatedType: MarketplaceRelatedEntityType.MARKETPLACE_OFFER,
          relatedId: { in: offerIds },
        },
      ],
    };
  }

  /**
   * Vérifie qu'un acteur peut agir sur un SellerProfile donné.
   * Lève NotFoundException si le profil n'existe pas (côté seller pour éviter
   * la divulgation d'ids), ForbiddenException si ownership refusé.
   */
  async assertSellerProfileOwnership(actor: RequestUser, sellerProfileId: string) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerProfileId },
      select: { id: true },
    });
    if (!seller) throw new NotFoundException('Profil vendeur introuvable');

    if (this.isStaff(actor)) return;
    if (!this.isSeller(actor)) {
      throw new ForbiddenException('Rôle non autorisé sur ce profil vendeur');
    }
    const owned = actor.sellerProfileIds ?? [];
    if (!owned.includes(sellerProfileId)) {
      throw new ForbiddenException(
        "Ce profil vendeur n'appartient pas au périmètre de l'utilisateur",
      );
    }
  }

  /** Résout un MarketplaceProduct → vérifie ownership de son sellerProfile. */
  async assertMarketplaceProductOwnership(actor: RequestUser, productId: string) {
    const mp = await this.prisma.marketplaceProduct.findUnique({
      where: { id: productId },
      select: { id: true, sellerProfileId: true },
    });
    if (!mp) throw new NotFoundException('Produit marketplace introuvable');
    if (this.isStaff(actor)) return mp;
    if (!this.isSeller(actor)) {
      throw new ForbiddenException('Rôle non autorisé sur ce produit marketplace');
    }
    if (!(actor.sellerProfileIds ?? []).includes(mp.sellerProfileId)) {
      throw new ForbiddenException('Produit marketplace hors périmètre');
    }
    return mp;
  }

  /** Résout une MarketplaceOffer → vérifie ownership. */
  async assertMarketplaceOfferOwnership(actor: RequestUser, offerId: string) {
    const offer = await this.prisma.marketplaceOffer.findUnique({
      where: { id: offerId },
      select: { id: true, sellerProfileId: true, marketplaceProductId: true },
    });
    if (!offer) throw new NotFoundException('Offre marketplace introuvable');
    if (this.isStaff(actor)) return offer;
    if (!this.isSeller(actor)) {
      throw new ForbiddenException('Rôle non autorisé sur cette offre');
    }
    if (!(actor.sellerProfileIds ?? []).includes(offer.sellerProfileId)) {
      throw new ForbiddenException('Offre marketplace hors périmètre');
    }
    return offer;
  }

  /** Vérifie ownership d'un MarketplaceOfferBatch (pont offre/lot). */
  async assertOfferBatchOwnership(actor: RequestUser, linkId: string) {
    const link = await this.prisma.marketplaceOfferBatch.findUnique({
      where: { id: linkId },
      select: {
        id: true,
        marketplaceOfferId: true,
        marketplaceOffer: { select: { sellerProfileId: true } },
      },
    });
    if (!link) throw new NotFoundException('Lien offre/lot introuvable');
    if (this.isStaff(actor)) return link;
    if (!this.isSeller(actor)) {
      throw new ForbiddenException('Rôle non autorisé');
    }
    if (!(actor.sellerProfileIds ?? []).includes(link.marketplaceOffer.sellerProfileId)) {
      throw new ForbiddenException('Lien offre/lot hors périmètre');
    }
    return link;
  }

  /**
   * Vérifie ownership d'une entité marketplace référencée par (relatedType, relatedId).
   * Utilisé par media-assets + marketplace-documents.
   *
   * PRODUCT_BATCH : hors scope seller MVP (traçabilité amont). Pour ce type,
   * on bloque côté seller par défaut (staff only), par prudence.
   */
  async assertRelatedEntityOwnership(
    actor: RequestUser,
    relatedType: MarketplaceRelatedEntityType,
    relatedId: string,
  ) {
    if (this.isStaff(actor)) return;
    if (!this.isSeller(actor)) {
      throw new ForbiddenException('Rôle non autorisé sur cette ressource marketplace');
    }
    const owned = new Set(actor.sellerProfileIds ?? []);

    switch (relatedType) {
      case MarketplaceRelatedEntityType.SELLER_PROFILE: {
        if (!owned.has(relatedId)) {
          throw new ForbiddenException('Profil vendeur hors périmètre');
        }
        return;
      }
      case MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT: {
        const mp = await this.prisma.marketplaceProduct.findUnique({
          where: { id: relatedId },
          select: { sellerProfileId: true },
        });
        if (!mp) throw new NotFoundException('Produit marketplace introuvable');
        if (!owned.has(mp.sellerProfileId)) {
          throw new ForbiddenException('Produit marketplace hors périmètre');
        }
        return;
      }
      case MarketplaceRelatedEntityType.MARKETPLACE_OFFER: {
        const offer = await this.prisma.marketplaceOffer.findUnique({
          where: { id: relatedId },
          select: { sellerProfileId: true },
        });
        if (!offer) throw new NotFoundException('Offre marketplace introuvable');
        if (!owned.has(offer.sellerProfileId)) {
          throw new ForbiddenException('Offre marketplace hors périmètre');
        }
        return;
      }
      case MarketplaceRelatedEntityType.PRODUCT_BATCH: {
        throw new ForbiddenException('Les lots produits ne sont pas dans le périmètre seller');
      }
      default:
        throw new ForbiddenException("Type d'entité non reconnu");
    }
  }

  /** Helpers de lecture pour les services. */
  canReadSellerProfile(actor: RequestUser, sellerProfileId: string): boolean {
    if (this.isStaff(actor)) return true;
    if (!this.isSeller(actor)) return false;
    return (actor.sellerProfileIds ?? []).includes(sellerProfileId);
  }
}
