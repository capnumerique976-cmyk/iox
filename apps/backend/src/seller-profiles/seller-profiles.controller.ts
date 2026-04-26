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
import { SellerProfilesService } from './seller-profiles.service';
import {
  CreateSellerProfileDto,
  UpdateSellerProfileDto,
  UpdateMySellerProfileDto,
  QuerySellerProfilesDto,
  RejectSellerProfileDto,
  SuspendSellerProfileDto,
} from './dto/seller-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, RequestUser } from '@iox/shared';

@ApiTags('marketplace - seller profiles')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('marketplace/seller-profiles')
export class SellerProfilesController {
  constructor(private service: SellerProfilesService) {}

  // Admin/Quality : vue complète, tous statuts
  @Get()
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.QUALITY_MANAGER, UserRole.AUDITOR)
  @ApiOperation({ summary: 'Liste des profils vendeurs (admin/qualité)' })
  findAll(@Query() query: QuerySellerProfilesDto, @CurrentUser() actor: RequestUser) {
    return this.service.findAll(query, actor);
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
  @ApiOperation({ summary: 'Profil vendeur par slug' })
  findBySlug(@Param('slug') slug: string, @CurrentUser() actor: RequestUser) {
    return this.service.findBySlug(slug, actor);
  }

  // FP-3 — auto-édition profil seller. Route littérale `/me` enregistrée
  // AVANT `/:id` (Express router ordre-dépendant) pour ne pas être avalée
  // par le ParseUUIDPipe.
  @Get('me')
  @Roles(UserRole.MARKETPLACE_SELLER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Mon profil vendeur (seller connecté)' })
  findMine(@CurrentUser() actor: RequestUser) {
    return this.service.findMine(actor);
  }

  @Patch('me')
  @Roles(UserRole.MARKETPLACE_SELLER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Auto-édition de mon profil vendeur' })
  updateMine(@Body() dto: UpdateMySellerProfileDto, @CurrentUser() actor: RequestUser) {
    return this.service.updateMine(dto, actor);
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.QUALITY_MANAGER,
    UserRole.AUDITOR,
    UserRole.MARKETPLACE_SELLER,
  )
  @ApiOperation({ summary: 'Fiche profil vendeur' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: RequestUser) {
    return this.service.findById(id, actor);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.MARKETPLACE_SELLER)
  @ApiOperation({ summary: 'Créer un profil vendeur (brouillon)' })
  create(@Body() dto: CreateSellerProfileDto, @CurrentUser() actor: RequestUser) {
    return this.service.create(dto, actor);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.MARKETPLACE_SELLER)
  @ApiOperation({ summary: 'Modifier un profil vendeur' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSellerProfileDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.update(id, dto, actor);
  }

  @Post(':id/submit')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.MARKETPLACE_SELLER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soumettre le profil à la revue qualité' })
  submit(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: RequestUser) {
    return this.service.submitForReview(id, actor);
  }

  @Post(':id/approve')
  @Roles(UserRole.ADMIN, UserRole.QUALITY_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approuver un profil vendeur (admin/qualité)' })
  approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: RequestUser) {
    return this.service.approve(id, actor.id);
  }

  @Post(':id/reject')
  @Roles(UserRole.ADMIN, UserRole.QUALITY_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rejeter un profil vendeur avec motif' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectSellerProfileDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.reject(id, dto, actor.id);
  }

  @Post(':id/suspend')
  @Roles(UserRole.ADMIN, UserRole.QUALITY_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspendre un profil approuvé' })
  suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuspendSellerProfileDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.suspend(id, dto, actor.id);
  }

  @Post(':id/reinstate')
  @Roles(UserRole.ADMIN, UserRole.QUALITY_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Réactiver un profil suspendu' })
  reinstate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: RequestUser) {
    return this.service.reinstate(id, actor.id);
  }

  @Post(':id/feature')
  @Roles(UserRole.ADMIN, UserRole.QUALITY_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mettre en avant un profil approuvé' })
  feature(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: RequestUser) {
    return this.service.setFeatured(id, true, actor.id);
  }

  @Post(':id/unfeature')
  @Roles(UserRole.ADMIN, UserRole.QUALITY_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retirer la mise en avant' })
  unfeature(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: RequestUser) {
    return this.service.setFeatured(id, false, actor.id);
  }
}
