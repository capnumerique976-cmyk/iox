import { Controller, Get, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, RequestUser } from '@iox/shared';
import { MarketplaceAlertResponseDto } from '../common/dto/swagger-responses.dto';

@ApiTags('dashboard')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'JWT manquant ou expiré' })
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.AUDITOR,
    UserRole.QUALITY_MANAGER,
    UserRole.MARKET_VALIDATOR,
    UserRole.SUPPLY_MANAGER,
    UserRole.LOGISTICS_MANAGER,
  )
  @ApiOperation({
    summary: 'KPIs internes (staff seulement)',
    description:
      'Compteurs globaux : lots, produits, incidents ouverts, bénéficiaires, etc. ' +
      'Réservé au staff interne (ADMIN, COORDINATOR, AUDITOR et assimilés).',
  })
  @ApiOkResponse({ description: 'Objet stats avec compteurs internes' })
  @ApiForbiddenResponse({ description: 'Rôle staff requis' })
  getStats() {
    return this.dashboardService.getStats();
  }

  @Get('alerts')
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.AUDITOR,
    UserRole.QUALITY_MANAGER,
    UserRole.MARKET_VALIDATOR,
    UserRole.SUPPLY_MANAGER,
    UserRole.LOGISTICS_MANAGER,
    UserRole.BENEFICIARY_MANAGER,
  )
  @ApiOperation({
    summary: 'Alertes opérationnelles internes (staff)',
    description: 'Alertes en attente : incidents non résolus, lots bloqués, lots expirés, etc.',
  })
  @ApiOkResponse({ description: 'Liste des alertes internes' })
  @ApiForbiddenResponse({ description: 'Rôle staff requis' })
  getAlerts() {
    return this.dashboardService.getAlerts();
  }

  @Get('recent-activity')
  @Roles(
    UserRole.ADMIN,
    UserRole.COORDINATOR,
    UserRole.AUDITOR,
    UserRole.QUALITY_MANAGER,
    UserRole.MARKET_VALIDATOR,
    UserRole.SUPPLY_MANAGER,
    UserRole.LOGISTICS_MANAGER,
  )
  @ApiOperation({
    summary: "Activité récente (journal d'audit, N dernières entrées)",
    description: 'Retourne les N dernières entrées du journal d\'audit. Par défaut : 10.',
  })
  @ApiQuery({ name: 'limit', required: false, example: 10, description: 'Nombre d\'entrées (max raisonnable : 50)' })
  @ApiOkResponse({ description: "Liste d'entrées d'audit récentes" })
  @ApiForbiddenResponse({ description: 'Rôle staff requis' })
  getRecentActivity(@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number) {
    return this.dashboardService.getRecentActivity(limit);
  }

  @Get('marketplace-alerts')
  @Roles(UserRole.MARKETPLACE_SELLER, UserRole.MARKETPLACE_BUYER)
  @ApiOperation({
    summary: 'Alertes marketplace (seller/buyer)',
    description:
      'Retourne les compteurs d\'alertes personnalisés pour le seller ou le buyer connecté. ' +
      'Polling recommandé toutes les 2 minutes côté frontend (MarketplaceBell). ' +
      'Seller : nouvelles RFQ, factures en attente, nouveaux messages. ' +
      'Buyer : nouveaux messages sur ses RFQ. ' +
      'Le champ `total` est la somme de tous les compteurs.',
  })
  @ApiOkResponse({ type: MarketplaceAlertResponseDto })
  @ApiForbiddenResponse({ description: 'Rôles MARKETPLACE_SELLER ou MARKETPLACE_BUYER requis' })
  getMarketplaceAlerts(@CurrentUser() actor: RequestUser) {
    return this.dashboardService.getMarketplaceAlerts(actor);
  }

  @Get('marketplace')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.QUALITY_MANAGER)
  @ApiOperation({
    summary: 'KPIs marketplace (admin)',
    description:
      'Statistiques agrégées marketplace : vendeurs actifs, produits publiés, ' +
      'RFQ pipeline (par statut), paiements du mois. ' +
      'Rôles : ADMIN, COORDINATOR, QUALITY_MANAGER.',
  })
  @ApiOkResponse({ description: 'Objet KPIs marketplace' })
  @ApiForbiddenResponse({ description: 'Rôle admin requis' })
  getMarketplaceStats() {
    return this.dashboardService.getMarketplaceStats();
  }
}
