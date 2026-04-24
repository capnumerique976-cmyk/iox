import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SellerOwnershipService } from './seller-ownership.service';
import { PrismaService } from '../../database/prisma.service';
import { MarketplaceRelatedEntityType, RequestUser, UserRole } from '@iox/shared';

/**
 * V2 — Couverture des refus cross-seller (défense en profondeur).
 * On teste la règle centrale : staff bypass / seller scopé par `sellerProfileIds` /
 * autre rôle = refus total.
 */
describe('SellerOwnershipService (V2 cross-seller)', () => {
  let service: SellerOwnershipService;
  let prisma: {
    sellerProfile: { findUnique: jest.Mock };
    marketplaceProduct: { findUnique: jest.Mock; findMany: jest.Mock };
    marketplaceOffer: { findUnique: jest.Mock; findMany: jest.Mock };
    marketplaceOfferBatch: { findUnique: jest.Mock };
  };

  const admin: RequestUser = {
    id: 'admin-1',
    email: 'a@a',
    role: UserRole.ADMIN,
    sellerProfileIds: [],
    companyIds: [],
  };
  const sellerA: RequestUser = {
    id: 'userA',
    email: 'a@s',
    role: UserRole.MARKETPLACE_SELLER,
    sellerProfileIds: ['sellerA-profile'],
    companyIds: ['companyA'],
  };
  const sellerB: RequestUser = {
    id: 'userB',
    email: 'b@s',
    role: UserRole.MARKETPLACE_SELLER,
    sellerProfileIds: ['sellerB-profile'],
    companyIds: ['companyB'],
  };
  const buyer: RequestUser = {
    id: 'buyer-1',
    email: 'b@b',
    role: UserRole.MARKETPLACE_BUYER,
    sellerProfileIds: [],
    companyIds: [],
  };

  beforeEach(async () => {
    prisma = {
      sellerProfile: { findUnique: jest.fn() },
      marketplaceProduct: { findUnique: jest.fn(), findMany: jest.fn() },
      marketplaceOffer: { findUnique: jest.fn(), findMany: jest.fn() },
      marketplaceOfferBatch: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SellerOwnershipService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(SellerOwnershipService);
  });

  describe('scopeSellerProfileFilter', () => {
    it('staff : renvoie un filtre vide (pas de restriction)', () => {
      expect(service.scopeSellerProfileFilter(admin)).toEqual({});
    });

    it('seller : restreint aux profils détenus', () => {
      expect(service.scopeSellerProfileFilter(sellerA)).toEqual({
        sellerProfileId: { in: ['sellerA-profile'] },
      });
    });

    it('buyer (non staff non seller) : force in:[] (zéro résultat)', () => {
      expect(service.scopeSellerProfileFilter(buyer)).toEqual({ sellerProfileId: { in: [] } });
    });
  });

  describe('assertSellerProfileOwnership', () => {
    it('staff : passe', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({ id: 'sellerA-profile' });
      await expect(
        service.assertSellerProfileOwnership(admin, 'sellerA-profile'),
      ).resolves.toBeUndefined();
    });

    it('seller propriétaire : passe', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({ id: 'sellerA-profile' });
      await expect(
        service.assertSellerProfileOwnership(sellerA, 'sellerA-profile'),
      ).resolves.toBeUndefined();
    });

    it('cross-seller : Forbidden', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({ id: 'sellerB-profile' });
      await expect(
        service.assertSellerProfileOwnership(sellerA, 'sellerB-profile'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('profil inexistant : NotFound', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue(null);
      await expect(service.assertSellerProfileOwnership(sellerA, 'ghost')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('buyer : Forbidden (défense en profondeur RolesGuard)', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({ id: 'sellerA-profile' });
      await expect(
        service.assertSellerProfileOwnership(buyer, 'sellerA-profile'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('assertMarketplaceProductOwnership', () => {
    it('cross-seller : Forbidden', async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue({
        id: 'mp-1',
        sellerProfileId: 'sellerB-profile',
      });
      await expect(
        service.assertMarketplaceProductOwnership(sellerA, 'mp-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('owner : OK', async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue({
        id: 'mp-1',
        sellerProfileId: 'sellerA-profile',
      });
      await expect(
        service.assertMarketplaceProductOwnership(sellerA, 'mp-1'),
      ).resolves.toMatchObject({ sellerProfileId: 'sellerA-profile' });
    });
  });

  describe('assertMarketplaceOfferOwnership', () => {
    it('cross-seller : Forbidden', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue({
        id: 'o-1',
        sellerProfileId: 'sellerB-profile',
        marketplaceProductId: 'mp-1',
      });
      await expect(service.assertMarketplaceOfferOwnership(sellerA, 'o-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('assertOfferBatchOwnership', () => {
    it('cross-seller : Forbidden', async () => {
      prisma.marketplaceOfferBatch.findUnique.mockResolvedValue({
        id: 'link-1',
        marketplaceOfferId: 'o-1',
        marketplaceOffer: { sellerProfileId: 'sellerB-profile' },
      });
      await expect(service.assertOfferBatchOwnership(sellerA, 'link-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('assertRelatedEntityOwnership (polymorphique)', () => {
    it('SELLER_PROFILE cross-seller : Forbidden', async () => {
      await expect(
        service.assertRelatedEntityOwnership(
          sellerA,
          MarketplaceRelatedEntityType.SELLER_PROFILE,
          'sellerB-profile',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('MARKETPLACE_PRODUCT cross-seller : Forbidden', async () => {
      prisma.marketplaceProduct.findUnique.mockResolvedValue({
        sellerProfileId: 'sellerB-profile',
      });
      await expect(
        service.assertRelatedEntityOwnership(
          sellerA,
          MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
          'mp-1',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('MARKETPLACE_OFFER cross-seller : Forbidden', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue({
        sellerProfileId: 'sellerB-profile',
      });
      await expect(
        service.assertRelatedEntityOwnership(
          sellerA,
          MarketplaceRelatedEntityType.MARKETPLACE_OFFER,
          'o-1',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('PRODUCT_BATCH pour seller : Forbidden (hors scope MVP)', async () => {
      await expect(
        service.assertRelatedEntityOwnership(
          sellerA,
          MarketplaceRelatedEntityType.PRODUCT_BATCH,
          'pb-1',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('staff : bypass sur tous les types', async () => {
      await expect(
        service.assertRelatedEntityOwnership(
          admin,
          MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
          'mp-1',
        ),
      ).resolves.toBeUndefined();
    });

    it('buyer : Forbidden sur tout', async () => {
      await expect(
        service.assertRelatedEntityOwnership(
          buyer,
          MarketplaceRelatedEntityType.SELLER_PROFILE,
          'sellerA-profile',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('scopeRelatedEntityFilter', () => {
    it('staff : filtre vide', async () => {
      await expect(service.scopeRelatedEntityFilter(admin)).resolves.toEqual({});
    });

    it('buyer : zero résultats', async () => {
      await expect(service.scopeRelatedEntityFilter(buyer)).resolves.toEqual({
        relatedId: { in: [] },
      });
    });

    it('seller sans scope : zero résultats', async () => {
      const seller0: RequestUser = { ...sellerA, sellerProfileIds: [] };
      await expect(service.scopeRelatedEntityFilter(seller0)).resolves.toEqual({
        relatedId: { in: [] },
      });
    });

    it('seller : OR sur profils + produits + offres détenus', async () => {
      prisma.marketplaceProduct.findMany.mockResolvedValue([{ id: 'mp-A-1' }]);
      prisma.marketplaceOffer.findMany.mockResolvedValue([{ id: 'o-A-1' }]);
      const result = await service.scopeRelatedEntityFilter(sellerA);
      expect(result).toEqual({
        OR: [
          {
            relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
            relatedId: { in: ['sellerA-profile'] },
          },
          {
            relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
            relatedId: { in: ['mp-A-1'] },
          },
          {
            relatedType: MarketplaceRelatedEntityType.MARKETPLACE_OFFER,
            relatedId: { in: ['o-A-1'] },
          },
        ],
      });
    });
  });

  describe('helpers', () => {
    it('isStaff / isSeller / canReadSellerProfile', () => {
      expect(service.isStaff(admin)).toBe(true);
      expect(service.isSeller(admin)).toBe(false);
      expect(service.isStaff(sellerA)).toBe(false);
      expect(service.isSeller(sellerA)).toBe(true);
      expect(service.canReadSellerProfile(sellerA, 'sellerA-profile')).toBe(true);
      expect(service.canReadSellerProfile(sellerA, 'sellerB-profile')).toBe(false);
      expect(service.canReadSellerProfile(admin, 'anything')).toBe(true);
      expect(service.canReadSellerProfile(buyer, 'anything')).toBe(false);
    });
  });
});
