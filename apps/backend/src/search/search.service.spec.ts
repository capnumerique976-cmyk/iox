// MeiliSearch search service — 8 specs.
// Tests MeiliSearch path + Postgres fallback + error recovery.

import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { PrismaService } from '../database/prisma.service';
import {
  MEILISEARCH_CLIENT,
  type MeiliSearchClientWrapper,
} from './meilisearch-client.factory';

function makeMeiliMock(opts: { configured?: boolean } = {}): MeiliSearchClientWrapper {
  return {
    isConfigured: () => opts.configured ?? true,
    client: () => ({
      index: jest.fn().mockReturnValue({
        search: jest.fn().mockResolvedValue({
          hits: [{ id: 'p1', commercialName: 'Vanilla' }],
          estimatedTotalHits: 1,
          totalHits: 1,
          processingTimeMs: 5,
        }),
        addDocuments: jest.fn().mockResolvedValue({}),
        updateSettings: jest.fn().mockResolvedValue({}),
      }),
    }),
  };
}

function makePrismaMock() {
  return {
    marketplaceProduct: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'p1',
          commercialName: 'Vanilla',
          subtitle: null,
          slug: 'vanilla',
          originCountry: 'MG',
          originRegion: null,
          publicationStatus: 'PUBLISHED',
          exportReadinessStatus: 'READY',
          qualityAttributes: [],
          sellerProfileId: 's1',
          createdAt: new Date(),
        },
      ]),
      count: jest.fn().mockResolvedValue(1),
    },
    sellerProfile: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 's1',
          publicDisplayName: 'Seller A',
          slug: 'seller-a',
          descriptionShort: null,
          country: 'MG',
          region: null,
          status: 'APPROVED',
          createdAt: new Date(),
        },
      ]),
      count: jest.fn().mockResolvedValue(1),
    },
    $transaction: jest.fn().mockImplementation((args: unknown[]) => Promise.all(args)),
  };
}

describe('SearchService', () => {
  let service: SearchService;
  let meiliMock: MeiliSearchClientWrapper;
  let prismaMock: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    meiliMock = makeMeiliMock();
    prismaMock = makePrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: MEILISEARCH_CLIENT, useValue: meiliMock },
      ],
    }).compile();

    service = module.get(SearchService);
  });

  // ── Products ───────────────────────────────────────────

  it('searchProducts returns MeiliSearch results when configured', async () => {
    const result = await service.searchProducts({ q: 'vanilla' });
    expect(result.meta.backend).toBe('meilisearch');
    expect(result.data).toHaveLength(1);
    expect(result.meta.processingTimeMs).toBe(5);
  });

  it('searchProducts falls back to Postgres when MeiliSearch not configured', async () => {
    meiliMock = makeMeiliMock({ configured: false });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: MEILISEARCH_CLIENT, useValue: meiliMock },
      ],
    }).compile();

    const svc = module.get(SearchService);
    const result = await svc.searchProducts({ q: 'vanilla' });
    expect(result.meta.backend).toBe('postgres');
  });

  it('searchProducts falls back to Postgres on MeiliSearch error', async () => {
    const brokenMeili: MeiliSearchClientWrapper = {
      isConfigured: () => true,
      client: () => ({
        index: () => ({
          search: jest.fn().mockRejectedValue(new Error('connection refused')),
          addDocuments: jest.fn(),
          updateSettings: jest.fn(),
        }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: MEILISEARCH_CLIENT, useValue: brokenMeili },
      ],
    }).compile();

    const svc = module.get(SearchService);
    const result = await svc.searchProducts({ q: 'vanilla' });
    expect(result.meta.backend).toBe('postgres');
  });

  it('searchProducts respects pagination params', async () => {
    const result = await service.searchProducts({ page: 2, limit: 10 });
    expect(result.meta.page).toBe(2);
    expect(result.meta.limit).toBe(10);
  });

  // ── Sellers ────────────────────────────────────────────

  it('searchSellers returns MeiliSearch results when configured', async () => {
    const result = await service.searchSellers({ q: 'seller' });
    expect(result.meta.backend).toBe('meilisearch');
    expect(result.data).toHaveLength(1);
  });

  it('searchSellers falls back to Postgres when MeiliSearch not configured', async () => {
    meiliMock = makeMeiliMock({ configured: false });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: MEILISEARCH_CLIENT, useValue: meiliMock },
      ],
    }).compile();

    const svc = module.get(SearchService);
    const result = await svc.searchSellers({ q: 'seller' });
    expect(result.meta.backend).toBe('postgres');
  });

  it('searchSellers falls back on MeiliSearch error', async () => {
    const brokenMeili: MeiliSearchClientWrapper = {
      isConfigured: () => true,
      client: () => ({
        index: () => ({
          search: jest.fn().mockRejectedValue(new Error('timeout')),
          addDocuments: jest.fn(),
          updateSettings: jest.fn(),
        }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: MEILISEARCH_CLIENT, useValue: brokenMeili },
      ],
    }).compile();

    const svc = module.get(SearchService);
    const result = await svc.searchSellers({ q: 'seller' });
    expect(result.meta.backend).toBe('postgres');
  });

  it('searchProducts limits page size to 100', async () => {
    const result = await service.searchProducts({ limit: 500 });
    expect(result.meta.limit).toBe(100);
  });
});
