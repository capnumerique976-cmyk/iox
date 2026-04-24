import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateQuoteRequestDto,
  QueryQuoteRequestsDto,
  UpdateQuoteRequestStatusDto,
  AssignQuoteRequestDto,
  CreateQuoteRequestMessageDto,
} from './dto/quote-request.dto';
import {
  EntityType,
  QuoteRequestStatus,
  UserRole,
  MarketplacePublicationStatus,
  MarketplaceVisibilityScope,
  SellerProfileStatus,
  RequestUser,
} from '@iox/shared';
import type { Prisma } from '@prisma/client';
import { SellerOwnershipService } from '../common/services/seller-ownership.service';

const RFQ_INCLUDE = {
  marketplaceOffer: {
    select: {
      id: true,
      title: true,
      priceMode: true,
      unitPrice: true,
      currency: true,
      moq: true,
      incoterm: true,
      leadTimeDays: true,
      departureLocation: true,
      publicationStatus: true,
      visibilityScope: true,
      sellerProfileId: true,
      marketplaceProductId: true,
      sellerProfile: { select: { id: true, slug: true, publicDisplayName: true, status: true } },
      marketplaceProduct: {
        select: { id: true, slug: true, commercialName: true, publicationStatus: true },
      },
    },
  },
  buyerCompany: { select: { id: true, code: true, name: true, country: true } },
  buyerUser: { select: { id: true, email: true, firstName: true, lastName: true } },
  assignedToUser: { select: { id: true, email: true, firstName: true, lastName: true } },
  _count: { select: { messages: true } },
} as const;

const STAFF_ROLES = new Set<UserRole>([
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.QUALITY_MANAGER,
]);

/**
 * Transitions autorisées par statut.
 * Logique B2B simple : tous les acteurs (buyer/seller/staff) peuvent naviguer
 * le funnel, avec quelques restrictions (WON/LOST = seller/staff only).
 */
const ALLOWED_TRANSITIONS: Record<QuoteRequestStatus, QuoteRequestStatus[]> = {
  [QuoteRequestStatus.NEW]: [
    QuoteRequestStatus.QUALIFIED,
    QuoteRequestStatus.CANCELLED,
    QuoteRequestStatus.LOST,
  ],
  [QuoteRequestStatus.QUALIFIED]: [
    QuoteRequestStatus.QUOTED,
    QuoteRequestStatus.CANCELLED,
    QuoteRequestStatus.LOST,
  ],
  [QuoteRequestStatus.QUOTED]: [
    QuoteRequestStatus.NEGOTIATING,
    QuoteRequestStatus.WON,
    QuoteRequestStatus.LOST,
    QuoteRequestStatus.CANCELLED,
  ],
  [QuoteRequestStatus.NEGOTIATING]: [
    QuoteRequestStatus.QUOTED,
    QuoteRequestStatus.WON,
    QuoteRequestStatus.LOST,
    QuoteRequestStatus.CANCELLED,
  ],
  [QuoteRequestStatus.WON]: [],
  [QuoteRequestStatus.LOST]: [],
  [QuoteRequestStatus.CANCELLED]: [],
};

