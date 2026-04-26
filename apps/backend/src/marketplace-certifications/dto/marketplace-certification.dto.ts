// FP-2 — DTOs marketplace certifications.
// Validation au niveau requête. La restriction `relatedType ∈ {SELLER_PROFILE,
// MARKETPLACE_PRODUCT}` est appliquée côté service (utilise l'enum
// `MarketplaceRelatedEntityType` partagée) — un IsIn() suffirait mais on
// préfère un message d'erreur métier explicite côté service.

import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsISO8601,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CertificationType,
  MarketplaceRelatedEntityType,
  MarketplaceVerificationStatus,
} from '@iox/shared';
import { Type } from 'class-transformer';

export class CreateMarketplaceCertificationDto {
  @ApiProperty({
    enum: MarketplaceRelatedEntityType,
    description: 'MVP : SELLER_PROFILE ou MARKETPLACE_PRODUCT (autres scopes refusés)',
  })
  @IsEnum(MarketplaceRelatedEntityType)
  relatedType: MarketplaceRelatedEntityType;

  @ApiProperty({ example: 'uuid-entity' })
  @IsUUID()
  relatedId: string;

  @ApiProperty({ enum: CertificationType, example: CertificationType.BIO_EU })
  @IsEnum(CertificationType)
  type: CertificationType;

  @ApiPropertyOptional({
    example: 'FR-BIO-01-2026-001',
    description: 'Numéro de licence/certificat tel que figure sur le document officiel.',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  code?: string;

  @ApiPropertyOptional({
    example: 'Ecocert',
    description: "Nom de l'organisme certificateur émetteur.",
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  issuingBody?: string;

  @ApiPropertyOptional({ example: '2026-01-15' })
  @IsOptional()
  @IsISO8601()
  issuedAt?: string;

  @ApiPropertyOptional({ example: '2026-01-15' })
  @IsOptional()
  @IsISO8601()
  validFrom?: string;

  @ApiPropertyOptional({ example: '2027-01-14' })
  @IsOptional()
  @IsISO8601()
  validUntil?: string;

  @ApiPropertyOptional({
    example: 'uuid-media',
    description: 'MediaAsset (PDF scanné) qui sert de preuve documentaire.',
  })
  @IsOptional()
  @IsUUID()
  documentMediaId?: string;
}

export class UpdateMarketplaceCertificationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  issuingBody?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  issuedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  validFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  validUntil?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  documentMediaId?: string;
}

export class QueryMarketplaceCertificationsDto {
  @IsOptional() @Type(() => Number) page?: number = 1;
  @IsOptional() @Type(() => Number) limit?: number = 20;

  @IsOptional()
  @IsEnum(MarketplaceRelatedEntityType)
  relatedType?: MarketplaceRelatedEntityType;

  @IsOptional()
  @IsUUID()
  relatedId?: string;

  @IsOptional()
  @IsEnum(CertificationType)
  type?: CertificationType;

  @IsOptional()
  @IsEnum(MarketplaceVerificationStatus)
  verificationStatus?: MarketplaceVerificationStatus;
}

export class VerifyMarketplaceCertificationDto {
  @ApiPropertyOptional({ example: 'Vérifié sur registre Ecocert' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class RejectMarketplaceCertificationDto {
  @ApiProperty({ example: 'Numéro de licence introuvable au registre Ecocert' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}
