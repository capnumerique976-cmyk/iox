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
import { TransformationOperationsService } from './transformation-operations.service';
import {
  CreateTransformationOperationDto,
  UpdateTransformationOperationDto,
  QueryTransformationOperationsDto,
} from './dto/transformation-operation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, RequestUser } from '@iox/shared';

@ApiTags('transformation-operations')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('transformation-operations')
export class TransformationOperationsController {
  constructor(private service: TransformationOperationsService) {}

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.QUALITY_MANAGER,
    UserRole.BENEFICIARY_MANAGER,
    UserRole.LOGISTICS_MANAGER,
    UserRole.AUDITOR,
  )
  @ApiOperation({ summary: 'Liste des opérations de transformation (filtrée, paginée)' })
  findAll(@Query() query: QueryTransformationOperationsDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.QUALITY_MANAGER,
    UserRole.BENEFICIARY_MANAGER,
    UserRole.LOGISTICS_MANAGER,
    UserRole.AUDITOR,
  )
  @ApiOperation({ summary: "Détail d'une opération de transformation" })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.QUALITY_MANAGER,
    UserRole.BENEFICIARY_MANAGER,
  )
  @ApiOperation({ summary: 'Enregistrer une opération de transformation (lot ACCEPTED requis)' })
  create(@Body() dto: CreateTransformationOperationDto, @CurrentUser() actor: RequestUser) {
    return this.service.create(dto, actor.id);
  }

  @Patch(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.QUALITY_MANAGER,
    UserRole.BENEFICIARY_MANAGER,
  )
  @ApiOperation({ summary: 'Modifier une opération de transformation' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransformationOperationDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }
}
