import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser, UserRole } from '@iox/shared';
import { MembershipsService } from './memberships.service';
import { CreateMembershipDto, QueryMembershipsDto } from './dto/membership.dto';

/**
 * Endpoints admin pour la gestion des rattachements User ↔ Company.
 *
 * Accès : ADMIN et COORDINATOR uniquement (le coordinateur ADAAM gère
 * l'onboarding seller côté ops). Aucun endpoint ne permet à un user
 * non-admin de créer un membership : la protection est double (RolesGuard
 * controller-level + test de régression dans `memberships.service.spec.ts`).
 */
@ApiTags('admin-memberships')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.COORDINATOR)
@Controller('admin/memberships')
export class MembershipsController {
  constructor(private service: MembershipsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste paginée des rattachements' })
  findAll(@Query() query: QueryMembershipsDto) {
    return this.service.findAll(query);
  }

  @Get('diagnostic')
  @ApiOperation({ summary: 'Statistiques ownership V2' })
  diagnostic() {
    return this.service.diagnostic();
  }

  @Get('orphan-sellers')
  @ApiOperation({
    summary: 'Users MARKETPLACE_SELLER sans aucun membership (à rattacher)',
  })
  orphanSellers() {
    return this.service.findOrphanSellers();
  }

  @Get('orphan-memberships')
  @ApiOperation({
    summary:
      'Memberships vers une Company sans SellerProfile (rattachements sans effet marketplace)',
  })
  orphanMemberships() {
    return this.service.findOrphanMemberships();
  }

  @Post()
  @ApiOperation({ summary: 'Créer un rattachement User ↔ Company' })
  create(@Body() dto: CreateMembershipDto, @CurrentUser() actor: RequestUser) {
    return this.service.create(dto, actor.id);
  }

  @Patch(':id/primary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marquer un rattachement comme primary' })
  setPrimary(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: RequestUser) {
    return this.service.setPrimary(id, actor.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Supprimer un rattachement (auto-promote primary si besoin)' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: RequestUser) {
    return this.service.delete(id, actor.id);
  }
}
