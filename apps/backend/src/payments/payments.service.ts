// PAY-1 phase 1 — PaymentsService.
// PAY-2 — refund(id, dto, actor).
//
// Lecture des Payment rows + (LOT 3) création de Stripe Checkout Sessions.

import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SellerOwnershipService } from '../common/services/seller-ownership.service';
import { AuditService } from '../audit/audit.service';
import { normalizeCurrency } from '../common/money';
import {
  EntityType,
  PaymentStatus,
  QuoteRequestStatus,
  RequestUser,
  UserRole,
} from '@iox/shared';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
  type CheckoutSessionResult,
  type RefundResult,
} from './provider/payment-provider.interface';
import { PaymentProviderError } from './provider/payment-provider.errors';
import type { RefundPaymentDto } from './dto/payments.dto';
import { QuoteRequestFsm } from '../quote-requests/quote-request-fsm';

/**
 * Commission IOX V1 : 5% du montant brut.
 * Calcul : Math.floor(amountCents * 0.05). Le seller reçoit le reste via
 * `transfer_data.destination` Stripe (split à la source).
 */
export const APPLICATION_FEE_PERCENT = 0.05;

export interface CreateCheckoutSessionInput {
  quoteRequestId: string;
  marketplaceOfferId: string;
  amountCents: number;
  currency?: string;
  returnUrl: string;
  cancelUrl: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: SellerOwnershipService,
    private readonly audit: AuditService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  /**
   * Calcule la commission IOX (gross 5%) en centimes.
   * `Math.floor` pour garantir que la commission est ≤ amountCents.
   */
  computeApplicationFeeCents(amountCents: number): number {
    return Math.floor(amountCents * APPLICATION_FEE_PERCENT);
  }

  /**
   * Crée une Stripe Checkout Session pour un buyer payant une RFQ acceptée.
   * Validation :
   *  - RFQ existe et status=WON
   *  - Seller a SellerStripeAccount avec charges_enabled=true
   *  - Currency = EUR (V1)
   * Application fee = 5% gross via `application_fee_amount`.
   * Transfer destination = stripeAccountId du seller (split à la source).
   */
  async createCheckoutSession(input: CreateCheckoutSessionInput, actor: RequestUser) {
    if (!this.provider.isConfigured()) {
      throw new BadRequestException(
        'Stripe non configuré côté serveur. Contacter l\'admin.',
      );
    }

    // 1. Validation RFQ
    const rfq = await this.prisma.quoteRequest.findUnique({
      where: { id: input.quoteRequestId },
      include: {
        marketplaceOffer: {
          include: {
            sellerProfile: { include: { stripeAccount: true } },
          },
        },
      },
    });
    if (!rfq) throw new NotFoundException('RFQ introuvable');

    // Mandat 53: centralized FSM guard — only WON status is payable.
    QuoteRequestFsm.assertPayable(rfq.status as QuoteRequestStatus);

    // Buyer ownership : seul le buyerUser peut payer sa propre RFQ.
    if (actor.id !== rfq.buyerUserId) {
      throw new BadRequestException('Cette RFQ n\'appartient pas à votre compte');
    }

    // 2. Validation seller Stripe
    const sellerProfile = rfq.marketplaceOffer.sellerProfile;
    const stripeAccount = sellerProfile.stripeAccount;
    if (!stripeAccount || !stripeAccount.chargesEnabled) {
      throw new BadRequestException(
        'Le vendeur n\'est pas configuré pour les paiements Stripe.',
      );
    }

    // M59: multi-devise EUR/USD — normalizeCurrency valide + normalise UPPERCASE
    let currency: string;
    try {
      currency = normalizeCurrency(input.currency);
    } catch {
      throw new BadRequestException(
        `Devise non supportée : ${input.currency ?? '(vide)'}. Devises acceptées : EUR, USD`,
      );
    }

    const applicationFeeCents = this.computeApplicationFeeCents(input.amountCents);

    // 3. Crée Payment row PENDING
    const payment = await this.prisma.payment.create({
      data: {
        quoteRequestId: input.quoteRequestId,
        marketplaceOfferId: input.marketplaceOfferId,
        sellerProfileId: sellerProfile.id,
        buyerCompanyId: rfq.buyerCompanyId,
        buyerUserId: actor.id,
        amountCents: input.amountCents,
        currency,
        applicationFeeCents,
        status: PaymentStatus.PENDING,
      },
    });

    // 4. Crée Checkout Session via le provider
    let sessionResult: CheckoutSessionResult;
    try {
      sessionResult = await this.provider.createCheckoutSession({
        amountCents: input.amountCents,
        currency,
        productName: rfq.marketplaceOffer.title ?? 'Commande IOX Marketplace',
        applicationFeeCents,
        destinationAccountId: stripeAccount.stripeAccountId,
        successUrl: input.returnUrl,
        cancelUrl: input.cancelUrl,
        metadata: {
          payment_id: payment.id,
          quote_request_id: input.quoteRequestId,
          marketplace_offer_id: input.marketplaceOfferId,
        },
      });
    } catch (err) {
      if (err instanceof PaymentProviderError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    // 5. Persist sessionId sur Payment row
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { stripeCheckoutSessionId: sessionResult.sessionId },
    });

    this.logger.log(
      `Checkout session created paymentId=${payment.id} sessionId=${sessionResult.sessionId} amountCents=${input.amountCents} appFee=${applicationFeeCents}`,
    );

    return {
      paymentId: payment.id,
      sessionId: sessionResult.sessionId,
      checkoutUrl: sessionResult.url,
    };
  }

