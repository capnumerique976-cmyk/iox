// MP-NOTIF-1 phase 1 — Transport nodemailer en mode stream.
//
// **Aucun envoi réseau** : on utilise le `streamTransport: true` de
// nodemailer qui sérialise le message en buffer (RFC 822) sans ouvrir de
// socket. Permet de valider qu'un template produit bien un email
// MIME-correct sans dépendance externe.
//
// Pour activer ce transport en local : `NOTIF_EMAIL_TRANSPORT=smtp-stream`.

import { Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import type { EmailTransport, RenderedEmail } from '../notif-email.types';

@Injectable()
export class SmtpStreamEmailTransport implements EmailTransport {
  readonly name = 'smtp-stream' as const;
  private readonly logger = new Logger(SmtpStreamEmailTransport.name);
  private readonly transporter: Transporter;
  /** Buffer des messages MIME sérialisés — utile pour debug/tests d'intégration. */
  private readonly mimeBuffers: Buffer[] = [];

  constructor() {
    // `streamTransport` n'est pas exposé dans les types officiels de
    // nodemailer 8 (option dépréciée chez TS mais toujours fonctionnelle
    // au runtime). Cast ciblé pour éviter `any`.
    const options = {
      streamTransport: true,
      jsonTransport: false,
      buffer: true,
      newline: 'unix',
    } as unknown as Parameters<typeof createTransport>[0];
    this.transporter = createTransport(options);
  }

  async send(message: RenderedEmail): Promise<{ messageId: string }> {
    const info = await this.transporter.sendMail({
      from: message.from,
      to: message.to,
      replyTo: message.replyTo,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    if (Buffer.isBuffer(info.message)) {
      this.mimeBuffers.push(info.message);
    }
    const messageId = info.messageId ?? `smtp-stream-${this.mimeBuffers.length}`;
    this.logger.debug(
      `[smtp-stream] serialized ${messageId} → ${message.to.join(',')} (${
        Buffer.isBuffer(info.message) ? info.message.length : 0
      } bytes)`,
    );
    return { messageId };
  }

  /** Buffers MIME accumulés (tests d'intégration). */
  getMimeBuffers(): readonly Buffer[] {
    return [...this.mimeBuffers];
  }

  clear(): void {
    this.mimeBuffers.length = 0;
  }
}
