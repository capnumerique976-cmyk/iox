import { Controller, Get, Post, Param, Body, Query, ParseUUIDPipe, Request } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@iox/shared';
import { MarketReleaseDecisionsService } from './market-release-decisions.service';
import {
  CreateMarketReleaseDecisionDto,
  QueryMarketReleaseDecisionsDto,
} from './dto/market-release-decision.dto';

@Controller('market-release-decisions')
export class MarketReleaseDecisionsController {
  constructor(private readonly service: MarketReleaseDecisionsService) {}

  /** Liste paginée de toutes les décisions */
  @Get()
  findAll(@Query() query: QueryMarketReleaseDecisionsDto) {
    return this.service.findAll(query);
  }

  /** Toutes les décisions d'un lot donné */
  @Get('batch/:batchId')
  findByBatch(@Param('batchId', ParseUUIDPipe) batchId: string) {
    return this.service.findByBatch(batchId);
  }

  /**
   * Évaluation live des 7 conditions pour un lot.
   * Accessible à tous les rôles authentifiés pour pré-visualisation.
   */
  @Get('checklist/:batchId')
  evaluateChecklist(@Param('batchId', ParseUUIDPipe) batchId: string) {
    return this.service.evaluateChecklist(batchId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  /**
   * Création d'une décision de mise en marché.
   * Réservé à ADMIN, COORDINATOR, QUALITY_MANAGER, MARKET_VALIDATOR.
   * Règle critique : COMPLIANT / COMPLIANT_WITH_RESERVATIONS bloquées si checklist incomplète.
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.QUALITY_MANAGER, UserRole.MARKET_VALIDATOR)
  create(
    @Body() dto: CreateMarketReleaseDecisionDto,
    @Request() req: Express.Request & { user: { sub: string } },
  ) {
    return this.service.create(dto, req.user.sub);
  }
}
