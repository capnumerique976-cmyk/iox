import {
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  IsUUID,
  IsInt,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MarketReleaseDecision } from '@iox/shared';

export class CreateMarketReleaseDecisionDto {
  @IsUUID()
  productBatchId: string;

  @IsEnum(MarketReleaseDecision)
  decision: MarketReleaseDecision;

  @IsOptional()
  @IsString()
  notes?: string;

  /** Obligatoire si decision === NON_COMPLIANT */
  @ValidateIf((o) => o.decision === MarketReleaseDecision.NON_COMPLIANT)
  @IsString()
  blockingReason?: string;

  /** Réserves si decision === COMPLIANT_WITH_RESERVATIONS */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  reservations?: string[];
}

export class QueryMarketReleaseDecisionsDto {
  @IsOptional()
  @IsUUID()
  productBatchId?: string;

  @IsOptional()
  @IsEnum(MarketReleaseDecision)
  decision?: MarketReleaseDecision;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
