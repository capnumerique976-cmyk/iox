import {
  IsBoolean,
  IsOptional,
  IsString,
  IsArray,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsBooleanString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLabelValidationDto {
  @IsUUID()
  productBatchId: string;

  @IsBoolean()
  isValid: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  reservations?: string[];
}

export class UpdateLabelValidationDto {
  @IsOptional()
  @IsBoolean()
  isValid?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  reservations?: string[];
}

export class QueryLabelValidationsDto {
  @IsOptional()
  @IsUUID()
  productBatchId?: string;

  /* 'true' | 'false' — query string booléen */
  @IsOptional()
  @IsBooleanString()
  isValid?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
