import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsArray,
  IsDateString,
  IsNumber,
  IsPositive,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupplyContractStatus } from '@iox/shared';
import { Type } from 'class-transformer';

export class CreateSupplyContractDto {
  @ApiProperty({ description: 'UUID du fournisseur (Company)' })
  @IsUUID()
  supplierId: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'UUIDs des produits couverts par le contrat',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  productIds?: string[];

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ type: Number, example: 5000 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  volumeCommitted?: number;

  @ApiPropertyOptional({ example: 'kg' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ example: '30 jours net fin de mois' })
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSupplyContractDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  productIds?: string[];

  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  volumeCommitted?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentTerms?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class ChangeSupplyContractStatusDto {
  @ApiProperty({ enum: SupplyContractStatus })
  @IsEnum(SupplyContractStatus)
  status: SupplyContractStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class QuerySupplyContractsDto {
  @IsOptional() @Type(() => Number) page?: number = 1;
  @IsOptional() @Type(() => Number) limit?: number = 20;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(SupplyContractStatus) status?: SupplyContractStatus;
  @IsOptional() @IsUUID() supplierId?: string;
}
