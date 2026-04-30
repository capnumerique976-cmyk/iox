import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotifEmailService } from '../notif-email/notif-email.service';
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
  buyerUser: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      preferredLocale: true,
    },
  },
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
  private readonly logger = new Logger(QuoteRequestsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private ownership: SellerOwnershipService,
    // MP-NOTIF-1 phase 1 — émetteur d'emails transactionnels.
    private notifEmail: NotifEmailService,
    private config: ConfigService,
  ) {}

  /**
   * MP-NOTIF-1 phase 1 — Construit l'URL CTA vers la fiche RFQ seller/buyer.
   * Pas d'environment-specific, on utilise `FRONTEND_URL` (défaut local).
   */
  private rfqCtaUrl(rfqId: string, audience: 'seller' | 'buyer'): string {
    const base = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const path = audience === 'seller' ? '/seller/quote-requests' : '/quote-requests';
    return `${base.replace(/\/$/, '')}${path}/${rfqId}`;
  }

  /**
   * MP-NOTIF-1 phase 1 — Notifie l'autre partie d'un message non-interne.
   * Si l'auteur est seller → notifier buyer. Sinon → notifier seller.
   * Le staff (admin/coordinator/quality) n'est jamais notifié ici.
   */
  private async notifyOtherPartyOnMessage(
    rfq: {
      id: string;
      marketplaceOffer: {
        title: string;
        sellerProfile: { publicDisplayName: string; salesEmail: string | null };
      };
      buyerUser: {
        email: string;
        firstName: string | null;
        lastName: string | null;
        preferredLocale?: string;
      } | null;
    },
    message: {
      message: string;
      authorUser: {
        firstName: string | null;
        lastName: string | null;
        email: string;
        role: string;
      };
    },
    actor: RequestUser,
  ): Promise<void> {
    const offerTitle = rfq.marketplaceOffer.title;
    const senderDisplayName = this.formatUserName(
      message.authorUser.firstName,
      message.authorUser.lastName,
      message.authorUser.email,
    );

    if (this.isSeller(actor)) {
      // Auteur seller → notifier buyer
      if (!rfq.buyerUser?.email) return;
      const recipientDisplayName = this.formatUserName(
        rfq.buyerUser.firstName,
        rfq.buyerUser.lastName,
        rfq.buyerUser.email,
      );
      await this.safeNotify(
        'rfq-message-created',
        rfq.buyerUser.email,
        {
          recipientDisplayName,
          senderDisplayName,
          offerTitle,
          messageBody: message.message,
          ctaUrl: this.rfqCtaUrl(rfq.id, 'buyer'),
        },
        // I18N-4 — locale buyer pour résolution template (FR/EN).
        rfq.buyerUser.preferredLocale,
      );
    } else {
      // Auteur buyer ou staff → notifier seller (via salesEmail SellerProfile)
      const sellerEmail = rfq.marketplaceOffer.sellerProfile.salesEmail;
      if (!sellerEmail) return;
      await this.safeNotify('rfq-message-created', sellerEmail, {
        recipientDisplayName: rfq.marketplaceOffer.sellerProfile.publicDisplayName,
        senderDisplayName,
        offerTitle,
        messageBody: message.message,
        ctaUrl: this.rfqCtaUrl(rfq.id, 'seller'),
      });
    }
  }

  private formatUserName(
    firstName: string | null,
    lastName: string | null,
    fallbackEmail: string,
  ): string {
    const full = [firstName, lastName].filter(Boolean).join(' ').trim();
    return full.length > 0 ? full : fallbackEmail;
  }

  /**
   * MP-NOTIF-1 phase 1 — Émet un email transactionnel sans bloquer le
   * workflow métier en cas d'échec (try/catch silencieux + log warn).
   * Phase 2 ajoutera EmailLog + retry.
   */
  private async safeNotify(
    templateId: string,
    to: string,
    templateData: Record<string, unknown>,
    locale?: string,
  ): Promise<void> {
    try {
      // I18N-4 — locale passée au service pour résolution template.
      const res = await this.notifEmail.send({ to, templateId, templateData, locale });
      if (!res.success) {
        this.logger.warn(
          `notif-email skipped templateId=${templateId} to=${to} locale=${locale ?? 'fr'} error=${res.error ?? 'unknown'}`,
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      this.logger.error(
        `notif-email failed templateId=${templateId} to=${to} error=${msg}`,
      );
    }
  }

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

    // MP-NOTIF-1 phase 1 — Notifie le seller. Pas bloquant : si l'email
    // échoue (transport, DB, template), la RFQ reste créée et on log warn.
    const sellerProfile = await this.prisma.sellerProfile.findUnique({
      where: { id: offer.sellerProfileId },
      select: { publicDisplayName: true, salesEmail: true },
    });
    if (sellerProfile?.salesEmail) {
      await this.safeNotify('rfq-created-to-seller', sellerProfile.salesEmail, {
        sellerDisplayName: sellerProfile.publicDisplayName,
        buyerCompanyName: company.name,
        offerTitle: offer.title,
        requestedQuantity: dto.requestedQuantity ?? null,
        requestedUnit: dto.requestedUnit ?? null,
        deliveryCountry: dto.deliveryCountry ?? null,
        message: dto.message ?? null,
        ctaUrl: this.rfqCtaUrl(rfq.id, 'seller'),
      });
    } else {
      this.logger.warn(
        `notif-email skipped (no salesEmail) sellerProfileId=${offer.sellerProfileId} rfqId=${rfq.id}`,
      );
    }

    return rfq;
  }

  // ─── Transitions de statut ────────────────────────────────────────────────

  async updateStatus(id: string, dto: UpdateQuoteRequestStatusDto, actor: RequestUser) {
    const rfq = await this.prisma.quoteRequest.findUnique({
      where: { id },
      include: {
        marketplaceOffer: {
          select: {
            id: true,
            title: true,
            sellerProfileId: true,
            sellerProfile: { select: { publicDisplayName: true } },
          },
        },
      },
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

    // MP-NOTIF-2 phase 2 — Notifie le buyer pour les transitions clés.
    // Skip pour `NEGOTIATING` et `CANCELLED` (ton informel ; pas de notif
    // dans cette phase). Skip aussi si `notifEmail` n'est pas injecté
    // (compatibilité tests minimaux).
    if (this.notifEmail) {
      await this.notifyOnStatusTransition(updated, dto.status, dto.note);
    }

    return updated;
  }

  /**
   * MP-NOTIF-2 phase 2 — Mappe `QuoteRequestStatus` cible → templateId
   * et émet l'email au buyer (try/catch silencieux via `safeNotify`).
   */
  private async notifyOnStatusTransition(
    updated: Awaited<ReturnType<typeof this.prisma.quoteRequest.findUnique>> &
      Record<string, unknown>,
    targetStatus: QuoteRequestStatus,
    note: string | null | undefined,
  ): Promise<void> {
    const TEMPLATE_BY_STATUS: Partial<Record<QuoteRequestStatus, string>> = {
      [QuoteRequestStatus.QUALIFIED]: 'rfq-qualified',
      [QuoteRequestStatus.QUOTED]: 'rfq-quoted',
      [QuoteRequestStatus.WON]: 'rfq-won',
      [QuoteRequestStatus.LOST]: 'rfq-lost',
    };
    const templateId = TEMPLATE_BY_STATUS[targetStatus];
    if (!templateId) return; // NEGOTIATING / CANCELLED → no-op

    const offer = (updated as { marketplaceOffer?: unknown }).marketplaceOffer as
      | {
          title?: string | null;
          sellerProfile?: { publicDisplayName?: string | null } | null;
        }
      | undefined;
    const buyer = (updated as { buyerUser?: unknown }).buyerUser as
      | {
          email?: string | null;
          firstName?: string | null;
          lastName?: string | null;
        }
      | undefined;
    if (!offer || !buyer?.email) return;

    const recipientDisplayName = this.formatUserName(
      buyer.firstName ?? null,
      buyer.lastName ?? null,
      buyer.email,
    );
    const senderDisplayName = offer.sellerProfile?.publicDisplayName ?? 'Le vendeur';
    const offerTitle = offer.title ?? 'Votre offre';
    const ctaUrl = this.rfqCtaUrl(
      (updated as { id: string }).id,
      'buyer',
    );

    await this.safeNotify(templateId, buyer.email, {
      recipientDisplayName,
      senderDisplayName,
      offerTitle,
      note: note ?? null,
      ctaUrl,
    });
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
      include: {
        marketplaceOffer: {
          select: {
            id: true,
            title: true,
            sellerProfileId: true,
            sellerProfile: {
              select: { id: true, publicDisplayName: true, salesEmail: true },
            },
          },
        },
        buyerUser: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      preferredLocale: true,
    },
  },
      },
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

    // MP-NOTIF-1 phase 1 — Notifie l'autre partie d'un nouveau message
    // public (jamais sur une note interne staff). Pas bloquant.
    if (!isInternal) {
      await this.notifyOtherPartyOnMessage(rfq, message, actor);
    }

    return message;
  }
}
