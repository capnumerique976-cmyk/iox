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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MarketplaceProductsService } from './marketplace-products.service';
import {
  CreateMarketplaceProductDto,
  UpdateMarketplaceProductDto,
  QueryMarketplaceProductsDto,
  RejectMarketplaceProductDto,
  SuspendMarketplaceProductDto,
  SetExportReadinessDto,
} from './dto/marketplace-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, RequestUser } from '@iox/shared';

const SELLER_EDIT = [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.MARKETPLACE_SELLER] as const;
const MODERATION = [UserRole.ADMIN, UserRole.QUALITY_MANAGER] as const;

@ApiTags('marketplace - products')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('marketplace/products')
export class MarketplaceProductsController {
  constructor(private service: MarketplaceProductsService) {}

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.QUALITY_MANAGER,
    UserRole.AUDITOR,
    UserRole.MARKETPLACE_SELLER,
  )
  @ApiOperation({ summary: 'Liste produits marketplace (admin/qualité/vendeur)' })
  findAll(@Query() query: QueryMarketplaceProductsDto, @CurrentUser() actor: RequestUser) {
    return this.service.findAll(query, actor);
  }

  @Get('published')
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.QUALITY_MANAGER,
    UserRole.AUDITOR,
    UserRole.MARKETPLACE_SELLER,
    UserRole.MARKETPLACE_BUYER,
  )
  @ApiOperation({ summary: 'Catalogue public (PUBLISHED uniquement)' })
  findPublished(@Query() query: QueryMarketplaceProductsDto) {
    return this.service.findPublished(query);
  }

  @Get('by-slug/:slug')
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.QUALITY_MANAGER,
    UserRole.AUDITOR,
    UserRole.MARKETPLACE_SELLER,
    UserRole.MARKETPLACE_BUYER,
  )
  @ApiOperation({ summary: 'Fiche produit marketplace par slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.service.findBySlug(slug);
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.QUALITY_MANAGER,
    UserRole.AUDITOR,
    UserRole.MARKETPLACE_SELLER,
  )
  @ApiOperation({ summary: 'Fiche produit marketplace par id' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: RequestUser) {
    return this.service.findById(id, actor);
  }

  @Post()
  @Roles(...SELLER_EDIT)
  @ApiOperation({ summary: 'Créer un produit marketplace (brouillon)' })
  create(@Body() dto: CreateMarketplaceProductDto, @CurrentUser() actor: RequestUser) {
    return this.service.create(dto, actor);
  }

  @Patch(':id')
  @Roles(...SELLER_EDIT)
  @ApiOperation({ summary: 'Modifier un produit marketplace' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMarketplaceProductDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.update(id, dto, actor);
  }

  @Post(':id/submit')
  @Roles(...SELLER_EDIT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soumettre à la revue qualité (DRAFT/REJECTED → IN_REVIEW)' })
  submit(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: RequestUser) {
    return this.service.submitForReview(id, actor);
  }

  @Post(':id/approve')
  @Roles(...MODERATION)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approuver le produit (IN_REVIEW → APPROVED)' })
  approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: RequestUser) {
    return this.service.approve(id, actor.id);
  }

  @Post(':id/reject')
  @Roles(...MODERATION)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rejeter le produit (IN_REVIEW → REJECTED)' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectMarketplaceProductDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.reject(id, dto, actor.id);
  }

  @Post(':id/publish')
  @Roles(...MODERATION)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publier (APPROVED → PUBLISHED, gates seller+media+readiness)' })
  publish(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: RequestUser) {
    return this.service.publish(id, actor.id);
  }

  @Post(':id/suspend')
  @Roles(...MODERATION)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspendre un produit publié' })
  suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuspendMarketplaceProductDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.suspend(id, dto, actor.id);
  }

  @Post(':id/archive')
  @Roles(...SELLER_EDIT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archiver un produit' })
  archive(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: RequestUser) {
    return this.service.archive(id, actor);
  }

  @Post(':id/readiness')
  @Roles(...MODERATION)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mettre à jour l'export readiness + snapshot conformité" })
  setReadiness(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetExportReadinessDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.setExportReadiness(id, dto, actor.id);
  }
}
