import { Module } from '@nestjs/common';
import { TraceabilityService } from './traceability.service';
import { TraceabilityController } from './traceability.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [TraceabilityService],
  controllers: [TraceabilityController],
  exports: [TraceabilityService],
})
export class TraceabilityModule {}
