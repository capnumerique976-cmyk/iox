// PAY-1 phase 1 — Payments controller.
//
// Endpoints :
//  - POST /payments/connect/onboarding-link  (seller)
//  - POST /payments/connect/refresh-status   (seller)
//  - GET  /payments/connect/account-status   (seller)
//  - POST /payments/checkout-session         (buyer)
//  - POST /payments/:id/refund               (admin + seller)
//  - POST /payments/webhook                  (Stripe → backend, signature header)

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Public, Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, RequestUser } from '@iox/shared';
import { CreateCheckoutSessionDto, GenerateOnboardingLinkDto, RefundPaymentDto } from './dto/payments.dto';
import { PaymentsService } from './payments.service';
import { PaymentsWebhookService } from './payments-webhook.service';
import { StripeOnboardingService } from './stripe-onboarding.service';
import {
  WebhookSignatureError,
  PaymentProviderNotConfiguredError,
} from './provider/payment-provider.errors';
import {
  OnboardingLinkResponseDto,
  PaymentCheckoutResponseDto,
  RefundResponseDto,
  StripeAccountStatusDto,
  WebhookAckDto,
} from '../common/dto/swagger-responses.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly onboarding: StripeOnboardingService,
    private readonly payments: PaymentsService,
    private readonly webhookHandler: PaymentsWebhookService,
  ) {}

  // ─── Onboarding Stripe Connect Express ───────────────────────────────────

  @Post('connect/onboarding-link')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @Roles(UserRole.MARKETPLACE_SELLER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Génère un AccountLink Stripe pour onboarding seller',
    description:
      'Crée un AccountLink Stripe Express permettant au seller de compléter son onboarding Stripe. ' +
      'Accessible uniquement au MARKETPLACE_SELLER authentifié. ' +
      'Le lien est à usage unique et expire rapidement — ne pas stocker.',
  })
  @ApiOkResponse({ type: OnboardingLinkResponseDto })
  @ApiBadRequestResponse({ description: 'Aucun profil vendeur rattaché au compte' })
  @ApiForbiddenResponse({ description: 'Rôle MARKETPLACE_SELLER requis' })
  @ApiUnauthorizedResponse({ description: 'JWT manquant ou expiré' })
  async generateOnboardingLink(
    @Body() dto: GenerateOnboardingLinkDto,
    @CurrentUser() actor: RequestUser,
  ) {
    const sellerProfileId = actor.sellerProfileIds[0];
    if (!sellerProfileId) {
      throw new BadRequestException('Aucun profil vendeur rattaché à votre compte');
    }
    return this.onboarding.generateOnboardingLink(
      sellerProfileId,
      dto.returnUrl,
      dto.refreshUrl,
      actor,
    );
  }

  @Post('connect/refresh-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @Roles(UserRole.MARKETPLACE_SELLER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sync le status compte Stripe depuis Stripe → DB',
    description:
      'Appelle l\'API Stripe pour récupérer le statut du compte Connect du seller ' +
      'et met à jour la base de données (chargesEnabled, payoutsEnabled, detailsSubmitted).',
  })
  @ApiOkResponse({ type: StripeAccountStatusDto })
  @ApiBadRequestResponse({ description: 'Aucun profil vendeur rattaché au compte' })
  @ApiForbiddenResponse({ description: 'Rôle MARKETPLACE_SELLER requis' })
  @ApiUnauthorizedResponse({ description: 'JWT manquant ou expiré' })
  async refreshStatus(@CurrentUser() actor: RequestUser) {
    const sellerProfileId = actor.sellerProfileIds[0];
    if (!sellerProfileId) {
      throw new BadRequestException('Aucun profil vendeur rattaché à votre compte');
    }
    return this.onboarding.syncAccountStatus(sellerProfileId, actor);
  }

  // ─── Buyer checkout ──────────────────────────────────────────────────────

  @Post('checkout-session')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @Roles(UserRole.MARKETPLACE_BUYER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Crée une Stripe Checkout Session pour payer une RFQ WON',
    description:
      'Initie le flux de paiement Stripe Connect pour une RFQ dont le statut est WON. ' +
      'Conditions : la RFQ doit appartenir au buyer authentifié, le seller doit avoir ' +
      'son compte Stripe Connect actif (chargesEnabled=true). ' +
      'Devises acceptées : EUR, USD (case-insensitive). ' +
      'Commission IOX : 5% du montant brut (application_fee_amount). ' +
      'Retourne l\'URL Stripe Checkout à rediriger côté frontend.',
  })
  @ApiOkResponse({ type: PaymentCheckoutResponseDto })
  @ApiBadRequestResponse({
    description:
      'RFQ non en statut WON | buyer ne possède pas la RFQ | ' +
      'seller non configuré Stripe | devise non supportée (hors EUR/USD)',
  })
  @ApiForbiddenResponse({ description: 'Rôle MARKETPLACE_BUYER requis' })
  @ApiUnauthorizedResponse({ description: 'JWT manquant ou expiré' })
  async createCheckoutSession(
    @Body() dto: CreateCheckoutSessionDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.payments.createCheckoutSession(
      {
        quoteRequestId: dto.quoteRequestId,
        marketplaceOfferId: dto.marketplaceOfferId,
        amountCents: dto.amountCents,
        currency: dto.currency,
        returnUrl: dto.returnUrl,
        cancelUrl: dto.cancelUrl,
      },
      actor,
    );
  }

  // ─── PAY-2 — Refund ──────────────────────────────────────────────────────

  @Post(':id/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.MARKETPLACE_SELLER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rembourser un paiement (total ou partiel)',
    description:
      'Déclenche un remboursement Stripe sur un paiement en statut SUCCEEDED. ' +
      'Si `amountCents` est omis : remboursement total. ' +
      'Ownership : ADMIN/COORDINATOR = accès global ; MARKETPLACE_SELLER = uniquement ses paiements. ' +
      'Statut final : REFUNDED. Journalisé dans l\'audit.',
  })
  @ApiParam({ name: 'id', description: 'UUID du paiement à rembourser' })
  @ApiOkResponse({ type: RefundResponseDto })
  @ApiBadRequestResponse({ description: 'Paiement non en statut SUCCEEDED' })
  @ApiForbiddenResponse({ description: 'Seller non propriétaire du paiement' })
  @ApiNotFoundResponse({ description: 'Paiement introuvable' })
  @ApiUnauthorizedResponse({ description: 'JWT manquant ou expiré' })
  async refund(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RefundPaymentDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.payments.refund(id, dto, actor);
  }

  @Get('connect/account-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @Roles(UserRole.MARKETPLACE_SELLER)
  @ApiOperation({
    summary: 'Lecture status compte Stripe (sans appel Stripe)',
    description:
      'Retourne le statut Stripe Connect stocké en base (pas d\'appel Stripe en temps réel). ' +
      'Pour forcer la synchronisation, utiliser POST /payments/connect/refresh-status.',
  })
  @ApiOkResponse({ type: StripeAccountStatusDto })
  @ApiBadRequestResponse({ description: 'Aucun profil vendeur rattaché au compte' })
  @ApiForbiddenResponse({ description: 'Rôle MARKETPLACE_SELLER requis' })
  @ApiUnauthorizedResponse({ description: 'JWT manquant ou expiré' })
  async getAccountStatus(@CurrentUser() actor: RequestUser) {
    const sellerProfileId = actor.sellerProfileIds[0];
    if (!sellerProfileId) {
      throw new BadRequestException('Aucun profil vendeur rattaché à votre compte');
    }
    const account = await this.onboarding.getAccountStatus(sellerProfileId, actor);
    return account ?? { status: 'PENDING_ONBOARDING', chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false };
  }

  // ─── Webhook Stripe ──────────────────────────────────────────────────────
  // Stripe envoie ses events ici. Vérification signature obligatoire.

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook Stripe (signature requise dans header stripe-signature)',
    description:
      '**Endpoint interne — NE PAS appeler depuis le frontend.** ' +
      'Reçoit les events Stripe (payment_intent.succeeded, checkout.session.completed, ' +
      'account.updated, etc.). ' +
      'La signature HMAC dans le header `stripe-signature` est vérifiée avec STRIPE_WEBHOOK_SECRET. ' +
      'Si la vérification échoue → 400. ' +
      'Events traités : payment_intent.succeeded/payment_failed, checkout.session.completed, account.updated.',
  })
  @ApiHeader({
    name: 'stripe-signature',
    required: true,
    description: 'Signature HMAC Stripe (générée par Stripe, vérifiée côté backend)',
  })
  @ApiOkResponse({ type: WebhookAckDto })
  @ApiBadRequestResponse({ description: 'Signature manquante ou invalide | Body raw indisponible' })
  async webhook(
    @Headers('stripe-signature') signature: string | undefined,
    @Req() req: Request,
  ) {
    if (!signature) {
      throw new BadRequestException('Signature Stripe manquante');
    }

    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!rawBody) {
      throw new BadRequestException('Body raw indisponible (raw-body parser non câblé)');
    }

    let result: { handled: boolean; action: string; eventType: string };
    try {
      result = await this.webhookHandler.receiveRaw(rawBody, signature);
    } catch (err) {
      if (err instanceof WebhookSignatureError) {
        this.logger.warn(`Webhook signature verification failed: ${err.message}`);
        throw new BadRequestException(`Webhook signature invalide: ${err.message}`);
      }
      if (err instanceof PaymentProviderNotConfiguredError) {
        throw new BadRequestException('Stripe non configuré côté serveur');
      }
      throw err;
    }

    return { received: true, type: result.eventType, ...result };
  }
}
