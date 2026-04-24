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
import { CreateCompanyDto, UpdateCompanyDto, QueryCompaniesDto } from './dto/company.dto';
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
