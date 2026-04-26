import {
  IsArray,
  IsBoolean,
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
  IsObject,
  IsInt,
  MinLength,
  MaxLength,
  Matches,
  Min,
  Max,
  ArrayUnique,
  ArrayMaxSize,
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

  // ─── FP-6 — Origine fine (tous optionnels) ──────────────────────────────
  @ApiPropertyOptional({ example: 'Combani', description: 'Localité / village / lieu-dit.' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  originLocality?: string;

  @ApiPropertyOptional({ example: 350, description: 'Altitude moyenne en mètres (0..9000).' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9000)
  altitudeMeters?: number;

  @ApiPropertyOptional({ example: -12.8275, description: 'Latitude WGS84 (-90..90). Cohérence service-side avec gpsLng.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  gpsLat?: number;

  @ApiPropertyOptional({ example: 45.166, description: 'Longitude WGS84 (-180..180). Cohérence service-side avec gpsLat.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  gpsLng?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() descriptionShort?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descriptionLong?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() usageTips?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() packagingDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() storageConditions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shelfLifeInfo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() allergenInfo?: string;

  // ─── FP-8 — Logistique structurée ──────────────────────────────────────
  @ApiPropertyOptional({
    type: [String],
    example: ['1kg', '5kg', 'carton 10kg'],
    description: 'Conditionnements proposés. Max 12 entrées, ≤ 80 chars chacune.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  packagingFormats?: string[];

  @ApiPropertyOptional({ example: 'Cool 4-8°C' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  temperatureRequirements?: string;

  @ApiPropertyOptional({ example: 1.05, description: 'Poids brut unitaire (kg).' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100000)
  grossWeight?: number;

  @ApiPropertyOptional({ example: 1.0, description: 'Poids net unitaire (kg).' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100000)
  netWeight?: number;

  @ApiPropertyOptional({ example: '120 cartons / palette EUR-EPAL 1200x800' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  palletization?: string;

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

  // ─── FP-6 — Origine fine (tous optionnels, mêmes règles que Create) ─────
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  originLocality?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9000)
  altitudeMeters?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  gpsLat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  gpsLng?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() descriptionShort?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descriptionLong?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() usageTips?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() packagingDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() storageConditions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shelfLifeInfo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() allergenInfo?: string;

  // ─── FP-8 — Logistique structurée (mêmes règles que Create) ────────────
  @ApiPropertyOptional({ type: [String], example: ['1kg', '5kg'] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  packagingFormats?: string[];

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100)
  temperatureRequirements?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100000)
  grossWeight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100000)
  netWeight?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  palletization?: string;

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
