// MP-NOTIF-3 phase 4 — DTO query `GET /notif-email/unsubscribes`.

import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EmailUnsubscribeType } from '@iox/shared';

export class ListUnsubscribesQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ enum: ['ALL', 'RFQ_NOTIFICATIONS', 'TRANSACTIONAL'] })
  @IsOptional()
  @IsEnum(['ALL', 'RFQ_NOTIFICATIONS', 'TRANSACTIONAL'] as const)
  type?: EmailUnsubscribeType;

  @ApiPropertyOptional({ description: 'Recherche partielle insensible à la casse' })
  @IsOptional()
  @IsString()
  email?: string;
}
