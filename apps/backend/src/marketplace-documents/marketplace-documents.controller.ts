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
import { MarketplaceDocumentsService } from './marketplace-documents.service';
import {
  CreateMarketplaceDocumentDto,
  UpdateMarketplaceDocumentDto,
  QueryMarketplaceDocumentsDto,
  RejectMarketplaceDocumentDto,
  VerifyMarketplaceDocumentDto,
} from './dto/marketplace-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, RequestUser, MarketplaceRelatedEntityType } from '@iox/shared';

const SELLER_ROLES = [
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.QUALITY_MANAGER,
  UserRole.MARKETPLACE_SELLER,
] as const;

const VERIFICATION_ROLES = [UserRole.ADMIN, UserRole.QUALITY_MANAGER] as const;

@ApiTags('marketplace - documents')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('marketplace/documents')
export class MarketplaceDocumentsController {
  constructor(private service: MarketplaceDocumentsService) {}

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.QUALITY_MANAGER,
    UserRole.AUDITOR,
    UserRole.MARKETPLACE_SELLER,
  )
  @ApiOperation({ summary: 'Liste documents marketplace (staff/seller)' })
  findAll(@Query() query: QueryMarketplaceDocumentsDto, @CurrentUser() actor: RequestUser) {
    return this.service.findAll(query, actor);
  }

  @Get('public')
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.QUALITY_MANAGER,
    UserRole.AUDITOR,
    UserRole.MARKETPLACE_SELLER,
    UserRole.MARKETPLACE_BUYER,
  )
  @ApiOperation({ summary: 'Documents publics vérifiés non expirés (catalogue)' })
  findPublic(
    @Query('relatedType') relatedType: MarketplaceRelatedEntityType,
    @Query('relatedId', ParseUUIDPipe) relatedId: string,
  ) {
    return this.service.findPublic(relatedType, relatedId);
  }

  @Get('buyer-view')
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.QUALITY_MANAGER,
    UserRole.AUDITOR,
    UserRole.MARKETPLACE_BUYER,
  )
  @ApiOperation({ summary: 'Vue buyer (PUBLIC + BUYER_ON_REQUEST vérifiés)' })
  findForBuyer(
    @Query('relatedType') relatedType: MarketplaceRelatedEntityType,
    @Query('relatedId', ParseUUIDPipe) relatedId: string,
  ) {
    return this.service.findForBuyer(relatedType, relatedId);
  }

  @Get(':id')
  @Roles(...SELLER_ROLES, UserRole.AUDITOR)
  @ApiOperation({ summary: 'Fiche document marketplace' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: RequestUser) {
    return this.service.findById(id, actor);
  }

  @Get(':id/url')
  @Roles(...SELLER_ROLES, UserRole.AUDITOR)
  @ApiOperation({ summary: 'URL signée (staff/seller, tout statut)' })
  getUrl(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getDownloadUrl(id);
  }

  @Get(':id/public-url')
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.QUALITY_MANAGER,
    UserRole.AUDITOR,
    UserRole.MARKETPLACE_SELLER,
    UserRole.MARKETPLACE_BUYER,
  )
  @ApiOperation({ summary: 'URL signée publique (PUBLIC + VERIFIED + non expiré uniquement)' })
  getPublicUrl(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getDownloadUrl(id, { publicOnly: true });
  }

  @Post()
  @Roles(...SELLER_ROLES)
  @ApiOperation({ summary: 'Attacher un Document existant à une entité marketplace' })
  create(@Body() dto: CreateMarketplaceDocumentDto, @CurrentUser() actor: RequestUser) {
    return this.service.create(dto, actor.id, actor);
  }

  @Patch(':id')
  @Roles(...SELLER_ROLES)
  @ApiOperation({ summary: 'Modifier métadonnées (titre, visibilité, validité)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMarketplaceDocumentDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.update(id, dto, actor.id, actor);
  }

  @Post(':id/verify')
  @HttpCode(HttpStatus.OK)
  @Roles(...VERIFICATION_ROLES)
  @ApiOperation({ summary: 'Marquer le document comme vérifié (staff qualité/admin)' })
  verify(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyMarketplaceDocumentDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.verify(id, dto, actor.id);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @Roles(...VERIFICATION_ROLES)
  @ApiOperation({ summary: 'Rejeter le document avec motif obligatoire' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectMarketplaceDocumentDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.reject(id, dto, actor.id);
  }

  @Delete(':id')
  @Roles(...SELLER_ROLES)
  @ApiOperation({ summary: 'Détacher le document (ne supprime pas le Document source)' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: RequestUser) {
    return this.service.delete(id, actor.id, actor);
  }
}
