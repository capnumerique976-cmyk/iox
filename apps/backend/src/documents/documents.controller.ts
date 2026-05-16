import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto, UpdateDocumentStatusDto, QueryDocumentsDto } from './dto/document.dto';

// B-002 fix: @UseGuards au niveau classe — documents KYC/conformité
// protégés pour tous les users authentifiés au minimum.
// Les GET sont limités aux rôles staff (ADMIN, COORDINATOR, QUALITY_MANAGER)
// car ils exposent des données KYC sensibles.
@ApiTags('documents')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT manquant ou expiré' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get()
  // B-002 fix: restriction aux rôles staff — documents KYC non accessibles aux buyers/sellers
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.QUALITY_MANAGER, UserRole.AUDITOR)
  @ApiOperation({
    summary: 'Liste les documents de conformité',
    description:
      'Filtrés par entityId/entityType selon les paramètres. ' +
      'Accessible aux rôles staff (ADMIN, COORDINATOR, QUALITY_MANAGER, AUDITOR).',
  })
  @ApiOkResponse({ description: 'Liste paginée de documents' })
  findAll(@Query() query: QueryDocumentsDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  // B-002 fix: restriction aux rôles staff pour le détail d'un document KYC
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.QUALITY_MANAGER, UserRole.AUDITOR)
  @ApiOperation({ summary: 'Détail d\'un document' })
  @ApiParam({ name: 'id', description: 'UUID du document' })
  @ApiOkResponse({ description: 'Document trouvé' })
  @ApiNotFoundResponse({ description: 'Document introuvable' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Get(':id/url')
  // B-002 fix: restriction aux rôles staff — URL pré-signée ne doit pas être générée par n'importe quel user auth
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.QUALITY_MANAGER, UserRole.AUDITOR)
  @ApiOperation({
    summary: 'URL de téléchargement signée (download)',
    description: 'Génère une URL pré-signée (S3/MinIO) pour télécharger le fichier.',
  })
  @ApiParam({ name: 'id', description: 'UUID du document' })
  @ApiOkResponse({ description: 'Objet { url: string }' })
  @ApiNotFoundResponse({ description: 'Document introuvable' })
  getDownloadUrl(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getDownloadUrl(id);
  }

  @Post('upload')
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.QUALITY_MANAGER,
    UserRole.BENEFICIARY_MANAGER,
  )
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @ApiOperation({
    summary: 'Uploader un document (multipart/form-data)',
    description:
      'Upload d\'un fichier de conformité (PDF, image). ' +
      'Champ fichier : `file`. Métadonnées dans le body. ' +
      'Rôles : ADMIN, COORDINATOR, QUALITY_MANAGER, BENEFICIARY_MANAGER.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Fichier + métadonnées',
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'Fichier document (PDF, image)' },
        entityType: { type: 'string', example: 'SELLER_PROFILE' },
        entityId: { type: 'string', format: 'uuid', example: 'uuid-seller-profile' },
        documentType: { type: 'string', example: 'KYC_ID' },
        expiresAt: { type: 'string', format: 'date', example: '2027-01-01' },
      },
    },
  })
  @ApiOkResponse({ description: 'Document uploadé' })
  @ApiForbiddenResponse({ description: 'Rôle staff requis' })
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.upload(dto, file, user?.id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.QUALITY_MANAGER)
  @ApiOperation({
    summary: 'Mettre à jour le statut de validation d\'un document',
    description:
      'Statuts possibles : PENDING | VERIFIED | REJECTED | EXPIRED. ' +
      'Rôles : ADMIN, COORDINATOR, QUALITY_MANAGER.',
  })
  @ApiParam({ name: 'id', description: 'UUID du document' })
  @ApiOkResponse({ description: 'Document mis à jour' })
  @ApiNotFoundResponse({ description: 'Document introuvable' })
  @ApiForbiddenResponse({ description: 'Rôle staff requis' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentStatusDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.updateStatus(id, dto, user?.id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @ApiOperation({
    summary: 'Supprimer un document',
    description: 'Suppression définitive. Rôles : ADMIN, COORDINATOR.',
  })
  @ApiParam({ name: 'id', description: 'UUID du document' })
  @ApiOkResponse({ description: 'Document supprimé' })
  @ApiNotFoundResponse({ description: 'Document introuvable' })
  @ApiForbiddenResponse({ description: 'Rôles ADMIN ou COORDINATOR requis' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.delete(id, user?.id);
  }
}
