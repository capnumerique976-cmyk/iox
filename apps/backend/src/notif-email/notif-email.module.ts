// MP-NOTIF-1 phase 1 — Module emails transactionnels.
// MP-NOTIF-2 phase 2 — +DatabaseModule (persistance EmailLog),
//                      +ResendEmailTransport (provider production).
//
// Exporte uniquement `NotifEmailService` (les transports + factory sont
// internes). `MockEmailTransport` est aussi exporté pour permettre aux
// tests d'injecter le même singleton et asserter sur `getSent()`.

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from '../database/database.module';
import { NotifEmailService } from './notif-email.service';
import { NotifEmailRetryService } from './notif-email-retry.service';
import { NotifEmailController } from './notif-email.controller';
import { NotifEmailTransportFactory } from './transport.factory';
import { MockEmailTransport } from './transports/mock.transport';
import { SmtpStreamEmailTransport } from './transports/smtp-stream.transport';
import { ResendEmailTransport } from './transports/resend.transport';
import { UnsubscribeService } from './unsubscribe.service';
import { UnsubscribeController } from './unsubscribe.controller';
import { NotifEmailMePreferencesController } from './me-preferences.controller';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    // MP-NOTIF-3 phase 7 — ScheduleModule for cron-based retry.
    ScheduleModule.forRoot(),
    // MP-NOTIF-2 — JwtModule local pour signer/vérifier les tokens
    // unsubscribe ; le secret est résolu dynamiquement dans
    // `UnsubscribeService.resolveSecret`.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => ({}),
    }),
  ],
  controllers: [UnsubscribeController, NotifEmailController, NotifEmailMePreferencesController],
  providers: [
    MockEmailTransport,
    SmtpStreamEmailTransport,
    ResendEmailTransport,
    NotifEmailTransportFactory,
    UnsubscribeService,
    NotifEmailService,
    NotifEmailRetryService,
  ],
  exports: [NotifEmailService, MockEmailTransport, UnsubscribeService],
})
export class NotifEmailModule {}
