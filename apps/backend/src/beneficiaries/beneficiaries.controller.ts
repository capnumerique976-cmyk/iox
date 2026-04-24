import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BeneficiariesService } from './beneficiaries.service';
import {
  CreateBeneficiaryDto,
  UpdateBeneficiaryDto,
  ChangeBeneficiaryStatusDto,
  UpsertDiagnosticDto,
  CreateActionDto,
  UpdateActionDto,
  QueryBeneficiariesDto,
} from './dto/beneficiary.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, RequestUser } from '@iox/shared';

@ApiTags('beneficiaries')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('beneficiaries')
export class BeneficiariesController {
  constructor(private service: BeneficiariesService) {}

  // ─── BÉNÉFICIAIRES ─────────────────────────────────────────────────────────

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.BENEFICIARY_MANAGER,
    UserRole.AUDITOR,
    UserRole.FUNDER,
  )
  @ApiOperation({ summary: 'Liste des bénéficiaires (filtrée, paginée)' })
  findAll(@Query() query: QueryBeneficiariesDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.BENEFICIARY_MANAGER, UserRole.AUDITOR)
  @ApiOperation({ summary: "Fiche complète d'un bénéficiaire" })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.BENEFICIARY_MANAGER)
  @ApiOperation({ summary: 'Créer un bénéficiaire' })
  create(@Body() dto: CreateBeneficiaryDto, @CurrentUser() actor: RequestUser) {
    return this.service.create(dto, actor.id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.BENEFICIARY_MANAGER)
  @ApiOperation({ summary: 'Modifier un bénéficiaire' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBeneficiaryDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.BENEFICIARY_MANAGER)
  @ApiOperation({ summary: "Changer le statut d'un bénéficiaire (transitions validées)" })
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeBeneficiaryStatusDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.changeStatus(id, dto, actor.id);
  }

  // ─── DIAGNOSTIC ────────────────────────────────────────────────────────────

  @Post(':id/diagnostic')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.BENEFICIARY_MANAGER)
  @ApiOperation({ summary: 'Créer ou mettre à jour le diagnostic initial' })
  upsertDiagnostic(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertDiagnosticDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.upsertDiagnostic(id, dto, actor.id);
  }

  // ─── ACTIONS D'ACCOMPAGNEMENT ──────────────────────────────────────────────

  @Get(':id/actions')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.BENEFICIARY_MANAGER, UserRole.AUDITOR)
  @ApiOperation({ summary: "Liste des actions d'accompagnement" })
  findActions(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findActions(id);
  }

  @Post(':id/actions')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.BENEFICIARY_MANAGER)
  @ApiOperation({ summary: "Créer une action d'accompagnement" })
  createAction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateActionDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.createAction(id, dto, actor.id);
  }

  @Patch(':id/actions/:actionId')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.BENEFICIARY_MANAGER)
  @ApiOperation({ summary: "Modifier une action d'accompagnement" })
  updateAction(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('actionId', ParseUUIDPipe) actionId: string,
    @Body() dto: UpdateActionDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.updateAction(id, actionId, dto, actor.id);
  }
}
