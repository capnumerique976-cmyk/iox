import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@iox/shared';

@ApiTags('audit')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.AUDITOR, UserRole.COORDINATOR)
  @ApiOperation({ summary: "Journal d'audit — consultation des actions sensibles" })
  findAll(@Query() query: QueryAuditLogsDto) {
    return this.auditService.findAll({
      page: query.page,
      limit: query.limit,
      entityType: query.entityType,
      entityId: query.entityId,
      userId: query.userId,
      action: query.action,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
  }
}
