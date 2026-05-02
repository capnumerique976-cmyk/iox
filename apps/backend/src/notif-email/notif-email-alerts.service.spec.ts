// MP-NOTIF-3 phase 8 — Tests du service d'alertes taux d'erreur email.

import { Test, TestingModule } from '@nestjs/testing';
import { NotifEmailAlertsService } from './notif-email-alerts.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';

describe('NotifEmailAlertsService', () => {
  let alertsService: NotifEmailAlertsService;
  let auditService: { log: jest.Mock };
  let prisma: {
    emailLog: {
      count: jest.Mock;
    };
  };

  beforeEach(async () => {
    auditService = { log: jest.fn().mockResolvedValue(undefined) };
    prisma = {
      emailLog: {
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotifEmailAlertsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    alertsService = module.get(NotifEmailAlertsService);
  });

  it('rate below threshold (<=20%) → no audit log', async () => {
    // 10 total, 2 failed = 20% (not >20%)
    prisma.emailLog.count.mockResolvedValueOnce(10).mockResolvedValueOnce(2);

    await alertsService.checkErrorRate();

    expect(auditService.log).not.toHaveBeenCalled();
  });

  it('rate above threshold (>20%) → creates audit log', async () => {
    // 10 total, 5 failed = 50%
    prisma.emailLog.count.mockResolvedValueOnce(10).mockResolvedValueOnce(5);

    await alertsService.checkErrorRate();

    expect(auditService.log).toHaveBeenCalledTimes(1);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'NOTIF_EMAIL_ERROR_RATE_HIGH',
        entityType: 'USER',
        entityId: '00000000-0000-0000-0000-000000000000',
        notes: expect.stringContaining('50.0%'),
      }),
    );
  });

  it('no logs in window → skip (no error, no audit log)', async () => {
    // 0 total, 0 failed
    prisma.emailLog.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);

    await alertsService.checkErrorRate();

    expect(auditService.log).not.toHaveBeenCalled();
  });
});
