import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { OpsMetricsService } from './ops-metrics.service';
import { PrismaService } from '../database/prisma.service';
import { MetricsService } from '../metrics/metrics.service';

/**
 * Tests OpsMetricsService :
 *  - tick() exécute bien les 13 count() Prisma et publie les gauges attendues
 *  - une exception Prisma est absorbée (warn + pas de crash)
 *  - onModuleInit ne démarre pas de timer quand NODE_ENV=test
 */
describe('OpsMetricsService', () => {
  let service: OpsMetricsService;
  let prisma: {
    sellerProfile: { count: jest.Mock };
    marketplaceProduct: { count: jest.Mock };
    marketplaceOffer: { count: jest.Mock };
    marketplaceReviewQueue: { count: jest.Mock };
    marketplaceDocument: { count: jest.Mock };
    quoteRequest: { count: jest.Mock };
  };
  let metrics: { setGauge: jest.Mock };

  beforeEach(async () => {
    prisma = {
      sellerProfile: { count: jest.fn().mockResolvedValue(0) },
      marketplaceProduct: { count: jest.fn().mockResolvedValue(0) },
      marketplaceOffer: { count: jest.fn().mockResolvedValue(0) },
      marketplaceReviewQueue: { count: jest.fn().mockResolvedValue(0) },
      marketplaceDocument: { count: jest.fn().mockResolvedValue(0) },
      quoteRequest: { count: jest.fn().mockResolvedValue(0) },
    };
    metrics = { setGauge: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        OpsMetricsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MetricsService, useValue: metrics },
      ],
    }).compile();

    service = moduleRef.get(OpsMetricsService);
  });

  it('tick() publie les 14 gauges attendues en 1 rafale', async () => {
    // Retours spécifiques pour différencier les appels.
    prisma.sellerProfile.count
      .mockResolvedValueOnce(100) // total
      .mockResolvedValueOnce(7) //  pending
      .mockResolvedValueOnce(90) // approved
      .mockResolvedValueOnce(3); //  suspended
    prisma.marketplaceProduct.count
      .mockResolvedValueOnce(42) // published
      .mockResolvedValueOnce(5); //  in_review
    prisma.marketplaceOffer.count
      .mockResolvedValueOnce(30) // published
      .mockResolvedValueOnce(2); //  in_review
    prisma.marketplaceReviewQueue.count.mockResolvedValueOnce(9);
    prisma.marketplaceDocument.count
      .mockResolvedValueOnce(4) // pending
      .mockResolvedValueOnce(1); // rejected
    prisma.quoteRequest.count
      .mockResolvedValueOnce(12) // new
      .mockResolvedValueOnce(6); //  negotiating

    await service.tick();

    // 13 count() Prisma en tout
    const totalCalls =
      prisma.sellerProfile.count.mock.calls.length +
      prisma.marketplaceProduct.count.mock.calls.length +
      prisma.marketplaceOffer.count.mock.calls.length +
      prisma.marketplaceReviewQueue.count.mock.calls.length +
      prisma.marketplaceDocument.count.mock.calls.length +
      prisma.quoteRequest.count.mock.calls.length;
    expect(totalCalls).toBe(13);

    // Gauges : 1 total + 3 sellers_by_status + 4 publications + 1 review
    // + 2 documents + 2 rfq + 1 last_refresh = 14 appels setGauge.
    expect(metrics.setGauge).toHaveBeenCalledTimes(14);

    // Quelques vérifications ponctuelles (valeurs + labels).
    expect(metrics.setGauge).toHaveBeenCalledWith(
      'iox_marketplace_sellers_total',
      100,
      {},
      expect.any(String),
    );
    expect(metrics.setGauge).toHaveBeenCalledWith(
      'iox_marketplace_sellers_by_status',
      7,
      { status: 'pending_review' },
      expect.any(String),
    );
    expect(metrics.setGauge).toHaveBeenCalledWith(
      'iox_marketplace_sellers_by_status',
      3,
      { status: 'suspended' },
    );
    expect(metrics.setGauge).toHaveBeenCalledWith(
      'iox_marketplace_publications',
      42,
      { entity: 'product', status: 'published' },
      expect.any(String),
    );
    expect(metrics.setGauge).toHaveBeenCalledWith(
      'iox_marketplace_review_pending',
      9,
      {},
      expect.any(String),
    );
    expect(metrics.setGauge).toHaveBeenCalledWith(
      'iox_marketplace_documents',
      1,
      { verification_status: 'rejected' },
    );
    expect(metrics.setGauge).toHaveBeenCalledWith(
      'iox_marketplace_rfq',
      12,
      { status: 'new' },
      expect.any(String),
    );
    // Timestamp du dernier refresh (nom seul, valeur numérique).
    expect(metrics.setGauge).toHaveBeenCalledWith(
      'iox_marketplace_metrics_last_refresh_seconds',
      expect.any(Number),
      {},
      expect.any(String),
    );
  });

  it('tick() absorbe une exception Prisma sans crasher et log un warn', async () => {
    prisma.sellerProfile.count.mockRejectedValueOnce(new Error('DB down'));
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    await expect(service.tick()).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Ops metrics tick failed'),
    );
    // Rien n'a été publié côté metrics puisque la rafale a échoué tôt.
    expect(metrics.setGauge).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('onModuleInit ne démarre pas de timer en NODE_ENV=test', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    const setIntervalSpy = jest.spyOn(global, 'setInterval');

    service.onModuleInit();

    expect(setIntervalSpy).not.toHaveBeenCalled();

    setIntervalSpy.mockRestore();
    process.env.NODE_ENV = prev;
  });
});
