// MP-NOTIF-1 phase 1 — Service emails transactionnels.
// MP-NOTIF-2 phase 2 — Persistance audit trail (`email_logs`) +
// préparation à l'unsubscribe (LOT 2 ajoutera le check pré-envoi).
//
// Pipeline :
//   1. Validation minimale (`to` non vide).
//   2. Si `templateId` : résolution dans le registry + rendu
//      (subject/html/text) à partir de `templateData`.
//   3. Sinon : utilise les `subject/html/text` fournis (mode raw).
//   4. Délégation au transport actif (mock par défaut).
//   5. Persistance EmailLog (succès, échec, ou skip) — non bloquante.
//
// Toutes les erreurs métier sont retournées en `SendEmailResult` — le
// service NE THROW PAS pour ne pas casser les services métier.

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailLogStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type {
  SendEmailInput,
  SendEmailResult,
  RenderedEmail,
  NotifEmailTransportName,
} from './notif-email.types';
import { NotifEmailError } from './notif-email.types';
import { NotifEmailTransportFactory } from './transport.factory';
import { getTemplate } from './templates';

interface PersistLogArgs {
  transport: NotifEmailTransportName;
  templateId: string;
  recipientEmail: string;
  recipientUserId?: string;
  subject: string;
  status: EmailLogStatus;
  errorCode?: string;
  errorMessage?: string;
  providerMessageId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class NotifEmailService {
  private readonly logger = new Logger(NotifEmailService.name);

  constructor(
    private readonly factory: NotifEmailTransportFactory,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const transport = this.factory.resolve();
    const templateIdForLog = input.templateId ?? 'raw';

    try {
      const rendered = this.render(input);

      const { messageId } = await transport.send(rendered);
      this.logger.log(
        `email sent transport=${transport.name} messageId=${messageId} to=${rendered.to.join(',')} subject="${rendered.subject}"`,
      );

      // MP-NOTIF-2 — persistance audit (1 log par destinataire).
      for (const recipient of rendered.to) {
        await this.persistLog({
          transport: transport.name,
          templateId: templateIdForLog,
          recipientEmail: recipient,
          recipientUserId: input.recipientUserId,
          subject: rendered.subject,
          status: EmailLogStatus.SENT,
          providerMessageId: messageId,
          metadata: input.metadata,
        });
      }

      return { success: true, messageId, transport: transport.name };
    } catch (err) {
      const recipientForLog = this.normalizeRecipients(input.to)[0] ?? '';
      const subjectForLog =
        (input.templateId ? `[template:${input.templateId}]` : input.subject) ?? 'unknown';
      if (err instanceof NotifEmailError) {
        this.logger.warn(`email blocked code=${err.code} message=${err.message}`);
        await this.persistLog({
          transport: transport.name,
          templateId: templateIdForLog,
          recipientEmail: recipientForLog,
          recipientUserId: input.recipientUserId,
          subject: subjectForLog,
          status: EmailLogStatus.FAILED,
          errorCode: err.code,
          errorMessage: err.message,
          metadata: input.metadata,
        });
        return {
          success: false,
          messageId: '',
          transport: transport.name,
          error: err.code,
        };
      }
      const msg = err instanceof Error ? err.message : 'unknown';
      this.logger.error(`email transport failure transport=${transport.name} error=${msg}`);
      await this.persistLog({
        transport: transport.name,
        templateId: templateIdForLog,
        recipientEmail: recipientForLog,
        recipientUserId: input.recipientUserId,
        subject: subjectForLog,
        status: EmailLogStatus.FAILED,
        errorCode: 'TRANSPORT_FAILURE',
        errorMessage: msg,
        metadata: input.metadata,
      });
      return {
        success: false,
        messageId: '',
        transport: transport.name,
        error: 'TRANSPORT_FAILURE',
      };
    }
  }

  /**
   * MP-NOTIF-2 — Persiste une entrée `email_logs`. Une défaillance ici
   * NE doit PAS casser le retour de `send()` — log warn et on continue.
   * Cas typique : DB indisponible ; on préfère perdre l'audit trail
   * plutôt que faire échouer un workflow métier critique.
   */
  private async persistLog(args: PersistLogArgs): Promise<void> {
    try {
      await this.prisma.emailLog.create({
        data: {
          transport: args.transport,
          templateId: args.templateId,
          recipientEmail: args.recipientEmail,
          recipientUserId: args.recipientUserId,
          subject: args.subject,
          status: args.status,
          errorCode: args.errorCode,
          errorMessage: args.errorMessage,
          providerMessageId: args.providerMessageId,
          metadataJson: (args.metadata as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      this.logger.warn(
        `email_log persistence failed templateId=${args.templateId} recipient=${args.recipientEmail} error=${msg}`,
      );
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
