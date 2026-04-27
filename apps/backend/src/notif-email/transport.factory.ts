// MP-NOTIF-1 phase 1 — Factory du transport email actif.
// MP-NOTIF-2 phase 2 — +Resend (production-ready, behind feature flag).
//
// Sélection via `NOTIF_EMAIL_TRANSPORT` :
//   - `mock` (défaut)  : MockEmailTransport (in-memory, tests + démo).
//   - `smtp-stream`    : SmtpStreamEmailTransport (sérialisation MIME
//                        nodemailer sans socket — diagnostic local).
//   - `resend`         : ResendEmailTransport (provider HTTPS Resend).
//                        Throw au boot si `RESEND_API_KEY` absent.
//
// Garde-fou : seul `resend` fait potentiellement de l'I/O réseau. Les
// tests injectent un mock du SDK via `RESEND_CLIENT_FACTORY`.

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EmailTransport, NotifEmailTransportName } from './notif-email.types';
import { MockEmailTransport } from './transports/mock.transport';
import { SmtpStreamEmailTransport } from './transports/smtp-stream.transport';
import { ResendEmailTransport } from './transports/resend.transport';

export const NOTIF_EMAIL_TRANSPORT_TOKEN = 'NOTIF_EMAIL_TRANSPORT';

@Injectable()
export class NotifEmailTransportFactory {
  private readonly logger = new Logger(NotifEmailTransportFactory.name);

  constructor(
    private readonly mockTransport: MockEmailTransport,
    private readonly smtpStreamTransport: SmtpStreamEmailTransport,
    private readonly resendTransport: ResendEmailTransport,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  resolve(): EmailTransport {
    const name = this.normalize(this.config.get<string>('NOTIF_EMAIL_TRANSPORT'));
    switch (name) {
      case 'smtp-stream':
        this.logger.debug('Active transport: smtp-stream');
        return this.smtpStreamTransport;
      case 'resend': {
        const apiKey = this.config.get<string>('RESEND_API_KEY') ?? '';
        if (!apiKey) {
          throw new Error(
            'NOTIF_EMAIL_TRANSPORT=resend mais RESEND_API_KEY manquant — ajouter la clé ou repasser sur mock/smtp-stream',
          );
        }
        this.logger.debug('Active transport: resend');
        return this.resendTransport;
      }
      case 'mock':
      default:
        this.logger.debug('Active transport: mock');
        return this.mockTransport;
    }
  }

  private normalize(raw: string | undefined): NotifEmailTransportName {
    const v = (raw ?? '').trim().toLowerCase();
    if (v === 'smtp-stream' || v === 'mock' || v === 'resend') return v;
    return 'mock';
  }
}
