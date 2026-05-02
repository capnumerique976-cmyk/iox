import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../database/prisma.service';

describe('DashboardService — getMarketplaceStats', () => {
  let service: DashboardService;
  let prisma: Record<string, any>;

  beforeEach(async () => {
    prisma = {
      sellerProfile: { count: jest.fn().mockResolvedValue(0) },
      marketplaceProduct: { count: jest.fn().mockResolvedValue(0) },
      marketplaceOffer: { count: jest.fn().mockResolvedValue(0) },
      quoteRequest: {
        groupBy: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      // Required for other dashboard methods (not under test here)
      beneficiary: { count: jest.fn().mockResolvedValue(0) },
      inboundBatch: { groupBy: jest.fn().mockResolvedValue([]) },
      productBatch: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      marketReleaseDecision: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      labelValidation: { count: jest.fn().mockResolvedValue(0) },
      document: { count: jest.fn().mockResolvedValue(0) },
      incident: { count: jest.fn().mockResolvedValue(0) },
      product: { groupBy: jest.fn().mockResolvedValue([]) },
      distribution: { groupBy: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      auditLog: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [DashboardService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(DashboardService);
  });

  it('returns marketplace KPIs structure', async () => {
    prisma.sellerProfile.count
      .mockResolvedValueOnce(4)   // APPROVED
      .mockResolvedValueOnce(2)   // PENDING_REVIEW
      .mockResolvedValueOnce(1);  // SUSPENDED
    prisma.marketplaceProduct.count
      .mockResolvedValueOnce(8)   // PUBLISHED
      .mockResolvedValueOnce(3);  // DRAFT
    prisma.marketplaceOffer.count.mockResolvedValue(10);
    prisma.quoteRequest.groupBy.mockResolvedValue([
      { status: 'NEW', _count: { id: 5 } },
      { status: 'WON', _count: { id: 2 } },
    ]);
    prisma.quoteRequest.count
      .mockResolvedValueOnce(3)   // stale
      .mockResolvedValueOnce(6);  // created last 7d

    const result = await service.getMarketplaceStats();

    expect(result.sellers).toEqual({
      approved: 4,
      pending: 2,
      suspended: 1,
      total: 7,
    });
    expect(result.catalog).toEqual({
      productsPublished: 8,
      productsDraft: 3,
      offersPublished: 10,
    });
    expect(result.rfq.total).toBe(7);
    expect(result.rfq.new).toBe(5);
    expect(result.rfq.won).toBe(2);
    expect(result.rfq.stale).toBe(3);
    expect(result.rfq.createdLast7d).toBe(6);
  });

  it('handles empty marketplace (all zeros)', async () => {
    const result = await service.getMarketplaceStats();

    expect(result.sellers.total).toBe(0);
    expect(result.catalog.productsPublished).toBe(0);
    expect(result.rfq.total).toBe(0);
    expect(result.rfq.stale).toBe(0);
  });
});
