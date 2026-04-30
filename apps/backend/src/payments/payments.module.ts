// PAY-1 phase 1 — Payments module.

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsWebhookService } from './payments-webhook.service';
import { StripeOnboardingService } from './stripe-onboarding.service';
import { stripeClientProvider } from './stripe.factory';

@Module({
  imports: [ConfigModule, DatabaseModule, CommonModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentsWebhookService,
    StripeOnboardingService,
    stripeClientProvider,
  ],
  exports: [PaymentsService, PaymentsWebhookService, StripeOnboardingService],
})
export class PaymentsModule {}
