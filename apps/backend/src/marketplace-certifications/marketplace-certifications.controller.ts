// FP-2 — Controller marketplace certifications.
// Pattern aligné sur marketplace-documents : seller crée/modifie/supprime,
// staff qualité vérifie/refuse, lecture publique côté catalog (route séparée
// dans le module marketplace-catalog).

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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, RequestUser, MarketplaceRelatedEntityType } from '@iox/shared';
import { MarketplaceCertificationsService } from './marketplace-certifications.service';
import {
  CreateMarketplaceCertificationDto,
  QueryMarketplaceCertificationsDto,
  RejectMarketplaceCertificationDto,
  UpdateMarketplaceCertificationDto,
  VerifyMarketplaceCertificationDto,
} from './dto/marketplace-certification.dto';

const SELLER_ROLES = [
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.QUALITY_MANAGER,
  UserRole.MARKETPLACE_SELLER,
] as const;

const VERIFICATION_ROLES = [UserRole.ADMIN, UserRole.QUALITY_MANAGER] as const;

@ApiTags('marketplace - certifications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('marketplace/certifications')
export class MarketplaceCertificationsController {
  constructor(private service: MarketplaceCertificationsService) {}

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.QUALITY_MANAGER,
    UserRole.AUDITOR,
    UserRole.MARKETPLACE_SELLER,
  )
  @ApiOperation({ summary: 'Liste certifications (staff/seller, scope auto)' })
  findAll(
    @Query() query: QueryMarketplaceCertificationsDto,
    @CurrentUser() actor: RequestUser,
  ) {
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
  @ApiOperation({ summary: 'Certifications VERIFIED non expirées (catalogue)' })
  findPublic(
    @Query('relatedType') relatedType: MarketplaceRelatedEntityType,
    @Query('relatedId', ParseUUIDPipe) relatedId: string,
  ) {
    return this.service.findPublic(relatedType, relatedId);
  }

  @Get(':id')
  @Roles(...SELLER_ROLES, UserRole.AUDITOR)
  @ApiOperation({ summary: 'Fiche certification' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: RequestUser) {
    return this.service.findById(id, actor);
  }

  @Post()
  @Roles(...SELLER_ROLES)
  @ApiOperation({ summary: 'Déclarer une certification (PENDING)' })
  create(
    @Body() dto: CreateMarketplaceCertificationDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.create(dto, actor);
  }

  @Patch(':id')
  @Roles(...SELLER_ROLES)
  @ApiOperation({ summary: 'Modifier une certification (re-passe en PENDING si VERIFIED)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMarketplaceCertificationDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles(...SELLER_ROLES)
  @ApiOperation({ summary: 'Supprimer une certification' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: RequestUser) {
    return this.service.delete(id, actor);
  }

  @Post(':id/verify')
  @HttpCode(HttpStatus.OK)
  @Roles(...VERIFICATION_ROLES)
  @ApiOperation({ summary: 'Vérifier la certification (staff qualité)' })
  verify(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyMarketplaceCertificationDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.verify(id, dto, actor.id);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @Roles(...VERIFICATION_ROLES)
  @ApiOperation({ summary: 'Refuser la certification avec motif' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectMarketplaceCertificationDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.reject(id, dto, actor.id);
  }
}
