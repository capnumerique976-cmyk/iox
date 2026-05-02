// MP-NOTIF-3 — Controller admin pour consulter les `email_logs`.
//
// Lecture seule, restreint aux rôles ADMIN/COORDINATOR. Pas d'endpoint
// pour resend/retry ni pour purger : audit trail immuable.

import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
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

  // MP-NOTIF-3 phase 6 — Export CSV des EmailLogs (admin).
  // Déclaré AVANT `logs/:id` pour éviter shadow par ParseUUIDPipe.
  @Get('logs-export.csv')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="email-logs.csv"')
  @ApiOperation({ summary: 'Export CSV des EmailLogs (filtres identiques à /logs, cap 10000)' })
  async exportLogsCsv(@Query() query: ListEmailLogsQueryDto, @Res() res: Response) {
    const csv = await this.service.exportLogsCsv(query);
    res.send(csv);
  }

  // MP-NOTIF-3 phase 5 — Stats agrégées EmailLog (admin).
  // Déclaré AVANT `logs/:id` pour éviter shadow par ParseUUIDPipe sur 'logs-stats'.
  @Get('logs-stats')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @ApiOperation({
    summary: 'Stats agrégées EmailLog (count par status / top templates / 30 jours)',
  })
  getLogsStats() {
    return this.service.getLogsStats();
  }

  @Get('logs/:id')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @ApiOperation({ summary: "Détail d'un EmailLog par id (vue admin)" })
  getLogById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getLogById(id);
  }

  // MP-NOTIF-3 phase 7 — Replay un email FAILED (admin only).
  @Post('logs/:id/replay')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Replay un EmailLog FAILED (admin only)' })
  replayLog(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.replayFailedLog(id, req.user);
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
