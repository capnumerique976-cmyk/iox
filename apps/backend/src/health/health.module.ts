import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { OpsMetricsService } from './ops-metrics.service';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [OpsMetricsService],
})
export class HealthModule {}
