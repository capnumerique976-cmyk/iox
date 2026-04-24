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
import { MarketplaceOffersService } from './marketplace-offers.service';
import {
  CreateMarketplaceOfferDto,
  UpdateMarketplaceOfferDto,
  QueryMarketplaceOffersDto,
  AttachOfferBatchDto,
  UpdateOfferBatchDto,
  RejectMarketplaceOfferDto,
  SuspendMarketplaceOfferDto,
  SetOfferExportReadinessDto,
} from './dto/marketplace-offer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, RequestUser } from '@iox/shared';

const SELLER_EDIT = [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.MARKETPLACE_SELLER] as const;
const MODERATION = [UserRole.ADMIN, UserRole.QUALITY_MANAGER] as const;

@ApiTags('marketplace - offers')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('marketplace/offers')
export class MarketplaceOffersController {
  constructor(private service: MarketplaceOffersService) {}

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.QUALITY_MANAGER,
    UserRole.AUDITOR,
    UserRole.MARKETPLACE_SELLER,
  )
  @ApiOperation({ summary: 'Liste des offres marketplace (admin/qualité/vendeur)' })
  findAll(@Query() query: QueryMarketplaceOffersDto, @CurrentUser() actor: RequestUser) {
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
  @ApiOperation({ summary: 'Catalogue public offres (PUBLISHED + visibility ≠ PRIVATE)' })
  findPublished(@Query() query: QueryMarketplaceOffersDto) {
    return this.service.findPublished(query);
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.QUALITY_MANAGER,
    UserRole.AUDITOR,
    UserRole.MARKETPLACE_SELLER,
  )
  @ApiOperation({ summary: 'Fiche offre marketplace par id' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: RequestUser) {
    return this.service.findById(id, actor);
  }

  @Post()
  @Roles(...SELLER_EDIT)
  @ApiOperation({ summary: 'Créer une offre marketplace (brouillon)' })
  create(@Body() dto: CreateMarketplaceOfferDto, @CurrentUser() actor: RequestUser) {
    return this.service.create(dto, actor);
  }

  @Patch(':id')
  @Roles(...SELLER_EDIT)
  @ApiOperation({ summary: 'Modifier une offre marketplace' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMarketplaceOfferDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.update(id, dto, actor);
  }

  // ─── Lots ──────────────────────────────────────────────────────────────

  @Post(':id/batches')
  @Roles(...SELLER_EDIT)
  @ApiOperation({ summary: "Rattacher un lot produit à l'offre" })
  attachBatch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AttachOfferBatchDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.attachBatch(id, dto, actor);
  }

  @Patch('batches/:linkId')
  @Roles(...SELLER_EDIT)
  @ApiOperation({ summary: 'Modifier un rattachement offre/lot' })
  updateBatch(
    @Param('linkId', ParseUUIDPipe) linkId: string,
    @Body() dto: UpdateOfferBatchDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.updateBatch(linkId, dto, actor);
  }

  @Delete('batches/:linkId')
  @Roles(...SELLER_EDIT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Détacher un lot de l'offre" })
  detachBatch(@Param('linkId', ParseUUIDPipe) linkId: string, @CurrentUser() actor: RequestUser) {
    return this.service.detachBatch(linkId, actor);
  }

  // ─── Workflow ──────────────────────────────────────────────────────────

  @Post(':id/submit')
  @Roles(...SELLER_EDIT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soumettre à la revue (DRAFT/REJECTED → IN_REVIEW)' })
  submit(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: RequestUser) {
    return this.service.submitForReview(id, actor);
  }

  @Post(':id/approve')
  @Roles(...MODERATION)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approuver (IN_REVIEW → APPROVED, gates seller + mp)' })
  approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: RequestUser) {
    return this.service.approve(id, actor.id);
  }

  @Post(':id/reject')
  @Roles(...MODERATION)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rejeter (IN_REVIEW → REJECTED)' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectMarketplaceOfferDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.reject(id, dto, actor.id);
  }

  @Post(':id/publish')
  @Roles(...MODERATION)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publier (APPROVED → PUBLISHED, 4 gates)' })
  publish(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: RequestUser) {
    return this.service.publish(id, actor.id);
  }

  @Post(':id/suspend')
  @Roles(...MODERATION)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspendre une offre publiée' })
  suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuspendMarketplaceOfferDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.suspend(id, dto, actor.id);
  }

  @Post(':id/archive')
  @Roles(...SELLER_EDIT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archiver une offre' })
  archive(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: RequestUser) {
    return this.service.archive(id, actor);
  }

  @Post(':id/readiness')
  @Roles(...MODERATION)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mettre à jour l'export readiness de l'offre" })
  setReadiness(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetOfferExportReadinessDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.setExportReadiness(id, dto, actor.id);
  }
}
