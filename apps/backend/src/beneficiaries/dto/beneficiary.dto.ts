import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsInt,
  IsArray,
  IsDateString,
  MinLength,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BeneficiaryStatus, MaturityLevel, AccompanimentActionStatus } from '@iox/shared';
import { Type } from 'class-transformer';

// ─── BÉNÉFICIAIRE ─────────────────────────────────────────────────────────────

export class CreateBeneficiaryDto {
  @ApiProperty({ example: 'Coopérative Mahoraise Bio' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({
    example: 'coopérative',
    description: 'entreprise | artisan | producteur | groupement | transformateur',
  })
  @IsString()
  type: string;

  @ApiPropertyOptional({ example: 'maraîchage' })
  @IsOptional()
  @IsString()
  sector?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  siret?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  legalStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  establishedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  employeeCount?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  capacityDescription?: string;

  @ApiPropertyOptional({ description: 'UUID du référent' })
  @IsOptional()
  @IsUUID()
  referentId?: string;
}

export class UpdateBeneficiaryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sector?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  siret?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  legalStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  establishedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  employeeCount?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  capacityDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  referentId?: string;
}

export class ChangeBeneficiaryStatusDto {
  @ApiProperty({ enum: BeneficiaryStatus })
  @IsEnum(BeneficiaryStatus)
  status: BeneficiaryStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

// ─── DIAGNOSTIC ───────────────────────────────────────────────────────────────

export class UpsertDiagnosticDto {
  @ApiPropertyOptional({ enum: MaturityLevel })
  @IsOptional()
  @IsEnum(MaturityLevel)
  maturityLevel?: MaturityLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  constraints?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  needs?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  objectives?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  risks?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priorities?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  conductedAt?: string;
}

// ─── ACTIONS D'ACCOMPAGNEMENT ─────────────────────────────────────────────────

export class CreateActionDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 'formation',
    description: 'formation | diagnostic | accompagnement | certification | autre',
  })
  @IsString()
  actionType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}

export class UpdateActionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actionType?: string;

  @ApiPropertyOptional({ enum: AccompanimentActionStatus })
  @IsOptional()
  @IsEnum(AccompanimentActionStatus)
  status?: AccompanimentActionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}

// ─── QUERY ────────────────────────────────────────────────────────────────────

export class QueryBeneficiariesDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(BeneficiaryStatus)
  status?: BeneficiaryStatus;

  @IsOptional()
  @IsString()
  sector?: string;

  @IsOptional()
  @IsUUID()
  referentId?: string;
}
