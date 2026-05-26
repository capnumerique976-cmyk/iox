// ADR-0006 — BuyerOwnershipService unit tests.

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole, RequestUser } from '@iox/shared';
import { BuyerOwnershipService } from './buyer-ownership.service';

function actor(role: UserRole, companyIds: string[] = []): RequestUser {
  return {
    id: 'u-1',
    email: 'u@iox.test',
    role,
    sellerProfileIds: [],
    companyIds,
  };
}

const STAFF: RequestUser = actor(UserRole.ADMIN);
const BUYER: RequestUser = actor(UserRole.MARKETPLACE_BUYER, ['co-1', 'co-2']);
const SELLER: RequestUser = actor(UserRole.MARKETPLACE_SELLER);
const BENEFICIARY: RequestUser = actor(UserRole.BENEFICIARY);

describe('BuyerOwnershipService', () => {
  let prisma: { company: { findUnique: jest.Mock } };
  let svc: BuyerOwnershipService;

  beforeEach(() => {
    prisma = { company: { findUnique: jest.fn() } };
    svc = new BuyerOwnershipService(prisma as never);
  });

  // ─── isStaff / isBuyer ─────────────────────────────────────────────

  describe('role helpers', () => {
    it('STAFF roles → isStaff=true', () => {
      expect(svc.isStaff(STAFF)).toBe(true);
      expect(svc.isStaff(actor(UserRole.COORDINATOR))).toBe(true);
      expect(svc.isStaff(actor(UserRole.QUALITY_MANAGER))).toBe(true);
      expect(svc.isStaff(actor(UserRole.AUDITOR))).toBe(true);
    });

    it('BUYER → isBuyer=true, isStaff=false', () => {
      expect(svc.isBuyer(BUYER)).toBe(true);
      expect(svc.isStaff(BUYER)).toBe(false);
    });

    it('SELLER → isBuyer=false', () => {
      expect(svc.isBuyer(SELLER)).toBe(false);
    });
  });

  // ─── scopeBuyerCompanyFilter ───────────────────────────────────────

  describe('scopeBuyerCompanyFilter', () => {
    it('STAFF → {} (no restriction)', () => {
      expect(svc.scopeBuyerCompanyFilter(STAFF)).toEqual({});
    });

    it('BUYER → { buyerCompanyId: { in: companyIds } }', () => {
      expect(svc.scopeBuyerCompanyFilter(BUYER)).toEqual({
        buyerCompanyId: { in: ['co-1', 'co-2'] },
      });
    });

    it('SELLER → zero result filter (defense en profondeur)', () => {
      expect(svc.scopeBuyerCompanyFilter(SELLER)).toEqual({
        buyerCompanyId: { in: [] },
      });
    });

    it('BENEFICIARY → zero result filter', () => {
      expect(svc.scopeBuyerCompanyFilter(BENEFICIARY)).toEqual({
        buyerCompanyId: { in: [] },
      });
    });
  });

  // ─── scopeCompanyFilter ────────────────────────────────────────────

  describe('scopeCompanyFilter', () => {
    it('STAFF → {}', () => {
      expect(svc.scopeCompanyFilter(STAFF)).toEqual({});
    });

    it('BUYER → { id: { in: companyIds } }', () => {
      expect(svc.scopeCompanyFilter(BUYER)).toEqual({
        id: { in: ['co-1', 'co-2'] },
      });
    });

    it('SELLER → zero result', () => {
      expect(svc.scopeCompanyFilter(SELLER)).toEqual({ id: { in: [] } });
    });
  });

  // ─── assertCompanyOwnership ────────────────────────────────────────

  describe('assertCompanyOwnership', () => {
    it('company introuvable → NotFoundException', async () => {
      prisma.company.findUnique.mockResolvedValue(null);
      await expect(
        svc.assertCompanyOwnership(BUYER, 'co-x'),
      ).rejects.toThrow(NotFoundException);
    });

    it('company soft-deleted → NotFoundException', async () => {
      prisma.company.findUnique.mockResolvedValue({
        id: 'co-1',
        deletedAt: new Date(),
      });
      await expect(
        svc.assertCompanyOwnership(BUYER, 'co-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('STAFF → bypass ownership (company existe)', async () => {
      prisma.company.findUnique.mockResolvedValue({ id: 'co-x', deletedAt: null });
      await expect(
        svc.assertCompanyOwnership(STAFF, 'co-x'),
      ).resolves.toBeUndefined();
    });

    it('BUYER own company → OK', async () => {
      prisma.company.findUnique.mockResolvedValue({ id: 'co-1', deletedAt: null });
      await expect(
        svc.assertCompanyOwnership(BUYER, 'co-1'),
      ).resolves.toBeUndefined();
    });

    it('BUYER not member → ForbiddenException', async () => {
      prisma.company.findUnique.mockResolvedValue({ id: 'co-x', deletedAt: null });
      await expect(
        svc.assertCompanyOwnership(BUYER, 'co-x'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('SELLER → ForbiddenException (role non autorisé)', async () => {
      prisma.company.findUnique.mockResolvedValue({ id: 'co-1', deletedAt: null });
      await expect(
        svc.assertCompanyOwnership(SELLER, 'co-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── assertBuyerCompanyOwnership (no DB) ───────────────────────────

  describe('assertBuyerCompanyOwnership', () => {
    it('STAFF → bypass', () => {
      expect(() => svc.assertBuyerCompanyOwnership(STAFF, 'co-x')).not.toThrow();
    });

    it('BUYER own → no throw', () => {
      expect(() =>
        svc.assertBuyerCompanyOwnership(BUYER, 'co-1'),
      ).not.toThrow();
    });

    it('BUYER not member → ForbiddenException', () => {
      expect(() =>
        svc.assertBuyerCompanyOwnership(BUYER, 'co-x'),
      ).toThrow(ForbiddenException);
    });

    it('SELLER → ForbiddenException', () => {
      expect(() =>
        svc.assertBuyerCompanyOwnership(SELLER, 'co-1'),
      ).toThrow(ForbiddenException);
    });
  });

  // ─── canReadBuyerCompany ───────────────────────────────────────────

  describe('canReadBuyerCompany', () => {
    it('STAFF → true', () => {
      expect(svc.canReadBuyerCompany(STAFF, 'anything')).toBe(true);
    });

    it('BUYER own → true', () => {
      expect(svc.canReadBuyerCompany(BUYER, 'co-1')).toBe(true);
    });

    it('BUYER not member → false', () => {
      expect(svc.canReadBuyerCompany(BUYER, 'co-x')).toBe(false);
    });

    it('SELLER → false', () => {
      expect(svc.canReadBuyerCompany(SELLER, 'co-1')).toBe(false);
    });
  });
});
