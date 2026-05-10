import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@iox/shared';
import { LabelValidationsService } from './label-validations.service';
import {
  CreateLabelValidationDto,
  UpdateLabelValidationDto,
  QueryLabelValidationsDto,
} from './dto/label-validation.dto';

@ApiTags('label-validations')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT manquant ou expiré' })
@Controller('label-validations')
export class LabelValidationsController {
  constructor(private readonly service: LabelValidationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Liste les validations de labels/certifications',
    description: 'Filtrable par entityId, entityType, statut. Accessible à tous les rôles authentifiés.',
  })
  @ApiOkResponse({ description: 'Liste paginée de validations de labels' })
  findAll(@Query() query: QueryLabelValidationsDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'une validation de label' })
  @ApiParam({ name: 'id', description: 'UUID de la validation' })
  @ApiOkResponse({ description: 'Validation trouvée' })
  @ApiNotFoundResponse({ description: 'Validation introuvable' })
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
  @ApiOperation({
    summary: 'Créer une validation de label',
    description:
      'Associe un label/certification à une entité (produit, lot, profil). ' +
      'Rôles : ADMIN, COORDINATOR, QUALITY_MANAGER, BENEFICIARY_MANAGER.',
  })
  @ApiCreatedResponse({ description: 'Validation créée' })
  @ApiForbiddenResponse({ description: 'Rôle staff requis' })
  create(
    @Body() dto: CreateLabelValidationDto,
    @Request() req: Express.Request & { user: { sub: string } },
  ) {
    return this.service.create(dto, req.user?.sub);
  }

  @Patch(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.QUALITY_MANAGER,
    UserRole.BENEFICIARY_MANAGER,
  )
  @ApiOperation({
    summary: 'Mettre à jour une validation de label',
    description:
      'Met à jour le statut ou les données d\'une validation existante. ' +
      'Rôles : ADMIN, COORDINATOR, QUALITY_MANAGER, BENEFICIARY_MANAGER.',
  })
  @ApiParam({ name: 'id', description: 'UUID de la validation' })
  @ApiOkResponse({ description: 'Validation mise à jour' })
  @ApiNotFoundResponse({ description: 'Validation introuvable' })
  @ApiForbiddenResponse({ description: 'Rôle staff requis' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLabelValidationDto,
    @Request() req: Express.Request & { user: { sub: string } },
  ) {
    return this.service.update(id, dto, req.user?.sub);
  }
}
