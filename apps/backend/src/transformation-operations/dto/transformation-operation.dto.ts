import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsNumber,
  Min,
  Max,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateTransformationOperationDto {
  @ApiProperty({ description: 'UUID du lot entrant utilisé (doit être ACCEPTED)' })
  @IsUUID()
  inboundBatchId: string;

  @ApiProperty({ example: 'Cuisson et mise en conserve' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '2026-04-10T09:00:00Z' })
  @IsDateString()
  operationDate: string;

  @ApiPropertyOptional({ example: 'Atelier MCH — Mamoudzou' })
  @IsOptional()
  @IsString()
  site?: string;

  @ApiPropertyOptional({
    type: Number,
    minimum: 0,
    maximum: 100,
    example: 72.5,
    description: 'Taux de transformation en %',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  yieldRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  operatorNotes?: string;
}

export class UpdateTransformationOperationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() operationDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() site?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  yieldRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() operatorNotes?: string;
}

export class QueryTransformationOperationsDto {
  @IsOptional() @Type(() => Number) page?: number = 1;
  @IsOptional() @Type(() => Number) limit?: number = 20;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsUUID() inboundBatchId?: string;
}
