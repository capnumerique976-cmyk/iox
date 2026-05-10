// QuoteRequestFsm — Centralized state machine for QuoteRequest status transitions.
//
// Single source of truth for:
//   - allowed transitions between statuses
//   - role-based restrictions on specific transitions
//   - "payable" guard for Stripe payments
//   - "messageable" guard to prevent reopening closed requests
//
// Business rules (Mandat 53):
//   - Buyer can only CANCEL (transition to CANCELLED).
//   - Seller + staff can drive the full funnel.
//   - WON and LOST are terminal — only seller or staff can reach them.
//   - CANCELLED / LOST / WON are terminal — no further transitions.
//   - Payment (Stripe) is only allowed from status WON.
//   - Messages can be added until the request is in a terminal state.

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { QuoteRequestStatus, UserRole, RequestUser } from '@iox/shared';

/** Allowed target statuses for each source status. */
export const ALLOWED_TRANSITIONS: Readonly<
  Record<QuoteRequestStatus, QuoteRequestStatus[]>
> = {
  [QuoteRequestStatus.NEW]: [
    QuoteRequestStatus.QUALIFIED,
    QuoteRequestStatus.CANCELLED,
    QuoteRequestStatus.LOST,
  ],
  [QuoteRequestStatus.QUALIFIED]: [
    QuoteRequestStatus.QUOTED,
    QuoteRequestStatus.CANCELLED,
    QuoteRequestStatus.LOST,
  ],
  [QuoteRequestStatus.QUOTED]: [
    QuoteRequestStatus.NEGOTIATING,
    QuoteRequestStatus.WON,
    QuoteRequestStatus.LOST,
    QuoteRequestStatus.CANCELLED,
  ],
  [QuoteRequestStatus.NEGOTIATING]: [
    QuoteRequestStatus.QUOTED,
    QuoteRequestStatus.WON,
    QuoteRequestStatus.LOST,
    QuoteRequestStatus.CANCELLED,
  ],
  [QuoteRequestStatus.WON]: [],
  [QuoteRequestStatus.LOST]: [],
  [QuoteRequestStatus.CANCELLED]: [],
} as const;

/** Terminal statuses where no further transitions are allowed. */
export const TERMINAL_STATUSES: ReadonlySet<QuoteRequestStatus> = new Set([
  QuoteRequestStatus.WON,
  QuoteRequestStatus.LOST,
  QuoteRequestStatus.CANCELLED,
]);

/**
 * Statuses from which a Stripe payment confirmation is accepted.
 * Only WON means the deal is closed and payment can be confirmed.
 */
export const PAYABLE_STATUSES: ReadonlySet<QuoteRequestStatus> = new Set([
  QuoteRequestStatus.WON,
]);

const STAFF_ROLES = new Set<UserRole>([
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.QUALITY_MANAGER,
]);

/** Return true if the actor is an internal staff member. */
function isStaff(role: UserRole): boolean {
  return STAFF_ROLES.has(role);
}

export class QuoteRequestFsm {
  /**
   * Check whether a transition `from → to` is structurally allowed.
   * Does NOT check role restrictions — use `assertTransition` for full validation.
   */
  static canTransition(from: QuoteRequestStatus, to: QuoteRequestStatus): boolean {
    if (from === to) return false;
    const allowed = ALLOWED_TRANSITIONS[from];
    return allowed.includes(to);
  }

  /**
   * Validate and assert a transition, throwing NestJS HTTP exceptions on failure.
   *
   * Checks:
   *   1. Same-status no-op.
   *   2. Structural transition allowed.
   *   3. Role restrictions.
   *
   * @param from   Current status.
   * @param to     Target status.
   * @param actor  The requesting user.
   * @throws BadRequestException  when transition is structurally forbidden.
   * @throws ForbiddenException   when the actor's role cannot perform this transition.
   */
  static assertTransition(
    from: QuoteRequestStatus,
    to: QuoteRequestStatus,
    actor: RequestUser,
  ): void {
    if (from === to) {
      throw new BadRequestException('Statut identique au statut courant');
    }

    const allowed = ALLOWED_TRANSITIONS[from];
    if (!allowed.includes(to)) {
      throw new BadRequestException(`Transition interdite : ${from} → ${to}`);
    }

    // Role restrictions —
    // Buyer can only cancel.
    if (actor.role === UserRole.MARKETPLACE_BUYER) {
      if (to !== QuoteRequestStatus.CANCELLED) {
        throw new ForbiddenException("Un acheteur ne peut qu'annuler sa demande");
      }
    }

    // WON / LOST can only be set by seller or staff.
    if (
      (to === QuoteRequestStatus.WON || to === QuoteRequestStatus.LOST) &&
      !isStaff(actor.role) &&
      actor.role !== UserRole.MARKETPLACE_SELLER
    ) {
      throw new ForbiddenException(
        "Seul le vendeur ou l'équipe IOX peut clôturer cette demande",
      );
    }
  }

  /**
   * Assert that a payment can be confirmed for a quote request in the given status.
   * Used by Stripe webhook and invoice creation to prevent invalid payment processing.
   *
   * @throws BadRequestException if status is not payable.
   */
  static assertPayable(status: QuoteRequestStatus): void {
    if (!PAYABLE_STATUSES.has(status)) {
      throw new BadRequestException(
        `Paiement impossible : statut RFQ ${status} ne permet pas une confirmation de paiement` +
          ` (statuts valides : ${[...PAYABLE_STATUSES].join(', ')})`,
      );
    }
  }

  /**
   * Return true if a message can be added to a quote request in the given status.
   * Staff can always message (for internal notes). Public messages close with terminal status.
   */
  static canMessage(status: QuoteRequestStatus, isInternalNote: boolean, actor: RequestUser): boolean {
    if (isInternalNote && isStaff(actor.role)) return true;
    return !TERMINAL_STATUSES.has(status);
  }

  /** Return whether the status is terminal (no further transitions possible). */
  static isTerminal(status: QuoteRequestStatus): boolean {
    return TERMINAL_STATUSES.has(status);
  }
}
