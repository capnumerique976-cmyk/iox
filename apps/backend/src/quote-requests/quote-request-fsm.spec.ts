// Spec — QuoteRequestFsm (Mandat 53)
//
// Tests all allowed transitions, all forbidden transitions, role restrictions,
// payable guard, and canMessage guard.

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { QuoteRequestStatus, UserRole, RequestUser } from '@iox/shared';
import {
  QuoteRequestFsm,
  ALLOWED_TRANSITIONS,
  TERMINAL_STATUSES,
  PAYABLE_STATUSES,
} from './quote-request-fsm';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeActor = (role: UserRole, id = 'u-1'): RequestUser => ({
  id,
  email: `${id}@test.com`,
  role,
  sellerProfileIds: role === UserRole.MARKETPLACE_SELLER ? ['sp-1'] : [],
  companyIds: [],
});

const BUYER = makeActor(UserRole.MARKETPLACE_BUYER);
const SELLER = makeActor(UserRole.MARKETPLACE_SELLER);
const ADMIN = makeActor(UserRole.ADMIN);
const COORDINATOR = makeActor(UserRole.COORDINATOR);
const QUALITY = makeActor(UserRole.QUALITY_MANAGER);

// ─── canTransition ────────────────────────────────────────────────────────────

describe('QuoteRequestFsm.canTransition', () => {
  it('returns false for same status', () => {
    expect(QuoteRequestFsm.canTransition(QuoteRequestStatus.NEW, QuoteRequestStatus.NEW)).toBe(false);
  });

  it.each<[QuoteRequestStatus, QuoteRequestStatus]>([
    [QuoteRequestStatus.NEW, QuoteRequestStatus.QUALIFIED],
    [QuoteRequestStatus.NEW, QuoteRequestStatus.CANCELLED],
    [QuoteRequestStatus.NEW, QuoteRequestStatus.LOST],
    [QuoteRequestStatus.QUALIFIED, QuoteRequestStatus.QUOTED],
    [QuoteRequestStatus.QUALIFIED, QuoteRequestStatus.CANCELLED],
    [QuoteRequestStatus.QUALIFIED, QuoteRequestStatus.LOST],
    [QuoteRequestStatus.QUOTED, QuoteRequestStatus.NEGOTIATING],
    [QuoteRequestStatus.QUOTED, QuoteRequestStatus.WON],
    [QuoteRequestStatus.QUOTED, QuoteRequestStatus.LOST],
    [QuoteRequestStatus.QUOTED, QuoteRequestStatus.CANCELLED],
    [QuoteRequestStatus.NEGOTIATING, QuoteRequestStatus.QUOTED],
    [QuoteRequestStatus.NEGOTIATING, QuoteRequestStatus.WON],
    [QuoteRequestStatus.NEGOTIATING, QuoteRequestStatus.LOST],
    [QuoteRequestStatus.NEGOTIATING, QuoteRequestStatus.CANCELLED],
  ])('allows %s → %s', (from, to) => {
    expect(QuoteRequestFsm.canTransition(from, to)).toBe(true);
  });

  it.each<[QuoteRequestStatus, QuoteRequestStatus]>([
    [QuoteRequestStatus.NEW, QuoteRequestStatus.QUOTED],
    [QuoteRequestStatus.NEW, QuoteRequestStatus.NEGOTIATING],
    [QuoteRequestStatus.NEW, QuoteRequestStatus.WON],
    [QuoteRequestStatus.QUALIFIED, QuoteRequestStatus.NEW],
    [QuoteRequestStatus.QUALIFIED, QuoteRequestStatus.WON],
    [QuoteRequestStatus.WON, QuoteRequestStatus.NEW],
    [QuoteRequestStatus.WON, QuoteRequestStatus.QUALIFIED],
    [QuoteRequestStatus.WON, QuoteRequestStatus.CANCELLED],
    [QuoteRequestStatus.LOST, QuoteRequestStatus.NEW],
    [QuoteRequestStatus.LOST, QuoteRequestStatus.QUOTED],
    [QuoteRequestStatus.CANCELLED, QuoteRequestStatus.NEW],
    [QuoteRequestStatus.CANCELLED, QuoteRequestStatus.WON],
  ])('forbids %s → %s', (from, to) => {
    expect(QuoteRequestFsm.canTransition(from, to)).toBe(false);
  });
});

