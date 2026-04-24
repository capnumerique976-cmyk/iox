import { IsString, IsOptional, IsEnum, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  MarketplaceRelatedEntityType,
  MarketplaceReviewStatus,
  MarketplaceReviewType,
} from '@iox/shared';

export class QueryReviewQueueDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) limit?: number;

  @ApiPropertyOptional({ enum: MarketplaceReviewStatus })
  @IsOptional()
  @IsEnum(MarketplaceReviewStatus)
  status?: MarketplaceReviewStatus;

  @ApiPropertyOptional({ enum: MarketplaceReviewType })
  @IsOptional()
  @IsEnum(MarketplaceReviewType)
  reviewType?: MarketplaceReviewType;

  @ApiPropertyOptional({ enum: MarketplaceRelatedEntityType })
  @IsOptional()
  @IsEnum(MarketplaceRelatedEntityType)
  entityType?: MarketplaceRelatedEntityType;

  @ApiPropertyOptional() @IsOptional() @IsUUID() entityId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() reviewedByUserId?: string;
}

export class EnqueueReviewDto {
  @ApiProperty({ enum: MarketplaceRelatedEntityType })
  @IsEnum(MarketplaceRelatedEntityType)
  entityType: MarketplaceRelatedEntityType;

  @ApiProperty() @IsUUID() entityId: string;

  @ApiProperty({ enum: MarketplaceReviewType })
  @IsEnum(MarketplaceReviewType)
  reviewType: MarketplaceReviewType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class DecideReviewDto {
  @ApiPropertyOptional({ description: 'Motif décision (obligatoire pour un rejet)' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
