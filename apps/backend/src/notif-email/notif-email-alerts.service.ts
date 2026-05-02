// MP-NOTIF-3 phase 8 — Service d'alertes automatiques sur le taux d'erreur
// emails transactionnels.
//
// Cron horaire : si le taux d'echecs sur la derniere heure depasse 20 %,
// un audit log `NOTIF_EMAIL_ERROR_RATE_HIGH` est cree pour visibilite
// dans le dashboard admin.

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EntityType } from '@iox/shared';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class NotifEmailAlertsService {
  private readonly logger = new Logger(NotifEmailAlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async checkErrorRate(): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const [total, failed] = await Promise.all([
      this.prisma.emailLog.count({ where: { createdAt: { gte: oneHourAgo } } }),
      this.prisma.emailLog.count({
        where: { createdAt: { gte: oneHourAgo }, status: 'FAILED' },
      }),
    ]);

    if (total === 0) {
      this.logger.debug('checkErrorRate: no email logs in last hour, skip');
      return;
    }

    const rate = failed / total;
    if (rate > 0.2) {
      this.logger.warn(
        `Email error rate HIGH: ${(rate * 100).toFixed(1)}% (${failed}/${total} in last hour)`,
      );
      await this.auditService.log({
        action: 'NOTIF_EMAIL_ERROR_RATE_HIGH',
        entityType: EntityType.USER,
        entityId: '00000000-0000-0000-0000-000000000000',
        notes: `Error rate ${(rate * 100).toFixed(1)}% — ${failed} failed / ${total} total in last hour`,
      });
    }
  }
}
