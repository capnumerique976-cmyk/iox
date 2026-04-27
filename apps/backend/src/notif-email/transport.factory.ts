// MP-NOTIF-1 phase 1 — Factory du transport email actif.
//
// Sélection via `NOTIF_EMAIL_TRANSPORT` :
//   - `mock` (défaut) : MockEmailTransport (in-memory, tests + démo)
//   - `smtp-stream`   : SmtpStreamEmailTransport (sérialisation MIME nodemailer
//                       sans socket — diagnostic local)
//
// **Aucun transport ne fait d'I/O réseau dans cette phase 1.** Les
// transports réels (Resend / SES / Mailgun) seront ajoutés en phase 2
// avec un EmailLog persistant.

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EmailTransport, NotifEmailTransportName } from './notif-email.types';
import { MockEmailTransport } from './transports/mock.transport';
import { SmtpStreamEmailTransport } from './transports/smtp-stream.transport';

export const NOTIF_EMAIL_TRANSPORT_TOKEN = 'NOTIF_EMAIL_TRANSPORT';

@Injectable()
export class NotifEmailTransportFactory {
  private readonly logger = new Logger(NotifEmailTransportFactory.name);

  constructor(
    private readonly mockTransport: MockEmailTransport,
    private readonly smtpStreamTransport: SmtpStreamEmailTransport,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  resolve(): EmailTransport {
    const name = this.normalize(this.config.get<string>('NOTIF_EMAIL_TRANSPORT'));
    switch (name) {
      case 'smtp-stream':
        this.logger.debug('Active transport: smtp-stream');
        return this.smtpStreamTransport;
      case 'mock':
      default:
        this.logger.debug('Active transport: mock');
        return this.mockTransport;
    }
  }

  private normalize(raw: string | undefined): NotifEmailTransportName {
    const v = (raw ?? '').trim().toLowerCase();
    if (v === 'smtp-stream' || v === 'mock') return v;
    return 'mock';
  }
}
