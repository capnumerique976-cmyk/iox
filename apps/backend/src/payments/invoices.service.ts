// PAY-2 — InvoicesService.
//
// CRUD factures marketplace. Création depuis Payment, listing
// paginé buyer/seller, génération PDF professionnelle B2B.

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');
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
   * Génère un PDF de facture B2B professionnel.
   * Retourne un Buffer contenant le document PDF.
   */
  async generatePdf(id: string, actor: RequestUser): Promise<Buffer> {
    // 1. Fetch invoice
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
    });
    if (!invoice) throw new NotFoundException('Facture introuvable');

    // 2. Ownership check
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

    // 3. Fetch related data (no Prisma relations on Invoice)
    const [payment, sellerProfile, buyerCompany] = await Promise.all([
      this.prisma.payment.findUnique({ where: { id: invoice.paymentId } }),
      this.prisma.sellerProfile.findUnique({
        where: { id: invoice.sellerProfileId },
        include: { company: true },
      }),
      this.prisma.company.findUnique({
        where: { id: invoice.buyerCompanyId },
      }),
    ]);

    if (!sellerProfile || !buyerCompany) {
      throw new NotFoundException('Données vendeur/acheteur manquantes');
    }

    // 4. Build PDF
    const pdf = await this.buildInvoicePdf({
      ...invoice,
      payment,
      sellerProfile,
      buyerCompany,
    });

    this.logger.log(`PDF generated for invoice ${invoice.invoiceNumber}`);

    return pdf;
  }

  /**
   * Builds the PDF document and returns a Buffer.
   */
  private buildInvoicePdf(invoice: {
    invoiceNumber: string;
    amountCents: number;
    currency: string;
    status: string;
    issuedAt: Date | null;
    createdAt: Date;
    payment: {
      amountCents: number;
      currency: string;
      applicationFeeCents: number | null;
    } | null;
    sellerProfile: {
      publicDisplayName: string;
      legalName: string | null;
      country: string | null;
      region: string | null;
      salesEmail: string | null;
      salesPhone: string | null;
      company: {
        name: string;
        address: string | null;
        city: string | null;
        country: string | null;
        postalCode: string | null;
        vatNumber: string | null;
        email: string | null;
        phone: string | null;
      } | null;
    };
    buyerCompany: {
      name: string;
      address: string | null;
      city: string | null;
      country: string | null;
      postalCode: string | null;
      vatNumber: string | null;
      email: string | null;
      phone: string | null;
    };
  }): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const { sellerProfile, buyerCompany, payment } = invoice;
      const sellerCompany = sellerProfile.company;
      const invoiceDate = invoice.issuedAt ?? invoice.createdAt;
      const amountEur = (invoice.amountCents / 100).toFixed(2);
      const feeCents = payment?.applicationFeeCents ?? 0;
      const feeEur = (feeCents / 100).toFixed(2);
      const netCents = invoice.amountCents - feeCents;
      const netEur = (netCents / 100).toFixed(2);

      // ─── Header ──────────────────────────────────────────
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('IOX MARKETPLACE', 50, 50);
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#666666')
        .text('Plateforme B2B — Produits tropicaux', 50, 75);

      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .text('FACTURE', 350, 50, { align: 'right' });
      doc
        .fontSize(12)
        .font('Helvetica')
        .text(invoice.invoiceNumber, 350, 80, { align: 'right' });

      // ─── Date + Status ───────────────────────────────────
      doc.moveDown(2);
      const dateStr = invoiceDate.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#000000')
        .text(`Date : ${dateStr}`, 50, 110);
      doc.text(`Statut : ${invoice.status}`, 50, 125);
      doc.text(`Devise : ${invoice.currency.toUpperCase()}`, 50, 140);

      // ─── Seller (left) + Buyer (right) ──────────────────
      const partiesY = 175;
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#333333')
        .text('VENDEUR', 50, partiesY);
      doc.font('Helvetica').fillColor('#000000');
      const sellerName = sellerProfile.legalName ?? sellerProfile.publicDisplayName;
      doc.text(sellerName, 50, partiesY + 18);
      if (sellerCompany?.address) doc.text(sellerCompany.address);
      if (sellerCompany?.postalCode || sellerCompany?.city) {
        doc.text(
          [sellerCompany.postalCode, sellerCompany.city].filter(Boolean).join(' '),
        );
      }
      if (sellerCompany?.country) doc.text(sellerCompany.country);
      if (sellerCompany?.vatNumber)
        doc.text(`TVA : ${sellerCompany.vatNumber}`);
      if (sellerProfile.salesEmail)
        doc.text(sellerProfile.salesEmail);

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#333333')
        .text('ACHETEUR', 300, partiesY);
      doc.font('Helvetica').fillColor('#000000');
      doc.text(buyerCompany.name, 300, partiesY + 18);
      if (buyerCompany.address) doc.text(buyerCompany.address, 300);
      if (buyerCompany.postalCode || buyerCompany.city) {
        doc.text(
          [buyerCompany.postalCode, buyerCompany.city].filter(Boolean).join(' '),
          300,
        );
      }
      if (buyerCompany.country) doc.text(buyerCompany.country, 300);
      if (buyerCompany.vatNumber)
        doc.text(`TVA : ${buyerCompany.vatNumber}`, 300);
      if (buyerCompany.email) doc.text(buyerCompany.email, 300);

      // ─── Line items table ──────────────────────────────
      const tableTop = 340;

      // Table header
      doc
        .rect(50, tableTop, 500, 22)
        .fill('#f0f0f0');
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#000000');
      doc.text('Description', 55, tableTop + 6, { width: 250 });
      doc.text('Quantité', 310, tableTop + 6, { width: 60, align: 'center' });
      doc.text('Prix unit.', 375, tableTop + 6, { width: 80, align: 'right' });
      doc.text('Total', 460, tableTop + 6, { width: 85, align: 'right' });

      // Line item (single-line invoice from payment)
      const lineY = tableTop + 28;
      doc.font('Helvetica').fontSize(9);
      doc.text('Commande marketplace IOX', 55, lineY, { width: 250 });
      doc.text('1', 310, lineY, { width: 60, align: 'center' });
      doc.text(`${amountEur} ${invoice.currency}`, 375, lineY, {
        width: 80,
        align: 'right',
      });
      doc.text(`${amountEur} ${invoice.currency}`, 460, lineY, {
        width: 85,
        align: 'right',
      });

      // ─── Totals ────────────────────────────────────────
      const totalsY = lineY + 40;
      doc
        .moveTo(50, totalsY)
        .lineTo(550, totalsY)
        .strokeColor('#cccccc')
        .stroke();

      doc.font('Helvetica').fontSize(10);
      doc.text('Sous-total HT :', 350, totalsY + 10, {
        width: 100,
        align: 'right',
      });
      doc.text(`${amountEur} ${invoice.currency}`, 460, totalsY + 10, {
        width: 85,
        align: 'right',
      });

      if (feeCents > 0) {
        doc.text('Commission plateforme :', 350, totalsY + 28, {
          width: 100,
          align: 'right',
        });
        doc.text(`-${feeEur} ${invoice.currency}`, 460, totalsY + 28, {
          width: 85,
          align: 'right',
        });

        doc.font('Helvetica-Bold').fontSize(12);
        doc.text('Net vendeur :', 350, totalsY + 50, {
          width: 100,
          align: 'right',
        });
        doc.text(`${netEur} ${invoice.currency}`, 460, totalsY + 50, {
          width: 85,
          align: 'right',
        });
      } else {
        doc.font('Helvetica-Bold').fontSize(12);
        doc.text('Total TTC :', 350, totalsY + 28, {
          width: 100,
          align: 'right',
        });
        doc.text(`${amountEur} ${invoice.currency}`, 460, totalsY + 28, {
          width: 85,
          align: 'right',
        });
      }

      // ─── Footer ────────────────────────────────────────
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#999999');
      doc.text(
        `Facture ${invoice.invoiceNumber} — Générée automatiquement par IOX Marketplace`,
        50,
        750,
        { align: 'center', width: 500 },
      );

      doc.end();
    });
  }
}
