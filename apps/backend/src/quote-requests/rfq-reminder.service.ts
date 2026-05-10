// RfqReminderService — sends reminders for QUOTED RFQs stale > 7 days.
//
// Runs every day at midnight. Finds all RFQs in QUOTED state that have not
// been updated for more than REMINDER_DAYS days, and sends a reminder email
// to the buyer with an audit log entry per reminder.

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EntityType, QuoteRequestStatus } from '@iox/shared';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EmailQueueService } from '../queue/services/email-queue.service';

@Injectable()
export class RfqReminderService {
  private readonly logger = new Logger(RfqReminderService.name);
  private readonly REMINDER_DAYS = 7;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailQueue: EmailQueueService,
    private readonly audit: AuditService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async sendQuotedReminders(): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.REMINDER_DAYS);

    const rfqs = await this.prisma.quoteRequest.findMany({
      where: {
        status: QuoteRequestStatus.QUOTED,
        updatedAt: { lt: cutoff },
      },
      select: {
        id: true,
        buyerUserId: true,
        status: true,
        buyerUser: {
          select: { email: true, firstName: true, lastName: true, preferredLocale: true },
        },
        marketplaceOffer: {
          select: {
            title: true,
            sellerProfile: {
              select: { publicDisplayName: true },
            },
          },
        },
      },
    });

    if (rfqs.length === 0) return;

    this.logger.log(
      `RfqReminderService: ${rfqs.length} RFQ(s) QUOTED > ${this.REMINDER_DAYS}j — envoi relances`,
    );

    await Promise.all(
      rfqs.map(async (rfq) => {
        try {
          const buyerDisplayName =
            [rfq.buyerUser.firstName, rfq.buyerUser.lastName].filter(Boolean).join(' ') ||
            rfq.buyerUser.email;
          const sellerDisplayName =
            rfq.marketplaceOffer.sellerProfile?.publicDisplayName ?? 'IOX Marketplace';
          const locale = rfq.buyerUser.preferredLocale ?? 'fr';
          const ctaUrl = `${process.env['APP_URL'] ?? 'https://iox.example'}/buyer/quote-requests/${rfq.id}`;

          await this.emailQueue.enqueue({
            templateId: 'rfq-reminder',
            to: rfq.buyerUser.email,
            locale,
            templateData: {
              recipientDisplayName: buyerDisplayName,
              senderDisplayName: sellerDisplayName,
              offerTitle: rfq.marketplaceOffer.title,
              note: null,
              ctaUrl,
            },
          });
          await this.audit.log({
            action: 'QUOTE_REQUEST_REMINDER_SENT',
            entityType: EntityType.QUOTE_REQUEST,
            entityId: rfq.id,
            notes: `Relance automatique : devis QUOTED depuis plus de ${this.REMINDER_DAYS} jours.`,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'unknown';
          this.logger.warn(
            `RfqReminderService: relance échouée rfqId=${rfq.id} err=${msg}`,
          );
        }
      }),
    );
  }
}
