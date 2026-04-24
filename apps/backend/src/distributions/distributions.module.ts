import { Module } from '@nestjs/common';
import { DistributionsController } from './distributions.controller';
import { DistributionsService } from './distributions.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [DistributionsController],
  providers: [DistributionsService],
  exports: [DistributionsService],
})
export class DistributionsModule {}
