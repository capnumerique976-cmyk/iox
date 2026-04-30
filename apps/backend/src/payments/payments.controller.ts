// PAY-1 phase 1 — Payments controller.
//
// Endpoints :
//  - POST /payments/connect/onboarding-link  (seller)
//  - POST /payments/connect/refresh-status   (seller)
//  - GET  /payments/connect/account-status   (seller)
//  - POST /payments/webhook                  (Stripe → backend, signature header)
//
// LOT 3 ajoutera POST /payments/checkout-session (buyer).

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Public, Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, RequestUser } from '@iox/shared';
import { CreateCheckoutSessionDto, GenerateOnboardingLinkDto } from './dto/payments.dto';
import { PaymentsService } from './payments.service';
import { PaymentsWebhookService } from './payments-webhook.service';
import { StripeOnboardingService } from './stripe-onboarding.service';
import { STRIPE_CLIENT, type StripeClientWrapper } from './stripe.factory';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly onboarding: StripeOnboardingService,
    private readonly payments: PaymentsService,
    private readonly webhookHandler: PaymentsWebhookService,
    private readonly config: ConfigService,
    @Inject(STRIPE_CLIENT) private readonly stripeWrapper: StripeClientWrapper,
  ) {}

  // ─── Onboarding Stripe Connect Express ───────────────────────────────────

  @Post('connect/onboarding-link')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @Roles(UserRole.MARKETPLACE_SELLER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Génère un AccountLink Stripe pour onboarding seller' })
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
  @ApiOperation({ summary: 'Sync le status compte Stripe depuis Stripe → DB' })
  async refreshStatus(@CurrentUser() actor: RequestUser) {
    const sellerProfileId = actor.sellerProfileIds[0];
    if (!sellerProfileId) {
      throw new BadRequestException('Aucun profil vendeur rattaché à votre compte');
    }
    return this.onboarding.syncAccountStatus(sellerProfileId, actor);
  }

  // ─── Buyer checkout (LOT 3) ──────────────────────────────────────────────

  @Post('checkout-session')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @Roles(UserRole.MARKETPLACE_BUYER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Crée une Stripe Checkout Session pour payer une RFQ WON' })
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

  @Get('connect/account-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @Roles(UserRole.MARKETPLACE_SELLER)
  @ApiOperation({ summary: 'Lecture status compte Stripe (sans appel Stripe)' })
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
  // V1 : log + 200. V3 (LOT 3) : update Payment + SellerStripeAccount selon event type.

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook Stripe (signature requise dans header stripe-signature)' })
  async webhook(
    @Headers('stripe-signature') signature: string | undefined,
    @Req() req: Request,
  ) {
    if (!signature) {
      throw new BadRequestException('Signature Stripe manquante');
    }
    if (!this.stripeWrapper.isConfigured()) {
      throw new BadRequestException('Stripe non configuré côté serveur');
    }
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new BadRequestException('STRIPE_WEBHOOK_SECRET non configuré');
    }

    // Body raw requis pour vérif signature (cf. main.ts json verify hook).
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!rawBody) {
      throw new BadRequestException(
        'Body raw indisponible (raw-body parser non câblé)',
      );
    }

    let event;
    try {
      event = this.stripeWrapper.client().webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      this.logger.warn(`Webhook signature verification failed: ${msg}`);
      throw new BadRequestException(`Webhook signature invalide: ${msg}`);
    }

    this.logger.log(`Webhook received type=${event.type} id=${event.id}`);
    // Cast au shape minimal du PaymentsWebhookService (cf. service pour
     // l'historique Stripe SDK 22.x typing quirks).
    const result = await this.webhookHandler.handleEvent(
      event as unknown as Parameters<typeof this.webhookHandler.handleEvent>[0],
    );
    return { received: true, type: event.type, ...result };
  }
}
