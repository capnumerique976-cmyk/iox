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
  MaxLength,
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

/**
 * FP-3 — DTO d'auto-édition par le seller connecté.
 *
 * Volontairement plus restreint que `UpdateSellerProfileDto` (admin) :
 *  - pas de `slug` (impacte SEO et liens publics, doit rester staff) ;
 *  - pas de `legalName` (identité légale, staff uniquement) ;
 *  - bornes longues vs admin pour éviter qu'un seller pousse un payload
 *    de plusieurs MB dans la base (DoS doux + audit lisible).
 *
 * Le ValidationPipe global (`whitelist + forbidNonWhitelisted`) bloque
 * automatiquement toute clé hors whitelist (slug, status, isFeatured,
 * companyId, etc.) → on ne réinvente pas la roue ici.
 */
export class UpdateMySellerProfileDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 80 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  publicDisplayName?: string;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  region?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  cityOrZone?: string;

  @ApiPropertyOptional({ maxLength: 280 })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  descriptionShort?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descriptionLong?: string;

  @ApiPropertyOptional({ maxLength: 4000 })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  story?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(8, { each: true })
  languages?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  salesEmail?: string;

  @ApiPropertyOptional({ maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  salesPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true })
  @MaxLength(255)
  website?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(8, { each: true })
  supportedIncoterms?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(3, { each: true })
  destinationsServed?: string[];

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  averageLeadTimeDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  logoMediaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  bannerMediaId?: string;
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
