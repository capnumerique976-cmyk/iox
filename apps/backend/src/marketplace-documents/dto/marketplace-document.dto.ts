import { IsString, IsOptional, IsEnum, IsUUID, IsISO8601, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MarketplaceRelatedEntityType,
  MarketplaceDocumentVisibility,
  MarketplaceVerificationStatus,
} from '@iox/shared';
import { Type } from 'class-transformer';

export class CreateMarketplaceDocumentDto {
  @ApiProperty({ enum: MarketplaceRelatedEntityType })
  @IsEnum(MarketplaceRelatedEntityType)
  relatedType: MarketplaceRelatedEntityType;

  @ApiProperty({ example: 'uuid-entity' })
  @IsUUID()
  relatedId: string;

  @ApiProperty({ example: 'uuid-document' })
  @IsUUID()
  documentId: string;

  @ApiProperty({
    example: 'CERT_BIO',
    description: 'Catégorie libre (CERT_BIO, COA, FDS, FT, FAIR_TRADE…)',
  })
  @IsString()
  @MinLength(2)
  documentType: string;

  @ApiProperty({ example: 'Certificat Ecocert 2026' })
  @IsString()
  @MinLength(2)
  title: string;

  @ApiPropertyOptional({
    enum: MarketplaceDocumentVisibility,
    default: MarketplaceDocumentVisibility.PRIVATE,
  })
  @IsOptional()
  @IsEnum(MarketplaceDocumentVisibility)
  visibility?: MarketplaceDocumentVisibility;

  @ApiPropertyOptional({ example: '2025-01-01' })
  @IsOptional()
  @IsISO8601()
  validFrom?: string;

  @ApiPropertyOptional({ example: '2027-01-01' })
  @IsOptional()
  @IsISO8601()
  validUntil?: string;
}

export class UpdateMarketplaceDocumentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  documentType?: string;

  @ApiPropertyOptional({ enum: MarketplaceDocumentVisibility })
  @IsOptional()
  @IsEnum(MarketplaceDocumentVisibility)
  visibility?: MarketplaceDocumentVisibility;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  validFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  validUntil?: string;
}

export class QueryMarketplaceDocumentsDto {
  @IsOptional() @Type(() => Number) page?: number = 1;
  @IsOptional() @Type(() => Number) limit?: number = 20;

  @IsOptional()
  @IsEnum(MarketplaceRelatedEntityType)
  relatedType?: MarketplaceRelatedEntityType;

  @IsOptional()
  @IsUUID()
  relatedId?: string;

  @IsOptional()
  @IsString()
  documentType?: string;

  @IsOptional()
  @IsEnum(MarketplaceDocumentVisibility)
  visibility?: MarketplaceDocumentVisibility;

  @IsOptional()
  @IsEnum(MarketplaceVerificationStatus)
  verificationStatus?: MarketplaceVerificationStatus;
}

export class RejectMarketplaceDocumentDto {
  @ApiProperty({ example: 'Document illisible, page manquante' })
  @IsString()
  @MinLength(3)
  reason: string;
}

export class VerifyMarketplaceDocumentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
