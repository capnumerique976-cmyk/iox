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
import { Throttle } from '@nestjs/throttler';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
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
import {
  PaginatedQuoteRequestsDto,
  QuoteRequestMessageResponseDto,
  QuoteRequestResponseDto,
} from '../common/dto/swagger-responses.dto';

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
@ApiUnauthorizedResponse({ description: 'JWT manquant ou expiré' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('marketplace/quote-requests')
export class QuoteRequestsController {
  constructor(private service: QuoteRequestsService) {}

  @Get()
  @Roles(...RFQ_VIEW)
  @ApiOperation({
    summary: 'Liste des demandes de devis (scoping automatique par rôle)',
    description:
      'MARKETPLACE_BUYER : uniquement ses propres RFQ. ' +
      'MARKETPLACE_SELLER : RFQ sur ses offres. ' +
      'ADMIN/COORDINATOR/QUALITY_MANAGER : toutes les RFQ. ' +
      'FSM statuts : NEW | QUALIFIED | QUOTED | NEGOTIATING | WON | LOST | CANCELLED. ' +
      'WON, LOST, CANCELLED sont terminaux.',
  })
  @ApiOkResponse({ type: PaginatedQuoteRequestsDto })
  @ApiForbiddenResponse({ description: 'Rôle insuffisant' })
  findAll(@Query() query: QueryQuoteRequestsDto, @CurrentUser() actor: RequestUser) {
    return this.service.findAll(query, actor);
  }

  @Get(':id')
  @Roles(...RFQ_VIEW)
  @ApiOperation({
    summary: "Détail d'une demande de devis",
    description:
      'Retourne la RFQ complète avec son offre et ses messages. ' +
      'Ownership : buyer voit ses RFQ, seller voit ses RFQ reçues.',
  })
  @ApiParam({ name: 'id', description: 'UUID de la demande de devis' })
  @ApiOkResponse({ type: QuoteRequestResponseDto })
  @ApiNotFoundResponse({ description: 'RFQ introuvable ou accès refusé' })
  @ApiForbiddenResponse({ description: 'Ownership non respectée' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: RequestUser) {
    return this.service.findById(id, actor);
  }

  @Post()
  @Roles(...RFQ_CREATE)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Créer une demande de devis sur une offre publiée',
    description:
      'Crée une RFQ sur une offre marketplace publiée (visibility ≠ PRIVATE). ' +
      'Statut initial : NEW. Rate-limit : 5 créations / minute par IP. ' +
      'Rôles : MARKETPLACE_BUYER, ADMIN, COORDINATOR.',
  })
  @ApiCreatedResponse({ type: QuoteRequestResponseDto })
  @ApiBadRequestResponse({ description: 'Offre non publiée / visibility PRIVATE / données invalides' })
  @ApiForbiddenResponse({ description: 'Rôle MARKETPLACE_BUYER (ou admin) requis' })
  create(@Body() dto: CreateQuoteRequestDto, @CurrentUser() actor: RequestUser) {
    return this.service.create(dto, actor);
  }

  @Patch(':id/status')
  @Roles(...RFQ_VIEW)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Changer le statut d'une RFQ (transitions contrôlées par FSM)",
    description:
      'Transitions FSM autorisées : ' +
      'NEW → QUALIFIED | LOST | CANCELLED ; ' +
      'QUALIFIED → QUOTED | LOST | CANCELLED ; ' +
      'QUOTED → NEGOTIATING | WON | LOST | CANCELLED ; ' +
      'NEGOTIATING → WON | LOST | CANCELLED. ' +
      'WON, LOST, CANCELLED sont terminaux — aucune transition possible depuis ces statuts. ' +
      'Une transition invalide retourne 400 avec le message FSM.',
  })
  @ApiParam({ name: 'id', description: 'UUID de la demande de devis' })
  @ApiOkResponse({ type: QuoteRequestResponseDto })
  @ApiBadRequestResponse({ description: 'Transition FSM invalide (ex: WON → CANCELLED impossible)' })
  @ApiNotFoundResponse({ description: 'RFQ introuvable' })
  @ApiForbiddenResponse({ description: 'Ownership non respectée ou rôle insuffisant' })
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
  @ApiOperation({
    summary: 'Assigner la RFQ à un membre staff',
    description:
      'Assigne la RFQ à un utilisateur interne. ' +
      'Passer `assignedToUserId: null` pour désassigner. ' +
      'Rôles : ADMIN, COORDINATOR, QUALITY_MANAGER.',
  })
  @ApiParam({ name: 'id', description: 'UUID de la demande de devis' })
  @ApiOkResponse({ type: QuoteRequestResponseDto })
  @ApiNotFoundResponse({ description: 'RFQ introuvable' })
  @ApiForbiddenResponse({ description: 'Rôle staff requis' })
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignQuoteRequestDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.assign(id, dto, actor);
  }

  // ─── Alerts (admin) ──────────────────────────────────────────────────────

  @Get('alerts/stale')
  @Roles(...RFQ_ASSIGN)
  @ApiOperation({
    summary: 'RFQ stagnantes (>7j sans transition) — admin/staff only',
    description:
      'Retourne les RFQ dont le statut n\'a pas évolué depuis plus de 7 jours. ' +
      'Utile pour les relances. Rôles : ADMIN, COORDINATOR, QUALITY_MANAGER.',
  })
  @ApiOkResponse({ type: [QuoteRequestResponseDto] })
  @ApiForbiddenResponse({ description: 'Rôle staff requis' })
  staleAlerts() {
    return this.service.findStaleAlerts();
  }

  // ─── Messages ────────────────────────────────────────────────────────────

  @Get(':id/messages')
  @Roles(...RFQ_VIEW)
  @ApiOperation({
    summary: 'Fil de discussion (notes internes masquées côté buyer)',
    description:
      'Retourne les messages de la RFQ. ' +
      'Les notes internes (`isInternalNote: true`) sont visibles uniquement au staff. ' +
      'Buyer et seller voient uniquement les messages non-internes. ' +
      'La conversation reste accessible même si la RFQ est en statut terminal.',
  })
  @ApiParam({ name: 'id', description: 'UUID de la demande de devis' })
  @ApiOkResponse({ type: [QuoteRequestMessageResponseDto] })
  @ApiNotFoundResponse({ description: 'RFQ introuvable ou accès refusé' })
  findMessages(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: RequestUser) {
    return this.service.findMessages(id, actor);
  }

  @Post(':id/messages')
  @Roles(...RFQ_VIEW)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Ajouter un message ou une note interne staff',
    description:
      'Ajoute un message à la conversation de la RFQ. ' +
      '`isInternalNote: true` → note staff uniquement (buyer ne voit pas). ' +
      'Rate-limit : 20 messages / minute. ' +
      'La conversation reste ouverte même si la RFQ est terminale (WON/LOST/CANCELLED) ' +
      '— envoi possible pour garder l\'historique, même après fermeture.',
  })
  @ApiParam({ name: 'id', description: 'UUID de la demande de devis' })
  @ApiCreatedResponse({ type: QuoteRequestMessageResponseDto })
  @ApiBadRequestResponse({ description: 'Message vide ou trop long (max 4000 caractères)' })
  @ApiNotFoundResponse({ description: 'RFQ introuvable ou accès refusé' })
  addMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateQuoteRequestMessageDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.service.addMessage(id, dto, actor);
  }
}
