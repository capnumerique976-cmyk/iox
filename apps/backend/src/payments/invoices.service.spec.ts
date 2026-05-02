// PAY-2 — Spec InvoicesService.

import { Test, TestingModule } from '@nestjs/testing';
import { NotImplementedException, NotFoundException, BadRequestException } from '@nestjs/common';
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
    it('returns 501 Not Implemented', async () => {
      await expect(service.generatePdf('inv-1')).rejects.toThrow(
        NotImplementedException,
      );
    });
  });
});
