import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsEmail,
  IsUrl,
  IsUUID,
  IsArray,
  MinLength,
  Matches,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SellerProfileStatus } from '@iox/shared';
import { Type } from 'class-transformer';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateSellerProfileDto {
  @ApiProperty({ example: 'uuid-company' })
  @IsUUID()
  companyId: string;

  @ApiProperty({ example: 'Coopérative Vanille de Mayotte' })
  @IsString()
  @MinLength(2)
  publicDisplayName: string;

  @ApiProperty({ example: 'cooperative-vanille-mayotte' })
  @IsString()
  @Matches(SLUG_REGEX, { message: 'slug must be lowercase letters, digits and hyphens' })
  slug: string;

  @ApiProperty({ example: 'YT' })
  @IsString()
  country: string;

  @ApiPropertyOptional() @IsOptional() @IsString() legalName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() region?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cityOrZone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descriptionShort?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descriptionLong?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() story?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @ApiPropertyOptional() @IsOptional() @IsEmail() salesEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() salesPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() website?: string;

  @ApiPropertyOptional({ type: [String], example: ['FOB', 'CIF'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedIncoterms?: string[];

  @ApiPropertyOptional({ type: [String], example: ['FR', 'DE', 'RE'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  destinationsServed?: string[];

  @ApiPropertyOptional({ example: 14 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  averageLeadTimeDays?: number;
}

export class UpdateSellerProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) publicDisplayName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(SLUG_REGEX) slug?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() legalName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() region?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cityOrZone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descriptionShort?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descriptionLong?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() story?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @ApiPropertyOptional() @IsOptional() @IsEmail() salesEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() salesPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() website?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedIncoterms?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  destinationsServed?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  averageLeadTimeDays?: number;

  @ApiPropertyOptional() @IsOptional() @IsUUID() logoMediaId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() bannerMediaId?: string;
}

export class QuerySellerProfilesDto {
  @IsOptional() @Type(() => Number) page?: number = 1;
  @IsOptional() @Type(() => Number) limit?: number = 20;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(SellerProfileStatus) status?: SellerProfileStatus;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isFeatured?: boolean;
}

export class RejectSellerProfileDto {
  @ApiProperty({ example: 'Documents manquants : certificat bio expiré' })
  @IsString()
  @MinLength(3)
  reason: string;
}

export class SuspendSellerProfileDto {
  @ApiProperty({ example: 'Non-conformité qualité constatée' })
  @IsString()
  @MinLength(3)
  reason: string;
}
