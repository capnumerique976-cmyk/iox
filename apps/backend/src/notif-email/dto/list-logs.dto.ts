// MP-NOTIF-3 — DTO query `GET /notif-email/logs`.

import { IsEnum, IsInt, IsOptional, IsString, IsISO8601, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListEmailLogsQueryDto {
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

  @ApiPropertyOptional({ enum: ['SENT', 'FAILED', 'SKIPPED'] })
  @IsOptional()
  @IsEnum(['SENT', 'FAILED', 'SKIPPED'] as const)
  status?: 'SENT' | 'FAILED' | 'SKIPPED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Recherche partielle insensible à la casse' })
  @IsOptional()
  @IsString()
  recipientEmail?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 date string' })
  @IsOptional()
  @IsISO8601()
  createdAtAfter?: string;
}
