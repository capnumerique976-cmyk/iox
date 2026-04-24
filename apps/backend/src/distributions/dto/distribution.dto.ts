import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsNumber,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DistributionStatus } from '@iox/shared';

export class CreateDistributionLineDto {
  @IsString()
  @IsNotEmpty()
  productBatchId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateDistributionDto {
  @IsString()
  @IsNotEmpty()
  beneficiaryId: string;

  @IsDateString()
  distributionDate: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDistributionLineDto)
  lines: CreateDistributionLineDto[];
}

export class UpdateDistributionDto {
  @IsOptional()
  @IsDateString()
  distributionDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ChangeDistributionStatusDto {
  @IsEnum(DistributionStatus)
  status: DistributionStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class QueryDistributionsDto {
  @IsOptional()
  @IsString()
  beneficiaryId?: string;

  @IsOptional()
  @IsEnum(DistributionStatus)
  status?: DistributionStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
