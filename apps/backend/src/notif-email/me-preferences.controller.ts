// BUYER-DASHBOARD-4 — Préférences notifications du user connecté.
//
// L'endpoint public `/unsubscribe?token=...` reste pour les liens
// email signés (one-click). Ces endpoints `me/preferences/*` sont
// pour la page `/buyer/preferences` où le user authentifié gère ses
// opt-in/opt-out granulaires.
//
// L'email cible est tiré du JWT (`user.email`), pas d'un paramètre.

import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EmailUnsubscribeType } from '@iox/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UnsubscribeService } from './unsubscribe.service';
import { ToggleMyPreferenceDto } from './dto/toggle-my-preference.dto';
import type { RequestUser } from '@iox/shared';

@ApiTags('notif-email')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notif-email/me/preferences')
export class NotifEmailMePreferencesController {
  constructor(private readonly unsubscribe: UnsubscribeService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des opt-out actifs pour mon email (user connecté)' })
  list(@CurrentUser() user: RequestUser) {
    return this.unsubscribe.listForEmail(user.email);
  }

  @Post()
  @ApiOperation({ summary: 'Désinscrire mon email pour un type donné' })
  add(@Body() dto: ToggleMyPreferenceDto, @CurrentUser() user: RequestUser) {
    return this.unsubscribe.register(user.email, dto.type, user.id, 'self-service');
  }

  @Delete(':type')
  @ApiOperation({ summary: "Réinscrire mon email pour un type (supprime l'opt-out)" })
  remove(
    @Param('type') type: EmailUnsubscribeType,
    @CurrentUser() user: RequestUser,
  ) {
    return this.unsubscribe.deleteForEmail(user.email, type, user.id);
  }
}
