// Spec — RfqReminderService (Mandat 55B)
//
// Verifies the daily cron:
//   - no-op when no QUOTED RFQ > 7 days exist
//   - sends email + audit for each QUOTED RFQ > 7 days

import { Test } from '@nestjs/testing';
import { QuoteRequestStatus, EntityType } from '@iox/shared';
import { RfqReminderService } from './rfq-reminder.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EmailQueueService } from '../queue/services/email-queue.service';

describe('RfqReminderService', () => {
  let service: RfqReminderService;
  let prisma: { quoteRequest: { findMany: jest.Mock } };
  let audit: { log: jest.Mock };
  let emailQueue: { enqueue: jest.Mock };

  beforeEach(async () => {
    prisma = {
      quoteRequest: {
        findMany: jest.fn(),
      },
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    emailQueue = { enqueue: jest.fn().mockResolvedValue(undefined) };

    const module = await Test.createTestingModule({
      providers: [
        RfqReminderService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
        { provide: EmailQueueService, useValue: emailQueue },
      ],
    }).compile();

    service = module.get(RfqReminderService);
  });

  it('does nothing when no QUOTED RFQ > 7j', async () => {
    prisma.quoteRequest.findMany.mockResolvedValue([]);

    await service.sendQuotedReminders();

    expect(emailQueue.enqueue).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('sends email + audit for each QUOTED RFQ > 7j', async () => {
    const rfqs = [
      {
        id: 'rfq-1',
        buyerUserId: 'user-1',
        status: QuoteRequestStatus.QUOTED,
        buyerUser: { email: 'buyer1@test.yt', firstName: 'Alice', lastName: 'Buyer', preferredLocale: 'fr' },
        marketplaceOffer: { title: 'Vanille Bourbon', sellerProfile: { publicDisplayName: 'Coop Test' } },
      },
      {
        id: 'rfq-2',
        buyerUserId: 'user-2',
        status: QuoteRequestStatus.QUOTED,
        buyerUser: { email: 'buyer2@test.yt', firstName: 'Bob', lastName: null, preferredLocale: 'en' },
        marketplaceOffer: { title: 'Cacao Bio', sellerProfile: { publicDisplayName: 'Farm EN' } },
      },
    ];
    prisma.quoteRequest.findMany.mockResolvedValue(rfqs);

    await service.sendQuotedReminders();

    expect(emailQueue.enqueue).toHaveBeenCalledTimes(2);
    expect(emailQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: 'rfq-reminder',
        to: 'buyer1@test.yt',
      }),
    );
    expect(emailQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: 'rfq-reminder',
        to: 'buyer2@test.yt',
      }),
    );

    expect(audit.log).toHaveBeenCalledTimes(2);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'QUOTE_REQUEST_REMINDER_SENT',
        entityType: EntityType.QUOTE_REQUEST,
        entityId: 'rfq-1',
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'QUOTE_REQUEST_REMINDER_SENT',
        entityType: EntityType.QUOTE_REQUEST,
        entityId: 'rfq-2',
      }),
    );
  });

  it('enqueue contient templateData enrichi avec offerTitle et senderDisplayName', async () => {
    const rfqs = [
      {
        id: 'rfq-1',
        buyerUserId: 'user-1',
        status: QuoteRequestStatus.QUOTED,
        buyerUser: { email: 'buyer@test.com', firstName: 'Alice', lastName: 'Buyer', preferredLocale: 'fr' },
        marketplaceOffer: { title: 'Vanille Bourbon', sellerProfile: { publicDisplayName: 'Coop Test' } },
      },
    ];
    prisma.quoteRequest.findMany.mockResolvedValue(rfqs);

    await service.sendQuotedReminders();

    expect(emailQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        templateData: expect.objectContaining({
          offerTitle: 'Vanille Bourbon',
          senderDisplayName: 'Coop Test',
        }),
      }),
    );
  });

  it('queries only QUOTED status with an updatedAt cutoff of 7 days', async () => {
    prisma.quoteRequest.findMany.mockResolvedValue([]);
    const before = new Date();

    await service.sendQuotedReminders();

    const [callArg] = prisma.quoteRequest.findMany.mock.calls[0] as [
      { where: { status: QuoteRequestStatus; updatedAt: { lt: Date } } },
    ];
    expect(callArg.where.status).toBe(QuoteRequestStatus.QUOTED);
    const cutoff: Date = callArg.where.updatedAt.lt;
    const diffMs = before.getTime() - cutoff.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(7, 0);
  });
});
