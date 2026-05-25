import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QuoteRequestsService } from './quote-requests.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SellerOwnershipService } from '../common/services/seller-ownership.service';
import { NotifEmailService } from '../notif-email/notif-email.service';
import { PricingPolicyService } from '../payments/domain/pricing-policy.service';
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
    sellerProfile: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let audit: { log: jest.Mock };
  let notifEmail: { send: jest.Mock };
  let config: { get: jest.Mock };

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
      sellerProfile: { findUnique: jest.fn() },
      $transaction: jest.fn((ops: Array<Promise<unknown>>) => Promise.all(ops)),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    notifEmail = {
      send: jest.fn().mockResolvedValue({ success: true, messageId: 'mock-1', transport: 'mock' }),
    };
    config = {
      get: jest.fn((key: string) => {
        if (key === 'FRONTEND_URL') return 'http://localhost:3000';
        return undefined;
      }),
    };

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
        { provide: NotifEmailService, useValue: notifEmail },
        { provide: ConfigService, useValue: config },
        PricingPolicyService,
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
      title: 'Vanille Bourbon Grade A — offre principale',
      sellerProfileId: 'sp-1',
      publicationStatus: MarketplacePublicationStatus.PUBLISHED,
      visibilityScope: MarketplaceVisibilityScope.BUYERS_ONLY,
      sellerProfile: { id: 'sp-1', status: SellerProfileStatus.APPROVED },
      marketplaceProduct: { id: 'mp-1', publicationStatus: MarketplacePublicationStatus.PUBLISHED },
    };

    it('crée une RFQ valide sur offre publiée', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue(publishedOffer);
      prisma.company.findUnique.mockResolvedValue({ id: 'co-1', name: 'Acme Foods' });
      prisma.quoteRequest.create.mockResolvedValue({
        id: 'rfq-1',
        ...dto,
        buyerUserId: BUYER.id,
        status: QuoteRequestStatus.NEW,
      });
      prisma.quoteRequestMessage.create.mockResolvedValue({ id: 'msg-1' });
      prisma.sellerProfile.findUnique.mockResolvedValue({
        publicDisplayName: 'Coop Vanille',
        salesEmail: 'sales@coop-vanille.demo',
      });

      const out = await service.create(dto, BUYER);
      expect(out.id).toBe('rfq-1');
      expect(prisma.quoteRequestMessage.create).toHaveBeenCalled(); // message initial archivé
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'QUOTE_REQUEST_CREATED',
        }),
      );
    });

    // ── MP-NOTIF-1 phase 1 ─────────────────────────────────────────────────
    it('MP-NOTIF-1 — appelle NotifEmailService.send vers seller.salesEmail après create', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue(publishedOffer);
      prisma.company.findUnique.mockResolvedValue({ id: 'co-1', name: 'Acme Foods' });
      prisma.quoteRequest.create.mockResolvedValue({
        id: 'rfq-1',
        ...dto,
        buyerUserId: BUYER.id,
        status: QuoteRequestStatus.NEW,
      });
      prisma.quoteRequestMessage.create.mockResolvedValue({ id: 'msg-1' });
      prisma.sellerProfile.findUnique.mockResolvedValue({
        publicDisplayName: 'Coop Vanille',
        salesEmail: 'sales@coop-vanille.demo',
      });

      await service.create(dto, BUYER);
      expect(notifEmail.send).toHaveBeenCalledTimes(1);
      const arg = notifEmail.send.mock.calls[0][0];
      expect(arg.templateId).toBe('rfq-created-to-seller');
      expect(arg.to).toBe('sales@coop-vanille.demo');
      expect(arg.templateData).toMatchObject({
        sellerDisplayName: 'Coop Vanille',
        buyerCompanyName: 'Acme Foods',
        offerTitle: publishedOffer.title,
        requestedQuantity: 500,
        requestedUnit: 'kg',
      });
      expect(typeof arg.templateData.ctaUrl).toBe('string');
      expect(arg.templateData.ctaUrl).toContain('/seller/quote-requests/rfq-1');
    });

    it('MP-NOTIF-1 — RFQ créée même si salesEmail absent (skip silencieux)', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue(publishedOffer);
      prisma.company.findUnique.mockResolvedValue({ id: 'co-1', name: 'Acme Foods' });
      prisma.quoteRequest.create.mockResolvedValue({
        id: 'rfq-2',
        ...dto,
        buyerUserId: BUYER.id,
        status: QuoteRequestStatus.NEW,
      });
      prisma.quoteRequestMessage.create.mockResolvedValue({ id: 'msg-1' });
      prisma.sellerProfile.findUnique.mockResolvedValue({
        publicDisplayName: 'Coop sans email',
        salesEmail: null,
      });

      const out = await service.create(dto, BUYER);
      expect(out.id).toBe('rfq-2');
      expect(notifEmail.send).not.toHaveBeenCalled();
    });

    it('MP-NOTIF-1 — RFQ créée même si transport notif throw (try/catch silencieux)', async () => {
      prisma.marketplaceOffer.findUnique.mockResolvedValue(publishedOffer);
      prisma.company.findUnique.mockResolvedValue({ id: 'co-1', name: 'Acme Foods' });
      prisma.quoteRequest.create.mockResolvedValue({
        id: 'rfq-3',
        ...dto,
        buyerUserId: BUYER.id,
        status: QuoteRequestStatus.NEW,
      });
      prisma.quoteRequestMessage.create.mockResolvedValue({ id: 'msg-1' });
      prisma.sellerProfile.findUnique.mockResolvedValue({
        publicDisplayName: 'Coop Vanille',
        salesEmail: 'sales@coop-vanille.demo',
      });
      notifEmail.send.mockRejectedValueOnce(new Error('boom transport'));

      const out = await service.create(dto, BUYER);
      expect(out.id).toBe('rfq-3');
      expect(notifEmail.send).toHaveBeenCalledTimes(1);
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

    it('WON autorisé depuis QUOTED par seller (agreedAmountCents explicite)', async () => {
      // M133 — agreedAmountCents doit être fourni ou calculable depuis unitPrice × qty
      prisma.quoteRequest.findUnique.mockResolvedValue({
        ...baseRfq,
        status: QuoteRequestStatus.QUOTED,
      });
      prisma.quoteRequest.update.mockResolvedValue({ ...baseRfq, status: QuoteRequestStatus.WON });
      const out = await service.updateStatus(
        'rfq-1',
        { status: QuoteRequestStatus.WON, agreedAmountCents: 240000, agreedCurrency: 'EUR' },
        SELLER,
      );
      expect(out.status).toBe(QuoteRequestStatus.WON);
      // Vérifier que le montant verrouillé est bien passé au update
      expect(prisma.quoteRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            agreedAmountCents: 240000,
            agreedCurrency: 'EUR',
          }),
        }),
      );
    });

    it('M133 — WON sans agreedAmountCents ni unitPrice → BadRequestException', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue({
        ...baseRfq,
        status: QuoteRequestStatus.QUOTED,
        requestedQuantity: null,
        marketplaceOffer: { sellerProfileId: 'sp-1', unitPrice: null, currency: null },
      });
      await expect(
        service.updateStatus('rfq-1', { status: QuoteRequestStatus.WON }, SELLER),
      ).rejects.toThrow(BadRequestException);
    });

    it('M133 — WON auto-compute depuis unitPrice × requestedQuantity', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue({
        ...baseRfq,
        status: QuoteRequestStatus.QUOTED,
        requestedQuantity: { toNumber: () => 2 },
        marketplaceOffer: {
          sellerProfileId: 'sp-1',
          unitPrice: { toNumber: () => 1200 },
          currency: 'EUR',
        },
      });
      prisma.quoteRequest.update.mockResolvedValue({ ...baseRfq, status: QuoteRequestStatus.WON });
      await service.updateStatus('rfq-1', { status: QuoteRequestStatus.WON }, SELLER);
      // 1200 EUR × 2 kg = 240 000 centimes
      expect(prisma.quoteRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            agreedAmountCents: 240000,
            agreedCurrency: 'EUR',
          }),
        }),
      );
    });

    it('M133 — WON auto-compute depuis NEGOTIATING (unitPrice × qty)', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue({
        ...baseRfq,
        status: QuoteRequestStatus.NEGOTIATING,
        requestedQuantity: { toNumber: () => 3 },
        marketplaceOffer: {
          sellerProfileId: 'sp-1',
          unitPrice: { toNumber: () => 500 },
          currency: 'USD',
        },
      });
      prisma.quoteRequest.update.mockResolvedValue({ ...baseRfq, status: QuoteRequestStatus.WON });
      await service.updateStatus('rfq-1', { status: QuoteRequestStatus.WON }, SELLER);
      // 500 USD × 3 = 1500 → 150 000 centimes
      expect(prisma.quoteRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            agreedAmountCents: 150000,
            agreedCurrency: 'USD',
          }),
        }),
      );
    });

    // ── MP-NOTIF-2 phase 2 — Notif transitions ─────────────────────────

    /**
     * Fixture enrichie pour les tests de notif transition : la RFQ
     * retournée par `update` doit inclure marketplaceOffer (avec title +
     * sellerProfile) et buyerUser (avec email). Le service skip la notif
     * silencieusement si l'un de ces champs manque (cas des tests legacy).
     */
    const richUpdated = (status: QuoteRequestStatus) => ({
      id: 'rfq-1',
      status,
      buyerUser: {
        email: 'alice@buyer.demo',
        firstName: 'Alice',
        lastName: 'Buyer',
      },
      marketplaceOffer: {
        id: 'off-1',
        title: 'Vanille Bourbon Grade A',
        sellerProfileId: 'sp-1',
        sellerProfile: { publicDisplayName: 'Coop Vanille' },
      },
    });

    const fromStatusSetup = (current: QuoteRequestStatus) => {
      prisma.quoteRequest.findUnique.mockResolvedValue({
        ...baseRfq,
        status: current,
      });
    };

    it('MP-NOTIF-2 — NEW→QUALIFIED par seller → notif rfq-qualified vers buyer', async () => {
      fromStatusSetup(QuoteRequestStatus.NEW);
      prisma.quoteRequest.update.mockResolvedValue(richUpdated(QuoteRequestStatus.QUALIFIED));
      await service.updateStatus('rfq-1', { status: QuoteRequestStatus.QUALIFIED }, SELLER);
      expect(notifEmail.send).toHaveBeenCalledTimes(1);
      const arg = notifEmail.send.mock.calls[0][0];
      expect(arg.templateId).toBe('rfq-qualified');
      expect(arg.to).toBe('alice@buyer.demo');
      expect(arg.templateData).toMatchObject({
        recipientDisplayName: 'Alice Buyer',
        senderDisplayName: 'Coop Vanille',
        offerTitle: 'Vanille Bourbon Grade A',
      });
    });

    it('MP-NOTIF-2 — QUALIFIED→QUOTED par seller → notif rfq-quoted', async () => {
      fromStatusSetup(QuoteRequestStatus.QUALIFIED);
      prisma.quoteRequest.update.mockResolvedValue(richUpdated(QuoteRequestStatus.QUOTED));
      await service.updateStatus(
        'rfq-1',
        { status: QuoteRequestStatus.QUOTED, note: 'Devis 1850 EUR/t.' },
        SELLER,
      );
      expect(notifEmail.send).toHaveBeenCalledTimes(1);
      expect(notifEmail.send.mock.calls[0][0].templateId).toBe('rfq-quoted');
      expect(notifEmail.send.mock.calls[0][0].templateData.note).toBe('Devis 1850 EUR/t.');
    });

    it('MP-NOTIF-2 — QUOTED→WON par seller → notif rfq-won', async () => {
      fromStatusSetup(QuoteRequestStatus.QUOTED);
      prisma.quoteRequest.update.mockResolvedValue(richUpdated(QuoteRequestStatus.WON));
      // M133 — agreedAmountCents requis (baseRfq n'a pas de unitPrice)
      await service.updateStatus(
        'rfq-1',
        { status: QuoteRequestStatus.WON, agreedAmountCents: 240000, agreedCurrency: 'EUR' },
        SELLER,
      );
      expect(notifEmail.send).toHaveBeenCalledTimes(1);
      expect(notifEmail.send.mock.calls[0][0].templateId).toBe('rfq-won');
    });

    it('MP-NOTIF-2 — QUOTED→LOST par seller → notif rfq-lost', async () => {
      fromStatusSetup(QuoteRequestStatus.QUOTED);
      prisma.quoteRequest.update.mockResolvedValue(richUpdated(QuoteRequestStatus.LOST));
      await service.updateStatus('rfq-1', { status: QuoteRequestStatus.LOST }, SELLER);
      expect(notifEmail.send).toHaveBeenCalledTimes(1);
      expect(notifEmail.send.mock.calls[0][0].templateId).toBe('rfq-lost');
    });

    it('MP-NOTIF-2 — QUOTED→NEGOTIATING → PAS de notif', async () => {
      fromStatusSetup(QuoteRequestStatus.QUOTED);
      prisma.quoteRequest.update.mockResolvedValue(richUpdated(QuoteRequestStatus.NEGOTIATING));
      await service.updateStatus('rfq-1', { status: QuoteRequestStatus.NEGOTIATING }, SELLER);
      expect(notifEmail.send).not.toHaveBeenCalled();
    });

    it('MP-NOTIF-2 — NEW→CANCELLED par buyer → PAS de notif (skip status)', async () => {
      fromStatusSetup(QuoteRequestStatus.NEW);
      prisma.quoteRequest.update.mockResolvedValue(richUpdated(QuoteRequestStatus.CANCELLED));
      await service.updateStatus('rfq-1', { status: QuoteRequestStatus.CANCELLED }, BUYER);
      expect(notifEmail.send).not.toHaveBeenCalled();
    });

    it('MP-NOTIF-2 — notifEmail throw → la transition status est tout de même persistée', async () => {
      fromStatusSetup(QuoteRequestStatus.NEW);
      prisma.quoteRequest.update.mockResolvedValue(richUpdated(QuoteRequestStatus.QUALIFIED));
      notifEmail.send.mockRejectedValueOnce(new Error('boom transport'));
      const out = await service.updateStatus(
        'rfq-1',
        { status: QuoteRequestStatus.QUALIFIED },
        SELLER,
      );
      expect(out.status).toBe(QuoteRequestStatus.QUALIFIED);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'QUOTE_REQUEST_STATUS_CHANGED' }),
      );
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

  // ── findStaleAlerts ────────────────────────────────────────────────────────

  describe('findStaleAlerts', () => {
    it('returns RFQs with status NEW or QUALIFIED and updatedAt > 7 days ago', async () => {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      const staleRfq = {
        id: 'rfq-stale-1',
        status: QuoteRequestStatus.NEW,
        createdAt: tenDaysAgo,
        updatedAt: tenDaysAgo,
        marketplaceOffer: {
          id: 'off-1',
          title: 'Vanille 500g',
          sellerProfile: { publicDisplayName: 'Coop Vanille' },
        },
        buyerCompany: { id: 'co-1', name: 'Acme Foods' },
        buyerUser: { id: 'buyer-1', email: 'buyer@test.io', firstName: 'A', lastName: 'B' },
        assignedToUser: null,
      };

      prisma.quoteRequest.findMany.mockResolvedValue([staleRfq]);

      const result = await service.findStaleAlerts();

      expect(result.count).toBe(1);
      expect(result.threshold).toBe('7d');
      expect(result.data[0].id).toBe('rfq-stale-1');
      expect(result.data[0].offerTitle).toBe('Vanille 500g');
      expect(result.data[0].sellerName).toBe('Coop Vanille');
      expect(result.data[0].buyerCompany).toBe('Acme Foods');
      expect(result.data[0].daysStale).toBeGreaterThanOrEqual(10);
      expect(result.data[0].assignedTo).toBeNull();

      // Verify query filter
      const queryArg = prisma.quoteRequest.findMany.mock.calls[0][0];
      expect(queryArg.where.status.in).toEqual([QuoteRequestStatus.NEW, QuoteRequestStatus.QUALIFIED]);
      expect(queryArg.where.updatedAt.lt).toBeInstanceOf(Date);
    });

    it('returns empty list when no stale RFQs exist', async () => {
      prisma.quoteRequest.findMany.mockResolvedValue([]);

      const result = await service.findStaleAlerts();

      expect(result.count).toBe(0);
      expect(result.data).toEqual([]);
    });

    it('formats assignedTo name when present', async () => {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      prisma.quoteRequest.findMany.mockResolvedValue([
        {
          id: 'rfq-stale-2',
          status: QuoteRequestStatus.QUALIFIED,
          createdAt: tenDaysAgo,
          updatedAt: tenDaysAgo,
          marketplaceOffer: { id: 'off-1', title: 'Ylang', sellerProfile: { publicDisplayName: 'Coop Y' } },
          buyerCompany: { id: 'co-1', name: 'BuyerCo' },
          buyerUser: { id: 'b1', email: 'b@x.io', firstName: 'B', lastName: 'U' },
          assignedToUser: { id: 'staff-1', email: 'staff@iox.io', firstName: 'Jean', lastName: 'Dupont' },
        },
      ]);

      const result = await service.findStaleAlerts();
      expect(result.data[0].assignedTo).toBe('Jean Dupont');
    });
  });

  // ── messages ───────────────────────────────────────────────────────────────

  describe('messages', () => {
    const rfq = {
      id: 'rfq-1',
      buyerUserId: BUYER.id,
      marketplaceOffer: {
        id: 'off-1',
        title: 'Vanille Bourbon Grade A — offre principale',
        sellerProfileId: 'sp-1',
        sellerProfile: {
          id: 'sp-1',
          publicDisplayName: 'Coop Vanille',
          salesEmail: 'sales@coop-vanille.demo',
        },
      },
      buyerUser: {
        id: 'buyer-1',
        email: 'buyer@acme.demo',
        firstName: 'Alice',
        lastName: 'Acheteuse',
      },
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
      prisma.quoteRequestMessage.create.mockResolvedValue({
        id: 'm-1',
        message: 'note',
        isInternalNote: true,
        authorUser: { firstName: 'S', lastName: 'L', email: 'sl@x', role: 'MARKETPLACE_SELLER' },
      });
      await service.addMessage('rfq-1', { message: 'note', isInternalNote: true }, SELLER);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'QUOTE_REQUEST_INTERNAL_NOTE_ADDED',
        }),
      );
      // MP-NOTIF-1 : note interne ne déclenche PAS de notif
      expect(notifEmail.send).not.toHaveBeenCalled();
    });

    it('addMessage buyer visible : audit MESSAGE_ADDED', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue(rfq);
      prisma.quoteRequestMessage.create.mockResolvedValue({
        id: 'm-2',
        message: 'hello',
        isInternalNote: false,
        authorUser: {
          firstName: 'Alice',
          lastName: 'Acheteuse',
          email: 'buyer@acme.demo',
          role: 'MARKETPLACE_BUYER',
        },
      });
      await service.addMessage('rfq-1', { message: 'hello' }, BUYER);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'QUOTE_REQUEST_MESSAGE_ADDED',
        }),
      );
    });

    // ── MP-NOTIF-1 phase 1 ─────────────────────────────────────────────────
    it('MP-NOTIF-1 — buyer envoie un message → notifie le seller (salesEmail)', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue(rfq);
      prisma.quoteRequestMessage.create.mockResolvedValue({
        id: 'm-3',
        message: 'Pouvez-vous chiffrer ?',
        isInternalNote: false,
        authorUser: {
          firstName: 'Alice',
          lastName: 'Acheteuse',
          email: 'buyer@acme.demo',
          role: 'MARKETPLACE_BUYER',
        },
      });
      await service.addMessage('rfq-1', { message: 'Pouvez-vous chiffrer ?' }, BUYER);
      expect(notifEmail.send).toHaveBeenCalledTimes(1);
      const arg = notifEmail.send.mock.calls[0][0];
      expect(arg.templateId).toBe('rfq-message-created');
      expect(arg.to).toBe('sales@coop-vanille.demo');
      expect(arg.templateData).toMatchObject({
        recipientDisplayName: 'Coop Vanille',
        senderDisplayName: 'Alice Acheteuse',
        offerTitle: 'Vanille Bourbon Grade A — offre principale',
        messageBody: 'Pouvez-vous chiffrer ?',
      });
      expect(String(arg.templateData.ctaUrl)).toContain('/seller/quote-requests/rfq-1');
    });

    it('MP-NOTIF-1 — seller envoie un message → notifie le buyer (email user)', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue(rfq);
      prisma.quoteRequestMessage.create.mockResolvedValue({
        id: 'm-4',
        message: 'Devis 1850 EUR/tonne CIF.',
        isInternalNote: false,
        authorUser: {
          firstName: 'Boris',
          lastName: 'Vendeur',
          email: 'sales@coop-vanille.demo',
          role: 'MARKETPLACE_SELLER',
        },
      });
      await service.addMessage('rfq-1', { message: 'Devis 1850 EUR/tonne CIF.' }, SELLER);
      expect(notifEmail.send).toHaveBeenCalledTimes(1);
      const arg = notifEmail.send.mock.calls[0][0];
      expect(arg.to).toBe('buyer@acme.demo');
      expect(arg.templateData).toMatchObject({
        recipientDisplayName: 'Alice Acheteuse',
        senderDisplayName: 'Boris Vendeur',
        offerTitle: 'Vanille Bourbon Grade A — offre principale',
        messageBody: 'Devis 1850 EUR/tonne CIF.',
      });
      expect(String(arg.templateData.ctaUrl)).toContain('/quote-requests/rfq-1');
    });

    it('404 si RFQ introuvable pour messages', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue(null);
      await expect(service.findMessages('x', ADMIN)).rejects.toThrow(NotFoundException);
      await expect(service.addMessage('x', { message: 'y' }, ADMIN)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── setAgreedAmount (M135) ─────────────────────────────────────────────────

  describe('setAgreedAmount', () => {
    const wonRfq = {
      id: 'rfq-won',
      status: QuoteRequestStatus.WON,
      agreedAmountCents: null,
      agreedCurrency: null,
    };

    it('admin fixe le montant sur une RFQ WON sans montant → OK + audit', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue(wonRfq);
      prisma.quoteRequest.update.mockResolvedValue({
        ...wonRfq,
        agreedAmountCents: 250000,
        agreedCurrency: 'EUR',
      });
      const out = await service.setAgreedAmount(
        'rfq-won',
        { agreedAmountCents: 250000, agreedCurrency: 'EUR', reason: 'Correction M133' },
        ADMIN,
      );
      expect(out.agreedAmountCents).toBe(250000);
      expect(out.agreedCurrency).toBe('EUR');
      expect(prisma.quoteRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            agreedAmountCents: 250000,
            agreedCurrency: 'EUR',
          }),
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'QUOTE_REQUEST_AGREED_AMOUNT_SET',
          entityId: 'rfq-won',
          notes: 'Correction M133',
        }),
      );
    });

    it('coordinator peut aussi corriger le montant', async () => {
      const COORDINATOR = u(UserRole.COORDINATOR, 'coord-1');
      prisma.quoteRequest.findUnique.mockResolvedValue(wonRfq);
      prisma.quoteRequest.update.mockResolvedValue({
        ...wonRfq,
        agreedAmountCents: 80000,
        agreedCurrency: 'USD',
      });
      const out = await service.setAgreedAmount(
        'rfq-won',
        { agreedAmountCents: 80000, agreedCurrency: 'usd' },
        COORDINATOR,
      );
      expect(out.agreedAmountCents).toBe(80000);
      // Devise normalisée en UPPERCASE dans l'update
      expect(prisma.quoteRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ agreedCurrency: 'USD' }),
        }),
      );
    });

    it('seller → ForbiddenException', async () => {
      await expect(
        service.setAgreedAmount(
          'rfq-won',
          { agreedAmountCents: 10000, agreedCurrency: 'EUR' },
          SELLER,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('buyer → ForbiddenException', async () => {
      await expect(
        service.setAgreedAmount(
          'rfq-won',
          { agreedAmountCents: 10000, agreedCurrency: 'EUR' },
          BUYER,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('404 si RFQ introuvable', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue(null);
      await expect(
        service.setAgreedAmount('x', { agreedAmountCents: 1000, agreedCurrency: 'EUR' }, ADMIN),
      ).rejects.toThrow(NotFoundException);
    });

    it('400 si RFQ pas en statut WON', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue({
        ...wonRfq,
        status: QuoteRequestStatus.QUOTED,
      });
      await expect(
        service.setAgreedAmount(
          'rfq-won',
          { agreedAmountCents: 10000, agreedCurrency: 'EUR' },
          ADMIN,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('400 si devise non supportée (GBP)', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue(wonRfq);
      await expect(
        service.setAgreedAmount(
          'rfq-won',
          { agreedAmountCents: 10000, agreedCurrency: 'GBP' },
          ADMIN,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('écrase un montant existant (correction post-hoc)', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue({
        ...wonRfq,
        agreedAmountCents: 100,
        agreedCurrency: 'EUR',
      });
      prisma.quoteRequest.update.mockResolvedValue({
        ...wonRfq,
        agreedAmountCents: 500000,
        agreedCurrency: 'EUR',
      });
      await service.setAgreedAmount(
        'rfq-won',
        { agreedAmountCents: 500000, agreedCurrency: 'EUR', reason: 'Erreur initiale corrigée' },
        ADMIN,
      );
      expect(prisma.quoteRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ agreedAmountCents: 500000 }),
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          previousData: expect.objectContaining({ agreedAmountCents: 100 }),
          newData: expect.objectContaining({ agreedAmountCents: 500000 }),
        }),
      );
    });
  });
});
