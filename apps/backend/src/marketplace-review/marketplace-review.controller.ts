import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MarketplaceReviewService } from './marketplace-review.service';
import {
  QueryReviewQueueDto,
  EnqueueReviewDto,
  DecideReviewDto,
} from './dto/marketplace-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, RequestUser } from '@iox/shared';

const VIEW = [
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.QUALITY_MANAGER,
  UserRole.AUDITOR,
] as const;

const DECIDE = [UserRole.ADMIN, UserRole.QUALITY_MANAGER] as const;

@ApiTags('marketplace - review queue')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('marketplace/review-queue')
export class MarketplaceReviewController {
  constructor(private service: MarketplaceReviewService) {}

  @Get()
  @Roles(...VIEW)
  @ApiOperation({ summary: 'Liste de la file de modération (PENDING en tête)' })
  findAll(@Query() query: QueryReviewQueueDto) {
    return this.service.findAll(query);
  }

  @Get('stats/pending')
  @Roles(...VIEW)
  @ApiOperation({ summary: 'Compteurs PENDING par type (publication/media/document)' })
  countPending() {
    return this.service.countPending();
  }

  @Get(':id')
  @Roles(...VIEW)
  @ApiOperation({ summary: "Détail d'un item de revue" })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles(...DECIDE)
  @ApiOperation({
    summary: 'Enqueue manuel (usage admin, normalement appelé par les autres modules)',
  })
  enqueue(@Body() dto: EnqueueReviewDto, @CurrentUser() actor: RequestUser) {
    return this.service.enqueue(dto, actor.id);
  }

  @Post(':id/approve')
  @Roles(...DECIDE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approuver un item PENDING' })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideReviewDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.approve(id, dto, actor.id);
  }

  @Post(':id/reject')
  @Roles(...DECIDE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rejeter un item PENDING (motif obligatoire)' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideReviewDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.reject(id, dto, actor.id);
  }
}
