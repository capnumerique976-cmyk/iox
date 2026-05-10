import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ComplianceService } from './compliance.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, RequestUser } from '@iox/shared';
import {
  AdminComplianceSummaryDto,
  SellerComplianceSummaryDto,
  SellerComplianceRowDto,
} from '../common/dto/swagger-responses.dto';

@ApiTags('compliance')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT manquant ou expiré' })
@Controller('compliance')
export class ComplianceController {
  constructor(private readonly service: ComplianceService) {}

  @Get('seller/summary')
  @Roles(UserRole.MARKETPLACE_SELLER)
  @ApiOperation({
    summary: 'Résumé conformité du seller connecté',
    description:
      'Retourne le statut KYC global, les compteurs de documents/certifications ' +
      'et la prochaine action requise. Accessible uniquement au seller authentifié (propre profil).',
  })
  @ApiOkResponse({ type: SellerComplianceSummaryDto })
  @ApiForbiddenResponse({ description: 'Rôle MARKETPLACE_SELLER requis' })
  getSellerSummary(@CurrentUser() actor: RequestUser) {
    return this.service.getSellerSummary(actor);
  }

  @Get('admin/summary')
  @Roles(UserRole.ADMIN, UserRole.QUALITY_MANAGER)
  @ApiOperation({
    summary: 'Résumé conformité global (admin)',
    description:
      'Vue agrégée de tous les vendeurs : documents en attente/refusés/expirés, ' +
      'certifications, review queue. Rôles autorisés : ADMIN, QUALITY_MANAGER.',
  })
  @ApiOkResponse({ type: AdminComplianceSummaryDto })
  @ApiForbiddenResponse({ description: 'Rôles ADMIN ou QUALITY_MANAGER requis' })
  getAdminSummary() {
    return this.service.getAdminSummary();
  }

  @Get('admin/sellers')
  @Roles(UserRole.ADMIN, UserRole.QUALITY_MANAGER)
  @ApiOperation({
    summary: 'Liste détaillée conformité par vendeur (admin)',
    description:
      'Retourne une ligne par seller avec statut profil, documents et certifications. ' +
      "Permet de prioriser les actions de revue. Rôles : ADMIN, QUALITY_MANAGER.",
  })
  @ApiOkResponse({ type: [SellerComplianceRowDto] })
  @ApiForbiddenResponse({ description: 'Rôles ADMIN ou QUALITY_MANAGER requis' })
  getAdminSellersList() {
    return this.service.getAdminSellersList();
  }
}
