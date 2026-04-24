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
import { InboundBatchStatus } from '@iox/shared';
import { Type } from 'class-transformer';

export class CreateInboundBatchDto {
  @ApiProperty({ description: 'UUID du fournisseur (Company)' })
  @IsUUID()
  supplierId: string;

  @ApiProperty({ description: 'UUID du produit concerné' })
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({ description: "UUID du contrat d'approvisionnement lié" })
  @IsOptional()
  @IsUUID()
  supplyContractId?: string;

  @ApiProperty({ example: '2026-03-15T08:00:00Z', description: 'Date/heure de réception' })
  @IsDateString()
  receivedAt: string;

  @ApiProperty({ type: Number, example: 500 })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  quantity: number;

  @ApiProperty({ example: 'kg' })
  @IsString()
  @MinLength(1)
  unit: string;

  @ApiPropertyOptional({ example: 'Mayotte — Petite-Terre' })
  @IsOptional()
  @IsString()
  origin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateInboundBatchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  quantity?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  unit?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() origin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class ChangeInboundBatchStatusDto {
  @ApiProperty({ enum: InboundBatchStatus })
  @IsEnum(InboundBatchStatus)
  status: InboundBatchStatus;

  @ApiPropertyOptional({ description: 'Notes de contrôle qualité' })
  @IsOptional()
  @IsString()
  controlNotes?: string;
}

export class QueryInboundBatchesDto {
  @IsOptional() @Type(() => Number) page?: number = 1;
  @IsOptional() @Type(() => Number) limit?: number = 20;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(InboundBatchStatus) status?: InboundBatchStatus;
  @IsOptional() @IsUUID() supplierId?: string;
  @IsOptional() @IsUUID() productId?: string;
  @IsOptional() @IsUUID() supplyContractId?: string;
}
