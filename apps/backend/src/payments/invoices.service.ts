// PAY-2 — InvoicesService.
//
// CRUD factures marketplace. V1 : création depuis Payment, listing
// paginé buyer/seller, stub PDF.

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SellerOwnershipService } from '../common/services/seller-ownership.service';
import { AuditService } from '../audit/audit.service';
import {
  EntityType,
  PaymentStatus,
  RequestUser,
  UserRole,
} from '@iox/shared';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: SellerOwnershipService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Génère un numéro de facture au format IOX-YYYY-NNNNNN.
   * Séquentiel basé sur le count des factures existantes + 1.
   */
  async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.invoice.count();
    const seq = String(count + 1).padStart(6, '0');
    return `IOX-${year}-${seq}`;
  }

  /**
   * Crée une Invoice à partir d'un Payment existant.
   * Réservé ADMIN/COORDINATOR.
   */
  async createFromPayment(paymentId: string, actor: RequestUser) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException('Paiement introuvable');

    if (payment.status !== PaymentStatus.SUCCEEDED) {
      throw new BadRequestException(
        `Facturation impossible : statut paiement ${payment.status} (requis: SUCCEEDED)`,
      );
    }

    // Check if invoice already exists for this payment.
    const existing = await this.prisma.invoice.findUnique({
      where: { paymentId },
    });
    if (existing) {
      throw new BadRequestException(
        `Une facture existe déjà pour ce paiement (invoice ${existing.invoiceNumber})`,
      );
    }

    const invoiceNumber = await this.generateInvoiceNumber();

    const invoice = await this.prisma.invoice.create({
      data: {
        paymentId,
        sellerProfileId: payment.sellerProfileId,
        buyerCompanyId: payment.buyerCompanyId,
        invoiceNumber,
        amountCents: payment.amountCents,
        currency: payment.currency,
        status: 'DRAFT',
      },
    });

    await this.audit.log({
      action: 'INVOICE_CREATED',
      entityType: EntityType.INVOICE,
      entityId: invoice.id,
      userId: actor.id,
      newData: {
        invoiceNumber,
        paymentId,
        amountCents: payment.amountCents,
      },
    });

    this.logger.log(
      `Invoice created id=${invoice.id} invoiceNumber=${invoiceNumber} paymentId=${paymentId}`,
    );

    return invoice;
  }

  async findById(id: string, actor: RequestUser) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('Facture introuvable');

    // Ownership checks.
    if (!this.ownership.isStaff(actor)) {
      const isSeller =
        actor.role === UserRole.MARKETPLACE_SELLER &&
        (actor.sellerProfileIds ?? []).includes(invoice.sellerProfileId);
      const isBuyer =
        actor.role === UserRole.MARKETPLACE_BUYER &&
        (actor.companyIds ?? []).includes(invoice.buyerCompanyId);
      if (!isSeller && !isBuyer) {
        throw new NotFoundException('Facture introuvable');
      }
    }

    return invoice;
  }

  async listByBuyer(
    buyerCompanyId: string,
    query: { page?: number; limit?: number },
    actor: RequestUser,
  ) {
    // Ownership : staff voit tout, buyer ne voit que ses propres companies.
    if (!this.ownership.isStaff(actor)) {
      if (
        actor.role !== UserRole.MARKETPLACE_BUYER ||
        !(actor.companyIds ?? []).includes(buyerCompanyId)
      ) {
        throw new ForbiddenException('Accès refusé aux factures de cette entreprise');
      }
    }

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where = { buyerCompanyId };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async listBySeller(
    sellerProfileId: string,
    query: { page?: number; limit?: number },
    actor: RequestUser,
  ) {
    if (actor) {
      await this.ownership.assertSellerProfileOwnership(actor, sellerProfileId);
    }

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where = { sellerProfileId };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  /**
   * V1 stub — retourne 501 Not Implemented.
   * La génération PDF sera implémentée dans un lot ultérieur.
   */
  async generatePdf(_id: string): Promise<never> {
    throw new NotImplementedException(
      'Génération PDF non implémentée (V1 stub)',
    );
  }
}
