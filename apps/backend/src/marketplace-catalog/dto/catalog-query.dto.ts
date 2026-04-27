import {
  IsOptional,
  IsString,
  IsEnum,
  IsBooleanString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ExportReadinessStatus,
  MarketplacePriceMode,
  ProductQualityAttribute,
  SeasonalityMonth,
} from '@iox/shared';

export enum CatalogSort {
  FEATURED = 'featured',
  RECENT = 'recent',
  NAME_ASC = 'name_asc',
  NAME_DESC = 'name_desc',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  READINESS = 'readiness',
}

export class CatalogQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Recherche texte (nom commercial, seller, variété, origine)',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;
  @ApiPropertyOptional({ description: 'Slug de catégorie (alternative à categoryId)' })
  @IsOptional()
  @IsString()
  categorySlug?: string;

  @ApiPropertyOptional({ description: 'Code ISO pays (ex: YT, FR)' })
  @IsOptional()
  @IsString()
  originCountry?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() originRegion?: string;

  @ApiPropertyOptional({ description: 'Slug du seller' })
  @IsOptional()
  @IsString()
  sellerSlug?: string;

  @ApiPropertyOptional({ enum: ExportReadinessStatus })
  @IsOptional()
  @IsEnum(ExportReadinessStatus)
  readiness?: ExportReadinessStatus;

  @ApiPropertyOptional({ enum: MarketplacePriceMode })
  @IsOptional()
  @IsEnum(MarketplacePriceMode)
  priceMode?: MarketplacePriceMode;

  @ApiPropertyOptional({ description: 'MOQ maximum acceptable' })
  @IsOptional()
  @Type(() => Number)
  moqMax?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() productionMethod?: string;

  @ApiPropertyOptional({ description: 'Exige au moins un document public' })
  @IsOptional()
  @IsBooleanString()
  hasPublicDocs?: string;

  @ApiPropertyOptional({ description: 'Exige disponibilité (stock > 0 / dans fenêtre)' })
  @IsOptional()
  @IsBooleanString()
  availableOnly?: string;

  @ApiPropertyOptional({ enum: CatalogSort, default: CatalogSort.FEATURED })
  @IsOptional()
  @IsEnum(CatalogSort)
  sort?: CatalogSort;

  // MP-FILTERS-1 — filtre par attribut qualité structurée (FP-7).
  @ApiPropertyOptional({ enum: ProductQualityAttribute })
  @IsOptional()
  @IsEnum(ProductQualityAttribute)
  qualityAttribute?: ProductQualityAttribute;

  // MP-FILTERS-1 — filtre par exigence de température (FP-8). Texte libre,
  // contains insensitive.
  @ApiPropertyOptional({ description: 'Exigence de température (contains insensitive)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  temperatureRequirements?: string;

  // MP-FILTERS-1 — filtre par mois calendaire (FP-1). Un produit `isYearRound`
  // matche tous les mois ; sinon intersection avec `availabilityMonths`.
  @ApiPropertyOptional({ enum: SeasonalityMonth })
  @IsOptional()
  @IsEnum(SeasonalityMonth)
  seasonalityMonth?: SeasonalityMonth;
}
