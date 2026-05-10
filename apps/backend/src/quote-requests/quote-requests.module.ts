import { Module } from '@nestjs/common';
import { QuoteRequestsService } from './quote-requests.service';
import { QuoteRequestsController } from './quote-requests.controller';
import { RfqExpirationService } from './rfq-expiration.service';
import { RfqReminderService } from './rfq-reminder.service';
import { AuditModule } from '../audit/audit.module';
import { NotifEmailModule } from '../notif-email/notif-email.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [AuditModule, NotifEmailModule, QueueModule],
  providers: [QuoteRequestsService, RfqExpirationService, RfqReminderService],
  controllers: [QuoteRequestsController],
  exports: [QuoteRequestsService],
})
export class QuoteRequestsModule {}
