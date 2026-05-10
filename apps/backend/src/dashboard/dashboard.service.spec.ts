import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../database/prisma.service';
import { UserRole, RequestUser } from '@iox/shared';

describe('DashboardService — getMarketplaceStats', () => {
  let service: DashboardService;
  let prisma: Record<string, any>;

  beforeEach(async () => {
    prisma = {
      sellerProfile: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      marketplaceProduct: { count: jest.fn().mockResolvedValue(0) },
      marketplaceOffer: { count: jest.fn().mockResolvedValue(0) },
      quoteRequest: {
        groupBy: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      payment: { findMany: jest.fn().mockResolvedValue([]) },
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

describe('DashboardService — getMarketplaceAlerts', () => {
  let service: DashboardService;
  let prisma: Record<string, any>;

  function makeSellerActor(overrides: Partial<RequestUser> = {}): RequestUser {
    return {
      id: 'user-seller-1',
      email: 'seller@test.yt',
      role: UserRole.MARKETPLACE_SELLER,
      sellerProfileIds: ['sp-1'],
      companyIds: ['comp-1'],
      preferredLocale: 'fr',
      ...overrides,
    };
  }

  function makeBuyerActor(overrides: Partial<RequestUser> = {}): RequestUser {
    return {
      id: 'user-buyer-1',
      email: 'buyer@test.yt',
      role: UserRole.MARKETPLACE_BUYER,
      sellerProfileIds: [],
      companyIds: ['comp-2'],
      preferredLocale: 'fr',
      ...overrides,
    };
  }

  beforeEach(async () => {
    prisma = {
      sellerProfile: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      marketplaceProduct: { count: jest.fn().mockResolvedValue(0) },
      marketplaceOffer: { count: jest.fn().mockResolvedValue(0) },
      quoteRequest: {
        groupBy: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      quoteRequestMessage: { count: jest.fn().mockResolvedValue(0) },
      payment: { findMany: jest.fn().mockResolvedValue([]) },
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

  it('seller view: returns newRfqs=2, pendingActions=1, total=3', async () => {
    prisma.quoteRequest.count
      .mockResolvedValueOnce(2)  // newRfqs
      .mockResolvedValueOnce(1); // pendingActions

    const result = await service.getMarketplaceAlerts(makeSellerActor());

    expect(result.newRfqs).toBe(2);
    expect(result.pendingActions).toBe(1);
    expect(result.newQuotes).toBe(0);
    expect(result.pendingPayment).toBe(0);
    expect(result.total).toBe(3);
  });

  it('buyer view: returns newQuotes=1, pendingPayment=2, total=3', async () => {
    prisma.quoteRequest.count
      .mockResolvedValueOnce(1)  // newQuotes
      .mockResolvedValueOnce(2); // wonRfqs
    prisma.payment.findMany.mockResolvedValue([]); // no paid rfqs

    const result = await service.getMarketplaceAlerts(makeBuyerActor());

    expect(result.newQuotes).toBe(1);
    expect(result.pendingPayment).toBe(2);
    expect(result.newRfqs).toBe(0);
    expect(result.pendingActions).toBe(0);
    expect(result.total).toBe(3);
  });

  it('M58 — seller view: newMessages=2 counted from others, included in total', async () => {
    prisma.quoteRequest.count
      .mockResolvedValueOnce(1)  // newRfqs
      .mockResolvedValueOnce(0); // pendingActions
    prisma.quoteRequestMessage.count.mockResolvedValueOnce(2); // newMessages

    const result = await service.getMarketplaceAlerts(makeSellerActor());

    expect(result.newMessages).toBe(2);
    expect(result.total).toBe(3); // 1 + 0 + 2
  });

  it('M58 — buyer view: newMessages=1 counted from others, included in total', async () => {
    prisma.quoteRequest.count
      .mockResolvedValueOnce(0)  // newQuotes
      .mockResolvedValueOnce(0); // wonRfqs
    prisma.payment.findMany.mockResolvedValue([]);
    prisma.quoteRequestMessage.count.mockResolvedValueOnce(1); // newMessages

    const result = await service.getMarketplaceAlerts(makeBuyerActor());

    expect(result.newMessages).toBe(1);
    expect(result.total).toBe(1);
  });

  it('M58 — seller sans sellerProfileId → newMessages=0', async () => {
    const result = await service.getMarketplaceAlerts(makeSellerActor({ sellerProfileIds: [] }));
    expect(result.newMessages).toBe(0);
    expect(result.total).toBe(0);
  });
});
