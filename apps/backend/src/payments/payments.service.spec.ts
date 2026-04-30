// PAY-1 phase 1 LOT 1 — Spec PaymentsService.

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../database/prisma.service';
import { SellerOwnershipService } from '../common/services/seller-ownership.service';
import { UserRole, RequestUser } from '@iox/shared';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: {
    payment: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  const ownershipMock = {
    isStaff: jest.fn().mockReturnValue(true),
    assertSellerProfileOwnership: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    prisma = {
      payment: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(async (arr: unknown[]) =>
      Promise.all(arr as Promise<unknown>[]),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: SellerOwnershipService, useValue: ownershipMock },
      ],
    }).compile();
    service = module.get(PaymentsService);
  });

  describe('getPaymentById', () => {
    it('happy path : retourne le paiement', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'p1',
        sellerProfileId: 'sp1',
        buyerUserId: 'u1',
      });
      const res = await service.getPaymentById('p1');
      expect(res.id).toBe('p1');
    });

    it('throw NotFoundException si pas trouvé', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);
      await expect(service.getPaymentById('p404')).rejects.toThrow(NotFoundException);
    });

    it('seller non propriétaire → NotFoundException (scope ownership)', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'p1',
        sellerProfileId: 'sp-other',
        buyerUserId: 'u-other',
      });
      ownershipMock.isStaff.mockReturnValueOnce(false);
      const actor: RequestUser = {
        id: 'u-seller',
        email: 'a@a',
        role: UserRole.MARKETPLACE_SELLER,
        sellerProfileIds: ['sp-mine'],
        companyIds: [],
      };
      await expect(service.getPaymentById('p1', actor)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listPaymentsBySeller', () => {
    it('pagination correcte (page=2, limit=10)', async () => {
      prisma.payment.findMany.mockResolvedValue([]);
      prisma.payment.count.mockResolvedValue(25);
      const res = await service.listPaymentsBySeller('sp1', { page: 2, limit: 10 });
      const call = prisma.payment.findMany.mock.calls[0][0];
      expect(call.skip).toBe(10);
      expect(call.take).toBe(10);
      expect(res.meta.totalPages).toBe(3);
    });

    it('clamp limit à 100', async () => {
      prisma.payment.findMany.mockResolvedValue([]);
      prisma.payment.count.mockResolvedValue(0);
      await service.listPaymentsBySeller('sp1', { limit: 9999 });
      expect(prisma.payment.findMany.mock.calls[0][0].take).toBe(100);
    });
  });
});
