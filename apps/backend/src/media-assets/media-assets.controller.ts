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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { MediaAssetsService } from './media-assets.service';
import {
  UploadMediaAssetDto,
  UpdateMediaAssetDto,
  QueryMediaAssetsDto,
  RejectMediaAssetDto,
} from './dto/media-asset.dto';
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

const MODERATION_ROLES = [UserRole.ADMIN, UserRole.QUALITY_MANAGER] as const;

@ApiTags('marketplace - media assets')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('marketplace/media-assets')
export class MediaAssetsController {
  constructor(private service: MediaAssetsService) {}

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.QUALITY_MANAGER,
    UserRole.AUDITOR,
    UserRole.MARKETPLACE_SELLER,
  )
  @ApiOperation({ summary: 'Liste des médias (filtrée, paginée)' })
  findAll(@Query() query: QueryMediaAssetsDto, @CurrentUser() actor: RequestUser) {
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
  @ApiOperation({ summary: 'Médias approuvés pour une entité (lecture catalogue)' })
  findPublic(
    @Query('relatedType') relatedType: MarketplaceRelatedEntityType,
    @Query('relatedId', ParseUUIDPipe) relatedId: string,
  ) {
    return this.service.findPublic(relatedType, relatedId);
  }

  @Get(':id')
  @Roles(...SELLER_ROLES, UserRole.AUDITOR)
  @ApiOperation({ summary: 'Fiche média' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: RequestUser) {
    return this.service.findById(id, actor);
  }

  @Get(':id/url')
  @Roles(...SELLER_ROLES, UserRole.AUDITOR, UserRole.MARKETPLACE_BUYER)
  @ApiOperation({ summary: 'URL signée temporaire pour téléchargement' })
  getUrl(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getUrl(id);
  }

  @Post('upload')
  @Roles(...SELLER_ROLES)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: "Upload d'un média (image, max 5 MB)" })
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadMediaAssetDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.upload(dto, file, actor.id, actor);
  }

  @Patch(':id')
  @Roles(...SELLER_ROLES)
  @ApiOperation({ summary: "Modifier les métadonnées d'un média" })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMediaAssetDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.update(id, dto, actor.id, actor);
  }

  @Post(':id/set-primary')
  @HttpCode(HttpStatus.OK)
  @Roles(...SELLER_ROLES)
  @ApiOperation({ summary: 'Définir ce média comme image principale (unique)' })
  setPrimary(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: RequestUser) {
    return this.service.setPrimary(id, actor.id, actor);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @Roles(...MODERATION_ROLES)
  @ApiOperation({ summary: 'Approuver un média (modération)' })
  approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: RequestUser) {
    return this.service.approve(id, actor.id);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @Roles(...MODERATION_ROLES)
  @ApiOperation({ summary: 'Rejeter un média avec motif' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectMediaAssetDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.reject(id, dto, actor.id);
  }

  @Delete(':id')
  @Roles(...SELLER_ROLES)
  @ApiOperation({ summary: 'Supprimer un média (DB + stockage)' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: RequestUser) {
    return this.service.delete(id, actor.id, actor);
  }
}
