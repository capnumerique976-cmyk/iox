import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  IsNumber,
  IsPositive,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductBatchStatus } from '@iox/shared';
import { Type } from 'class-transformer';

export class CreateProductBatchDto {
  @ApiProperty({ description: 'UUID du produit (doit être éligible — non BLOCKED / ARCHIVED)' })
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({ description: "UUID de l'opération de transformation source (optionnel)" })
  @IsOptional()
  @IsUUID()
  transformationOpId?: string;

  @ApiProperty({ type: Number, example: 350, description: 'Quantité produite' })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  quantity: number;

  @ApiProperty({ example: 'kg' })
  @IsString()
  @MinLength(1)
  unit: string;

  @ApiProperty({ example: '2026-04-11', description: 'Date de fabrication' })
  @IsDateString()
  productionDate: string;

  @ApiPropertyOptional({ example: '2027-10-11', description: "Date d'expiration (DLC/DLUO)" })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ example: 'Entrepôt A — Étagère 3' })
  @IsOptional()
  @IsString()
  storageLocation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateProductBatchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) unit?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() storageLocation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class ChangeProductBatchStatusDto {
  @ApiProperty({ enum: ProductBatchStatus })
  @IsEnum(ProductBatchStatus)
  status: ProductBatchStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class QueryProductBatchesDto {
  @IsOptional() @Type(() => Number) page?: number = 1;
  @IsOptional() @Type(() => Number) limit?: number = 20;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(ProductBatchStatus) status?: ProductBatchStatus;
  @IsOptional() @IsUUID() productId?: string;
  @IsOptional() @IsUUID() transformationOpId?: string;
}
