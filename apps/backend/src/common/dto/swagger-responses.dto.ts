/**
 * M60 — DTOs de réponse Swagger centralisés.
 *
 * Ces classes servent uniquement à documenter les réponses dans Swagger UI.
 * Elles ne transforment pas les réponses (pas de class-transformer appliqué ici).
 * Les services retournent des objets Prisma — ces DTOs décrivent leur forme.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── Pagination ──────────────────────────────────────────────────────────────

export class PaginationMetaDto {
  @ApiProperty({ example: 42 }) total: number;
  @ApiProperty({ example: 1 }) page: number;
  @ApiProperty({ example: 20 }) limit: number;
  @ApiProperty({ example: 3 }) totalPages: number;
}

// ─── Compliance ──────────────────────────────────────────────────────────────

export class SellerComplianceSummaryDto {
  @ApiProperty({
    example: 'ACTION_REQUIRED',
    description: "Statut global conformité : COMPLETE | ACTION_REQUIRED | PENDING_REVIEW | BLOCKED | INCOMPLETE",
  })
  status: string;

  @ApiProperty({ example: 75, description: 'Pourcentage de complétion KYC (0–100)' })
  completionPercentage: number;

  @ApiProperty({ example: 'PENDING_REVIEW' })
  sellerProfileStatus: string;

  @ApiPropertyOptional({ example: null })
  sellerProfileRejectionReason: string | null;

  @ApiProperty({ example: 5 }) totalDocuments: number;
  @ApiProperty({ example: 3 }) verifiedDocuments: number;
  @ApiProperty({ example: 1 }) pendingDocuments: number;
  @ApiProperty({ example: 0 }) rejectedDocuments: number;
  @ApiProperty({ example: 0 }) expiredDocuments: number;
  @ApiProperty({ example: 1 }) expiringSoonDocuments: number;

  @ApiProperty({ example: 2 }) totalCertifications: number;
  @ApiProperty({ example: 1 }) verifiedCertifications: number;
  @ApiProperty({ example: 1 }) pendingCertifications: number;
  @ApiProperty({ example: 0 }) rejectedCertifications: number;
  @ApiProperty({ example: 0 }) expiredCertifications: number;
  @ApiProperty({ example: 0 }) expiringSoonCertifications: number;

  @ApiProperty({ example: 2, description: 'Items en attente de validation dans la review queue' })
  pendingReviewItems: number;

  @ApiPropertyOptional({ example: 'Complétez votre dossier KYC pour être visible dans le catalogue.' })
  nextAction: string | null;
}

export class AdminComplianceSummaryDto {
  @ApiProperty({ example: 24 }) sellersTotal: number;
  @ApiProperty({ example: 14 }) sellersApproved: number;
  @ApiProperty({ example: 7 }) sellersPendingReview: number;
  @ApiProperty({ example: 2 }) sellersRejected: number;
  @ApiProperty({ example: 1 }) sellersSuspended: number;
  @ApiProperty({ example: 8 }) documentsPending: number;
  @ApiProperty({ example: 3 }) documentsRejected: number;
  @ApiProperty({ example: 1 }) documentsExpired: number;
  @ApiProperty({ example: 2 }) documentsExpiringSoon: number;
  @ApiProperty({ example: 5 }) certificationsPending: number;
  @ApiProperty({ example: 1 }) certificationsRejected: number;
  @ApiProperty({ example: 0 }) certificationsExpired: number;
  @ApiProperty({ example: 1 }) certificationsExpiringSoon: number;
  @ApiProperty({ example: 4 }) reviewQueuePending: number;
}

export class SellerComplianceRowDto {
  @ApiProperty({ example: 'uuid-seller-profile' }) sellerProfileId: string;
  @ApiProperty({ example: 'Épices de Madagascar SARL' }) publicDisplayName: string;
  @ApiProperty({ example: 'ACTIVE' }) sellerProfileStatus: string;
  @ApiProperty({ example: 'ACTION_REQUIRED' }) complianceStatus: string;
  @ApiProperty({ example: 5 }) documentsTotal: number;
  @ApiProperty({ example: 3 }) documentsVerified: number;
  @ApiProperty({ example: 1 }) documentsPending: number;
  @ApiProperty({ example: 1 }) documentsRejected: number;
  @ApiProperty({ example: 2 }) certificationsTotal: number;
  @ApiProperty({ example: 1 }) certificationsVerified: number;
  @ApiProperty({ example: 1 }) certificationsPending: number;
  @ApiProperty({ example: 0 }) certificationsRejected: number;
  @ApiProperty({ example: 0 }) pendingReviewItems: number;
}

// ─── Marketplace Alerts (dashboard) ──────────────────────────────────────────

export class MarketplaceAlertResponseDto {
  @ApiProperty({ example: 3, description: "Nouvelles RFQ non traitées (seller uniquement)" })
  newRfqs: number;

  @ApiProperty({ example: 1, description: "Paiements confirmés en attente de facture (seller)" })
  pendingInvoices: number;

  @ApiProperty({ example: 2, description: "Nouveaux messages reçus sur les RFQ (buyer + seller)" })
  newMessages: number;

  @ApiProperty({ example: 6, description: 'Total des alertes (somme des champs ci-dessus)' })
  total: number;
}

// ─── Payments ────────────────────────────────────────────────────────────────

export class PaymentCheckoutResponseDto {
  @ApiProperty({ example: 'uuid-payment' })
  paymentId: string;

  @ApiProperty({ example: 'cs_live_abc123xyz' })
  sessionId: string;

  @ApiProperty({ example: 'https://checkout.stripe.com/c/pay/cs_live_abc123xyz' })
  checkoutUrl: string;
}

export class PaymentResponseDto {
  @ApiProperty({ example: 'uuid-payment' }) id: string;
  @ApiProperty({ example: 'uuid-quote-request' }) quoteRequestId: string;
  @ApiProperty({ example: 'uuid-offer' }) marketplaceOfferId: string;
  @ApiProperty({ example: 'uuid-seller-profile' }) sellerProfileId: string;
  @ApiProperty({ example: 'uuid-buyer-user' }) buyerUserId: string;
  @ApiProperty({ example: 'uuid-buyer-company' }) buyerCompanyId: string;
  @ApiProperty({ example: 100000, description: 'Montant en centimes' }) amountCents: number;
  @ApiProperty({ example: 5000, description: 'Commission IOX 5% en centimes' }) applicationFeeCents: number;
  @ApiProperty({ example: 'EUR', description: 'Devise : EUR ou USD' }) currency: string;
  @ApiProperty({
    example: 'SUCCEEDED',
    description: 'Statut paiement : PENDING | SUCCEEDED | FAILED | REFUNDED | CANCELLED',
  })
  status: string;
  @ApiPropertyOptional({ example: 'pi_3QxyzABC' }) stripePaymentIntentId: string | null;
  @ApiPropertyOptional({ example: 'cs_live_abc' }) stripeCheckoutSessionId: string | null;
  @ApiProperty({ example: '2026-05-10T10:00:00.000Z' }) createdAt: string;
  @ApiProperty({ example: '2026-05-10T10:00:00.000Z' }) updatedAt: string;
}

export class RefundResponseDto {
  @ApiProperty({ example: 'uuid-payment' }) id: string;
  @ApiProperty({ example: 'REFUNDED' }) status: string;
  @ApiPropertyOptional() metadataJson: Record<string, unknown> | null;
}

export class StripeAccountStatusDto {
  @ApiProperty({ example: 'ACTIVE', description: 'PENDING_ONBOARDING | RESTRICTED | ACTIVE | DISABLED' })
  status: string;
  @ApiProperty({ example: true }) chargesEnabled: boolean;
  @ApiProperty({ example: true }) payoutsEnabled: boolean;
  @ApiProperty({ example: true }) detailsSubmitted: boolean;
}

export class OnboardingLinkResponseDto {
  @ApiProperty({ example: 'https://connect.stripe.com/setup/e/acct_xxxx/xxxxxx' })
  url: string;
}

// ─── Invoices ────────────────────────────────────────────────────────────────

export class InvoiceResponseDto {
  @ApiProperty({ example: 'uuid-invoice' }) id: string;
  @ApiProperty({ example: 'uuid-payment' }) paymentId: string;
  @ApiProperty({ example: 'uuid-seller-profile' }) sellerProfileId: string;
  @ApiProperty({ example: 'uuid-buyer-company' }) buyerCompanyId: string;
  @ApiProperty({ example: 'INV-2026-00042', description: 'Numéro de facture auto-généré' }) invoiceNumber: string;
  @ApiProperty({ example: 100000, description: 'Montant en centimes' }) amountCents: number;
  @ApiProperty({ example: 'EUR', description: 'Devise : EUR ou USD' }) currency: string;
  @ApiProperty({
    example: 'ISSUED',
    description: 'Statut facture : DRAFT | ISSUED | PAID | CANCELED',
  })
  status: string;
  @ApiPropertyOptional({ example: 'invoices/INV-2026-00042.pdf' }) pdfStorageKey: string | null;
  @ApiPropertyOptional({ example: '2026-05-10T10:00:00.000Z' }) issuedAt: string | null;
  @ApiProperty({ example: '2026-05-10T09:00:00.000Z' }) createdAt: string;
}

export class PaginatedInvoicesDto {
  @ApiProperty({ type: [InvoiceResponseDto] }) data: InvoiceResponseDto[];
  @ApiProperty({ type: PaginationMetaDto }) meta: PaginationMetaDto;
}

// ─── Quote Requests ───────────────────────────────────────────────────────────

export class QuoteRequestResponseDto {
  @ApiProperty({ example: 'uuid-rfq' }) id: string;
  @ApiProperty({ example: 'uuid-offer' }) marketplaceOfferId: string;
  @ApiProperty({ example: 'uuid-buyer-company' }) buyerCompanyId: string;
  @ApiProperty({ example: 'uuid-buyer-user' }) buyerUserId: string;
  @ApiProperty({
    example: 'NEW',
    description:
      'Statut FSM : NEW → QUALIFIED → QUOTED → NEGOTIATING → WON | LOST | CANCELLED. ' +
      'WON, LOST, CANCELLED sont terminaux (plus de transition possible).',
  })
  status: string;
  @ApiPropertyOptional({ example: 500, description: 'Quantité demandée' }) requestedQuantity: number | null;
  @ApiPropertyOptional({ example: 'kg' }) requestedUnit: string | null;
  @ApiPropertyOptional({ example: 'FR' }) deliveryCountry: string | null;
  @ApiPropertyOptional({ example: 'EU' }) targetMarket: string | null;
  @ApiPropertyOptional({ example: 'Bonjour, je voudrais 500kg de vanille grade A.' })
  message: string | null;
  @ApiPropertyOptional({ example: 'uuid-staff-user', description: 'User staff assigné' })
  assignedToUserId: string | null;
  @ApiProperty({ example: '2026-05-10T09:00:00.000Z' }) createdAt: string;
  @ApiProperty({ example: '2026-05-10T10:00:00.000Z' }) updatedAt: string;
}

export class PaginatedQuoteRequestsDto {
  @ApiProperty({ type: [QuoteRequestResponseDto] }) data: QuoteRequestResponseDto[];
  @ApiProperty({ type: PaginationMetaDto }) meta: PaginationMetaDto;
}

export class QuoteRequestMessageResponseDto {
  @ApiProperty({ example: 'uuid-message' }) id: string;
  @ApiProperty({ example: 'uuid-rfq' }) quoteRequestId: string;
  @ApiProperty({ example: 'uuid-user' }) authorUserId: string;
  @ApiProperty({ example: 'Merci, nous pouvons livrer 500kg en 3 semaines.' }) message: string;
  @ApiProperty({ example: false, description: 'true = note interne staff (invisible côté buyer)' })
  isInternalNote: boolean;
  @ApiProperty({ example: '2026-05-10T10:15:00.000Z' }) createdAt: string;
}

// ─── Webhook ─────────────────────────────────────────────────────────────────

export class WebhookAckDto {
  @ApiProperty({ example: true }) received: boolean;
  @ApiProperty({ example: 'payment_intent.succeeded' }) type: string;
}
