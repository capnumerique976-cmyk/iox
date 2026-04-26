// FP-2 — Tests unitaires MarketplaceCertificationsService.
// Couvre :
//  - création nominale (PENDING par défaut + audit)
//  - rejet d'un scope non supporté (BadRequest)
//  - validation type=OTHER sans code/issuingBody (BadRequest)
//  - ownership 403 quand le seller n'est pas dans son périmètre
//  - verify/reject par staff + transition d'état
//  - update d'une certif VERIFIED → re-passe en PENDING
//  - findPublic ne renvoie que VERIFIED + non expirées

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  CertificationType,
  MarketplaceRelatedEntityType,
  MarketplaceVerificationStatus,
  RequestUser,
  UserRole,
} from '@iox/shared';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SellerOwnershipService } from '../common/services/seller-ownership.service';
import { MarketplaceCertificationsService } from './marketplace-certifications.service';

const SELLER_ID = '11111111-1111-1111-1111-111111111111';
const PRODUCT_ID = '22222222-2222-2222-2222-222222222222';
const CERT_ID = '33333333-3333-3333-3333-333333333333';
const STAFF_ID = '44444444-4444-4444-4444-444444444444';
const SELLER_USER_ID = '55555555-5555-5555-5555-555555555555';

const STAFF_ACTOR: RequestUser = {
  id: STAFF_ID,
  email: 'staff@iox.test',
  role: UserRole.QUALITY_MANAGER,
  sellerProfileIds: [],
};

const SELLER_ACTOR_OWNS: RequestUser = {
  id: SELLER_USER_ID,
  email: 'seller@iox.test',
  role: UserRole.MARKETPLACE_SELLER,
  sellerProfileIds: [SELLER_ID],
};

const SELLER_ACTOR_OUT_OF_SCOPE: RequestUser = {
  id: SELLER_USER_ID,
  email: 'seller@iox.test',
  role: UserRole.MARKETPLACE_SELLER,
  sellerProfileIds: ['ffffffff-ffff-ffff-ffff-ffffffffffff'],
};

