// MP-NOTIF-1 phase 1 — Service emails transactionnels.
//
// Pipeline :
//   1. Validation minimale (`to` non vide).
//   2. Si `templateId` : résolution dans le registry + rendu (subject/html/text)
//      à partir de `templateData`. Erreur typée si template inconnu.
//   3. Sinon : utilise les `subject/html/text` fournis (mode raw, surtout tests).
//   4. Délégation au transport actif (mock par défaut).
//
// Toutes les erreurs métier sont retournées en `SendEmailResult { success:
// false, error }` — le service NE THROW PAS pour ne pas casser les
// services métier (try/catch côté appelant facultatif).

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  SendEmailInput,
  SendEmailResult,
  RenderedEmail,
} from './notif-email.types';
import { NotifEmailError } from './notif-email.types';
import { NotifEmailTransportFactory } from './transport.factory';
import { getTemplate } from './templates';

@Injectable()
export class NotifEmailService {
  private readonly logger = new Logger(NotifEmailService.name);

  constructor(
    private readonly factory: NotifEmailTransportFactory,
    private readonly config: ConfigService,
  ) {}

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const transport = this.factory.resolve();

    try {
      const rendered = this.render(input);

      const { messageId } = await transport.send(rendered);
      this.logger.log(
        `email sent transport=${transport.name} messageId=${messageId} to=${rendered.to.join(',')} subject="${rendered.subject}"`,
      );
      return { success: true, messageId, transport: transport.name };
    } catch (err) {
      if (err instanceof NotifEmailError) {
        this.logger.warn(`email blocked code=${err.code} message=${err.message}`);
        return {
          success: false,
          messageId: '',
          transport: transport.name,
          error: err.code,
        };
      }
      const msg = err instanceof Error ? err.message : 'unknown';
      this.logger.error(`email transport failure transport=${transport.name} error=${msg}`);
      return {
        success: false,
        messageId: '',
        transport: transport.name,
        error: 'TRANSPORT_FAILURE',
      };
    }
  }

  private render(input: SendEmailInput): RenderedEmail {
    const to = this.normalizeRecipients(input.to);
    if (to.length === 0) {
      throw new NotifEmailError('NO_RECIPIENT', 'Aucun destinataire');
    }

    const from = input.from ?? this.config.get<string>('NOTIF_EMAIL_FROM') ?? 'noreply@iox.mch';
    const replyTo = input.replyTo ?? this.config.get<string>('NOTIF_EMAIL_REPLY_TO') ?? undefined;

    if (input.templateId) {
      const template = getTemplate(input.templateId);
      if (!template) {
        throw new NotifEmailError(
          'TEMPLATE_NOT_FOUND',
          `Template inconnu: ${input.templateId}`,
        );
      }
      const data = input.templateData ?? {};
      return {
        to,
        from,
        replyTo,
        subject: template.subject(data),
        html: template.html(data),
        text: template.text(data),
      };
    }

    if (!input.subject || (!input.html && !input.text)) {
      throw new NotifEmailError(
        'INVALID_INPUT',
        'subject + (html ou text) requis hors templateId',
      );
    }
    return {
      to,
      from,
      replyTo,
      subject: input.subject,
      html: input.html ?? '',
      text: input.text ?? '',
    };
  }

  private normalizeRecipients(to: string | string[]): string[] {
    const list = Array.isArray(to) ? to : [to];
    return list
      .map((s) => (typeof s === 'string' ? s.trim() : ''))
      .filter((s) => s.length > 0);
  }
}