  async getPaymentById(id: string, actor?: RequestUser) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Paiement introuvable');

    // Ownership : staff voit tout, seller voit ses propres paiements,
    // buyer voit ses propres paiements (par buyerUserId).
    if (actor && !this.ownership.isStaff(actor)) {
      const isSellerOwner =
        actor.role === 'MARKETPLACE_SELLER' &&
        actor.sellerProfileIds.includes(payment.sellerProfileId);
      const isBuyerOwner =
        actor.role === 'MARKETPLACE_BUYER' && actor.id === payment.buyerUserId;
      if (!isSellerOwner && !isBuyerOwner) {
        throw new NotFoundException('Paiement introuvable');
      }
    }

    return payment;
  }

  async listPaymentsBySeller(
    sellerProfileId: string,
    query: { page?: number; limit?: number; status?: string },
    actor?: RequestUser,
  ) {
    if (actor) {
      await this.ownership.assertSellerProfileOwnership(actor, sellerProfileId);
    }
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where = {
      sellerProfileId,
      ...(query.status ? { status: query.status as never } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ─── PAY-2 — Remboursement (total ou partiel) ───────────────────────────

  async refund(id: string, dto: RefundPaymentDto, actor: RequestUser) {
    if (!this.provider.isConfigured()) {
      throw new BadRequestException(
        'Stripe non configuré côté serveur. Contacter l\'admin.',
      );
    }

    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Paiement introuvable');

    if (payment.status !== PaymentStatus.SUCCEEDED) {
      throw new BadRequestException(
        `Remboursement impossible : statut ${payment.status} (requis: SUCCEEDED)`,
      );
    }

    // Ownership : staff (ADMIN, COORDINATOR) ou seller propriétaire.
    if (!this.ownership.isStaff(actor)) {
      if (actor.role === UserRole.MARKETPLACE_SELLER) {
        if (!(actor.sellerProfileIds ?? []).includes(payment.sellerProfileId)) {
          throw new ForbiddenException('Ce paiement n\'appartient pas à votre profil vendeur');
        }
      } else {
        throw new ForbiddenException('Rôle non autorisé pour le remboursement');
      }
    }

    if (!payment.stripePaymentIntentId) {
      throw new BadRequestException('Aucun paymentIntentId associé à ce paiement.');
    }
    let refundResult: RefundResult;
    try {
      refundResult = await this.provider.createRefund({
        paymentIntentId: payment.stripePaymentIntentId,
        amountCents: dto.amountCents,
      });
    } catch (err) {
      if (err instanceof PaymentProviderError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const existingMeta =
      (payment.metadataJson as Record<string, unknown> | null) ?? {};
    const updated = await this.prisma.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.REFUNDED,
        metadataJson: {
          ...existingMeta,
          refundId: refundResult.refundId,
          refundReason: dto.reason ?? null,
          refundAmountCents: dto.amountCents ?? payment.amountCents,
        },
      },
    });

    await this.audit.log({
      action: 'PAYMENT_REFUNDED',
      entityType: EntityType.PAYMENT,
      entityId: id,
      userId: actor.id,
      previousData: { status: payment.status },
      newData: {
        status: PaymentStatus.REFUNDED,
        refundId: refundResult.refundId,
        refundAmountCents: dto.amountCents ?? payment.amountCents,
      },
      notes: dto.reason ?? undefined,
    });

    this.logger.log(
      `Payment REFUNDED paymentId=${id} refundId=${refundResult.refundId} amountCents=${dto.amountCents ?? payment.amountCents}`,
    );

    return updated;
  }
}
