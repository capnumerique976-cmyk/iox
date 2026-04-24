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
import { ProductsService } from './products.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ChangeProductStatusDto,
  QueryProductsDto,
} from './dto/product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, RequestUser } from '@iox/shared';

@ApiTags('products')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private service: ProductsService) {}

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.BENEFICIARY_MANAGER,
    UserRole.QUALITY_MANAGER,
    UserRole.MARKET_VALIDATOR,
    UserRole.COMMERCIAL_MANAGER,
    UserRole.AUDITOR,
    UserRole.FUNDER,
  )
  @ApiOperation({ summary: 'Liste des produits (filtrée, paginée)' })
  findAll(@Query() query: QueryProductsDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.BENEFICIARY_MANAGER,
    UserRole.QUALITY_MANAGER,
    UserRole.MARKET_VALIDATOR,
    UserRole.COMMERCIAL_MANAGER,
    UserRole.AUDITOR,
  )
  @ApiOperation({ summary: "Fiche complète d'un produit" })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.BENEFICIARY_MANAGER,
    UserRole.QUALITY_MANAGER,
  )
  @ApiOperation({ summary: 'Créer un produit' })
  create(@Body() dto: CreateProductDto, @CurrentUser() actor: RequestUser) {
    return this.service.create(dto, actor.id);
  }

  @Patch(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.BENEFICIARY_MANAGER,
    UserRole.QUALITY_MANAGER,
  )
  @ApiOperation({
    summary: 'Modifier la fiche produit (incrémente la version si champs sensibles)',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.QUALITY_MANAGER, UserRole.MARKET_VALIDATOR)
  @ApiOperation({ summary: 'Changer le statut du produit (transitions validées)' })
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeProductStatusDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.changeStatus(id, dto, actor.id);
  }
}
