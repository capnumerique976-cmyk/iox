import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { TraceabilityService } from './traceability.service';
import { AuditService } from '../audit/audit.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@iox/shared';
import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { EntityType } from '@iox/shared';

class QueryAuditLogsDto {
  @IsOptional()
  @IsEnum(EntityType)
  entityType?: EntityType;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

@Controller('traceability')
export class TraceabilityController {
  constructor(
    private readonly traceabilityService: TraceabilityService,
    private readonly auditService: AuditService,
  ) {}

  /** Timeline chronologique complète d'un lot fini */
  @Get('batch/:batchId/timeline')
  getTimeline(@Param('batchId', ParseUUIDPipe) batchId: string) {
    return this.traceabilityService.getTimeline(batchId);
  }

  /** Chaîne de traçabilité : lot entrant → transformation → lot fini → décisions */
  @Get('batch/:batchId/chain')
  getChain(@Param('batchId', ParseUUIDPipe) batchId: string) {
    return this.traceabilityService.getChain(batchId);
  }

  /** Journal d'audit global (ADMIN / COORDINATOR / AUDITOR seulement) */
  @Get('audit-logs')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.AUDITOR)
  getAuditLogs(@Query() query: QueryAuditLogsDto) {
    return this.auditService.findAll({
      ...query,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
  }
}
