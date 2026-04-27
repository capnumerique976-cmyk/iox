// MP-NOTIF-1 phase 1 — Transport mock (tests + démo).
//
// Accumule les emails envoyés en mémoire. Aucun I/O. Le messageId est
// déterministe (`mock-${counter}`) pour faciliter les assertions.

import { Injectable, Logger } from '@nestjs/common';
import type { EmailTransport, RenderedEmail } from '../notif-email.types';

@Injectable()
export class MockEmailTransport implements EmailTransport {
  readonly name = 'mock' as const;
  private readonly logger = new Logger(MockEmailTransport.name);
  private readonly sent: RenderedEmail[] = [];
  private counter = 0;

  async send(message: RenderedEmail): Promise<{ messageId: string }> {
    this.counter += 1;
    const messageId = `mock-${this.counter}`;
    this.sent.push(message);
    this.logger.debug(
      `[mock] queued message ${messageId} → ${message.to.join(',')} subject="${message.subject}"`,
    );
    return { messageId };
  }

  /** Snapshot des messages envoyés (tests + démo). */
  getSent(): readonly RenderedEmail[] {
    return [...this.sent];
  }

  /** Reset (utile entre tests). */
  clear(): void {
    this.sent.length = 0;
    this.counter = 0;
  }
}
