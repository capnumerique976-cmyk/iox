import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { SellerProfilesService } from './seller-profiles.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MarketplaceReviewService } from '../marketplace-review/marketplace-review.service';
import { SellerOwnershipService } from '../common/services/seller-ownership.service';
import { SellerProfileStatus, UserRole, RequestUser } from '@iox/shared';

const ADMIN: RequestUser = {
  id: 'actor',
  email: 'a@a',
  role: UserRole.ADMIN,
  sellerProfileIds: [],
  companyIds: [],
};

const ownershipMock = {
  isStaff: () => true,
  isSeller: () => false,
  scopeSellerProfileFilter: () => ({}),
  scopeRelatedEntityFilter: async () => ({}),
  assertSellerProfileOwnership: async () => {},
  assertMarketplaceProductOwnership: async () => ({}),
  assertMarketplaceOfferOwnership: async () => ({}),
  assertOfferBatchOwnership: async () => ({}),
  assertRelatedEntityOwnership: async () => {},
  canReadSellerProfile: () => true,
};

describe('SellerProfilesService', () => {
  let service: SellerProfilesService;
  let prisma: {
    sellerProfile: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    company: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let audit: { log: jest.Mock };
  let reviewQueue: { enqueue: jest.Mock; resolvePendingForEntity: jest.Mock };

  beforeEach(async () => {
    prisma = {
      sellerProfile: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      company: { findFirst: jest.fn() },
      $transaction: jest.fn((ops: Array<Promise<unknown>>) => Promise.all(ops)),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    reviewQueue = {
      enqueue: jest.fn().mockResolvedValue({ id: 'r-1' }),
      resolvePendingForEntity: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SellerProfilesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
        { provide: MarketplaceReviewService, useValue: reviewQueue },
        { provide: SellerOwnershipService, useValue: ownershipMock },
      ],
    }).compile();

    service = module.get(SellerProfilesService);
  });

  describe('findAll', () => {
    it('applique pagination + recherche multi-champs', async () => {
      prisma.sellerProfile.findMany.mockResolvedValue([]);
      prisma.sellerProfile.count.mockResolvedValue(0);
      await service.findAll({ page: 2, limit: 10, search: 'vanille', country: 'YT' });
      const call = prisma.sellerProfile.findMany.mock.calls[0][0];
      expect(call.skip).toBe(10);
      expect(call.take).toBe(10);
      expect(call.where.country).toBe('YT');
      expect(call.where.OR).toHaveLength(4);
    });

    it('clamp limit à 100', async () => {
      prisma.sellerProfile.findMany.mockResolvedValue([]);
      prisma.sellerProfile.count.mockResolvedValue(0);
      await service.findAll({ limit: 9999 });
      expect(prisma.sellerProfile.findMany.mock.calls[0][0].take).toBe(100);
    });

    it('filtre status + isFeatured', async () => {
      prisma.sellerProfile.findMany.mockResolvedValue([]);
      prisma.sellerProfile.count.mockResolvedValue(0);
      await service.findAll({ status: SellerProfileStatus.APPROVED, isFeatured: true });
      const where = prisma.sellerProfile.findMany.mock.calls[0][0].where;
      expect(where.status).toBe(SellerProfileStatus.APPROVED);
      expect(where.isFeatured).toBe(true);
    });
  });

  describe('findById', () => {
    it('lève NotFound si inexistant', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue(null);
      await expect(service.findById('x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const dto = {
      companyId: 'c1',
      publicDisplayName: 'Nom',
      slug: 'nom',
      country: 'YT',
    };

    it('lève NotFound si company inexistante', async () => {
      prisma.company.findFirst.mockResolvedValue(null);
      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('lève Conflict si profil existe déjà pour la company', async () => {
      prisma.company.findFirst.mockResolvedValue({ id: 'c1' });
      prisma.sellerProfile.findUnique.mockResolvedValueOnce({ id: 'sp-existant' }); // by companyId
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('lève Conflict si slug déjà pris', async () => {
      prisma.company.findFirst.mockResolvedValue({ id: 'c1' });
      prisma.sellerProfile.findUnique
        .mockResolvedValueOnce(null) // companyId libre
        .mockResolvedValueOnce({ id: 'other', slug: 'nom' }); // slug pris
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('crée en DRAFT et logue', async () => {
      prisma.company.findFirst.mockResolvedValue({ id: 'c1' });
      prisma.sellerProfile.findUnique.mockResolvedValue(null);
      prisma.sellerProfile.create.mockResolvedValue({
        id: 'sp1',
        companyId: 'c1',
        slug: 'nom',
        status: SellerProfileStatus.DRAFT,
      });
      const res = await service.create(dto, ADMIN);
      expect(res.status).toBe(SellerProfileStatus.DRAFT);
      expect(prisma.sellerProfile.create.mock.calls[0][0].data.status).toBe(
        SellerProfileStatus.DRAFT,
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SELLER_PROFILE_CREATED',
          entityId: 'sp1',
          userId: 'actor',
        }),
      );
    });
  });

  describe('update', () => {
    it('lève Conflict si le nouveau slug est pris', async () => {
      prisma.sellerProfile.findUnique
        .mockResolvedValueOnce({ id: 'sp1', slug: 'old', status: SellerProfileStatus.DRAFT })
        .mockResolvedValueOnce({ id: 'other', slug: 'new' });
      await expect(service.update('sp1', { slug: 'new' })).rejects.toThrow(ConflictException);
    });

    it('ne bascule pas en PENDING_REVIEW si DRAFT', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValueOnce({
        id: 'sp1',
        slug: 'old',
        status: SellerProfileStatus.DRAFT,
      });
      prisma.sellerProfile.update.mockResolvedValue({
        id: 'sp1',
        slug: 'old',
        status: SellerProfileStatus.DRAFT,
      });
      await service.update('sp1', { publicDisplayName: 'Nouveau' });
      const data = prisma.sellerProfile.update.mock.calls[0][0].data;
      expect(data.status).toBeUndefined();
    });

    it('bascule APPROVED → PENDING_REVIEW si un champ vitrine change', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValueOnce({
        id: 'sp1',
        slug: 'old',
        status: SellerProfileStatus.APPROVED,
      });
      prisma.sellerProfile.update.mockResolvedValue({
        id: 'sp1',
        slug: 'old',
        status: SellerProfileStatus.PENDING_REVIEW,
      });
      await service.update('sp1', { descriptionShort: 'edit' });
      const data = prisma.sellerProfile.update.mock.calls[0][0].data;
      expect(data.status).toBe(SellerProfileStatus.PENDING_REVIEW);
    });

    it('ne bascule pas APPROVED si on change seulement un champ non-vitrine', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValueOnce({
        id: 'sp1',
        slug: 'old',
        status: SellerProfileStatus.APPROVED,
      });
      prisma.sellerProfile.update.mockResolvedValue({ id: 'sp1' });
      await service.update('sp1', { averageLeadTimeDays: 7 });
      const data = prisma.sellerProfile.update.mock.calls[0][0].data;
      expect(data.status).toBeUndefined();
    });
  });

  describe('submitForReview', () => {
    it('refuse si statut ≠ DRAFT/REJECTED', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'sp1',
        status: SellerProfileStatus.APPROVED,
        publicDisplayName: 'x',
        slug: 'x',
        country: 'YT',
      });
      await expect(service.submitForReview('sp1')).rejects.toThrow(BadRequestException);
    });

    it('refuse si champs obligatoires manquants', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'sp1',
        status: SellerProfileStatus.DRAFT,
        publicDisplayName: null,
        slug: 'x',
        country: 'YT',
      });
      await expect(service.submitForReview('sp1')).rejects.toThrow(BadRequestException);
    });

    it('DRAFT → PENDING_REVIEW et reset la raison de rejet', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'sp1',
        status: SellerProfileStatus.DRAFT,
        publicDisplayName: 'x',
        slug: 'x',
        country: 'YT',
      });
      prisma.sellerProfile.update.mockResolvedValue({
        id: 'sp1',
        status: SellerProfileStatus.PENDING_REVIEW,
      });
      await service.submitForReview('sp1', ADMIN);
      const data = prisma.sellerProfile.update.mock.calls[0][0].data;
      expect(data.status).toBe(SellerProfileStatus.PENDING_REVIEW);
      expect(data.rejectionReason).toBeNull();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SELLER_PROFILE_SUBMITTED',
        }),
      );
    });
  });

  describe('approve', () => {
    it('refuse si statut ≠ PENDING_REVIEW', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'sp1',
        status: SellerProfileStatus.DRAFT,
      });
      await expect(service.approve('sp1')).rejects.toThrow(BadRequestException);
    });

    it('passe APPROVED, set approvedAt, logue', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'sp1',
        status: SellerProfileStatus.PENDING_REVIEW,
      });
      prisma.sellerProfile.update.mockResolvedValue({
        id: 'sp1',
        status: SellerProfileStatus.APPROVED,
        approvedAt: new Date(),
      });
      await service.approve('sp1', 'actor');
      const data = prisma.sellerProfile.update.mock.calls[0][0].data;
      expect(data.status).toBe(SellerProfileStatus.APPROVED);
      expect(data.approvedAt).toBeInstanceOf(Date);
      expect(data.suspendedAt).toBeNull();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SELLER_PROFILE_APPROVED',
        }),
      );
    });
  });

  describe('reject', () => {
    it('refuse si statut ≠ PENDING_REVIEW', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'sp1',
        status: SellerProfileStatus.DRAFT,
      });
      await expect(service.reject('sp1', { reason: 'x' })).rejects.toThrow(BadRequestException);
    });

    it('passe REJECTED avec raison', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'sp1',
        status: SellerProfileStatus.PENDING_REVIEW,
      });
      prisma.sellerProfile.update.mockResolvedValue({
        id: 'sp1',
        status: SellerProfileStatus.REJECTED,
      });
      await service.reject('sp1', { reason: 'Docs manquants' });
      const data = prisma.sellerProfile.update.mock.calls[0][0].data;
      expect(data.status).toBe(SellerProfileStatus.REJECTED);
      expect(data.rejectionReason).toBe('Docs manquants');
    });
  });

  describe('suspend / reinstate', () => {
    it('suspend refuse si ≠ APPROVED', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'sp1',
        status: SellerProfileStatus.DRAFT,
      });
      await expect(service.suspend('sp1', { reason: 'x' })).rejects.toThrow(BadRequestException);
    });

    it('suspend APPROVED → SUSPENDED avec suspendedAt', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'sp1',
        status: SellerProfileStatus.APPROVED,
      });
      prisma.sellerProfile.update.mockResolvedValue({
        id: 'sp1',
        status: SellerProfileStatus.SUSPENDED,
      });
      await service.suspend('sp1', { reason: 'Non-conformité' });
      const data = prisma.sellerProfile.update.mock.calls[0][0].data;
      expect(data.status).toBe(SellerProfileStatus.SUSPENDED);
      expect(data.suspendedAt).toBeInstanceOf(Date);
    });

    it('reinstate refuse si ≠ SUSPENDED', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'sp1',
        status: SellerProfileStatus.DRAFT,
      });
      await expect(service.reinstate('sp1')).rejects.toThrow(BadRequestException);
    });

    it('reinstate SUSPENDED → APPROVED et clear suspendedAt', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'sp1',
        status: SellerProfileStatus.SUSPENDED,
      });
      prisma.sellerProfile.update.mockResolvedValue({
        id: 'sp1',
        status: SellerProfileStatus.APPROVED,
      });
      await service.reinstate('sp1');
      const data = prisma.sellerProfile.update.mock.calls[0][0].data;
      expect(data.status).toBe(SellerProfileStatus.APPROVED);
      expect(data.suspendedAt).toBeNull();
    });
  });

  describe('setFeatured', () => {
    it('refuse featured=true si non APPROVED', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'sp1',
        status: SellerProfileStatus.DRAFT,
        isFeatured: false,
      });
      await expect(service.setFeatured('sp1', true)).rejects.toThrow(BadRequestException);
    });

    it('accepte featured=false même si non APPROVED (retrait)', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'sp1',
        status: SellerProfileStatus.SUSPENDED,
        isFeatured: true,
      });
      prisma.sellerProfile.update.mockResolvedValue({ id: 'sp1', isFeatured: false });
      await service.setFeatured('sp1', false);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SELLER_PROFILE_UNFEATURED',
        }),
      );
    });
  });
});
