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
import { QuoteRequestsService } from './quote-requests.service';
import {
  CreateQuoteRequestDto,
  QueryQuoteRequestsDto,
  UpdateQuoteRequestStatusDto,
  AssignQuoteRequestDto,
  CreateQuoteRequestMessageDto,
} from './dto/quote-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, RequestUser } from '@iox/shared';

const RFQ_VIEW = [
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.QUALITY_MANAGER,
  UserRole.MARKETPLACE_SELLER,
  UserRole.MARKETPLACE_BUYER,
] as const;

const RFQ_CREATE = [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.MARKETPLACE_BUYER] as const;

const RFQ_ASSIGN = [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.QUALITY_MANAGER] as const;

@ApiTags('marketplace - quote requests')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('marketplace/quote-requests')
export class QuoteRequestsController {
  constructor(private service: QuoteRequestsService) {}

  @Get()
  @Roles(...RFQ_VIEW)
  @ApiOperation({ summary: 'Liste des demandes de devis (scoping automatique par rôle)' })
  findAll(@Query() query: QueryQuoteRequestsDto, @CurrentUser() actor: RequestUser) {
    return this.service.findAll(query, actor);
  }

  @Get(':id')
  @Roles(...RFQ_VIEW)
  @ApiOperation({ summary: "Détail d'une demande de devis" })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: RequestUser) {
    return this.service.findById(id, actor);
  }

  @Post()
  @Roles(...RFQ_CREATE)
  @ApiOperation({ summary: 'Créer une demande de devis sur une offre publiée' })
  create(@Body() dto: CreateQuoteRequestDto, @CurrentUser() actor: RequestUser) {
    return this.service.create(dto, actor);
  }

  @Patch(':id/status')
  @Roles(...RFQ_VIEW)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Changer le statut d'une RFQ (transitions contrôlées)" })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuoteRequestStatusDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.updateStatus(id, dto, actor);
  }

  @Patch(':id/assign')
  @Roles(...RFQ_ASSIGN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assigner la RFQ à un membre staff' })
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignQuoteRequestDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.assign(id, dto, actor);
  }

  // ─── Messages ────────────────────────────────────────────────────────────

  @Get(':id/messages')
  @Roles(...RFQ_VIEW)
  @ApiOperation({ summary: 'Fil de discussion (notes internes masquées côté buyer)' })
  findMessages(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: RequestUser) {
    return this.service.findMessages(id, actor);
  }

  @Post(':id/messages')
  @Roles(...RFQ_VIEW)
  @ApiOperation({ summary: 'Ajouter un message ou une note interne staff' })
  addMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateQuoteRequestMessageDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.addMessage(id, dto, actor);
  }
}
