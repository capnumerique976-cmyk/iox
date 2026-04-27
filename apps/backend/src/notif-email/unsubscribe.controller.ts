// MP-NOTIF-2 phase 2 — Endpoint public désinscription email.
//
// `GET /api/v1/notif-email/unsubscribe?token=<jwt>`
//
// Public (pas de bearer auth — le token JWT signé fait foi). Pas de page
// HTML pour l'instant (futur lot MP-NOTIF-3 pour une page conviviale) :
// retour JSON simple. Idempotent (upsert).

import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/roles.decorator';
import {
  UnsubscribeService,
  UnsubscribeTokenError,
} from './unsubscribe.service';

@ApiTags('notif-email')
@Controller('notif-email')
export class UnsubscribeController {
  private readonly logger = new Logger(UnsubscribeController.name);

  constructor(private readonly unsubscribe: UnsubscribeService) {}

  @Public()
  @Get('unsubscribe')
  @ApiOperation({
    summary: "Désinscription email (public, validation par token JWT signé)",
  })
  async handle(@Query('token') token?: string) {
    if (!token || token.trim().length === 0) {
      throw new BadRequestException({
        code: 'INVALID_TOKEN',
        message: 'token manquant',
      });
    }
    try {
      const { email, type } = this.unsubscribe.validateToken(token);
      await this.unsubscribe.register(email, type, undefined, 'one-click');
      this.logger.log(`unsubscribe one-click email=${email} type=${type}`);
      return {
        email,
        type,
        unsubscribedAt: new Date().toISOString(),
      };
    } catch (err) {
      if (err instanceof UnsubscribeTokenError) {
        throw new BadRequestException({ code: err.code, message: err.message });
      }
      throw err;
    }
  }
}