describe('MarketplaceCertificationsService', () => {
  let service: MarketplaceCertificationsService;
  let prisma: {
    certification: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
    sellerProfile: { findUnique: jest.Mock };
    marketplaceProduct: { findUnique: jest.Mock };
    mediaAsset: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let audit: { log: jest.Mock };
  let ownership: {
    assertRelatedEntityOwnership: jest.Mock;
    scopeRelatedEntityFilter: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      certification: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn().mockResolvedValue({}),
        count: jest.fn(),
      },
      sellerProfile: { findUnique: jest.fn() },
      marketplaceProduct: { findUnique: jest.fn() },
      mediaAsset: { findUnique: jest.fn() },
      $transaction: jest.fn(async (arg: unknown) =>
        Array.isArray(arg) ? Promise.all(arg as Array<Promise<unknown>>) : arg,
      ),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    ownership = {
      assertRelatedEntityOwnership: jest.fn().mockResolvedValue(undefined),
      scopeRelatedEntityFilter: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceCertificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
        { provide: SellerOwnershipService, useValue: ownership },
      ],
    }).compile();

    service = module.get(MarketplaceCertificationsService);
  });

  // ─── create ───────────────────────────────────────────────────────────────

  it('crée une certification PENDING + log audit', async () => {
    prisma.sellerProfile.findUnique.mockResolvedValue({ id: SELLER_ID });
    prisma.certification.create.mockImplementation(({ data }: { data: unknown }) => ({
      id: CERT_ID,
      ...(data as object),
    }));

    const out = await service.create(
      {
        relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
        relatedId: SELLER_ID,
        type: CertificationType.BIO_EU,
        code: 'FR-BIO-01-2026-001',
        issuingBody: 'Ecocert',
      },
      STAFF_ACTOR,
    );

    expect(prisma.sellerProfile.findUnique).toHaveBeenCalledWith({
      where: { id: SELLER_ID },
      select: { id: true },
    });
    expect(ownership.assertRelatedEntityOwnership).toHaveBeenCalled();
    expect(prisma.certification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
          relatedId: SELLER_ID,
          type: CertificationType.BIO_EU,
          verificationStatus: MarketplaceVerificationStatus.PENDING,
          createdByUserId: STAFF_ID,
        }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'MARKETPLACE_CERTIFICATION_CREATED' }),
    );
    expect((out as { id: string }).id).toBe(CERT_ID);
  });

  it('refuse un scope non supporté (MARKETPLACE_OFFER)', async () => {
    await expect(
      service.create(
        {
          relatedType: MarketplaceRelatedEntityType.MARKETPLACE_OFFER,
          relatedId: PRODUCT_ID,
          type: CertificationType.BIO_EU,
        },
        STAFF_ACTOR,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.certification.create).not.toHaveBeenCalled();
  });

  it('refuse OTHER sans code ni issuingBody', async () => {
    prisma.marketplaceProduct.findUnique.mockResolvedValue({ id: PRODUCT_ID });
    await expect(
      service.create(
        {
          relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
          relatedId: PRODUCT_ID,
          type: CertificationType.OTHER,
        },
        STAFF_ACTOR,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('renvoie 403 quand le seller agit hors périmètre', async () => {
    prisma.sellerProfile.findUnique.mockResolvedValue({ id: SELLER_ID });
    ownership.assertRelatedEntityOwnership.mockRejectedValueOnce(
      new ForbiddenException('Profil vendeur hors périmètre'),
    );

    await expect(
      service.create(
        {
          relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
          relatedId: SELLER_ID,
          type: CertificationType.BIO_EU,
          code: 'X',
        },
        SELLER_ACTOR_OUT_OF_SCOPE,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.certification.create).not.toHaveBeenCalled();
  });

  it('refuse une validUntil dans le passé', async () => {
    prisma.sellerProfile.findUnique.mockResolvedValue({ id: SELLER_ID });
    await expect(
      service.create(
        {
          relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
          relatedId: SELLER_ID,
          type: CertificationType.BIO_EU,
          code: 'X',
          validUntil: '2000-01-01',
        },
        SELLER_ACTOR_OWNS,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuse un media de preuve attaché à une autre entité', async () => {
    prisma.sellerProfile.findUnique.mockResolvedValue({ id: SELLER_ID });
    prisma.mediaAsset.findUnique.mockResolvedValue({
      id: 'm1',
      relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
      relatedId: PRODUCT_ID,
    });

    await expect(
      service.create(
        {
          relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
          relatedId: SELLER_ID,
          type: CertificationType.BIO_EU,
          code: 'X',
          documentMediaId: '99999999-9999-9999-9999-999999999999',
        },
        SELLER_ACTOR_OWNS,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // ─── verify / reject ───────────────────────────────────────────────────────

  it('verify : PENDING → VERIFIED + audit', async () => {
    prisma.certification.findUnique.mockResolvedValue({
      id: CERT_ID,
      verificationStatus: MarketplaceVerificationStatus.PENDING,
      validUntil: null,
    });
    prisma.certification.update.mockImplementation(({ data }: { data: unknown }) => ({
      id: CERT_ID,
      ...(data as object),
    }));

    const out = await service.verify(CERT_ID, { note: 'ok' }, STAFF_ID);

    expect(prisma.certification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: CERT_ID },
        data: expect.objectContaining({
          verificationStatus: MarketplaceVerificationStatus.VERIFIED,
          verifiedByUserId: STAFF_ID,
        }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'MARKETPLACE_CERTIFICATION_VERIFIED' }),
    );
    expect((out as { verificationStatus: string }).verificationStatus).toBe('VERIFIED');
  });

  it('verify : refuse une certif déjà expirée', async () => {
    prisma.certification.findUnique.mockResolvedValue({
      id: CERT_ID,
      verificationStatus: MarketplaceVerificationStatus.PENDING,
      validUntil: new Date('2000-01-01'),
    });
    await expect(service.verify(CERT_ID, {}, STAFF_ID)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('reject : passe en REJECTED + stocke rejectionReason', async () => {
    prisma.certification.findUnique.mockResolvedValue({
      id: CERT_ID,
      verificationStatus: MarketplaceVerificationStatus.PENDING,
    });
    prisma.certification.update.mockImplementation(({ data }: { data: unknown }) => ({
      id: CERT_ID,
      ...(data as object),
    }));

    await service.reject(CERT_ID, { reason: 'Code introuvable au registre' }, STAFF_ID);

    expect(prisma.certification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          verificationStatus: MarketplaceVerificationStatus.REJECTED,
          rejectionReason: 'Code introuvable au registre',
        }),
      }),
    );
  });

  it("verify d'une certif inexistante → 404", async () => {
    prisma.certification.findUnique.mockResolvedValue(null);
    await expect(service.verify(CERT_ID, {}, STAFF_ID)).rejects.toBeInstanceOf(NotFoundException);
  });

  // ─── update : remise en PENDING ───────────────────────────────────────────

  it('update sur certif VERIFIED + champ factuel modifié → repasse PENDING', async () => {
    const existing = {
      id: CERT_ID,
      relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
      relatedId: SELLER_ID,
      verificationStatus: MarketplaceVerificationStatus.VERIFIED,
      code: 'OLD-CODE',
      issuingBody: 'Ecocert',
      issuedAt: null,
      validFrom: null,
      validUntil: null,
    };
    prisma.certification.findUnique.mockResolvedValue(existing);
    prisma.certification.update.mockImplementation(({ data }: { data: unknown }) => ({
      ...existing,
      ...(data as object),
    }));

    const out = await service.update(CERT_ID, { code: 'NEW-CODE' }, SELLER_ACTOR_OWNS);

    expect(prisma.certification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: 'NEW-CODE',
          verificationStatus: MarketplaceVerificationStatus.PENDING,
          rejectionReason: null,
        }),
      }),
    );
    expect((out as { verificationStatus: string }).verificationStatus).toBe('PENDING');
  });

  // ─── findPublic ───────────────────────────────────────────────────────────

  it('findPublic : applique VERIFIED + validUntil > now', async () => {
    prisma.certification.findMany.mockResolvedValue([]);
    await service.findPublic(MarketplaceRelatedEntityType.SELLER_PROFILE, SELLER_ID);

    const where = (prisma.certification.findMany.mock.calls[0]?.[0] as { where: unknown }).where as {
      verificationStatus: string;
      OR: Array<{ validUntil?: unknown }>;
    };
    expect(where.verificationStatus).toBe(MarketplaceVerificationStatus.VERIFIED);
    expect(where.OR).toEqual(
      expect.arrayContaining([{ validUntil: null }, expect.objectContaining({ validUntil: expect.any(Object) })]),
    );
  });

  it('findPublic : refuse silencieusement un scope hors MVP', async () => {
    const out = await service.findPublic(
      MarketplaceRelatedEntityType.MARKETPLACE_OFFER,
      PRODUCT_ID,
    );
    expect(out).toEqual([]);
    expect(prisma.certification.findMany).not.toHaveBeenCalled();
  });
});
