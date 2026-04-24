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
import { ProductBatchesService } from './product-batches.service';
import {
  CreateProductBatchDto,
  UpdateProductBatchDto,
  ChangeProductBatchStatusDto,
  QueryProductBatchesDto,
} from './dto/product-batch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, RequestUser } from '@iox/shared';

@ApiTags('product-batches')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('product-batches')
export class ProductBatchesController {
  constructor(private service: ProductBatchesService) {}

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.QUALITY_MANAGER,
    UserRole.BENEFICIARY_MANAGER,
    UserRole.LOGISTICS_MANAGER,
    UserRole.MARKET_VALIDATOR,
    UserRole.COMMERCIAL_MANAGER,
    UserRole.AUDITOR,
  )
  @ApiOperation({ summary: 'Liste des lots produits finis (filtrée, paginée)' })
  findAll(@Query() query: QueryProductBatchesDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.QUALITY_MANAGER,
    UserRole.BENEFICIARY_MANAGER,
    UserRole.LOGISTICS_MANAGER,
    UserRole.MARKET_VALIDATOR,
    UserRole.COMMERCIAL_MANAGER,
    UserRole.AUDITOR,
  )
  @ApiOperation({ summary: "Détail d'un lot produit fini" })
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
  @ApiOperation({ summary: 'Créer un lot de produit fini (produit éligible requis)' })
  create(@Body() dto: CreateProductBatchDto, @CurrentUser() actor: RequestUser) {
    return this.service.create(dto, actor.id);
  }

  @Patch(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.QUALITY_MANAGER,
    UserRole.BENEFICIARY_MANAGER,
  )
  @ApiOperation({ summary: 'Modifier un lot (CREATED uniquement)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductBatchDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Patch(':id/status')
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.QUALITY_MANAGER,
    UserRole.MARKET_VALIDATOR,
    UserRole.LOGISTICS_MANAGER,
  )
  @ApiOperation({ summary: "Changer le statut d'un lot (transitions validées)" })
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeProductBatchStatusDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.changeStatus(id, dto, actor.id);
  }
}
