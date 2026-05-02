// MP-CATEGORY-1 — DTOs admin CRUD catégories marketplace.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateMarketplaceCategoryDto {
  @ApiProperty({ example: 'epices' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(SLUG_REGEX, { message: 'Slug invalide (lowercase alphanumérique + tirets uniquement)' })
  slug: string;

  @ApiProperty({ example: 'Épices' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nameFr: string;

  @ApiProperty({ example: 'Spices' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nameEn: string;

  @ApiPropertyOptional({ example: 'Épices et aromates de Mayotte' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Parent UUID si sous-catégorie' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateMarketplaceCategoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nameFr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nameEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
