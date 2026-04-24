import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  IsBoolean,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { QuoteRequestStatus } from '@iox/shared';

export class CreateQuoteRequestDto {
  @ApiProperty({
    description: 'Offre marketplace ciblée (doit être PUBLISHED + visibility ≠ PRIVATE)',
  })
  @IsUUID()
  marketplaceOfferId: string;

  @ApiProperty({ description: 'Company acheteuse (contexte B2B)' })
  @IsUUID()
  buyerCompanyId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  requestedQuantity?: number;

  @ApiPropertyOptional({ example: 'kg' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  requestedUnit?: string;

  @ApiPropertyOptional({ example: 'FR' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  deliveryCountry?: string;

  @ApiPropertyOptional({ example: 'EU' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  targetMarket?: string;

  @ApiPropertyOptional({ description: 'Message initial (visible acheteur/vendeur)' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  message?: string;
}

export class QueryQuoteRequestsDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) limit?: number;

  @ApiPropertyOptional({ enum: QuoteRequestStatus })
  @IsOptional()
  @IsEnum(QuoteRequestStatus)
  status?: QuoteRequestStatus;

  @ApiPropertyOptional() @IsOptional() @IsUUID() marketplaceOfferId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() sellerProfileId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() buyerCompanyId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() assignedToUserId?: string;
}

export class UpdateQuoteRequestStatusDto {
  @ApiProperty({ enum: QuoteRequestStatus })
  @IsEnum(QuoteRequestStatus)
  status: QuoteRequestStatus;

  @ApiPropertyOptional({ description: 'Note motivant le changement (journalisée en audit)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class AssignQuoteRequestDto {
  @ApiProperty({ description: 'User interne assigné (staff). null pour désassigner.' })
  @IsOptional()
  @IsUUID()
  assignedToUserId?: string | null;
}

export class CreateQuoteRequestMessageDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message: string;

  @ApiPropertyOptional({ default: false, description: 'Note interne staff (invisible côté buyer)' })
  @IsOptional()
  @IsBoolean()
  isInternalNote?: boolean;
}
