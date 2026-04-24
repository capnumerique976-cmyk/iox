import { IsOptional, IsInt, Min, Max, IsString, IsUUID, IsEnum, IsISO8601 } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EntityType } from '@iox/shared';

/**
 * Query DTO pour le journal d'audit.
 * Toutes les valeurs numériques sont transformées + validées.
 * Les dates sont acceptées en ISO 8601 et parsées côté service.
 */
export class QueryAuditLogsDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: EntityType })
  @IsOptional()
  @IsEnum(EntityType)
  entityType?: EntityType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 — borne basse (inclusive)' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 — borne haute (exclusive)' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
