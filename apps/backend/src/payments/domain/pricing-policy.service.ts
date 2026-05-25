// ADR-0002 — PricingPolicy domain module.
//
// Single source of truth pour les règles monétaires IOX :
//  - Devises supportées (EUR, USD)
//  - Validation prix d'offre (priceMode × unitPrice × currency)
//  - Lock du `agreedAmountCents` à la transition RFQ → WON (M133)
//  - Calcul de la commission plateforme (application fee)
//
// Convention : tous les montants sont stockés en `amountCents: number`
// (entier, multiple le plus petit de la devise). Pas de Decimal.js V1.

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { MarketplacePriceMode } from '@iox/shared';

/** Devises supportées en V1. ADR-0002 — extension via PR explicite. */
export const SUPPORTED_CURRENCIES = ['EUR', 'USD'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/** Commission plateforme V1. Voir ADR-0002. */
const APPLICATION_FEE_PERCENT = 0.05;

interface OfferPricingInput {
  priceMode: MarketplacePriceMode;
  unitPrice: number | string | null | undefined | { toNumber?: () => number };
  currency: string | null | undefined;
}

interface AgreedAmountLockInput {
  dtoAmountCents?: number | null;
  dtoCurrency?: string | null;
  offerUnitPrice?: number | string | null | { toNumber?: () => number };
  offerCurrency?: string | null;
  requestedQuantity?: number | string | null | { toNumber?: () => number };
}

interface AgreedAmountLockOutput {
  agreedAmountCents: number;
  agreedCurrency: SupportedCurrency;
}

@Injectable()
export class PricingPolicyService {
  private readonly logger = new Logger(PricingPolicyService.name);

  /** Constantes exposées pour les callers (read-only). */
  readonly SUPPORTED_CURRENCIES = SUPPORTED_CURRENCIES;
  readonly APPLICATION_FEE_PERCENT = APPLICATION_FEE_PERCENT;

  // ─── Currency ──────────────────────────────────────────────────────────

  /**
   * Normalise une devise input (trim + uppercase) et asserte qu'elle est
   * supportée. Throw BadRequestException sinon.
   */
  normalizeCurrency(input: string | null | undefined): SupportedCurrency {
    if (!input) {
      throw new BadRequestException('Currency requise');
    }
    const normalized = input.trim().toUpperCase();
    this.assertSupportedCurrency(normalized);
    return normalized;
  }

  assertSupportedCurrency(
    input: string,
  ): asserts input is SupportedCurrency {
    if (!SUPPORTED_CURRENCIES.includes(input as SupportedCurrency)) {
      throw new BadRequestException(
        `Devise non supportée: "${input}". Devises autorisées: ${SUPPORTED_CURRENCIES.join(', ')}`,
      );
    }
  }

  // ─── Offer pricing ─────────────────────────────────────────────────────

  /**
   * Valide les champs prix d'une MarketplaceOffer (create/update).
   *
   * Règles :
   *  - FIXED ou FROM_PRICE → unitPrice > 0 obligatoire + currency
   *    supportée obligatoire
   *  - QUOTE_ONLY → aucun champ prix exigé
   */
  assertOfferPricingValid(input: OfferPricingInput): void {
    const { priceMode, unitPrice, currency } = input;
    const requiresPrice =
      priceMode === MarketplacePriceMode.FIXED ||
      priceMode === MarketplacePriceMode.FROM_PRICE;

    if (!requiresPrice) return;

    const numericPrice = this.toNumber(unitPrice);
    if (numericPrice === null || numericPrice <= 0) {
      throw new BadRequestException(
        `priceMode=${priceMode} exige un unitPrice > 0`,
      );
    }
    if (!currency) {
      throw new BadRequestException(
        `priceMode=${priceMode} exige une currency`,
      );
    }
    this.normalizeCurrency(currency); // throws if unsupported
  }

  // ─── RFQ → WON lock (M133) ─────────────────────────────────────────────

  /**
   * Verrouille le montant payable d'une RFQ à la transition → WON.
   *
   * Priorité : dto explicite → calcul (unitPrice × quantity) depuis offre.
   * Throw BadRequestException si aucun montant ne peut être déterminé.
   *
   * Le résultat est garanti :
   *  - agreedAmountCents : entier > 0
   *  - agreedCurrency : SupportedCurrency
   */
  lockAgreedAmount(input: AgreedAmountLockInput): AgreedAmountLockOutput {
    // 1) Montant fourni explicitement dans le dto
    if (input.dtoAmountCents !== undefined && input.dtoAmountCents !== null) {
      if (!Number.isInteger(input.dtoAmountCents) || input.dtoAmountCents <= 0) {
        throw new BadRequestException(
          'agreedAmountCents doit être un entier > 0',
        );
      }
      const currency = this.normalizeCurrency(input.dtoCurrency ?? 'EUR');
      return {
        agreedAmountCents: input.dtoAmountCents,
        agreedCurrency: currency,
      };
    }

    // 2) Calcul depuis offre + quantity
    const unitPrice = this.toNumber(input.offerUnitPrice);
    const qty = this.toNumber(input.requestedQuantity);
    if (unitPrice !== null && qty !== null && unitPrice > 0 && qty > 0) {
      const agreedAmountCents = Math.round(unitPrice * qty * 100);
      const currency = this.normalizeCurrency(input.offerCurrency ?? 'EUR');
      return { agreedAmountCents, agreedCurrency: currency };
    }

    throw new BadRequestException(
      'Impossible de verrouiller le montant payable : ' +
        'fournissez agreedAmountCents dans le body ou assurez-vous que ' +
        "l'offre a un unitPrice et que la RFQ a une requestedQuantity.",
    );
  }

  /**
   * Asserte qu'une RFQ a son montant verrouillé (post-WON).
   * Utilisé par le checkout pour refuser un paiement non verrouillé.
   */
  assertAgreedAmountLocked(rfq: {
    agreedAmountCents: number | null | undefined;
    agreedCurrency: string | null | undefined;
  }): asserts rfq is {
    agreedAmountCents: number;
    agreedCurrency: SupportedCurrency;
  } {
    if (
      rfq.agreedAmountCents === null ||
      rfq.agreedAmountCents === undefined ||
      rfq.agreedAmountCents <= 0
    ) {
      throw new BadRequestException(
        'Le montant payable n\'est pas verrouillé sur cette RFQ. ' +
          'La RFQ doit être en statut WON avec un agreedAmountCents > 0.',
      );
    }
    if (!rfq.agreedCurrency) {
      throw new BadRequestException(
        'La devise verrouillée est absente sur cette RFQ.',
      );
    }
    this.assertSupportedCurrency(rfq.agreedCurrency.toUpperCase());
  }

  // ─── Commission ────────────────────────────────────────────────────────

  /**
   * Calcule la commission plateforme (application fee) en centimes.
   * Math.floor pour garantir fee ≤ amount.
   */
  computeApplicationFeeCents(amountCents: number): number {
    if (!Number.isInteger(amountCents) || amountCents < 0) {
      throw new BadRequestException(
        'amountCents doit être un entier ≥ 0 pour calculer la commission',
      );
    }
    return Math.floor(amountCents * APPLICATION_FEE_PERCENT);
  }

  // ─── Helpers privés ────────────────────────────────────────────────────

  /**
   * Convertit Prisma.Decimal | string | number | null → number | null.
   * Centralisé ici car répété dans 3 services.
   */
  private toNumber(
    value: number | string | null | undefined | { toNumber?: () => number },
  ): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string') {
      const n = parseFloat(value);
      return Number.isFinite(n) ? n : null;
    }
    if (typeof value === 'object' && 'toNumber' in value && typeof value.toNumber === 'function') {
      try {
        const n = value.toNumber();
        return Number.isFinite(n) ? n : null;
      } catch {
        return null;
      }
    }
    return null;
  }
}
