// MP-NOTIF-3 — Controller admin pour consulter les `email_logs`.
//
// Lecture seule, restreint aux rôles ADMIN/COORDINATOR. Pas d'endpoint
// pour resend/retry ni pour purger : audit trail immuable.

import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@iox/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { NotifEmailService } from './notif-email.service';
import { UnsubscribeService } from './unsubscribe.service';
import { ListEmailLogsQueryDto } from './dto/list-logs.dto';
import { ListUnsubscribesQueryDto } from './dto/list-unsubscribes.dto';

@ApiTags('notif-email')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notif-email')
export class NotifEmailController {
  constructor(
    private readonly service: NotifEmailService,
    private readonly unsubscribe: UnsubscribeService,
  ) {}

  @Get('logs')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @ApiOperation({
    summary: 'Liste paginée + filtrée des emails transactionnels (audit trail)',
  })
  listLogs(@Query() query: ListEmailLogsQueryDto) {
    return this.service.listLogs(query);
  }

  @Get('logs/:id')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @ApiOperation({ summary: "Détail d'un EmailLog par id (vue admin)" })
  getLogById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getLogById(id);
  }

  // MP-NOTIF-3 phase 4 — Admin EmailUnsubscribe.
  @Get('unsubscribes')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @ApiOperation({
    summary: 'Liste paginée + filtrée des désinscriptions email (audit trail)',
  })
  listUnsubscribes(@Query() query: ListUnsubscribesQueryDto) {
    return this.unsubscribe.listUnsubscribes(query);
  }
}
