// Spec — RfqExpirationService (Mandat 54)
//
// Verifies the daily cron:
//   - no-op when no expired RFQs exist
//   - cancels expired RFQs in bulk + writes one audit log per cancellation
//   - doesn't throw when findMany returns an empty list

import { Test } from '@nestjs/testing';
import { QuoteRequestStatus, EntityType } from '@iox/shared';
import { RfqExpirationService } from './rfq-expiration.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';

describe('RfqExpirationService', () => {
  let service: RfqExpirationService;
  let prisma: { quoteRequest: { findMany: jest.Mock; updateMany: jest.Mock } };
  let audit: { log: jest.Mock };

  beforeEach(async () => {
    prisma = {
      quoteRequest: {
        findMany: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module = await Test.createTestingModule({
      providers: [
        RfqExpirationService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(RfqExpirationService);
  });

  it('does nothing when no expired RFQs exist', async () => {
    prisma.quoteRequest.findMany.mockResolvedValue([]);

    await service.cancelExpiredRfqs();

    expect(prisma.quoteRequest.updateMany).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('cancels expired RFQs in bulk and audits each one', async () => {
    const expired = [
      { id: 'rfq-1', status: QuoteRequestStatus.NEW },
      { id: 'rfq-2', status: QuoteRequestStatus.QUALIFIED },
    ];
    prisma.quoteRequest.findMany.mockResolvedValue(expired);

    await service.cancelExpiredRfqs();

    expect(prisma.quoteRequest.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['rfq-1', 'rfq-2'] } },
      data: { status: QuoteRequestStatus.CANCELLED },
    });

    expect(audit.log).toHaveBeenCalledTimes(2);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'QUOTE_REQUEST_EXPIRED',
        entityType: EntityType.QUOTE_REQUEST,
        entityId: 'rfq-1',
        previousData: { status: QuoteRequestStatus.NEW },
        newData: { status: QuoteRequestStatus.CANCELLED },
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'QUOTE_REQUEST_EXPIRED',
        entityType: EntityType.QUOTE_REQUEST,
        entityId: 'rfq-2',
        previousData: { status: QuoteRequestStatus.QUALIFIED },
        newData: { status: QuoteRequestStatus.CANCELLED },
      }),
    );
  });

  it('queries only NEW and QUALIFIED statuses with an updatedAt cutoff', async () => {
    prisma.quoteRequest.findMany.mockResolvedValue([]);
    const before = new Date();

    await service.cancelExpiredRfqs();

    const [callArg] = prisma.quoteRequest.findMany.mock.calls[0] as [
      { where: { status: { in: QuoteRequestStatus[] }; updatedAt: { lt: Date } } },
    ];
    expect(callArg.where.status.in).toEqual([
      QuoteRequestStatus.NEW,
      QuoteRequestStatus.QUALIFIED,
    ]);
    // cutoff should be ~14 days ago
    const cutoff: Date = callArg.where.updatedAt.lt;
    const diffMs = before.getTime() - cutoff.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(14, 0);
  });
});
