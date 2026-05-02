// PAY-1 phase 1 — DTOs payments.
// PAY-2 — RefundPaymentDto, CreateInvoiceDto.

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUrl, IsUUID, Min } from 'class-validator';

export class GenerateOnboardingLinkDto {
  @ApiProperty({ example: 'https://iox.mycloud.yt/seller/payments/return' })
  @IsString()
  @IsUrl({ require_tld: false })
  returnUrl: string;

  @ApiProperty({ example: 'https://iox.mycloud.yt/seller/payments/refresh' })
  @IsString()
  @IsUrl({ require_tld: false })
  refreshUrl: string;
}

export class CreateCheckoutSessionDto {
  @ApiProperty({ example: 'uuid-rfq' })
  @IsUUID()
  quoteRequestId: string;

  @ApiProperty({ example: 'uuid-offer' })
  @IsUUID()
  marketplaceOfferId: string;

  @ApiProperty({ example: 100000, description: 'Montant total en centimes EUR' })
  @IsInt()
  @Min(50) // 0.50 EUR min côté Stripe
  amountCents: number;

  @ApiProperty({ example: 'https://iox.mycloud.yt/buyer/payments/return' })
  @IsString()
  @IsUrl({ require_tld: false })
  returnUrl: string;

  @ApiProperty({ example: 'https://iox.mycloud.yt/buyer/payments/cancel' })
  @IsString()
  @IsUrl({ require_tld: false })
  cancelUrl: string;

  @ApiPropertyOptional({ example: 'EUR', default: 'EUR' })
  @IsOptional()
  @IsString()
  currency?: string;
}

// PAY-2 — Refund.

export class RefundPaymentDto {
  @ApiPropertyOptional({ description: 'Montant en centimes (partial refund). Omit = full refund' })
  @IsOptional()
  @IsInt()
  @Min(1)
  amountCents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

// PAY-2 — Invoice creation.

export class CreateInvoiceDto {
  @ApiProperty({ example: 'uuid-payment' })
  @IsUUID()
  paymentId: string;
}
