// MP-MEDIA-1 LOT 1 — Couverture controller (focus sur reorder).
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { MediaAssetsController } from './media-assets.controller';
import { MediaAssetsService } from './media-assets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole, RequestUser } from '@iox/shared';

describe('MediaAssetsController — reorder', () => {
  let controller: MediaAssetsController;
  let service: { reorder: jest.Mock };

  beforeEach(async () => {
    service = { reorder: jest.fn() };
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [MediaAssetsController],
      providers: [{ provide: MediaAssetsService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = moduleRef.get(MediaAssetsController);
  });

  const actor: RequestUser = {
    id: 'actor-1',
    email: 'a@a',
    role: UserRole.MARKETPLACE_SELLER,
    sellerProfileIds: [],
    companyIds: [],
  };

  it('reorder happy path : délègue au service.reorder avec le DTO + actor', async () => {
    service.reorder.mockResolvedValue({ count: 2 });
    const dto = {
      items: [
        { id: 'm1', sortOrder: 0 },
        { id: 'm2', sortOrder: 1 },
      ],
    };
    const res = await controller.reorder(dto, actor);
    expect(res).toEqual({ count: 2 });
    expect(service.reorder).toHaveBeenCalledWith(dto, actor.id, actor);
  });

  it('reorder service throws → controller propage 403', async () => {
    service.reorder.mockRejectedValue(new ForbiddenException('cross-entité interdit'));
    const dto = { items: [{ id: 'm1', sortOrder: 0 }] };
    await expect(controller.reorder(dto, actor)).rejects.toThrow(ForbiddenException);
  });
});

// MP-MEDIA-1 LOT 3 — couverture filtres list + reject reason.
describe('MediaAssetsController — list filters + reject', () => {
  let controller: MediaAssetsController;
  let service: {
    findAll: jest.Mock;
    reject: jest.Mock;
    approve: jest.Mock;
  };

  const adminActor: RequestUser = {
    id: 'admin-1',
    email: 'admin@x',
    role: UserRole.ADMIN,
    sellerProfileIds: [],
    companyIds: [],
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      reject: jest.fn(),
      approve: jest.fn(),
    };
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [MediaAssetsController],
      providers: [{ provide: MediaAssetsService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = moduleRef.get(MediaAssetsController);
  });

  it('findAll : passe filtres status + relatedType + mediaType au service', async () => {
    service.findAll.mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
    const query = {
      moderationStatus: ['PENDING', 'REJECTED'],
      relatedType: 'MARKETPLACE_PRODUCT',
      mediaType: 'VIDEO',
      page: 1,
      limit: 20,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    await controller.findAll(query, adminActor);
    expect(service.findAll).toHaveBeenCalledWith(query, adminActor);
  });

  it('findAll : pagination préservée', async () => {
    service.findAll.mockResolvedValue({ data: [], meta: { total: 50, page: 3, limit: 10, totalPages: 5 } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { page: 3, limit: 10, moderationStatus: 'PENDING' };
    const res = await controller.findAll(query, adminActor);
    expect(res.meta.page).toBe(3);
    expect(res.meta.limit).toBe(10);
  });

  it('findAll : permissions seller scopé via service.findAll(actor)', async () => {
    service.findAll.mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
    const sellerActor: RequestUser = {
      id: 'seller-1',
      email: 's@x',
      role: UserRole.MARKETPLACE_SELLER,
      sellerProfileIds: ['sp-1'],
      companyIds: [],
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await controller.findAll({} as any, sellerActor);
    // Service receives actor → service applique scopeRelatedEntityFilter en interne
    expect(service.findAll).toHaveBeenCalledWith({}, sellerActor);
  });

  it('findAll : filtres combinés relatedType + mediaType + status', async () => {
    service.findAll.mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {
      relatedType: 'MARKETPLACE_PRODUCT',
      mediaType: 'IMAGE',
      moderationStatus: 'APPROVED',
    };
    await controller.findAll(query, adminActor);
    expect(service.findAll.mock.calls[0][0]).toMatchObject({
      relatedType: 'MARKETPLACE_PRODUCT',
      mediaType: 'IMAGE',
      moderationStatus: 'APPROVED',
    });
  });

  it('reject : transmet reason au service', async () => {
    service.reject.mockResolvedValue({ id: 'm1', moderationStatus: 'REJECTED' });
    const dto = { reason: 'Image floue' };
    await controller.reject('m1', dto, adminActor);
    expect(service.reject).toHaveBeenCalledWith('m1', dto, adminActor.id);
  });

  it('approve : délègue au service avec actor.id', async () => {
    service.approve.mockResolvedValue({ id: 'm1', moderationStatus: 'APPROVED' });
    await controller.approve('m1', adminActor);
    expect(service.approve).toHaveBeenCalledWith('m1', adminActor.id);
  });
});
