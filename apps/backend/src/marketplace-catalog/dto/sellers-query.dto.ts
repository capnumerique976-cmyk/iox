import { IsOptional, IsString, IsEnum, IsBooleanString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * MP-S-INDEX — Tri pour l'annuaire seller public.
 *
 * `featured` (default) place les vendeurs `isFeatured=true` en tête, puis
 * trie par `approvedAt` desc.
 */
export enum SellersSort {
  FEATURED = 'featured',
  RECENT = 'recent',
  NAME_ASC = 'name_asc',
}

/**
 * MP-S-INDEX — Query params de `GET /marketplace/catalog/sellers`.
 *
 * Tous les champs sont optionnels. Les filtres sont combinés en `AND`,
 * la recherche `q` est un OR multi-champs (publicDisplayName + cityOrZone)
 * en `contains` insensible à la casse.
 *
 * Volontairement minimaliste pour ce premier lot ; pas de filtre par
 * certification, catégorie produit ou incoterm — voir la doc
 * `docs/marketplace/MARKETPLACE_SELLERS_PUBLIC_INDEX.md`.
 */
export class SellersQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Recherche texte (publicDisplayName, cityOrZone)' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Code ISO pays (ex: YT, FR)' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Région (contains insensible à la casse)' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ description: 'Filtre featured = true (sinon ignoré)' })
  @IsOptional()
  @IsBooleanString()
  featured?: string;

  @ApiPropertyOptional({ enum: SellersSort, default: SellersSort.FEATURED })
  @IsOptional()
  @IsEnum(SellersSort)
  sort?: SellersSort = SellersSort.FEATURED;
}
