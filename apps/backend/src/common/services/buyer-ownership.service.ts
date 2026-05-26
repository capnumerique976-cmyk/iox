// ADR-0006 — BuyerOwnershipService (symétrique à SellerOwnershipService).
//
// Centralise les règles d'ownership pour les ressources buyer-scope :
//  - Company (via UserCompanyMembership → user.companyIds)
//  - Invoice / Payment via `buyerCompanyId`
//  - QuoteRequest côté buyer via `buyerCompanyId` ou `buyerUserId`
//
// Règle générale :
//  - Staff (ADMIN, COORDINATOR, QUALITY_MANAGER, AUDITOR) bypass
//    systématique (périmètre transverse).
//  - Buyer (MARKETPLACE_BUYER) scopé via `actor.companyIds` (résolu au
//    JWT via memberships).
//  - Autres rôles refusés.

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RequestUser, UserRole } from '@iox/shared';

const STAFF_ROLES = new Set<UserRole>([
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.QUALITY_MANAGER,
  UserRole.AUDITOR,
]);

@Injectable()
export class BuyerOwnershipService {
  constructor(private prisma: PrismaService) {}

  isStaff(actor: RequestUser): boolean {
    return STAFF_ROLES.has(actor.role);
  }

  isBuyer(actor: RequestUser): boolean {
    return actor.role === UserRole.MARKETPLACE_BUYER;
  }

  /**
   * Where clause partial pour scoper une ressource ayant un champ
   * `buyerCompanyId` (Invoice, Payment, QuoteRequest, etc.).
   *
   *  - staff : `{}` (pas de restriction)
   *  - buyer : `{ buyerCompanyId: { in: [...] } }`
   *  - autres : force vide (zero résultat, défense en profondeur).
   */
  scopeBuyerCompanyFilter(
    actor: RequestUser,
  ): { buyerCompanyId?: { in: string[] } } {
    if (this.isStaff(actor)) return {};
    if (!this.isBuyer(actor)) {
      return { buyerCompanyId: { in: [] as string[] } };
    }
    const ids = actor.companyIds ?? [];
    return { buyerCompanyId: { in: ids } };
  }

  /**
   * Where clause partial pour scoper une entité `Company` directement
   * via son `id`.
   */
  scopeCompanyFilter(actor: RequestUser): { id?: { in: string[] } } {
    if (this.isStaff(actor)) return {};
    if (!this.isBuyer(actor)) {
      return { id: { in: [] as string[] } };
    }
    const ids = actor.companyIds ?? [];
    return { id: { in: ids } };
  }

  /**
   * Asserte que l'actor peut agir sur la company `companyId` (membership).
   * Hit DB pour vérifier l'existence — throw NotFoundException sinon.
   * Staff bypass.
   */
  async assertCompanyOwnership(
    actor: RequestUser,
    companyId: string,
  ): Promise<void> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, deletedAt: true },
    });
    if (!company || company.deletedAt) {
      throw new NotFoundException('Entreprise introuvable');
    }
    if (this.isStaff(actor)) return;
    if (!this.isBuyer(actor)) {
      throw new ForbiddenException('Rôle non autorisé sur cette entreprise');
    }
    const owned = actor.companyIds ?? [];
    if (!owned.includes(companyId)) {
      throw new ForbiddenException(
        "Cette entreprise n'appartient pas au périmètre de l'utilisateur",
      );
    }
  }

  /**
   * Variante pure (no DB) : asserte qu'une ressource ayant un
   * `buyerCompanyId` est dans le périmètre. Pour usage dans services qui
   * ont déjà chargé l'entité depuis Prisma.
   */
  assertBuyerCompanyOwnership(
    actor: RequestUser,
    buyerCompanyId: string,
  ): void {
    if (this.isStaff(actor)) return;
    if (!this.isBuyer(actor)) {
      throw new ForbiddenException('Rôle non autorisé sur cette ressource');
    }
    const owned = actor.companyIds ?? [];
    if (!owned.includes(buyerCompanyId)) {
      throw new ForbiddenException(
        'Ressource hors périmètre buyer',
      );
    }
  }

  /** Helper booléen (pas de throw). */
  canReadBuyerCompany(actor: RequestUser, buyerCompanyId: string): boolean {
    if (this.isStaff(actor)) return true;
    if (!this.isBuyer(actor)) return false;
    return (actor.companyIds ?? []).includes(buyerCompanyId);
  }
}
