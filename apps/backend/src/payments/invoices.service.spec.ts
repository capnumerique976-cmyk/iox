// PAY-2 — Spec InvoicesService.

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { PrismaService } from '../database/prisma.service';
import { SellerOwnershipService } from '../common/services/seller-ownership.service';
import { AuditService } from '../audit/audit.service';
import {
  PaymentStatus,
  UserRole,
  RequestUser,
} from '@iox/shared';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let prisma: {
    invoice: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
    };
    payment: { findUnique: jest.Mock };
    sellerProfile: { findUnique: jest.Mock };
    company: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  const ownershipMock = {
    isStaff: jest.fn().mockReturnValue(true),
    assertSellerProfileOwnership: jest.fn().mockResolvedValue(undefined),
  };
  const auditMock = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  const admin: RequestUser = {
    id: 'u-admin',
    email: 'admin@iox.co',
    role: UserRole.ADMIN,
    sellerProfileIds: [],
    companyIds: [],
  };

  const buyer: RequestUser = {
    id: 'u-buyer',
    email: 'buyer@iox.co',
    role: UserRole.MARKETPLACE_BUYER,
    sellerProfileIds: [],
    companyIds: ['co-buyer'],
  };

  const seller: RequestUser = {
    id: 'u-seller',
    email: 'seller@iox.co',
    role: UserRole.MARKETPLACE_SELLER,
    sellerProfileIds: ['sp1'],
    companyIds: [],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma = {
      invoice: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
      },
      payment: { findUnique: jest.fn() },
      sellerProfile: { findUnique: jest.fn() },
      company: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(async (arr: unknown[]) =>
      Promise.all(arr as Promise<unknown>[]),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: PrismaService, useValue: prisma },
        { provide: SellerOwnershipService, useValue: ownershipMock },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();
    service = module.get(InvoicesService);
  });

  describe('createFromPayment', () => {
    it('generates correct invoiceNumber format IOX-YYYY-NNNNNN', async () => {
      const payment = {
        id: 'pay1',
        status: PaymentStatus.SUCCEEDED,
        sellerProfileId: 'sp1',
        buyerCompanyId: 'co-buyer',
        amountCents: 10000,
        currency: 'EUR',
      };
      prisma.payment.findUnique.mockResolvedValue(payment);
      prisma.invoice.findUnique.mockResolvedValue(null); // no existing invoice
      prisma.invoice.count.mockResolvedValue(42); // 42 existing invoices
      prisma.invoice.create.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
        id: 'inv-1',
        ...args.data,
      }));

      const result = await service.createFromPayment('pay1', admin);

      const year = new Date().getFullYear();
      expect(result.invoiceNumber).toBe(`IOX-${year}-000043`);
      expect(result.amountCents).toBe(10000);
      expect(result.paymentId).toBe('pay1');
      expect(auditMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'INVOICE_CREATED' }),
      );
    });
  });

  describe('listByBuyer', () => {
    it('returns only buyer\'s invoices', async () => {
      const invoiceData = [
        { id: 'inv-1', buyerCompanyId: 'co-buyer', invoiceNumber: 'IOX-2026-000001' },
      ];
      prisma.invoice.findMany.mockResolvedValue(invoiceData);
      prisma.invoice.count.mockResolvedValue(1);
      ownershipMock.isStaff.mockReturnValue(false);

      const result = await service.listByBuyer('co-buyer', { page: 1, limit: 20 }, buyer);

      expect(result.data).toEqual(invoiceData);
      expect(result.meta.total).toBe(1);
      const findManyCall = prisma.invoice.findMany.mock.calls[0][0];
      expect(findManyCall.where.buyerCompanyId).toBe('co-buyer');
    });
  });

  describe('listBySeller', () => {
    it('returns only seller\'s invoices', async () => {
      const invoiceData = [
        { id: 'inv-2', sellerProfileId: 'sp1', invoiceNumber: 'IOX-2026-000002' },
      ];
      prisma.invoice.findMany.mockResolvedValue(invoiceData);
      prisma.invoice.count.mockResolvedValue(1);

      const result = await service.listBySeller('sp1', { page: 1, limit: 20 }, seller);

      expect(result.data).toEqual(invoiceData);
      expect(result.meta.total).toBe(1);
      const findManyCall = prisma.invoice.findMany.mock.calls[0][0];
      expect(findManyCall.where.sellerProfileId).toBe('sp1');
    });
  });

  describe('generatePdf', () => {
    const invoiceRow = {
      id: 'inv-1',
      invoiceNumber: 'IOX-2026-000001',
      paymentId: 'pay1',
      sellerProfileId: 'sp1',
      buyerCompanyId: 'co-buyer',
      amountCents: 15000,
      currency: 'EUR',
      status: 'DRAFT',
      issuedAt: new Date('2026-01-15'),
      createdAt: new Date('2026-01-15'),
    };
    const paymentRow = {
      amountCents: 15000,
      currency: 'EUR',
      applicationFeeCents: 750,
    };
    const sellerProfileRow = {
      publicDisplayName: 'Ferme Tropicale',
      legalName: 'Ferme Tropicale SARL',
      country: 'Madagascar',
      region: 'Analamanga',
      salesEmail: 'vente@ferme-tropicale.mg',
      salesPhone: '+261 34 00 00 00',
      company: {
        name: 'Ferme Tropicale SARL',
        address: '12 rue des Épices',
        city: 'Antananarivo',
        country: 'Madagascar',
        postalCode: '101',
        vatNumber: 'MG-12345',
        email: 'contact@ferme-tropicale.mg',
        phone: '+261 34 00 00 00',
      },
    };
    const buyerCompanyRow = {
      name: 'Épicerie Fine Paris',
      address: '45 avenue des Champs-Élysées',
      city: 'Paris',
      country: 'France',
      postalCode: '75008',
      vatNumber: 'FR-98765432',
      email: 'achat@epicerie-fine.fr',
      phone: '+33 1 00 00 00 00',
    };

    function setupPdfMocks() {
      prisma.invoice.findUnique.mockResolvedValue(invoiceRow);
      prisma.payment.findUnique.mockResolvedValue(paymentRow);
      prisma.sellerProfile.findUnique.mockResolvedValue(sellerProfileRow);
      prisma.company.findUnique.mockResolvedValue(buyerCompanyRow);
    }

    it('generates PDF buffer for admin', async () => {
      setupPdfMocks();
      ownershipMock.isStaff.mockReturnValue(true);

      const result = await service.generatePdf('inv-1', admin);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(100);
      // PDF magic bytes: %PDF
      expect(result.subarray(0, 4).toString()).toBe('%PDF');
    });

    it('generates PDF buffer for buyer with ownership', async () => {
      setupPdfMocks();
      ownershipMock.isStaff.mockReturnValue(false);

      const result = await service.generatePdf('inv-1', buyer);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.subarray(0, 4).toString()).toBe('%PDF');
    });

    it('generates PDF buffer for seller with ownership', async () => {
      setupPdfMocks();
      ownershipMock.isStaff.mockReturnValue(false);

      const result = await service.generatePdf('inv-1', seller);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.subarray(0, 4).toString()).toBe('%PDF');
    });

    it('throws NotFoundException when invoice not found', async () => {
      prisma.invoice.findUnique.mockResolvedValue(null);

      await expect(service.generatePdf('inv-999', admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when buyer has no ownership', async () => {
      prisma.invoice.findUnique.mockResolvedValue(invoiceRow);
      ownershipMock.isStaff.mockReturnValue(false);

      const otherBuyer: RequestUser = {
        id: 'u-other',
        email: 'other@iox.co',
        role: UserRole.MARKETPLACE_BUYER,
        sellerProfileIds: [],
        companyIds: ['co-other'],
      };

      await expect(service.generatePdf('inv-1', otherBuyer)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
