import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import {
  CreateCompanyDto,
  UpdateCompanyDto,
  UpdateMyCompanyDto,
  QueryCompaniesDto,
} from './dto/company.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, RequestUser } from '@iox/shared';

@ApiTags('companies')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private service: CompaniesService) {}

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.SUPPLY_MANAGER,
    UserRole.BENEFICIARY_MANAGER,
    UserRole.AUDITOR,
    UserRole.FUNDER,
  )
  @ApiOperation({ summary: 'Liste des entreprises partenaires (filtrée, paginée)' })
  findAll(@Query() query: QueryCompaniesDto) {
    return this.service.findAll(query);
  }

  /**
   * BUYER-DASHBOARD-2 — Companies dont l'utilisateur courant est membre.
   * Accessible à tous les rôles authentifiés (chacun voit ses propres
   * companies). Pour un MARKETPLACE_BUYER, c'est sa company acheteuse.
   */
  @Get('mine')
  @ApiOperation({ summary: "Mes entreprises (companies dont l'utilisateur est membre)" })
  findMine(@CurrentUser() user: RequestUser) {
    return this.service.findMine(user.companyIds ?? []);
  }

  /**
   * BUYER-DASHBOARD-3 — Édition self-service par tous les rôles
   * authentifiés (incl. MARKETPLACE_BUYER). Scope intrinsèque par
   * `user.companyIds`. DTO restreint (UpdateMyCompanyDto) — pas de
   * modification de `types` ni `isActive`.
   */
  @Patch('mine/:id')
  @ApiOperation({ summary: "Édition self-service d'une de mes entreprises" })
  updateMine(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMyCompanyDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.updateMine(id, user.companyIds ?? [], user.id, dto);
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.SUPPLY_MANAGER,
    UserRole.BENEFICIARY_MANAGER,
    UserRole.AUDITOR,
  )
  @ApiOperation({ summary: "Fiche complète d'une entreprise" })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.SUPPLY_MANAGER)
  @ApiOperation({ summary: 'Créer une entreprise partenaire' })
  create(@Body() dto: CreateCompanyDto, @CurrentUser() actor: RequestUser) {
    return this.service.create(dto, actor.id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.SUPPLY_MANAGER)
  @ApiOperation({ summary: 'Modifier une entreprise' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Désactiver une entreprise (soft-deactivate)' })
  deactivate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: RequestUser) {
    return this.service.deactivate(id, actor.id);
  }
}
