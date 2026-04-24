import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { QuoteRequestsService } from './quote-requests.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SellerOwnershipService } from '../common/services/seller-ownership.service';
import {
  MarketplacePublicationStatus,
  MarketplaceVisibilityScope,
  QuoteRequestStatus,
  RequestUser,
  SellerProfileStatus,
  UserRole,
} from '@iox/shared';

const u = (role: UserRole, id = 'u-actor', sellerProfileIds: string[] = []): RequestUser => ({
  id,
  email: `${id}@iox.test`,
  role,
  sellerProfileIds,
  companyIds: [],
});

const BUYER = u(UserRole.MARKETPLACE_BUYER, 'buyer-1');
const BUYER2 = u(UserRole.MARKETPLACE_BUYER, 'buyer-2');
const SELLER = u(UserRole.MARKETPLACE_SELLER, 'seller-1', ['sp-1']);
const ADMIN = u(UserRole.ADMIN, 'admin-1');
const QUALITY = u(UserRole.QUALITY_MANAGER, 'quality-1');

describe('QuoteRequestsService', () => {
  let service: QuoteRequestsService;
  let prisma: {
    quoteRequest: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    quoteRequestMessage: {
      findMany: jest.Mock;
      create: jest.Mock;
    };
    marketplaceOffer: { findUnique: jest.Mock };
    company: { findUnique: jest.Mock };
    user: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let audit: { log: jest.Mock };

  beforeEach(async () => {
    prisma = {
      quoteRequest: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      quoteRequestMessage: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      marketplaceOffer: { findUnique: jest.fn() },
      company: { findUnique: jest.fn() },
      user: { findUnique: jest.fn() },
      $transaction: jest.fn((ops: Array<Promise<unknown>>) => Promise.all(ops)),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuoteRequestsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
        {
          provide: SellerOwnershipService,
          useValue: {
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
          },
        },
      ],
    }).compile();

    service = module.get(QuoteRequestsService);
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto = {
      marketplaceOfferId: 'off-1',
      buyerCompanyId: 'co-1',
      requestedQuantity: 500,
      requestedUnit: 'kg',
      message: 'Bonjour, nous sommes intéressés.',
    };

    const publishedOffer = {
      id: 'off-1',
      publicationStatus: MarketplacePublicationStatus.PUBLISHED,
      visibilityScope: MarketplaceVisibilityScope.BUYERS_ONLY,
      sellerProfile: { id: 'sp-1', status: SellerProfileStatus.APPROVED },
      marketplaceProduct: { id: 'mp-1', publicationStatus: MarketplacePublicationStatus.PUBLISHED },
    };

    it('crée une RFQ valide sur offre publiée', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue(publishedOffer);
      prisma.company.findUnique.mockResolvedValue({ id: 'co-1' });
      prisma.quoteRequest.create.mockResolvedValue({
        id: 'rfq-1',
        ...dto,
        buyerUserId: BUYER.id,
        status: QuoteRequestStatus.NEW,
      });
      prisma.quoteRequestMessage.create.mockResolvedValue({ id: 'msg-1' });

      const out = await service.create(dto, BUYER);
      expect(out.id).toBe('rfq-1');
      expect(prisma.quoteRequestMessage.create).toHaveBeenCalled(); // message initial archivé
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'QUOTE_REQUEST_CREATED',
        }),
      );
    });

    it('404 si offre inexistante', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue(null);
      prisma.company.findUnique.mockResolvedValue({ id: 'co-1' });
      await expect(service.create(dto, BUYER)).rejects.toThrow(NotFoundException);
    });

    it('404 si company acheteuse inexistante', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue(publishedOffer);
      prisma.company.findUnique.mockResolvedValue(null);
      await expect(service.create(dto, BUYER)).rejects.toThrow(NotFoundException);
    });

    it('400 si offre non publiée', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue({
        ...publishedOffer,
        publicationStatus: MarketplacePublicationStatus.DRAFT,
      });
      prisma.company.findUnique.mockResolvedValue({ id: 'co-1' });
      await expect(service.create(dto, BUYER)).rejects.toThrow(BadRequestException);
    });

    it('400 si offre privée', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue({
        ...publishedOffer,
        visibilityScope: MarketplaceVisibilityScope.PRIVATE,
      });
      prisma.company.findUnique.mockResolvedValue({ id: 'co-1' });
      await expect(service.create(dto, BUYER)).rejects.toThrow(BadRequestException);
    });

    it('400 si seller non approuvé', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue({
        ...publishedOffer,
        sellerProfile: { id: 'sp-1', status: SellerProfileStatus.SUSPENDED },
      });
      prisma.company.findUnique.mockResolvedValue({ id: 'co-1' });
      await expect(service.create(dto, BUYER)).rejects.toThrow(BadRequestException);
    });

    it('400 si produit marketplace non publiable', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue({
        ...publishedOffer,
        marketplaceProduct: { id: 'mp-1', publicationStatus: MarketplacePublicationStatus.DRAFT },
      });
      prisma.company.findUnique.mockResolvedValue({ id: 'co-1' });
      await expect(service.create(dto, BUYER)).rejects.toThrow(BadRequestException);
    });

    it('403 si un seller tente de créer', async () => {
      await expect(service.create(dto, SELLER)).rejects.toThrow(ForbiddenException);
    });

    it('admin peut créer', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue(publishedOffer);
      prisma.company.findUnique.mockResolvedValue({ id: 'co-1' });
      prisma.quoteRequest.create.mockResolvedValue({ id: 'rfq-2', status: QuoteRequestStatus.NEW });
      const out = await service.create({ ...dto, message: undefined }, ADMIN);
      expect(out.id).toBe('rfq-2');
      expect(prisma.quoteRequestMessage.create).not.toHaveBeenCalled(); // pas de message fourni
    });
  });

  // ── findAll (scoping) ──────────────────────────────────────────────────────

  describe('findAll (scoping par rôle)', () => {
    beforeEach(() => {
      prisma.quoteRequest.findMany.mockResolvedValue([]);
      prisma.quoteRequest.count.mockResolvedValue(0);
    });

    it('buyer → filtrage automatique sur buyerUserId', async () => {
      await service.findAll({}, BUYER);
      const firstArg = prisma.quoteRequest.findMany.mock.calls[0][0];
      expect(firstArg.where.buyerUserId).toBe(BUYER.id);
    });

    it('seller → filtre automatique sur sellerProfileIds du scope', async () => {
      await service.findAll({}, SELLER);
      const firstArg = prisma.quoteRequest.findMany.mock.calls[0][0];
      expect(firstArg.where.buyerUserId).toBeUndefined();
      expect(firstArg.where.marketplaceOffer).toEqual({
        sellerProfileId: { in: ['sp-1'] },
      });
    });

    it('admin → pas de filtre automatique', async () => {
      await service.findAll({}, ADMIN);
      const firstArg = prisma.quoteRequest.findMany.mock.calls[0][0];
      expect(firstArg.where.buyerUserId).toBeUndefined();
    });
  });

  // ── findById (accès) ───────────────────────────────────────────────────────

  describe('findById', () => {
    const rfq = {
      id: 'rfq-1',
      buyerUserId: BUYER.id,
      status: QuoteRequestStatus.NEW,
      marketplaceOffer: { sellerProfileId: 'sp-1' },
    };

    it('buyer propriétaire → OK', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue(rfq);
      const out = await service.findById('rfq-1', BUYER);
      expect(out.id).toBe('rfq-1');
    });

    it('autre buyer → 403', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue(rfq);
      await expect(service.findById('rfq-1', BUYER2)).rejects.toThrow(ForbiddenException);
    });

    it('seller → OK', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue(rfq);
      const out = await service.findById('rfq-1', SELLER);
      expect(out.id).toBe('rfq-1');
    });

    it('admin → OK', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue(rfq);
      const out = await service.findById('rfq-1', ADMIN);
      expect(out.id).toBe('rfq-1');
    });

    it('404 si introuvable', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue(null);
      await expect(service.findById('x', ADMIN)).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateStatus ───────────────────────────────────────────────────────────

  describe('updateStatus', () => {
    const baseRfq = {
      id: 'rfq-1',
      buyerUserId: BUYER.id,
      status: QuoteRequestStatus.NEW,
      marketplaceOffer: { sellerProfileId: 'sp-1' },
    };

    it('transition autorisée NEW→QUALIFIED par seller', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue(baseRfq);
      prisma.quoteRequest.update.mockResolvedValue({
        ...baseRfq,
        status: QuoteRequestStatus.QUALIFIED,
      });
      const out = await service.updateStatus(
        'rfq-1',
        { status: QuoteRequestStatus.QUALIFIED },
        SELLER,
      );
      expect(out.status).toBe(QuoteRequestStatus.QUALIFIED);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'QUOTE_REQUEST_STATUS_CHANGED',
        }),
      );
    });

    it('transition interdite NEW→WON', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue(baseRfq);
      await expect(
        service.updateStatus('rfq-1', { status: QuoteRequestStatus.WON }, SELLER),
      ).rejects.toThrow(BadRequestException);
    });

    it("buyer ne peut qu'annuler", async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue(baseRfq);
      await expect(
        service.updateStatus('rfq-1', { status: QuoteRequestStatus.QUALIFIED }, BUYER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('buyer peut annuler sa propre RFQ', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue(baseRfq);
      prisma.quoteRequest.update.mockResolvedValue({
        ...baseRfq,
        status: QuoteRequestStatus.CANCELLED,
      });
      const out = await service.updateStatus(
        'rfq-1',
        { status: QuoteRequestStatus.CANCELLED },
        BUYER,
      );
      expect(out.status).toBe(QuoteRequestStatus.CANCELLED);
    });

    it('statut identique → 400', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue(baseRfq);
      await expect(
        service.updateStatus('rfq-1', { status: QuoteRequestStatus.NEW }, ADMIN),
      ).rejects.toThrow(BadRequestException);
    });

    it('statut terminal WON → plus de transition', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue({
        ...baseRfq,
        status: QuoteRequestStatus.WON,
      });
      await expect(
        service.updateStatus('rfq-1', { status: QuoteRequestStatus.NEGOTIATING }, ADMIN),
      ).rejects.toThrow(BadRequestException);
    });

    it('WON autorisé depuis QUOTED par seller', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue({
        ...baseRfq,
        status: QuoteRequestStatus.QUOTED,
      });
      prisma.quoteRequest.update.mockResolvedValue({ ...baseRfq, status: QuoteRequestStatus.WON });
      const out = await service.updateStatus('rfq-1', { status: QuoteRequestStatus.WON }, SELLER);
      expect(out.status).toBe(QuoteRequestStatus.WON);
    });
  });

  // ── assign ─────────────────────────────────────────────────────────────────

  describe('assign', () => {
    it('403 si non-staff', async () => {
      await expect(service.assign('rfq-1', { assignedToUserId: 'u-x' }, SELLER)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('assigne et journalise', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue({ id: 'rfq-1', assignedToUserId: null });
      prisma.user.findUnique.mockResolvedValue({ id: 'u-x' });
      prisma.quoteRequest.update.mockResolvedValue({ id: 'rfq-1', assignedToUserId: 'u-x' });
      const out = await service.assign('rfq-1', { assignedToUserId: 'u-x' }, ADMIN);
      expect(out.assignedToUserId).toBe('u-x');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'QUOTE_REQUEST_ASSIGNED',
        }),
      );
    });

    it('désassigne avec null', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue({ id: 'rfq-1', assignedToUserId: 'u-x' });
      prisma.quoteRequest.update.mockResolvedValue({ id: 'rfq-1', assignedToUserId: null });
      const out = await service.assign('rfq-1', { assignedToUserId: null }, QUALITY);
      expect(out.assignedToUserId).toBeNull();
    });
  });

  // ── messages ───────────────────────────────────────────────────────────────

  describe('messages', () => {
    const rfq = {
      id: 'rfq-1',
      buyerUserId: BUYER.id,
      marketplaceOffer: { sellerProfileId: 'sp-1' },
    };

    it('findMessages buyer → filtre isInternalNote=false', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue(rfq);
      prisma.quoteRequestMessage.findMany.mockResolvedValue([]);
      await service.findMessages('rfq-1', BUYER);
      const whereArg = prisma.quoteRequestMessage.findMany.mock.calls[0][0].where;
      expect(whereArg).toEqual({ quoteRequestId: 'rfq-1', isInternalNote: false });
    });

    it('findMessages staff → pas de filtre isInternalNote', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue(rfq);
      prisma.quoteRequestMessage.findMany.mockResolvedValue([]);
      await service.findMessages('rfq-1', ADMIN);
      const whereArg = prisma.quoteRequestMessage.findMany.mock.calls[0][0].where;
      expect(whereArg).toEqual({ quoteRequestId: 'rfq-1' });
    });

    it('findMessages buyer non-propriétaire → 403', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue(rfq);
      await expect(service.findMessages('rfq-1', BUYER2)).rejects.toThrow(ForbiddenException);
    });

    it('addMessage buyer avec note interne → 403', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue(rfq);
      await expect(
        service.addMessage('rfq-1', { message: 'x', isInternalNote: true }, BUYER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('addMessage seller : note interne OK + audit approprié', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue(rfq);
      prisma.quoteRequestMessage.create.mockResolvedValue({ id: 'm-1', isInternalNote: true });
      await service.addMessage('rfq-1', { message: 'note', isInternalNote: true }, SELLER);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'QUOTE_REQUEST_INTERNAL_NOTE_ADDED',
        }),
      );
    });

    it('addMessage buyer visible : audit MESSAGE_ADDED', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue(rfq);
      prisma.quoteRequestMessage.create.mockResolvedValue({ id: 'm-2', isInternalNote: false });
      await service.addMessage('rfq-1', { message: 'hello' }, BUYER);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'QUOTE_REQUEST_MESSAGE_ADDED',
        }),
      );
    });

    it('404 si RFQ introuvable pour messages', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue(null);
      await expect(service.findMessages('x', ADMIN)).rejects.toThrow(NotFoundException);
      await expect(service.addMessage('x', { message: 'y' }, ADMIN)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
