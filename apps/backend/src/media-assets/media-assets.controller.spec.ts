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
