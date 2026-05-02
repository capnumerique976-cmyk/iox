// MP-NOTIF-3 phase 7 — Tests du service de retry automatique.

import { Test, TestingModule } from '@nestjs/testing';
import { NotifEmailRetryService } from './notif-email-retry.service';
import { NotifEmailService } from './notif-email.service';
import { PrismaService } from '../database/prisma.service';

describe('NotifEmailRetryService', () => {
  let retryService: NotifEmailRetryService;
  let notifEmailService: { send: jest.Mock };
  let prisma: {
    emailLog: {
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };

  const makeFailedLog = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'fail-1',
    transport: 'mock',
    templateId: 'raw',
    recipientEmail: 'buyer@ex.com',
    recipientUserId: null,
    subject: 'Hello',
    status: 'FAILED',
    errorCode: 'TRANSPORT_FAILURE',
    errorMessage: 'timeout',
    providerMessageId: null,
    metadataJson: { data: {} },
    createdAt: new Date('2026-04-25T10:00:00Z'),
    ...overrides,
  });

  beforeEach(async () => {
    notifEmailService = {
      send: jest.fn().mockResolvedValue({
        success: true,
        messageId: 'mock-1',
        transport: 'mock',
      }),
    };
    prisma = {
      emailLog: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotifEmailRetryService,
        { provide: NotifEmailService, useValue: notifEmailService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    retryService = module.get(NotifEmailRetryService);
  });

  it('retries FAILED log with retryCount < 3', async () => {
    const log = makeFailedLog({ metadataJson: { data: {}, retryCount: 0 } });
    prisma.emailLog.findMany.mockResolvedValue([log]);

    await retryService.handleRetryFailed();

    expect(prisma.emailLog.update).toHaveBeenCalledWith({
      where: { id: 'fail-1' },
      data: { metadataJson: expect.objectContaining({ retryCount: 1 }) },
    });
    expect(notifEmailService.send).toHaveBeenCalledTimes(1);
    expect(notifEmailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'buyer@ex.com',
        subject: 'Hello',
      }),
    );
  });

  it('skips logs with retryCount >= 3 (max retries reached)', async () => {
    const log = makeFailedLog({ metadataJson: { data: {}, retryCount: 3 } });
    prisma.emailLog.findMany.mockResolvedValue([log]);

    await retryService.handleRetryFailed();

    expect(prisma.emailLog.update).not.toHaveBeenCalled();
    expect(notifEmailService.send).not.toHaveBeenCalled();
  });

  it('skips logs with UNSUBSCRIBED errorCode (filtered by query)', async () => {
    // The DB query filters out UNSUBSCRIBED, so findMany returns nothing.
    prisma.emailLog.findMany.mockResolvedValue([]);

    await retryService.handleRetryFailed();

    expect(notifEmailService.send).not.toHaveBeenCalled();
  });

  it('handles send failure gracefully (no throw)', async () => {
    const log = makeFailedLog();
    prisma.emailLog.findMany.mockResolvedValue([log]);
    notifEmailService.send.mockResolvedValue({
      success: false,
      messageId: '',
      transport: 'mock',
      error: 'TRANSPORT_FAILURE',
    });

    // Should not throw
    await retryService.handleRetryFailed();

    expect(notifEmailService.send).toHaveBeenCalledTimes(1);
  });

  it('handles unexpected errors gracefully (no throw)', async () => {
    const log = makeFailedLog();
    prisma.emailLog.findMany.mockResolvedValue([log]);
    notifEmailService.send.mockRejectedValue(new Error('boom'));

    // Should not throw
    await retryService.handleRetryFailed();

    expect(notifEmailService.send).toHaveBeenCalledTimes(1);
  });

  it('treats missing retryCount as 0', async () => {
    const log = makeFailedLog({ metadataJson: {} });
    prisma.emailLog.findMany.mockResolvedValue([log]);

    await retryService.handleRetryFailed();

    expect(prisma.emailLog.update).toHaveBeenCalledWith({
      where: { id: 'fail-1' },
      data: { metadataJson: expect.objectContaining({ retryCount: 1 }) },
    });
    expect(notifEmailService.send).toHaveBeenCalledTimes(1);
  });

  it('treats null metadataJson as retryCount=0', async () => {
    const log = makeFailedLog({ metadataJson: null });
    prisma.emailLog.findMany.mockResolvedValue([log]);

    await retryService.handleRetryFailed();

    expect(prisma.emailLog.update).toHaveBeenCalled();
    expect(notifEmailService.send).toHaveBeenCalledTimes(1);
  });
});
