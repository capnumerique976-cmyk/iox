// BUYER-DASHBOARD-4 — DTO body POST /notif-email/me/preferences.

import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EmailUnsubscribeType } from '@prisma/client';

export class ToggleMyPreferenceDto {
  @ApiProperty({ enum: ['ALL', 'RFQ_NOTIFICATIONS', 'TRANSACTIONAL'] })
  @IsEnum(['ALL', 'RFQ_NOTIFICATIONS', 'TRANSACTIONAL'] as const)
  type: EmailUnsubscribeType;
}
