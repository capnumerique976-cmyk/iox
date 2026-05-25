// MP-NOTIF-2 phase 2 — Couverture du controller unsubscribe.

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { EmailUnsubscribeType } from '@iox/shared';
import { UnsubscribeController } from './unsubscribe.controller';
import { UnsubscribeService, UnsubscribeTokenError } from './unsubscribe.service';

describe('UnsubscribeController', () => {
  let controller: UnsubscribeController;
  let service: {
    validateToken: jest.Mock;
    register: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      validateToken: jest.fn(),
      register: jest.fn().mockResolvedValue(undefined),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UnsubscribeController],
      providers: [{ provide: UnsubscribeService, useValue: service }],
    }).compile();
    controller = module.get(UnsubscribeController);
  });

  it('GET sans token → 400 INVALID_TOKEN', async () => {
    await expect(controller.handle(undefined)).rejects.toThrow(BadRequestException);
  });

  it('GET token vide → 400 INVALID_TOKEN', async () => {
    await expect(controller.handle('   ')).rejects.toThrow(BadRequestException);
  });

  it('GET token invalide → 400 + code INVALID_TOKEN', async () => {
    service.validateToken.mockImplementation(() => {
      throw new UnsubscribeTokenError('INVALID_TOKEN', 'jwt malformed');
    });
    await expect(controller.handle('xxx')).rejects.toThrow(BadRequestException);
    try {
      await controller.handle('xxx');
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      const response = (err as BadRequestException).getResponse() as {
        code: string;
      };
      expect(response.code).toBe('INVALID_TOKEN');
    }
  });

  it('GET token expiré → 400 + code TOKEN_EXPIRED', async () => {
    service.validateToken.mockImplementation(() => {
      throw new UnsubscribeTokenError('TOKEN_EXPIRED', 'jwt expired');
    });
    try {
      await controller.handle('yyy');
    } catch (err) {
      const response = (err as BadRequestException).getResponse() as { code: string };
      expect(response.code).toBe('TOKEN_EXPIRED');
    }
  });

  it('GET token valide → 200 JSON + register appelé', async () => {
    service.validateToken.mockReturnValue({
      email: 'a@x.test',
      type: EmailUnsubscribeType.RFQ_NOTIFICATIONS,
    });
    const out = await controller.handle('valid.jwt.here');
    expect(out).toMatchObject({
      email: 'a@x.test',
      type: EmailUnsubscribeType.RFQ_NOTIFICATIONS,
    });
    expect(typeof out.unsubscribedAt).toBe('string');
    expect(service.register).toHaveBeenCalledWith(
      'a@x.test',
      EmailUnsubscribeType.RFQ_NOTIFICATIONS,
      undefined,
      'one-click',
    );
  });
});
