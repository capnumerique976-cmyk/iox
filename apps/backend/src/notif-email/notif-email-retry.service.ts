// MP-NOTIF-3 phase 7 — Service de retry automatique des emails FAILED.
//
// Cron toutes les 30 minutes : requete les EmailLog FAILED eligibles
// (createdAt > 1h, retryCount < 3, errorCode pas UNSUBSCRIBED ni
// RECIPIENT_OPTED_OUT) et retente l'envoi via NotifEmailService.send().
//
// Le retryCount est stocke dans metadataJson (pas de migration Prisma).

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { NotifEmailService } from './notif-email.service';
import type { SendEmailInput } from './notif-email.types';

/** Max retries before giving up on a FAILED log. */
const MAX_RETRY_COUNT = 3;

/** Error codes that should never be retried. */
const NON_RETRYABLE_ERRORS = ['UNSUBSCRIBED', 'RECIPIENT_OPTED_OUT'];

@Injectable()
export class NotifEmailRetryService {
  private readonly logger = new Logger(NotifEmailRetryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifEmailService: NotifEmailService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleRetryFailed(): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Query FAILED logs eligible for retry:
    // - status FAILED
    // - errorCode NOT in non-retryable list
    // - createdAt older than 1 hour (avoid retrying too soon)
    // We filter retryCount in app code since JSON filtering varies by DB.
    const candidates = await this.prisma.emailLog.findMany({
      where: {
        status: 'FAILED',
        errorCode: { notIn: NON_RETRYABLE_ERRORS },
        createdAt: { lte: oneHourAgo },
      },
      orderBy: { createdAt: 'asc' },
      take: 50, // batch cap to avoid long-running jobs
    });

    let retried = 0;
    let skipped = 0;

    for (const log of candidates) {
      try {
        const meta = (log.metadataJson as Record<string, unknown>) ?? {};
        const retryCount = typeof meta.retryCount === 'number' ? meta.retryCount : 0;

        if (retryCount >= MAX_RETRY_COUNT) {
          skipped++;
          continue;
        }

        // Increment retryCount in metadataJson before resending.
        const updatedMeta = { ...meta, retryCount: retryCount + 1 };
        await this.prisma.emailLog.update({
          where: { id: log.id },
          data: { metadataJson: updatedMeta as any },
        });

        const sendInput: SendEmailInput = {
          to: log.recipientEmail,
          subject: log.subject,
          templateId: log.templateId !== 'raw' ? log.templateId : undefined,
          templateData: (meta.data as Record<string, unknown>) ?? {},
          recipientUserId: log.recipientUserId ?? undefined,
          metadata: {
            ...updatedMeta,
            retriedFrom: log.id,
          },
        };

        // If original was raw (no template), provide text fallback.
        if (log.templateId === 'raw') {
          sendInput.text = log.subject;
        }

        const result = await this.notifEmailService.send(sendInput);

        if (result.success) {
          retried++;
          this.logger.log(
            `retry success logId=${log.id} attempt=${retryCount + 1}`,
          );
        } else {
          this.logger.warn(
            `retry failed logId=${log.id} attempt=${retryCount + 1} error=${result.error}`,
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown';
        this.logger.warn(`retry error logId=${log.id} error=${msg}`);
      }
    }

    if (candidates.length > 0) {
      this.logger.log(
        `retry batch done candidates=${candidates.length} retried=${retried} skipped=${skipped}`,
      );
    }
  }
}
