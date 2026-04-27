// MP-NOTIF-2 phase 2 — Transport Resend (production).
//
// Wrappe le SDK officiel `resend`. Activé via env
// `NOTIF_EMAIL_TRANSPORT=resend` + `RESEND_API_KEY=<key>`.
//
// **Aucun appel réseau dans les tests** : le SDK est mocké via
// `jest.mock('resend', ...)`.

import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import type { EmailTransport, RenderedEmail } from '../notif-email.types';

export const RESEND_CLIENT_FACTORY = Symbol('RESEND_CLIENT_FACTORY');

/**
 * Factory injectable du client Resend — permet aux tests de
 * remplacer la construction par un mock sans toucher à `resend` au
 * niveau du module.
 */
export type ResendClientFactory = (apiKey: string) => Resend;

const defaultResendFactory: ResendClientFactory = (apiKey) => new Resend(apiKey);

@Injectable()
export class ResendEmailTransport implements EmailTransport {
  readonly name = 'resend' as const;
  private readonly logger = new Logger(ResendEmailTransport.name);
  private readonly client: Resend | null;
  private readonly fromOverride: string | null;

  constructor(
    config: ConfigService,
    @Optional()
    @Inject(RESEND_CLIENT_FACTORY)
    factory?: ResendClientFactory,
  ) {
    const apiKey = config.get<string>('RESEND_API_KEY') ?? '';
    if (!apiKey) {
      // On ne throw PAS au constructeur (le DI Nest instancie le provider
      // au boot du module, même si on n'utilise jamais Resend). On garde
      // le client null et on throw seulement à l'usage : `send()`.
      this.client = null;
    } else {
      const make = factory ?? defaultResendFactory;
      this.client = make(apiKey);
    }
    this.fromOverride = config.get<string>('NOTIF_EMAIL_FROM') ?? null;
  }

  async send(message: RenderedEmail): Promise<{ messageId: string }> {
    if (!this.client) {
      throw new Error('RESEND_API_KEY missing — Resend transport is not configured');
    }
    const result = await this.client.emails.send({
      from: message.from,
      to: message.to,
      replyTo: message.replyTo,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    if (result.error) {
      const code = result.error.name ?? 'RESEND_ERROR';
      const msg = result.error.message ?? 'unknown';
      this.logger.warn(`[resend] send failed code=${code} message=${msg}`);
      throw new Error(`${code}: ${msg}`);
    }
    const messageId = result.data?.id ?? '';
    this.logger.debug(
      `[resend] sent messageId=${messageId} to=${message.to.join(',')} subject="${message.subject}"`,
    );
    return { messageId };
  }
}
