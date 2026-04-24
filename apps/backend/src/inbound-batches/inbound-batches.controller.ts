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
import { InboundBatchesService } from './inbound-batches.service';
import {
  CreateInboundBatchDto,
  UpdateInboundBatchDto,
  ChangeInboundBatchStatusDto,
  QueryInboundBatchesDto,
} from './dto/inbound-batch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, RequestUser } from '@iox/shared';

@ApiTags('inbound-batches')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inbound-batches')
export class InboundBatchesController {
  constructor(private service: InboundBatchesService) {}

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.SUPPLY_MANAGER,
    UserRole.QUALITY_MANAGER,
    UserRole.LOGISTICS_MANAGER,
    UserRole.BENEFICIARY_MANAGER,
    UserRole.AUDITOR,
  )
  @ApiOperation({ summary: 'Liste des lots entrants (filtrée, paginée)' })
  findAll(@Query() query: QueryInboundBatchesDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.SUPPLY_MANAGER,
    UserRole.QUALITY_MANAGER,
    UserRole.LOGISTICS_MANAGER,
    UserRole.BENEFICIARY_MANAGER,
    UserRole.AUDITOR,
  )
  @ApiOperation({ summary: "Détail d'un lot entrant" })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.SUPPLY_MANAGER, UserRole.LOGISTICS_MANAGER)
  @ApiOperation({ summary: 'Enregistrer une réception de matière' })
  create(@Body() dto: CreateInboundBatchDto, @CurrentUser() actor: RequestUser) {
    return this.service.create(dto, actor.id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.SUPPLY_MANAGER, UserRole.LOGISTICS_MANAGER)
  @ApiOperation({ summary: 'Modifier un lot entrant (RECEIVED uniquement)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInboundBatchDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.QUALITY_MANAGER, UserRole.SUPPLY_MANAGER)
  @ApiOperation({ summary: "Changer le statut d'un lot (contrôle → accepté / rejeté)" })
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeInboundBatchStatusDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.changeStatus(id, dto, actor.id);
  }
}
