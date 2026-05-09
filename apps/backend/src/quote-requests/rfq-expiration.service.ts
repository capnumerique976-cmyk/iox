// RfqExpirationService — auto-cancels stale quote requests.
//
// Runs every day at midnight. Finds all RFQs in NEW or QUALIFIED state that
// have not been updated for more than EXPIRATION_DAYS days, cancels them in
// bulk, and writes one audit log entry per cancellation.
//
// Design notes:
//   - updateMany cancels all at once (single DB round-trip).
//   - Audit logs are created in parallel but never block the cron itself
//     (AuditService.log() already swallows its own errors).
//   - No FSM assertion: direct status override is intentional for the system
//     actor path — the FSM is for human-initiated transitions.

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EntityType, QuoteRequestStatus } from '@iox/shared';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';

const EXPIRATION_DAYS = 14;

@Injectable()
export class RfqExpirationService {
  private readonly logger = new Logger(RfqExpirationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cancelExpiredRfqs(): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - EXPIRATION_DAYS);

    const expired = await this.prisma.quoteRequest.findMany({
      where: {
        status: { in: [QuoteRequestStatus.NEW, QuoteRequestStatus.QUALIFIED] },
        updatedAt: { lt: cutoff },
      },
      select: { id: true, status: true },
    });

    if (expired.length === 0) {
      this.logger.debug('RfqExpirationService: no expired RFQs found');
      return;
    }

    this.logger.log(
      `RfqExpirationService: cancelling ${expired.length} expired RFQ(s) ` +
        `(no activity for >${EXPIRATION_DAYS} days)`,
    );

    await this.prisma.quoteRequest.updateMany({
      where: { id: { in: expired.map((r) => r.id) } },
      data: { status: QuoteRequestStatus.CANCELLED },
    });

    // Audit each cancellation in parallel — AuditService.log() never throws.
    await Promise.all(
      expired.map((rfq) =>
        this.audit.log({
          action: 'QUOTE_REQUEST_EXPIRED',
          entityType: EntityType.QUOTE_REQUEST,
          entityId: rfq.id,
          previousData: { status: rfq.status },
          newData: { status: QuoteRequestStatus.CANCELLED },
          notes: `Auto-cancelled: no activity for more than ${EXPIRATION_DAYS} days.`,
        }),
      ),
    );

    this.logger.log(
      `RfqExpirationService: ${expired.length} RFQ(s) cancelled and audited`,
    );
  }
}
