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

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// ADR-0003 — enums depuis @iox/shared, Prisma type pour input JSON uniquement.
import { EmailLogStatus, EmailUnsubscribeType } from '@iox/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type {
  SendEmailInput,
  SendEmailResult,
  RenderedEmail,
  NotifEmailTransportName,
  ListLogsQuery,
  ListLogsResult,
  EmailLogItem,
} from './notif-email.types';
import { NotifEmailError } from './notif-email.types';
import { NotifEmailTransportFactory } from './transport.factory';
import { getTemplate } from './templates';
import { UnsubscribeService } from './unsubscribe.service';

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
    private readonly unsubscribeService: UnsubscribeService,
  ) {}

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const transport = this.factory.resolve();
    const templateIdForLog = input.templateId ?? 'raw';
    const unsubscribeType: EmailUnsubscribeType =
      (input.unsubscribeType as EmailUnsubscribeType | undefined) ??
      EmailUnsubscribeType.TRANSACTIONAL;

    // MP-NOTIF-2 — Vérifie unsubscribe par destinataire avant tout envoi.
    const recipients = this.normalizeRecipients(input.to);
    const filteredRecipients: string[] = [];
    for (const recipient of recipients) {
      let isOptedOut = false;
      try {
        isOptedOut = await this.unsubscribeService.isUnsubscribed(
          recipient,
          unsubscribeType,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown';
        this.logger.warn(`unsubscribe check failed (treat as opted-in) error=${msg}`);
        isOptedOut = false;
      }
      if (isOptedOut) {
        this.logger.log(
          `email skipped UNSUBSCRIBED recipient=${recipient} type=${unsubscribeType}`,
        );
        await this.persistLog({
          transport: transport.name,
          templateId: templateIdForLog,
          recipientEmail: recipient,
          recipientUserId: input.recipientUserId,
          subject:
            (input.templateId ? `[template:${input.templateId}]` : input.subject) ??
            'unsubscribed',
          status: EmailLogStatus.SKIPPED,
          errorCode: 'UNSUBSCRIBED',
          errorMessage: `recipient opted-out of ${unsubscribeType}`,
          metadata: input.metadata,
        });
      } else {
        filteredRecipients.push(recipient);
      }
    }
    if (filteredRecipients.length === 0 && recipients.length > 0) {
      // Tous les destinataires sont désinscrits → skip silencieux mais
      // succès logique (pas d'erreur métier remontée à l'appelant).
      return {
        success: true,
        messageId: '',
        transport: transport.name,
      };
    }

    try {
      const rendered = this.render({ ...input, to: filteredRecipients });

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
  /**
   * MP-NOTIF-3 phase 6 — Export CSV des EmailLogs (vue admin).
   *
   * Filtres identiques à `listLogs`. Pas de pagination (cap dur à 10000
   * pour éviter timeouts/OOM). Retourne string CSV (header + rows).
   * Cellules échappées : double-quote autour, `"` interne doublé.
   */
  async exportLogsCsv(query: ListLogsQuery): Promise<string> {
    const where: Prisma.EmailLogWhereInput = {};
    if (query.status) where.status = query.status as EmailLogStatus;
    if (query.templateId) where.templateId = query.templateId;
    if (query.recipientEmail) {
      where.recipientEmail = { contains: query.recipientEmail, mode: 'insensitive' };
    }
    if (query.createdAtAfter) {
      const after = new Date(query.createdAtAfter);
      if (!Number.isNaN(after.getTime())) where.createdAt = { gte: after };
    }
    const rows = await this.prisma.emailLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10000, // hard cap anti OOM
    });

    const headers = [
      'id',
      'createdAt',
      'transport',
      'templateId',
      'status',
      'recipientEmail',
      'subject',
      'errorCode',
      'errorMessage',
      'providerMessageId',
    ];
    const escape = (v: unknown): string => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const lines = [headers.join(',')];
    for (const r of rows) {
      lines.push(
        [
          r.id,
          r.createdAt.toISOString(),
          r.transport,
          r.templateId,
          r.status,
          r.recipientEmail,
          r.subject,
          r.errorCode ?? '',
          r.errorMessage ?? '',
          r.providerMessageId ?? '',
        ]
          .map(escape)
          .join(','),
      );
    }
    return lines.join('\n');
  }

  /**
   * MP-NOTIF-3 phase 5 — Stats agrégées EmailLog (vue admin).
   *
   * Retourne :
   *  - `byStatus` : count par status (SENT/FAILED/SKIPPED)
   *  - `byTemplate` : top 10 templates (count desc)
   *  - `byDay` : count des 30 derniers jours, par status
   *
   * Requêtes parallèles (3 en `Promise.all`), pas de side effect.
   * Réservé ADMIN/COORDINATOR côté controller.
   */
  async getLogsStats(): Promise<{
    byStatus: Array<{ status: 'SENT' | 'FAILED' | 'SKIPPED'; count: number }>;
    byTemplate: Array<{ templateId: string; count: number }>;
    byDay: Array<{ day: string; sent: number; failed: number; skipped: number }>;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [byStatusRows, byTemplateRows, byDayRows] = await Promise.all([
      this.prisma.emailLog.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.emailLog.groupBy({
        by: ['templateId'],
        _count: { _all: true },
        orderBy: { _count: { templateId: 'desc' } },
        take: 10,
      }),
      this.prisma.$queryRaw<
        Array<{ day: Date; status: string; count: bigint }>
      >(Prisma.sql`
        SELECT date_trunc('day', created_at)::date AS day, status, count(*)::bigint AS count
        FROM email_logs
        WHERE created_at >= ${since}
        GROUP BY day, status
        ORDER BY day ASC
      `),
    ]);

    const byStatus = byStatusRows.map((r) => ({
      status: r.status as 'SENT' | 'FAILED' | 'SKIPPED',
      count: r._count._all,
    }));
    const byTemplate = byTemplateRows.map((r) => ({
      templateId: r.templateId,
      count: r._count._all,
    }));

    // Pivot byDay rows (day, status, count) → { day, sent, failed, skipped }.
    const dayMap = new Map<string, { sent: number; failed: number; skipped: number }>();
    for (const r of byDayRows) {
      const key = r.day.toISOString().slice(0, 10);
      const cur = dayMap.get(key) ?? { sent: 0, failed: 0, skipped: 0 };
      const c = Number(r.count);
      if (r.status === 'SENT') cur.sent = c;
      else if (r.status === 'FAILED') cur.failed = c;
      else if (r.status === 'SKIPPED') cur.skipped = c;
      dayMap.set(key, cur);
    }
    const byDay = Array.from(dayMap.entries())
      .map(([day, counts]) => ({ day, ...counts }))
      .sort((a, b) => a.day.localeCompare(b.day));

    return { byStatus, byTemplate, byDay };
  }

  /**
   * MP-NOTIF-3 phase 3 — Récupère un EmailLog par id (vue admin détail).
   * Lecture seule. Throw NotFoundException si introuvable.
   */
  async getLogById(id: string): Promise<EmailLogItem> {
    const r = await this.prisma.emailLog.findUnique({ where: { id } });
    if (!r) {
      throw new NotFoundException('EmailLog introuvable');
    }
    return {
      id: r.id,
      transport: r.transport,
      templateId: r.templateId,
      recipientEmail: r.recipientEmail,
      recipientUserId: r.recipientUserId ?? null,
      subject: r.subject,
      status: r.status as 'SENT' | 'FAILED' | 'SKIPPED',
      errorCode: r.errorCode ?? null,
      errorMessage: r.errorMessage ?? null,
      providerMessageId: r.providerMessageId ?? null,
      metadataJson: r.metadataJson ?? null,
      createdAt: r.createdAt.toISOString(),
    };
  }

  /**
   * MP-NOTIF-3 phase 7 — Replay un EmailLog FAILED (admin).
   *
   * Seuls les logs en status FAILED peuvent être rejoués. Le service
   * reconstruit l'input depuis les champs persistés + metadataJson et
   * appelle `send()`. Retourne l'id de l'original + le status du nouvel
   * envoi.
   */
  async replayFailedLog(
    id: string,
    _actor?: unknown,
  ): Promise<{ originalId: string; newLogId: string | null; status: string }> {
    const log = await this.prisma.emailLog.findUnique({ where: { id } });
    if (!log) {
      throw new NotFoundException('EmailLog introuvable');
    }
    if (log.status !== 'FAILED') {
      throw new BadRequestException('Only FAILED logs can be replayed');
    }

    const meta = (log.metadataJson as Record<string, unknown>) ?? {};
    const sendInput: SendEmailInput = {
      to: log.recipientEmail,
      subject: log.subject,
      templateId: log.templateId !== 'raw' ? log.templateId : undefined,
      templateData: (meta.data as Record<string, unknown>) ?? {},
      recipientUserId: log.recipientUserId ?? undefined,
      metadata: {
        ...meta,
        replayedFrom: id,
      },
    };

    // If original was raw (no template), include subject directly.
    if (log.templateId === 'raw') {
      sendInput.subject = log.subject;
      sendInput.text = sendInput.subject; // minimal text fallback
    }

    const result = await this.send(sendInput);

    return {
      originalId: id,
      newLogId: result.messageId || null,
      status: result.success ? 'SENT' : (result.error ?? 'FAILED'),
    };
  }

  /**
   * MP-NOTIF-3 — Liste paginée + filtrée des `email_logs` (vue admin).
   * Lecture seule, pas de side effect. Aucune masking PII car la table
   * est déjà restreinte aux rôles ADMIN/COORDINATOR côté controller.
   */
  async listLogs(query: ListLogsQuery): Promise<ListLogsResult> {
    const page = Math.max(1, Math.floor(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Math.floor(query.limit ?? 20)));
    const where: Prisma.EmailLogWhereInput = {};
    if (query.status) where.status = query.status as EmailLogStatus;
    if (query.templateId) where.templateId = query.templateId;
    if (query.recipientEmail) {
      where.recipientEmail = { contains: query.recipientEmail, mode: 'insensitive' };
    }
    if (query.createdAtAfter) {
      const after = new Date(query.createdAtAfter);
      if (!Number.isNaN(after.getTime())) {
        where.createdAt = { gte: after };
      }
    }
    const [total, rows] = await Promise.all([
      this.prisma.emailLog.count({ where }),
      this.prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    const data = rows.map((r) => ({
      id: r.id,
      transport: r.transport,
      templateId: r.templateId,
      recipientEmail: r.recipientEmail,
      recipientUserId: r.recipientUserId ?? null,
      subject: r.subject,
      status: r.status as 'SENT' | 'FAILED' | 'SKIPPED',
      errorCode: r.errorCode ?? null,
      errorMessage: r.errorMessage ?? null,
      providerMessageId: r.providerMessageId ?? null,
      metadataJson: r.metadataJson ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

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
      // I18N-4 — résolution template par locale (fallback FR si variante absente).
      const template = getTemplate(input.templateId, input.locale);
      if (!template) {
        throw new NotifEmailError(
          'TEMPLATE_NOT_FOUND',
          `Template inconnu: ${input.templateId}`,
        );
      }
      // MP-NOTIF-2 — Injecte automatiquement `unsubscribeUrl` dans le
      // payload template (footer commun). Le service tente de générer un
      // token signé pour le 1er destinataire ; si le secret JWT est
      // absent (env de test minimal), on injecte une chaîne vide et
      // chaque template doit se comporter en no-op sur ce cas.
      const firstRecipient = to[0];
      const unsubType: EmailUnsubscribeType =
        (input.unsubscribeType as EmailUnsubscribeType | undefined) ??
        EmailUnsubscribeType.TRANSACTIONAL;
      let unsubscribeUrl = '';
      try {
        const token = this.unsubscribeService.generateToken(firstRecipient, unsubType);
        const base =
          this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
        const apiBase = base.replace(/\/$/, '');
        unsubscribeUrl = `${apiBase}/api/v1/notif-email/unsubscribe?token=${encodeURIComponent(token)}`;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown';
        this.logger.warn(`unsubscribe URL generation failed error=${msg}`);
      }
      const data: Record<string, unknown> = {
        ...(input.templateData ?? {}),
        unsubscribeUrl,
      };
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
