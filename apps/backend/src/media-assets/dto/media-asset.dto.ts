import { IsString, IsOptional, IsEnum, IsInt, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MarketplaceRelatedEntityType,
  MediaAssetRole,
  MediaAssetType,
  MediaModerationStatus,
} from '@iox/shared';
import { Type } from 'class-transformer';

export class UploadMediaAssetDto {
  @ApiProperty({ enum: MarketplaceRelatedEntityType })
  @IsEnum(MarketplaceRelatedEntityType)
  relatedType: MarketplaceRelatedEntityType;

  @ApiProperty({ example: 'uuid-entity' })
  @IsUUID()
  relatedId: string;

  @ApiPropertyOptional({ enum: MediaAssetType, default: MediaAssetType.IMAGE })
  @IsOptional()
  @IsEnum(MediaAssetType)
  mediaType?: MediaAssetType;

  @ApiPropertyOptional({ enum: MediaAssetRole, default: MediaAssetRole.GALLERY })
  @IsOptional()
  @IsEnum(MediaAssetRole)
  role?: MediaAssetRole;

  @ApiPropertyOptional() @IsOptional() @IsString() altTextFr?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() altTextEn?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateMediaAssetDto {
  @ApiPropertyOptional({ enum: MediaAssetRole })
  @IsOptional()
  @IsEnum(MediaAssetRole)
  role?: MediaAssetRole;

  @ApiPropertyOptional() @IsOptional() @IsString() altTextFr?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() altTextEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class QueryMediaAssetsDto {
  @IsOptional() @Type(() => Number) page?: number = 1;
  @IsOptional() @Type(() => Number) limit?: number = 20;

  @IsOptional()
  @IsEnum(MarketplaceRelatedEntityType)
  relatedType?: MarketplaceRelatedEntityType;

  @IsOptional()
  @IsUUID()
  relatedId?: string;

  @IsOptional()
  @IsEnum(MediaAssetRole)
  role?: MediaAssetRole;

  @IsOptional()
  @IsEnum(MediaModerationStatus)
  moderationStatus?: MediaModerationStatus;
}

export class RejectMediaAssetDto {
  @ApiProperty({ example: 'Image floue, résolution insuffisante' })
  @IsString()
  reason: string;
}