@Injectable()
export class QuoteRequestsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private ownership: SellerOwnershipService,
  ) {}

  // ─── Helpers rôles / périmètre ────────────────────────────────────────────

  private isStaff(actor: RequestUser): boolean {
    return STAFF_ROLES.has(actor.role);
  }

  private isBuyer(actor: RequestUser): boolean {
    return actor.role === UserRole.MARKETPLACE_BUYER;
  }

  private isSeller(actor: RequestUser): boolean {
    return actor.role === UserRole.MARKETPLACE_SELLER;
  }

  /**
   * Vérifie qu'un acteur peut accéder à une RFQ donnée.
   * - buyer : doit être l'auteur (buyerUserId)
   * - seller : périmètre ouvert via filtre sellerProfileId (pas de back-relation owner)
   *            → même logique que marketplace-offers : le seller voit toutes les
   *              RFQ et peut filtrer par sellerProfileId. Ownership strict fera
   *              l'objet d'une évolution quand la liaison user↔sellerProfile sera posée.
   * - staff : accès plein
   */
  private ensureCanAccess(
    actor: RequestUser,
    rfq: { buyerUserId: string; marketplaceOffer?: { sellerProfileId: string } | null },
  ) {
    if (this.isStaff(actor)) return;
    if (this.isBuyer(actor) && rfq.buyerUserId === actor.id) return;
    if (this.isSeller(actor)) {
      const sellerId = rfq.marketplaceOffer?.sellerProfileId;
      const scope = actor.sellerProfileIds ?? [];
      if (sellerId && scope.includes(sellerId)) return;
      throw new ForbiddenException('Accès refusé à cette demande de devis');
    }
    throw new ForbiddenException('Accès refusé à cette demande de devis');
  }

  // ─── Lecture ──────────────────────────────────────────────────────────────

  async findAll(query: QueryQuoteRequestsDto, actor: RequestUser) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.QuoteRequestWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.marketplaceOfferId) where.marketplaceOfferId = query.marketplaceOfferId;
    if (query.buyerCompanyId) where.buyerCompanyId = query.buyerCompanyId;
    if (query.assignedToUserId) where.assignedToUserId = query.assignedToUserId;
    if (query.sellerProfileId) {
      where.marketplaceOffer = { sellerProfileId: query.sellerProfileId };
    }

    // Scoping par rôle
    if (this.isBuyer(actor)) {
      where.buyerUserId = actor.id;
    }
    if (this.isSeller(actor)) {
      // Restreint au périmètre des sellerProfile de l'acteur
      where.marketplaceOffer = {
        ...(where.marketplaceOffer as Prisma.MarketplaceOfferWhereInput | undefined),
        sellerProfileId: { in: actor.sellerProfileIds ?? [] },
      };
    }
    // staff : pas de restriction automatique ; ils filtrent via query

    const [data, total] = await this.prisma.$transaction([
      this.prisma.quoteRequest.findMany({
        where,
        include: RFQ_INCLUDE,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
      }),
      this.prisma.quoteRequest.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string, actor: RequestUser) {
    const rfq = await this.prisma.quoteRequest.findUnique({
      where: { id },
      include: RFQ_INCLUDE,
    });
    if (!rfq) throw new NotFoundException('Demande de devis introuvable');
    this.ensureCanAccess(actor, rfq);
    return rfq;
  }

  // ─── Création ─────────────────────────────────────────────────────────────

  async create(dto: CreateQuoteRequestDto, actor: RequestUser) {
    // Buyers et staff peuvent créer une RFQ ; seller ne devrait pas créer pour lui-même
    if (this.isSeller(actor)) {
      throw new ForbiddenException('Un vendeur ne peut pas créer de demande de devis');
    }

    const [offer, company] = await Promise.all([
      this.prisma.marketplaceOffer.findUnique({
        where: { id: dto.marketplaceOfferId },
        include: {
          sellerProfile: { select: { id: true, status: true } },
          marketplaceProduct: { select: { id: true, publicationStatus: true } },
        },
      }),
      this.prisma.company.findUnique({ where: { id: dto.buyerCompanyId } }),
    ]);

    if (!offer) throw new NotFoundException('Offre marketplace introuvable');
    if (!company) throw new NotFoundException('Company acheteuse introuvable');

    // Gates de visibilité publique (alignés sur marketplace-catalog)
    if (offer.publicationStatus !== MarketplacePublicationStatus.PUBLISHED) {
      throw new BadRequestException("Cette offre n'est pas publiée — demande impossible");
    }
    if (offer.visibilityScope === MarketplaceVisibilityScope.PRIVATE) {
      throw new BadRequestException('Cette offre est privée — demande impossible');
    }
    if (offer.sellerProfile.status !== SellerProfileStatus.APPROVED) {
      throw new BadRequestException("Le vendeur n'est plus approuvé — demande impossible");
    }
    const mpOk =
      offer.marketplaceProduct.publicationStatus === MarketplacePublicationStatus.APPROVED ||
      offer.marketplaceProduct.publicationStatus === MarketplacePublicationStatus.PUBLISHED;
    if (!mpOk) {
      throw new BadRequestException(
        "Le produit marketplace n'est plus publiable — demande impossible",
      );
    }

    const rfq = await this.prisma.quoteRequest.create({
      data: {
        marketplaceOfferId: dto.marketplaceOfferId,
        buyerCompanyId: dto.buyerCompanyId,
        buyerUserId: actor.id,
        requestedQuantity: dto.requestedQuantity,
        requestedUnit: dto.requestedUnit,
        deliveryCountry: dto.deliveryCountry,
        targetMarket: dto.targetMarket,
        message: dto.message,
        status: QuoteRequestStatus.NEW,
      },
      include: RFQ_INCLUDE,
    });

    // Si un message initial est fourni, on l'archive aussi dans le fil (visible)
    if (dto.message && dto.message.trim().length > 0) {
      await this.prisma.quoteRequestMessage.create({
        data: {
          quoteRequestId: rfq.id,
          authorUserId: actor.id,
          message: dto.message,
          isInternalNote: false,
        },
      });
    }

    await this.auditService.log({
      action: 'QUOTE_REQUEST_CREATED',
      entityType: EntityType.QUOTE_REQUEST,
      entityId: rfq.id,
      userId: actor.id,
      newData: {
        marketplaceOfferId: rfq.marketplaceOfferId,
        buyerCompanyId: rfq.buyerCompanyId,
        status: rfq.status,
      },
    });

    return rfq;
  }

  // ─── Transitions de statut ────────────────────────────────────────────────

  async updateStatus(id: string, dto: UpdateQuoteRequestStatusDto, actor: RequestUser) {
    const rfq = await this.prisma.quoteRequest.findUnique({
      where: { id },
      include: { marketplaceOffer: { select: { sellerProfileId: true } } },
    });
    if (!rfq) throw new NotFoundException('Demande de devis introuvable');
    this.ensureCanAccess(actor, rfq);

    if (rfq.status === dto.status) {
      throw new BadRequestException('Statut identique au statut courant');
    }

    const allowed = ALLOWED_TRANSITIONS[rfq.status as QuoteRequestStatus];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(`Transition interdite : ${rfq.status} → ${dto.status}`);
    }

    // Restrictions métier :
    // - buyer ne peut que CANCELLED
    // - WON/LOST : seller ou staff uniquement
    if (this.isBuyer(actor) && dto.status !== QuoteRequestStatus.CANCELLED) {
      throw new ForbiddenException("Un acheteur ne peut qu'annuler sa demande");
    }
    if (
      (dto.status === QuoteRequestStatus.WON || dto.status === QuoteRequestStatus.LOST) &&
      !this.isStaff(actor) &&
      !this.isSeller(actor)
    ) {
      throw new ForbiddenException("Seul le vendeur ou l'équipe IOX peut clôturer cette demande");
    }

    const updated = await this.prisma.quoteRequest.update({
      where: { id },
      data: { status: dto.status },
      include: RFQ_INCLUDE,
    });

    await this.auditService.log({
      action: 'QUOTE_REQUEST_STATUS_CHANGED',
      entityType: EntityType.QUOTE_REQUEST,
      entityId: id,
      userId: actor.id,
      previousData: { status: rfq.status },
      newData: { status: dto.status },
      notes: dto.note,
    });

    return updated;
  }

  // ─── Assignation staff ────────────────────────────────────────────────────

  async assign(id: string, dto: AssignQuoteRequestDto, actor: RequestUser) {
    if (!this.isStaff(actor)) {
      throw new ForbiddenException("Seule l'équipe IOX peut assigner une demande");
    }
    const rfq = await this.prisma.quoteRequest.findUnique({ where: { id } });
    if (!rfq) throw new NotFoundException('Demande de devis introuvable');

    if (dto.assignedToUserId) {
      const user = await this.prisma.user.findUnique({ where: { id: dto.assignedToUserId } });
      if (!user) throw new NotFoundException('Utilisateur assigné introuvable');
    }

    const updated = await this.prisma.quoteRequest.update({
      where: { id },
      data: { assignedToUserId: dto.assignedToUserId ?? null },
      include: RFQ_INCLUDE,
    });

    await this.auditService.log({
      action: 'QUOTE_REQUEST_ASSIGNED',
      entityType: EntityType.QUOTE_REQUEST,
      entityId: id,
      userId: actor.id,
      previousData: { assignedToUserId: rfq.assignedToUserId },
      newData: { assignedToUserId: updated.assignedToUserId },
    });

    return updated;
  }

  // ─── Messages ─────────────────────────────────────────────────────────────

  async findMessages(rfqId: string, actor: RequestUser) {
    const rfq = await this.prisma.quoteRequest.findUnique({
      where: { id: rfqId },
      include: { marketplaceOffer: { select: { sellerProfileId: true } } },
    });
    if (!rfq) throw new NotFoundException('Demande de devis introuvable');
    this.ensureCanAccess(actor, rfq);

    const where: Prisma.QuoteRequestMessageWhereInput = { quoteRequestId: rfqId };
    // Buyer ne voit jamais les notes internes
    if (this.isBuyer(actor)) {
      where.isInternalNote = false;
    }

    const messages = await this.prisma.quoteRequestMessage.findMany({
      where,
      include: {
        authorUser: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return messages;
  }

  async addMessage(rfqId: string, dto: CreateQuoteRequestMessageDto, actor: RequestUser) {
    const rfq = await this.prisma.quoteRequest.findUnique({
      where: { id: rfqId },
      include: { marketplaceOffer: { select: { sellerProfileId: true } } },
    });
    if (!rfq) throw new NotFoundException('Demande de devis introuvable');
    this.ensureCanAccess(actor, rfq);

    const isInternal = dto.isInternalNote === true;
    if (isInternal && this.isBuyer(actor)) {
      throw new ForbiddenException('Un acheteur ne peut pas créer de note interne');
    }

    // On n'empêche pas d'ajouter des messages sur une RFQ clôturée (historique possible)
    // mais on le journalise.

    const message = await this.prisma.quoteRequestMessage.create({
      data: {
        quoteRequestId: rfqId,
        authorUserId: actor.id,
        message: dto.message,
        isInternalNote: isInternal,
      },
      include: {
        authorUser: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
      },
    });

    await this.auditService.log({
      action: isInternal ? 'QUOTE_REQUEST_INTERNAL_NOTE_ADDED' : 'QUOTE_REQUEST_MESSAGE_ADDED',
      entityType: EntityType.QUOTE_REQUEST,
      entityId: rfqId,
      userId: actor.id,
      newData: { messageId: message.id, isInternalNote: isInternal },
    });

    return message;
  }
}
