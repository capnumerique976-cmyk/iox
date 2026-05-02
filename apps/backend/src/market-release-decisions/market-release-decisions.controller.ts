import { Controller, Get, Post, Param, Body, Query, ParseUUIDPipe, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@iox/shared';
import { MarketReleaseDecisionsService } from './market-release-decisions.service';
import {
  CreateMarketReleaseDecisionDto,
  QueryMarketReleaseDecisionsDto,
} from './dto/market-release-decision.dto';

@ApiTags('market-release-decisions')
@ApiBearerAuth('access-token')
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

  @ApiOperation({ summary: 'Create a market-release decision (checklist must pass)' })
  @Post()
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.QUALITY_MANAGER, UserRole.MARKET_VALIDATOR)
  create(
    @Body() dto: CreateMarketReleaseDecisionDto,
    @Request() req: Express.Request & { user: { sub: string } },
  ) {
    return this.service.create(dto, req.user.sub);
  }
}
