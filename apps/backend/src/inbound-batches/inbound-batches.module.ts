import { Module } from '@nestjs/common';
import { InboundBatchesService } from './inbound-batches.service';
import { InboundBatchesController } from './inbound-batches.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [InboundBatchesService],
  controllers: [InboundBatchesController],
  exports: [InboundBatchesService],
})
export class InboundBatchesModule {}
