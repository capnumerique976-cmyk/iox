import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MetricsInterceptor } from './metrics.interceptor';

/**
 * Module observabilité : service, endpoint /metrics et interceptor global.
 * Marqué @Global() pour que MetricsService soit injectable partout sans
 * réimport explicite (audit, erreurs métier, etc.).
 */
@Global()
@Module({
  controllers: [MetricsController],
  providers: [MetricsService, { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor }],
  exports: [MetricsService],
})
export class MetricsModule {}
