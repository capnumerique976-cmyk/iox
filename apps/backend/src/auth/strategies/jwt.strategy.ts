import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload, RequestUser, UserRole } from '@iox/shared';
import { UsersService } from '../../users/users.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    config: ConfigService,
    private usersService: UsersService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Session invalide ou utilisateur désactivé');
    }

    // V2 — Résolution du périmètre ownership à chaque requête authentifiée.
    // Coût : 1 jointure indexée User→UserCompanyMembership→Company→SellerProfile.
    // Pour un user sans membership (staff IOX, buyer), renvoie des tableaux vides.
    const memberships = await this.prisma.userCompanyMembership.findMany({
      where: { userId: user.id },
      select: {
        companyId: true,
        company: { select: { sellerProfile: { select: { id: true } } } },
      },
    });
    const companyIds = memberships.map((m) => m.companyId);
    const sellerProfileIds = memberships
      .map((m) => m.company.sellerProfile?.id)
      .filter((id): id is string => !!id);

    // V2 ownership — un MARKETPLACE_SELLER sans membership est "neutralisé" :
    // l'ownership service le traite comme un seller à scope vide (zéro
    // donnée exposée, aucune mutation possible). On log un warning structuré
    // pour permettre aux ops de détecter ces comptes à rattacher sans casser
    // la session (sinon l'admin ne pourrait plus se connecter pour le réparer).
    if (user.role === UserRole.MARKETPLACE_SELLER && sellerProfileIds.length === 0) {
      this.logger.warn(
        `SELLER_WITHOUT_MEMBERSHIP user_id=${user.id} email=${user.email} — onboarding à finaliser (admin → /admin/memberships)`,
      );
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role as unknown as UserRole,
      companyIds,
      sellerProfileIds,
    };
  }
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
