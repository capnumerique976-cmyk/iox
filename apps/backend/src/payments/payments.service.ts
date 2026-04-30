// PAY-1 phase 1 — PaymentsService.
//
// Lecture des Payment rows + (LOT 3) création de Stripe Checkout Sessions.

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SellerOwnershipService } from '../common/services/seller-ownership.service';
import { RequestUser } from '@iox/shared';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: SellerOwnershipService,
  ) {}

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
}
