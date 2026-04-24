import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { JwtPayload, UserRole } from '@iox/shared';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { EntityType } from '@iox/shared';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
    private auditService: AuditService,
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
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      });

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
    } catch {
      throw new UnauthorizedException('Token de rafraîchissement invalide ou expiré');
    }
  }

  async logout(userId: string, ipAddress?: string) {
    await this.auditService.log({
      action: 'USER_LOGOUT',
      entityType: EntityType.USER,
      entityId: userId,
      userId,
      ipAddress,
    });
  }
}
