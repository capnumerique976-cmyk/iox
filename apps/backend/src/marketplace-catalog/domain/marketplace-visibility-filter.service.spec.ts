// ADR-0004 — MarketplaceVisibilityFilter unit tests.
//
// Pure domain logic — no Prisma, no DB. Asserts WhereInput structure.

import {
  MarketplaceDocumentVisibility,
  MarketplacePublicationStatus,
  MarketplaceVerificationStatus,
  MarketplaceVisibilityScope,
  MediaModerationStatus,
  SellerProfileStatus,
} from '@iox/shared';
import { MarketplaceVisibilityFilter } from './marketplace-visibility-filter.service';

describe('MarketplaceVisibilityFilter', () => {
  let filter: MarketplaceVisibilityFilter;

  beforeEach(() => {
    filter = new MarketplaceVisibilityFilter();
  });

  describe('publicOfferWhere', () => {
    it('publicationStatus=PUBLISHED ∧ visibilityScope≠PRIVATE', () => {
      expect(filter.publicOfferWhere()).toEqual({
        publicationStatus: MarketplacePublicationStatus.PUBLISHED,
        visibilityScope: { not: MarketplaceVisibilityScope.PRIVATE },
      });
    });

    it('idempotent — appels successifs retournent même structure', () => {
      const a = filter.publicOfferWhere();
      const b = filter.publicOfferWhere();
      expect(a).toEqual(b);
    });
  });

  describe('publicProductWhere', () => {
    it('publicationStatus ∈ {APPROVED, PUBLISHED}', () => {
      const w = filter.publicProductWhere();
      expect(w.publicationStatus).toEqual({
        in: [
          MarketplacePublicationStatus.APPROVED,
          MarketplacePublicationStatus.PUBLISHED,
        ],
      });
    });

    it('compose sellerProfile.status=APPROVED', () => {
      const w = filter.publicProductWhere();
      expect(w.sellerProfile).toEqual({
        status: SellerProfileStatus.APPROVED,
      });
    });

    it('règle dérivée : seller SUSPENDED disqualifie produit (via sellerProfile.status=APPROVED)', () => {
      // Si on cherche un product avec seller SUSPENDED, le filter exclut.
      const w = filter.publicProductWhere();
      // sellerProfile clause exige status APPROVED → SUSPENDED jamais inclus
      expect((w.sellerProfile as { status: SellerProfileStatus }).status).toBe(
        SellerProfileStatus.APPROVED,
      );
    });
  });

  describe('publicSellerWhere', () => {
    it('status=APPROVED uniquement', () => {
      expect(filter.publicSellerWhere()).toEqual({
        status: SellerProfileStatus.APPROVED,
      });
    });
  });

  describe('publicDocumentWhere', () => {
    it('visibility=PUBLIC ∧ verificationStatus=VERIFIED', () => {
      const w = filter.publicDocumentWhere();
      expect(w.visibility).toBe(MarketplaceDocumentVisibility.PUBLIC);
      expect(w.verificationStatus).toBe(MarketplaceVerificationStatus.VERIFIED);
    });

    it('OR validUntil null OR validUntil > now', () => {
      const now = new Date('2026-05-25T12:00:00Z');
      const w = filter.publicDocumentWhere(now);
      expect(w.OR).toEqual([
        { validUntil: null },
        { validUntil: { gt: now } },
      ]);
    });

    it('now injectable — différentes dates → différents seuils', () => {
      const now1 = new Date('2025-01-01T00:00:00Z');
      const now2 = new Date('2026-12-31T00:00:00Z');
      const w1 = filter.publicDocumentWhere(now1);
      const w2 = filter.publicDocumentWhere(now2);
      expect((w1.OR as Array<{ validUntil: { gt: Date } | null }>)[1]).toEqual({
        validUntil: { gt: now1 },
      });
      expect((w2.OR as Array<{ validUntil: { gt: Date } | null }>)[1]).toEqual({
        validUntil: { gt: now2 },
      });
    });

    it('par défaut now = new Date() (système)', () => {
      const before = Date.now();
      const w = filter.publicDocumentWhere();
      const after = Date.now();
      const gt = (w.OR as Array<{ validUntil: { gt: Date } | null }>)[1]
        .validUntil as { gt: Date };
      const ts = gt.gt.getTime();
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });
  });

  describe('publicMediaWhere', () => {
    it('moderationStatus=APPROVED uniquement', () => {
      expect(filter.publicMediaWhere()).toEqual({
        moderationStatus: MediaModerationStatus.APPROVED,
      });
    });

    it('règle dérivée : PENDING et REJECTED exclus', () => {
      // L'enum APPROVED ne matchera ni PENDING ni REJECTED côté Prisma.
      const w = filter.publicMediaWhere();
      expect(w.moderationStatus).not.toBe(MediaModerationStatus.PENDING);
      expect(w.moderationStatus).not.toBe(MediaModerationStatus.REJECTED);
    });
  });

  describe('composabilité', () => {
    it('publicProductWhere imbrique publicSellerWhere', () => {
      const product = filter.publicProductWhere();
      const seller = filter.publicSellerWhere();
      expect(product.sellerProfile).toEqual(seller);
    });

    it('chaque méthode est pure — pas de mutation entre appels', () => {
      const a = filter.publicOfferWhere();
      const aSnapshot = JSON.parse(JSON.stringify(a));
      filter.publicOfferWhere(); // 2e appel
      filter.publicProductWhere(); // appel autre méthode
      expect(a).toEqual(aSnapshot);
    });
  });
});
