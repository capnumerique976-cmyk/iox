import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
  IsInt,
  IsObject,
  IsDateString,
  MinLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ExportReadinessStatus,
  MarketplacePriceMode,
  MarketplacePublicationStatus,
  MarketplaceVisibilityScope,
} from '@iox/shared';
import { Type } from 'class-transformer';

export class CreateMarketplaceOfferDto {
  @ApiProperty() @IsUUID() marketplaceProductId: string;
  @ApiProperty() @IsUUID() sellerProfileId: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  title: string;

  @ApiPropertyOptional() @IsOptional() @IsString() shortDescription?: string;

  @ApiPropertyOptional({ enum: MarketplacePriceMode, default: MarketplacePriceMode.QUOTE_ONLY })
  @IsOptional()
  @IsEnum(MarketplacePriceMode)
  priceMode?: MarketplacePriceMode;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional({ example: 'EUR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  moq?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  availableQuantity?: number;

  @ApiPropertyOptional() @IsOptional() @IsDateString() availabilityStart?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() availabilityEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  leadTimeDays?: number;

  @ApiPropertyOptional({ example: 'FOB' })
  @IsOptional()
  @IsString()
  incoterm?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() departureLocation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  destinationMarketsJson?: Record<string, unknown>;

  @ApiPropertyOptional({
    enum: MarketplaceVisibilityScope,
    default: MarketplaceVisibilityScope.BUYERS_ONLY,
  })
  @IsOptional()
  @IsEnum(MarketplaceVisibilityScope)
  visibilityScope?: MarketplaceVisibilityScope;
}

export class UpdateMarketplaceOfferDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shortDescription?: string;

  @ApiPropertyOptional({ enum: MarketplacePriceMode })
  @IsOptional()
  @IsEnum(MarketplacePriceMode)
  priceMode?: MarketplacePriceMode;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  moq?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  availableQuantity?: number;

  @ApiPropertyOptional() @IsOptional() @IsDateString() availabilityStart?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() availabilityEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  leadTimeDays?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() incoterm?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() departureLocation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  destinationMarketsJson?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: MarketplaceVisibilityScope })
  @IsOptional()
  @IsEnum(MarketplaceVisibilityScope)
  visibilityScope?: MarketplaceVisibilityScope;
}

export class QueryMarketplaceOffersDto {
  @IsOptional() @Type(() => Number) page?: number = 1;
  @IsOptional() @Type(() => Number) limit?: number = 20;
  @IsOptional() @IsString() search?: string;

  @IsOptional() @IsUUID() marketplaceProductId?: string;
  @IsOptional() @IsUUID() sellerProfileId?: string;

  @IsOptional()
  @IsEnum(MarketplacePublicationStatus)
  publicationStatus?: MarketplacePublicationStatus;

  @IsOptional()
  @IsEnum(ExportReadinessStatus)
  exportReadinessStatus?: ExportReadinessStatus;

  @IsOptional()
  @IsEnum(MarketplaceVisibilityScope)
  visibilityScope?: MarketplaceVisibilityScope;
}

export class AttachOfferBatchDto {
  @ApiProperty() @IsUUID() productBatchId: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantityAvailable: number;

  @ApiPropertyOptional() @IsOptional() @IsString() qualityStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() traceabilityStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  exportEligible?: boolean;
}

export class UpdateOfferBatchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantityAvailable?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantityReserved?: number;

  @ApiPropertyOptional() @IsOptional() @Type(() => Boolean) exportEligible?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() qualityStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() traceabilityStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class RejectMarketplaceOfferDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  reason: string;
}

export class SuspendMarketplaceOfferDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  reason: string;
}

export class SetOfferExportReadinessDto {
  @ApiProperty({ enum: ExportReadinessStatus })
  @IsEnum(ExportReadinessStatus)
  status: ExportReadinessStatus;
}
