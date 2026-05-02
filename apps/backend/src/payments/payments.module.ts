// PAY-1 phase 1 — Payments module.
// PAY-2 — +AuditModule, +NotifEmailModule, +InvoicesService, +InvoicesController.

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';
import { AuditModule } from '../audit/audit.module';
import { NotifEmailModule } from '../notif-email/notif-email.module';
import { PaymentsController } from './payments.controller';
import { InvoicesController } from './invoices.controller';
import { PaymentsService } from './payments.service';
import { PaymentsWebhookService } from './payments-webhook.service';
import { StripeOnboardingService } from './stripe-onboarding.service';
import { InvoicesService } from './invoices.service';
import { stripeClientProvider } from './stripe.factory';

@Module({
  imports: [ConfigModule, DatabaseModule, CommonModule, AuditModule, NotifEmailModule],
  controllers: [PaymentsController, InvoicesController],
  providers: [
    PaymentsService,
    PaymentsWebhookService,
    StripeOnboardingService,
    InvoicesService,
    stripeClientProvider,
  ],
  exports: [PaymentsService, PaymentsWebhookService, StripeOnboardingService, InvoicesService],
})
export class PaymentsModule {}