// ─── assertTransition — structural ───────────────────────────────────────────

describe('QuoteRequestFsm.assertTransition — structural', () => {
  it('throws BadRequestException on same-status transition', () => {
    expect(() =>
      QuoteRequestFsm.assertTransition(QuoteRequestStatus.NEW, QuoteRequestStatus.NEW, ADMIN),
    ).toThrow(BadRequestException);
  });

  it('throws BadRequestException on forbidden structural transition', () => {
    expect(() =>
      QuoteRequestFsm.assertTransition(
        QuoteRequestStatus.WON,
        QuoteRequestStatus.NEW,
        ADMIN,
      ),
    ).toThrow(BadRequestException);
  });

  it('WON → NEW throws even for ADMIN', () => {
    expect(() =>
      QuoteRequestFsm.assertTransition(QuoteRequestStatus.WON, QuoteRequestStatus.NEW, ADMIN),
    ).toThrow(BadRequestException);
  });

  it('CANCELLED → WON (PAID) throws even for ADMIN', () => {
    expect(() =>
      QuoteRequestFsm.assertTransition(QuoteRequestStatus.CANCELLED, QuoteRequestStatus.WON, ADMIN),
    ).toThrow(BadRequestException);
  });

  it('LOST → WON throws even for ADMIN', () => {
    expect(() =>
      QuoteRequestFsm.assertTransition(QuoteRequestStatus.LOST, QuoteRequestStatus.WON, ADMIN),
    ).toThrow(BadRequestException);
  });
});

// ─── assertTransition — role restrictions ─────────────────────────────────────

describe('QuoteRequestFsm.assertTransition — role restrictions', () => {
  it('BUYER can cancel (NEW → CANCELLED)', () => {
    expect(() =>
      QuoteRequestFsm.assertTransition(
        QuoteRequestStatus.NEW,
        QuoteRequestStatus.CANCELLED,
        BUYER,
      ),
    ).not.toThrow();
  });

  it('BUYER cannot qualify (NEW → QUALIFIED)', () => {
    expect(() =>
      QuoteRequestFsm.assertTransition(
        QuoteRequestStatus.NEW,
        QuoteRequestStatus.QUALIFIED,
        BUYER,
      ),
    ).toThrow(ForbiddenException);
  });

  it('BUYER cannot mark WON', () => {
    expect(() =>
      QuoteRequestFsm.assertTransition(
        QuoteRequestStatus.QUOTED,
        QuoteRequestStatus.WON,
        BUYER,
      ),
    ).toThrow(ForbiddenException);
  });

  it('BUYER cannot mark LOST', () => {
    expect(() =>
      QuoteRequestFsm.assertTransition(
        QuoteRequestStatus.QUOTED,
        QuoteRequestStatus.LOST,
        BUYER,
      ),
    ).toThrow(ForbiddenException);
  });

  it('SELLER can mark QUOTED → WON', () => {
    expect(() =>
      QuoteRequestFsm.assertTransition(
        QuoteRequestStatus.QUOTED,
        QuoteRequestStatus.WON,
        SELLER,
      ),
    ).not.toThrow();
  });

  it('SELLER can mark QUOTED → LOST', () => {
    expect(() =>
      QuoteRequestFsm.assertTransition(
        QuoteRequestStatus.QUOTED,
        QuoteRequestStatus.LOST,
        SELLER,
      ),
    ).not.toThrow();
  });

  it.each([ADMIN, COORDINATOR, QUALITY])('staff %s can mark WON', (actor) => {
    expect(() =>
      QuoteRequestFsm.assertTransition(
        QuoteRequestStatus.QUOTED,
        QuoteRequestStatus.WON,
        actor,
      ),
    ).not.toThrow();
  });

  it.each([ADMIN, COORDINATOR, QUALITY])('staff %s can qualify (NEW → QUALIFIED)', (actor) => {
    expect(() =>
      QuoteRequestFsm.assertTransition(
        QuoteRequestStatus.NEW,
        QuoteRequestStatus.QUALIFIED,
        actor,
      ),
    ).not.toThrow();
  });
});

