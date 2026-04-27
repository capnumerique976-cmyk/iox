// MP-NOTIF-1 phase 1 — Module emails transactionnels.
//
// Exporte uniquement `NotifEmailService` (les transports + factory sont
// internes). Aucun consumer ne doit dépendre directement d'un transport.
// `MockEmailTransport` est aussi exporté pour permettre aux tests
// d'injecter le même singleton et asserter sur `getSent()`.

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotifEmailService } from './notif-email.service';
import { NotifEmailTransportFactory } from './transport.factory';
import { MockEmailTransport } from './transports/mock.transport';
import { SmtpStreamEmailTransport } from './transports/smtp-stream.transport';

@Module({
  imports: [ConfigModule],
  providers: [
    MockEmailTransport,
    SmtpStreamEmailTransport,
    NotifEmailTransportFactory,
    NotifEmailService,
  ],
  exports: [NotifEmailService, MockEmailTransport],
})
export class NotifEmailModule {}
