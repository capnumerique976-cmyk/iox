import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { JwtPayload, UserRole } from '@iox/shared';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../database/prisma.service';
import { EntityType } from '@iox/shared';

/**
 * Hash sha256 d'un refresh token, pour stockage dans la liste de
 * révocation (L9-4). On ne stocke jamais le token en clair.
 */
function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
    private auditService: AuditService,
    private prisma: PrismaService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.isActive) return null;

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;

    return user;
  }

  async login(userId: string, ipAddress?: string, userAgent?: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as unknown as UserRole,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.getOrThrow('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    // Mise à jour last_login_at
    await this.usersService.updateLastLogin(user.id);

    await this.auditService.log({
      action: 'USER_LOGIN',
      entityType: EntityType.USER,
      entityId: user.id,
      userId: user.id,
      ipAddress,
      userAgent,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15min en secondes
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Token de rafraîchissement invalide ou expiré');
    }

    // L9-4 : check liste de révocation AVANT toute autre vérification.
    // Le hash est court (sha256, 64 chars) et indexé en base — coût négligeable.
    const tokenHash = hashRefreshToken(refreshToken);
    const revoked = await this.prisma.revokedRefreshToken.findUnique({
      where: { tokenHash },
    });
    if (revoked) {
      throw new UnauthorizedException('Token de rafraîchissement révoqué');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) throw new UnauthorizedException('Utilisateur invalide');

    const newPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as unknown as UserRole,
    };
    const accessToken = this.jwtService.sign(newPayload, {
      secret: this.config.getOrThrow('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
    });

    return { accessToken, expiresIn: 900 };
  }

  /**
   * L9-4 — Logout réel : si le client envoie son refresh token, on
   * l'ajoute à la liste de révocation. La tentative ultérieure de
   * /auth/refresh avec ce même token retournera 401.
   *
   * Si pas de refresh token fourni (compat clients antérieurs), on se
   * contente de tracer l'événement d'audit. Le access token actuel
   * continue à fonctionner jusqu'à son expiration naturelle (15 min).
   */
  async logout(userId: string, refreshToken?: string, ipAddress?: string) {
    if (refreshToken) {
      try {
        const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
          secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
        });
        // Sécurité : on n'accepte de révoquer un token QUE s'il
        // appartient bien au user authentifié. Évite qu'un attaquant
        // ayant volé un access token révoque les refresh d'autres
        // utilisateurs en spammant /auth/logout.
        if (payload.sub !== userId) {
          this.logger.warn(
            `Logout attempt with mismatched refresh token (auth=${userId}, token.sub=${payload.sub})`,
          );
        } else {
          const expiresAt = payload.exp
            ? new Date(payload.exp * 1000)
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          await this.prisma.revokedRefreshToken
            .create({
              data: {
                tokenHash: hashRefreshToken(refreshToken),
                userId,
                expiresAt,
              },
            })
            .catch((err: unknown) => {
              // P2002 : token déjà révoqué — logout idempotent.
              if (
                err instanceof Prisma.PrismaClientKnownRequestError &&
                err.code === 'P2002'
              ) {
                return;
              }
              throw err;
            });
        }
      } catch (err) {
        if (err instanceof UnauthorizedException) throw err;
        // JWT invalide/expiré : pas la peine de polluer la table.
        // On laisse l'audit log se faire normalement.
        this.logger.debug(
          `Logout with unverifiable refresh token (user=${userId}): ${(err as Error)?.message}`,
        );
      }
    }

    await this.auditService.log({
      action: 'USER_LOGOUT',
      entityType: EntityType.USER,
      entityId: userId,
      userId,
      ipAddress,
    });
  }
}
