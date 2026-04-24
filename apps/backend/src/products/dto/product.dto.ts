import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsUUID,
  MinLength,
  IsNumber,
  IsPositive,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus } from '@iox/shared';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 'Rougail de mangue' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 'Rougail Bio Mayotte' })
  @IsOptional()
  @IsString()
  commercialName?: string;

  @ApiProperty({ example: 'conserve', description: 'conserve | épice | poisson | artisanat...' })
  @IsString()
  category: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Mangues de Madagascar' })
  @IsOptional()
  @IsString()
  origin?: string;

  @ApiPropertyOptional({ example: 'Atelier MCH — Mamoudzou' })
  @IsOptional()
  @IsString()
  transformationSite?: string;

  @ApiPropertyOptional({ example: 'Pot verre 200g' })
  @IsOptional()
  @IsString()
  packagingSpec?: string;

  @ApiPropertyOptional({ type: Number, example: 500 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  productionCapacity?: number;

  @ApiPropertyOptional({ example: 'kg' })
  @IsOptional()
  @IsString()
  unit?: string;

  // Fiche technique
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ingredients?: string;

  @ApiPropertyOptional({ type: [String], example: ['gluten', 'sulfites'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];

  @ApiPropertyOptional({ example: '18 mois' })
  @IsOptional()
  @IsString()
  shelfLife?: string;

  @ApiPropertyOptional({ example: "Conserver à température ambiante, à l'abri de la lumière" })
  @IsOptional()
  @IsString()
  storageConditions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  labelingInfo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nutritionalInfo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  technicalNotes?: string;

  @ApiProperty({ description: 'UUID du bénéficiaire propriétaire' })
  @IsUUID()
  beneficiaryId: string;
}

export class UpdateProductDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() commercialName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() origin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() transformationSite?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() packagingSpec?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  productionCapacity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ingredients?: string;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() shelfLife?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() storageConditions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() labelingInfo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nutritionalInfo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() technicalNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() versionNotes?: string;
}

export class ChangeProductStatusDto {
  @ApiProperty({ enum: ProductStatus })
  @IsEnum(ProductStatus)
  status: ProductStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class QueryProductsDto {
  @IsOptional() @Type(() => Number) page?: number = 1;
  @IsOptional() @Type(() => Number) limit?: number = 20;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsUUID() beneficiaryId?: string;
}
