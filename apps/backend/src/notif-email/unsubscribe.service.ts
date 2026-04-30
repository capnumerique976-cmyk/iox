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

  /**
   * MP-NOTIF-3 phase 4 — Liste paginée + filtrée des désinscriptions
   * (vue admin). Lecture seule, restreinte côté controller aux rôles
   * ADMIN/COORDINATOR.
   */
  /**
   * BUYER-DASHBOARD-4 — Liste les unsubscribes actifs pour un email
   * (user connecté, vue "mes préférences"). Pas de token requis : l'auth
   * vient du JWT côté controller.
   */
  async listForEmail(email: string): Promise<
    Array<{ unsubscribeType: EmailUnsubscribeType; createdAt: string }>
  > {
    const normalized = email.toLowerCase().trim();
    const rows = await this.prisma.emailUnsubscribe.findMany({
      where: { email: normalized },
      orderBy: { createdAt: 'desc' },
      select: { unsubscribeType: true, createdAt: true },
    });
    return rows.map((r) => ({
      unsubscribeType: r.unsubscribeType,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  /**
   * BUYER-DASHBOARD-4 — Re-souscrit (DELETE) une entrée
   * (email + type) pour un user connecté. Idempotent : si pas trouvé,
   * silent.
   */
  async deleteForEmail(email: string, type: EmailUnsubscribeType, actorId?: string): Promise<void> {
    const normalized = email.toLowerCase().trim();
    await this.prisma.emailUnsubscribe.deleteMany({
      where: { email: normalized, unsubscribeType: type },
    });
    this.logger.log(
      `unsubscribe deleted (resubscribe) email=${normalized} type=${type} actorId=${actorId ?? 'unknown'}`,
    );
  }

  async listUnsubscribes(query: {
    page?: number;
    limit?: number;
    type?: EmailUnsubscribeType;
    email?: string;
  }): Promise<{
    data: Array<{
      id: string;
      email: string;
      unsubscribeType: EmailUnsubscribeType;
      userId: string | null;
      reason: string | null;
      createdAt: string;
    }>;
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = Math.max(1, Math.floor(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Math.floor(query.limit ?? 20)));
    const where: {
      unsubscribeType?: EmailUnsubscribeType;
      email?: { contains: string; mode: 'insensitive' };
    } = {};
    if (query.type) where.unsubscribeType = query.type;
    if (query.email) where.email = { contains: query.email, mode: 'insensitive' };

    const [total, rows] = await Promise.all([
      this.prisma.emailUnsubscribe.count({ where }),
      this.prisma.emailUnsubscribe.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    const data = rows.map((r) => ({
      id: r.id,
      email: r.email,
      unsubscribeType: r.unsubscribeType,
      userId: r.userId ?? null,
      reason: r.reason ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
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
