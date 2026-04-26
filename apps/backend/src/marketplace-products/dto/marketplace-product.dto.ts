import {
  IsArray,
  IsBoolean,
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
  IsObject,
  MinLength,
  Matches,
  Min,
  ArrayUnique,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ExportReadinessStatus,
  MarketplacePublicationStatus,
  SeasonalityMonth,
} from '@iox/shared';
import { Type } from 'class-transformer';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateMarketplaceProductDto {
  @ApiProperty() @IsUUID() productId: string;
  @ApiProperty() @IsUUID() sellerProfileId: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;

  @ApiProperty({ example: 'Vanille de Mayotte — Gousses Premium' })
  @IsString()
  @MinLength(2)
  commercialName: string;

  @ApiProperty({ example: 'vanille-mayotte-premium' })
  @IsString()
  @Matches(SLUG_REGEX, { message: 'slug lowercase [a-z0-9-]' })
  slug: string;

  @ApiProperty({ example: 'YT' })
  @IsString()
  originCountry: string;

  @ApiPropertyOptional() @IsOptional() @IsString() regulatoryName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subtitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() originRegion?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() varietySpecies?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() productionMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descriptionShort?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descriptionLong?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() usageTips?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() packagingDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() storageConditions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shelfLifeInfo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() allergenInfo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  nutritionInfoJson?: Record<string, unknown>;

  @ApiPropertyOptional() @IsOptional() @IsString() defaultUnit?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minimumOrderQuantity?: number;

  // ─── FP-1 — Saisonnalité ────────────────────────────────────────────────
  @ApiPropertyOptional({
    enum: SeasonalityMonth,
    isArray: true,
    example: ['JUL', 'AUG', 'SEP'],
    description: 'Mois de récolte. Tableau de SeasonalityMonth, sans doublon.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(SeasonalityMonth, { each: true })
  harvestMonths?: SeasonalityMonth[];

  @ApiPropertyOptional({
    enum: SeasonalityMonth,
    isArray: true,
    example: ['SEP', 'OCT', 'NOV', 'DEC'],
    description:
      "Mois de disponibilité commerciale. Doit être non-vide si isYearRound=false " +
      "lors de la soumission produit (vérification au niveau service).",
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(SeasonalityMonth, { each: true })
  availabilityMonths?: SeasonalityMonth[];

  @ApiPropertyOptional({
    example: false,
    description:
      'Si true, produit disponible toute l\'année. Dans ce cas availabilityMonths ' +
      'est ignoré (et normalisé à []) côté service.',
  })
  @IsOptional()
  @IsBoolean()
  isYearRound?: boolean;
}

export class UpdateMarketplaceProductDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) commercialName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(SLUG_REGEX) slug?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() regulatoryName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subtitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() originCountry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() originRegion?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() varietySpecies?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() productionMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descriptionShort?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descriptionLong?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() usageTips?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() packagingDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() storageConditions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shelfLifeInfo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() allergenInfo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  nutritionInfoJson?: Record<string, unknown>;

  @ApiPropertyOptional() @IsOptional() @IsString() defaultUnit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minimumOrderQuantity?: number;

  // ─── FP-1 — Saisonnalité (mêmes règles que Create) ──────────────────────
  @ApiPropertyOptional({ enum: SeasonalityMonth, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(SeasonalityMonth, { each: true })
  harvestMonths?: SeasonalityMonth[];

  @ApiPropertyOptional({ enum: SeasonalityMonth, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(SeasonalityMonth, { each: true })
  availabilityMonths?: SeasonalityMonth[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isYearRound?: boolean;
}

export class QueryMarketplaceProductsDto {
  @IsOptional() @Type(() => Number) page?: number = 1;
  @IsOptional() @Type(() => Number) limit?: number = 20;
  @IsOptional() @IsString() search?: string;

  @IsOptional() @IsUUID() sellerProfileId?: string;
  @IsOptional() @IsUUID() categoryId?: string;

  @IsOptional() @IsString() originCountry?: string;

  @IsOptional()
  @IsEnum(MarketplacePublicationStatus)
  publicationStatus?: MarketplacePublicationStatus;

  @IsOptional()
  @IsEnum(ExportReadinessStatus)
  exportReadinessStatus?: ExportReadinessStatus;
}

export class RejectMarketplaceProductDto {
  @ApiProperty({ example: 'Informations nutritionnelles manquantes' })
  @IsString()
  @MinLength(3)
  reason: string;
}

export class SuspendMarketplaceProductDto {
  @ApiProperty({ example: 'Non-conformité découverte en audit' })
  @IsString()
  @MinLength(3)
  reason: string;
}

export class SetExportReadinessDto {
  @ApiProperty({ enum: ExportReadinessStatus })
  @IsEnum(ExportReadinessStatus)
  status: ExportReadinessStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  complianceStatusSnapshot?: string;
}
