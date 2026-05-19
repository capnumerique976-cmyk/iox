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

  // M133 — amountCents retiré du body : le montant est lu depuis rfq.agreedAmountCents (serveur).
  // Champ conservé optionnel dans le DTO pour ne pas casser les clients existants — ignoré côté service.
  @ApiPropertyOptional({
    example: 240000,
    description:
      'DÉPRÉCIÉ — ignoré depuis M133. Le montant est lu depuis rfq.agreedAmountCents. ' +
      'Conserver pour rétrocompatibilité uniquement.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  amountCents?: number;

  @ApiProperty({ example: 'https://iox.mycloud.yt/buyer/payments/return' })
  @IsString()
  @IsUrl({ require_tld: false })
  returnUrl: string;

  @ApiProperty({ example: 'https://iox.mycloud.yt/buyer/payments/cancel' })
  @IsString()
  @IsUrl({ require_tld: false })
  cancelUrl: string;

  // M133 — currency ignorée aussi : la devise est lue depuis rfq.agreedCurrency.
  @ApiPropertyOptional({
    example: 'EUR',
    description: 'DÉPRÉCIÉ — ignoré depuis M133. La devise est lue depuis rfq.agreedCurrency.',
  })
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
