// MP-NOTIF-2 phase 2 — Service unsubscribe.
//
// Gestion des opt-outs par email + catégorie. Tokens JWT HS256 signés
// avec un secret dédié (`UNSUBSCRIBE_JWT_SECRET`, fallback
// `${JWT_SECRET}-unsub`). Expiration courte (90j par défaut).
//
// Cycle :
//   1. `generateToken(email, type)` → token signé inséré dans le footer
//      des emails transactionnels.
//   2. Le destinataire clique → endpoint `GET /api/v1/notif-email/unsubscribe?token=...`.
//   3. Endpoint valide le token + appelle `register(email, type)`.
//   4. Avant chaque envoi, `NotifEmailService.send` appelle
//      `isUnsubscribed(email, type)` ; si true → EmailLog SKIPPED, no-op.

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EmailUnsubscribeType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export interface UnsubscribeTokenPayload {
  email: string;
  type: EmailUnsubscribeType;
}

@Injectable()
export class UnsubscribeService {
  private readonly logger = new Logger(UnsubscribeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Récupère le secret dédié unsubscribe. Fallback : `${JWT_SECRET}-unsub`
   * si non fourni — assure une rotation découplée du secret access JWT.
   */
  private resolveSecret(): string {
    const dedicated = this.config.get<string>('UNSUBSCRIBE_JWT_SECRET');
    if (dedicated && dedicated.length >= 16) return dedicated;
    const base = this.config.get<string>('JWT_SECRET') ?? '';
    if (!base) {
      throw new Error('UNSUBSCRIBE_JWT_SECRET ou JWT_SECRET requis');
    }
    return `${base}-unsub`;
  }

  generateToken(
    email: string,
    type: EmailUnsubscribeType,
    expiresIn: string | number = '90d',
  ): string {
    const payload: UnsubscribeTokenPayload = { email: email.toLowerCase().trim(), type };
    return this.jwt.sign(payload, {
      secret: this.resolveSecret(),
      expiresIn,
    });
  }

  /**
   * Valide la signature + l'expiration. Retourne le payload décodé ou
   * throw avec un code stable (`INVALID_TOKEN` ou `TOKEN_EXPIRED`).
   */
  validateToken(token: string): UnsubscribeTokenPayload {
    let decoded: UnsubscribeTokenPayload;
    try {
      decoded = this.jwt.verify<UnsubscribeTokenPayload>(token, {
        secret: this.resolveSecret(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      if (msg.toLowerCase().includes('expired')) {
        throw new UnsubscribeTokenError('TOKEN_EXPIRED', msg);
      }
      throw new UnsubscribeTokenError('INVALID_TOKEN', msg);
    }
    if (!decoded.email || !decoded.type) {
      throw new UnsubscribeTokenError('INVALID_TOKEN', 'payload incomplet');
    }
    return decoded;
  }

  /**
   * Persiste un opt-out (idempotent grâce à l'unique
   * `(email, unsubscribeType)`).
   */
  async register(
    email: string,
    type: EmailUnsubscribeType,
    userId?: string,
    reason?: string,
  ): Promise<void> {
    const normalized = email.toLowerCase().trim();
    await this.prisma.emailUnsubscribe.upsert({
      where: {
        email_unsubscribes_email_type_uq: {
          email: normalized,
          unsubscribeType: type,
        },
      },
      update: {
        ...(userId !== undefined ? { userId } : {}),
        ...(reason !== undefined ? { reason } : {}),
      },
      create: {
        email: normalized,
        unsubscribeType: type,
        userId,
        reason,
      },
    });
    this.logger.log(`unsubscribe registered email=${normalized} type=${type}`);
  }

  /**
   * Retourne `true` si :
   *  - une entrée `(email, type)` exact existe, OU
   *  - une entrée `(email, ALL)` existe (override global).
   */
  async isUnsubscribed(email: string, type: EmailUnsubscribeType): Promise<boolean> {
    const normalized = email.toLowerCase().trim();
    const count = await this.prisma.emailUnsubscribe.count({
      where: {
        email: normalized,
        OR: [{ unsubscribeType: type }, { unsubscribeType: EmailUnsubscribeType.ALL }],
      },
    });
    return count > 0;
  }
}

export class UnsubscribeTokenError extends Error {
  constructor(
    public readonly code: 'INVALID_TOKEN' | 'TOKEN_EXPIRED',
    message: string,
  ) {
    super(message);
    this.name = 'UnsubscribeTokenError';
  }
}
