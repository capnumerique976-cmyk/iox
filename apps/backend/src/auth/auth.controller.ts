import { Controller, Post, Body, UseGuards, Get, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { AuthResponseDto, RefreshDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/roles.decorator';
import { RequestUser, UserRole } from '@iox/shared';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(AuthGuard('local'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion — retourne access_token + refresh_token' })
  async login(@Req() req: Request): Promise<AuthResponseDto> {
    const user = req.user as { id: string };
    return this.authService.login(
      user.id,
      req.ip,
      req.headers['user-agent'],
    ) as unknown as AuthResponseDto;
  }

  @Post('refresh')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renouvellement du access_token via refresh_token' })
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Déconnexion' })
  async logout(@CurrentUser() user: RequestUser, @Req() req: Request) {
    await this.authService.logout(user.id, req.ip);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "Profil de l'utilisateur connecté + flags ownership V2" })
  me(@CurrentUser() user: RequestUser) {
    // V2 ownership — `needsSellerOnboarding` signale un compte MARKETPLACE_SELLER
    // sans aucun rattachement Company → SellerProfile. Le frontend affiche
    // alors un bandeau et désactive les actions de création. L'admin doit
    // créer un membership via POST /admin/memberships pour débloquer le user.
    const sellerProfileIds = user.sellerProfileIds ?? [];
    const needsSellerOnboarding =
      user.role === UserRole.MARKETPLACE_SELLER && sellerProfileIds.length === 0;

    return {
      ...user,
      sellerProfileIds,
      needsSellerOnboarding,
    };
  }
}
