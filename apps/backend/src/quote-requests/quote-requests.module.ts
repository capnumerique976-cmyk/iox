import { Module } from '@nestjs/common';
import { QuoteRequestsService } from './quote-requests.service';
import { QuoteRequestsController } from './quote-requests.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [QuoteRequestsService],
  controllers: [QuoteRequestsController],
  exports: [QuoteRequestsService],
})
export class QuoteRequestsModule {}