// ─── assertPayable ────────────────────────────────────────────────────────────

describe('QuoteRequestFsm.assertPayable', () => {
  it('allows payment on WON status', () => {
    expect(() => QuoteRequestFsm.assertPayable(QuoteRequestStatus.WON)).not.toThrow();
  });

  it.each([
    QuoteRequestStatus.NEW,
    QuoteRequestStatus.QUALIFIED,
    QuoteRequestStatus.QUOTED,
    QuoteRequestStatus.NEGOTIATING,
    QuoteRequestStatus.LOST,
    QuoteRequestStatus.CANCELLED,
  ])('throws BadRequestException for non-payable status %s', (status) => {
    expect(() => QuoteRequestFsm.assertPayable(status)).toThrow(BadRequestException);
  });
});

// ─── canMessage ───────────────────────────────────────────────────────────────

describe('QuoteRequestFsm.canMessage', () => {
  it('allows public message on open status', () => {
    expect(QuoteRequestFsm.canMessage(QuoteRequestStatus.NEW, false, BUYER)).toBe(true);
    expect(QuoteRequestFsm.canMessage(QuoteRequestStatus.QUOTED, false, SELLER)).toBe(true);
  });

  it('blocks public message on terminal status', () => {
    expect(QuoteRequestFsm.canMessage(QuoteRequestStatus.WON, false, BUYER)).toBe(false);
    expect(QuoteRequestFsm.canMessage(QuoteRequestStatus.LOST, false, SELLER)).toBe(false);
    expect(QuoteRequestFsm.canMessage(QuoteRequestStatus.CANCELLED, false, BUYER)).toBe(false);
  });

  it('allows internal note by staff on terminal status', () => {
    expect(QuoteRequestFsm.canMessage(QuoteRequestStatus.WON, true, ADMIN)).toBe(true);
    expect(QuoteRequestFsm.canMessage(QuoteRequestStatus.CANCELLED, true, COORDINATOR)).toBe(true);
  });

  it('blocks internal note by staff on terminal status when not staff role (buyer)', () => {
    // Even if isInternalNote=true, buyer is not staff
    expect(QuoteRequestFsm.canMessage(QuoteRequestStatus.WON, true, BUYER)).toBe(false);
  });
});

// ─── isTerminal ───────────────────────────────────────────────────────────────

describe('QuoteRequestFsm.isTerminal', () => {
  it.each([QuoteRequestStatus.WON, QuoteRequestStatus.LOST, QuoteRequestStatus.CANCELLED])(
    'returns true for terminal status %s',
    (status) => expect(QuoteRequestFsm.isTerminal(status)).toBe(true),
  );

  it.each([
    QuoteRequestStatus.NEW,
    QuoteRequestStatus.QUALIFIED,
    QuoteRequestStatus.QUOTED,
    QuoteRequestStatus.NEGOTIATING,
  ])('returns false for non-terminal status %s', (status) => {
    expect(QuoteRequestFsm.isTerminal(status)).toBe(false);
  });
});

// ─── ALLOWED_TRANSITIONS completeness ─────────────────────────────────────────

describe('ALLOWED_TRANSITIONS completeness', () => {
  it('covers all QuoteRequestStatus values', () => {
    const allStatuses = Object.values(QuoteRequestStatus);
    for (const s of allStatuses) {
      expect(ALLOWED_TRANSITIONS).toHaveProperty(s);
    }
  });

  it('terminal statuses have empty allowed transitions', () => {
    for (const s of TERMINAL_STATUSES) {
      expect(ALLOWED_TRANSITIONS[s]).toHaveLength(0);
    }
  });
});

// ─── PAYABLE_STATUSES ─────────────────────────────────────────────────────────

describe('PAYABLE_STATUSES', () => {
  it('contains only WON', () => {
    expect([...PAYABLE_STATUSES]).toEqual([QuoteRequestStatus.WON]);
  });
});
