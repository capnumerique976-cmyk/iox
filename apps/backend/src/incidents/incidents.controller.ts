import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IncidentsService } from './incidents.service';
import { CreateIncidentDto, UpdateIncidentDto, ChangeIncidentStatusDto } from './dto/incident.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@iox/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

const READ_ROLES = [
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.AUDITOR,
  UserRole.QUALITY_MANAGER,
  UserRole.SUPPLY_MANAGER,
  UserRole.LOGISTICS_MANAGER,
  UserRole.MARKET_VALIDATOR,
];

const WRITE_ROLES = [
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.QUALITY_MANAGER,
  UserRole.SUPPLY_MANAGER,
];

// Défense en profondeur: @UseGuards au niveau classe — incidents sensibles
// (chaque route a aussi son propre @Roles, le guard classe est un filet de sécurité)
@ApiTags('incidents')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  /* ---------------------------------------------------------------- */
  /*  Statistiques                                                     */
  /* ---------------------------------------------------------------- */

  @Get('stats')
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'Statistiques des incidents (compteurs par statut/sévérité)' })
  getStats() {
    return this.incidentsService.getStats();
  }

  /* ---------------------------------------------------------------- */
  /*  Liste                                                            */
  /* ---------------------------------------------------------------- */

  @Get()
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'Liste des incidents (filtres, pagination)' })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('entityType') entityType?: string,
  ) {
    return this.incidentsService.findAll({
      page,
      limit,
      search,
      status,
      severity,
      linkedEntityType: entityType,
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Détail                                                           */
  /* ---------------------------------------------------------------- */

  @Get(':id')
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'Détail d\'un incident par id' })
  findOne(@Param('id') id: string) {
    return this.incidentsService.findOne(id);
  }

  /* ---------------------------------------------------------------- */
  /*  Création                                                         */
  /* ---------------------------------------------------------------- */

  @Post()
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Créer un incident' })
  create(@Body() dto: CreateIncidentDto, @Request() req: any) {
    return this.incidentsService.create(dto, req.user.id);
  }

  /* ---------------------------------------------------------------- */
  /*  Mise à jour                                                      */
  /* ---------------------------------------------------------------- */

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Modifier un incident' })
  update(@Param('id') id: string, @Body() dto: UpdateIncidentDto, @Request() req: any) {
    return this.incidentsService.update(id, dto, req.user.id);
  }

  /* ---------------------------------------------------------------- */
  /*  Changement de statut                                             */
  /* ---------------------------------------------------------------- */

  @Patch(':id/status')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Changer le statut d\'un incident' })
  changeStatus(@Param('id') id: string, @Body() dto: ChangeIncidentStatusDto, @Request() req: any) {
    return this.incidentsService.changeStatus(id, dto, req.user.id);
  }

  /* ---------------------------------------------------------------- */
  /*  Suppression                                                      */
  /* ---------------------------------------------------------------- */

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Supprimer un incident (admin uniquement)' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.incidentsService.remove(id, req.user.id);
  }
}
