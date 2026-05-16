import { Controller, Get, Post, Param, Body, Query, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@iox/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MarketReleaseDecisionsService } from './market-release-decisions.service';
import {
  CreateMarketReleaseDecisionDto,
  QueryMarketReleaseDecisionsDto,
} from './dto/market-release-decision.dto';

// B-001 fix: @UseGuards au niveau classe pour protéger toutes les routes
// B-001 fix: @Roles ADMIN/COORDINATOR sur les GET — décisions internes uniquement
@ApiTags('market-release-decisions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.COORDINATOR)
@Controller('market-release-decisions')
export class MarketReleaseDecisionsController {
  constructor(private readonly service: MarketReleaseDecisionsService) {}

  @ApiOperation({ summary: 'List all market-release decisions (paginated)' })
  @Get()
  findAll(@Query() query: QueryMarketReleaseDecisionsDto) {
    return this.service.findAll(query);
  }

  @ApiOperation({ summary: 'Get all decisions for a given product batch' })
  @Get('batch/:batchId')
  findByBatch(@Param('batchId', ParseUUIDPipe) batchId: string) {
    return this.service.findByBatch(batchId);
  }

  @ApiOperation({ summary: 'Evaluate the 7-point release checklist for a batch (live)' })
  @Get('checklist/:batchId')
  evaluateChecklist(@Param('batchId', ParseUUIDPipe) batchId: string) {
    return this.service.evaluateChecklist(batchId);
  }

  @ApiOperation({ summary: 'Get a single market-release decision by ID' })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  // Rôles élargis pour la création vs lecture seule (ADMIN/COORDINATOR)
  @ApiOperation({ summary: 'Create a market-release decision (checklist must pass)' })
  @Post()
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.QUALITY_MANAGER, UserRole.MARKET_VALIDATOR)
  create(
    @Body() dto: CreateMarketReleaseDecisionDto,
    @CurrentUser() user: { id: string },
  ) {
    // B-005 fix: req.user.id au lieu de req.user.sub
    return this.service.create(dto, user.id);
  }
}
