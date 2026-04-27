// MP-NOTIF-1 phase 1 — Module emails transactionnels.
// MP-NOTIF-2 phase 2 — +DatabaseModule (persistance EmailLog),
//                      +ResendEmailTransport (provider production).
//
// Exporte uniquement `NotifEmailService` (les transports + factory sont
// internes). `MockEmailTransport` est aussi exporté pour permettre aux
// tests d'injecter le même singleton et asserter sur `getSent()`.

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { NotifEmailService } from './notif-email.service';
import { NotifEmailTransportFactory } from './transport.factory';
import { MockEmailTransport } from './transports/mock.transport';
import { SmtpStreamEmailTransport } from './transports/smtp-stream.transport';
import { ResendEmailTransport } from './transports/resend.transport';

@Module({
  imports: [ConfigModule, DatabaseModule],
  providers: [
    MockEmailTransport,
    SmtpStreamEmailTransport,
    ResendEmailTransport,
    NotifEmailTransportFactory,
    NotifEmailService,
  ],
  exports: [NotifEmailService, MockEmailTransport],
})
export class NotifEmailModule {}
