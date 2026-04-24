import { Controller, Get, Header, UnauthorizedException, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../common/decorators/roles.decorator';
import { MetricsService } from './metrics.service';

/**
 * GET /api/v1/metrics — export Prometheus.
 *
 * Route publique par défaut (Prometheus scrape stateless), mais protégée par
 * un token optionnel `METRICS_TOKEN` : si la variable est définie, le header
 * `Authorization: Bearer <token>` devient obligatoire.
 *
 * Exclue de Swagger (endpoint opérationnel, pas métier).
 */
@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly metrics: MetricsService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  @Public()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiExcludeEndpoint()
  scrape(@Req() req: Request): string {
    const token = this.config.get<string>('METRICS_TOKEN');
    if (token) {
      const auth = req.header('authorization') ?? '';
      if (auth !== `Bearer ${token}`) {
        throw new UnauthorizedException('Token metrics invalide');
      }
    }
    return this.metrics.render();
  }
}
