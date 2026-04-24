import { Module } from '@nestjs/common';
import { MarketReleaseDecisionsService } from './market-release-decisions.service';
import { MarketReleaseDecisionsController } from './market-release-decisions.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [MarketReleaseDecisionsService],
  controllers: [MarketReleaseDecisionsController],
  exports: [MarketReleaseDecisionsService],
})
export class MarketReleaseDecisionsModule {}
