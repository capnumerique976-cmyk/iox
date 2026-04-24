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
import { SupplyContractsService } from './supply-contracts.service';
import {
  CreateSupplyContractDto,
  UpdateSupplyContractDto,
  ChangeSupplyContractStatusDto,
  QuerySupplyContractsDto,
} from './dto/supply-contract.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, RequestUser } from '@iox/shared';

@ApiTags('supply-contracts')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('supply-contracts')
export class SupplyContractsController {
  constructor(private service: SupplyContractsService) {}

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.SUPPLY_MANAGER,
    UserRole.BENEFICIARY_MANAGER,
    UserRole.AUDITOR,
    UserRole.FUNDER,
  )
  @ApiOperation({ summary: "Liste des contrats d'approvisionnement (filtrée, paginée)" })
  findAll(@Query() query: QuerySupplyContractsDto) {
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
  @ApiOperation({ summary: "Détail d'un contrat" })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.SUPPLY_MANAGER)
  @ApiOperation({ summary: "Créer un contrat d'approvisionnement" })
  create(@Body() dto: CreateSupplyContractDto, @CurrentUser() actor: RequestUser) {
    return this.service.create(dto, actor.id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.SUPPLY_MANAGER)
  @ApiOperation({ summary: 'Modifier un contrat (hors statut)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupplyContractDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.SUPPLY_MANAGER)
  @ApiOperation({ summary: "Changer le statut d'un contrat (transitions validées)" })
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeSupplyContractStatusDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.changeStatus(id, dto, actor.id);
  }
}
