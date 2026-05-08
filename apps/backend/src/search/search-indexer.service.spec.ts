// MeiliSearch indexer — 5 specs.

import { Test, TestingModule } from '@nestjs/testing';
import { SearchIndexerService } from './search-indexer.service';
import { PrismaService } from '../database/prisma.service';
import {
  MEILISEARCH_CLIENT,
  type MeiliSearchClientWrapper,
} from './meilisearch-client.factory';

const addDocumentsMock = jest.fn().mockResolvedValue({});
const updateSettingsMock = jest.fn().mockResolvedValue({});
const searchMock = jest.fn().mockResolvedValue({ hits: [], estimatedTotalHits: 0 });

function makeMeiliMock(opts: { configured?: boolean } = {}): MeiliSearchClientWrapper {
  return {
    isConfigured: () => opts.configured ?? true,
    client: () => ({
      index: jest.fn().mockReturnValue({
        search: searchMock,
        addDocuments: addDocumentsMock,
        updateSettings: updateSettingsMock,
      }),
    }),
  };
}

const NOW = new Date('2026-01-15T10:00:00Z');

function makePrismaMock() {
  return {
    marketplaceProduct: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'p1',
        commercialName: 'Vanilla',
        subtitle: null,
        slug: 'vanilla',
        varietySpecies: null,
        productionMethod: null,
        descriptionShort: null,
        originCountry: 'MG',
        originRegion: null,
        categoryId: null,
        category: null,
        qualityAttributes: [],
        temperatureRequirements: null,
        availabilityMonths: [],
        isYearRound: true,
        minimumOrderQuantity: null,
        publicationStatus: 'PUBLISHED',
        exportReadinessStatus: 'READY',
        sellerProfileId: 's1',
        sellerProfile: { publicDisplayName: 'Seller A', status: 'APPROVED' },
        searchIndexHash: null,
        searchIndexedAt: null,
        createdAt: NOW,
      }),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
    },
    sellerProfile: {
      findUnique: jest.fn().mockResolvedValue({
        id: 's1',
        publicDisplayName: 'Seller A',
        slug: 'seller-a',
        descriptionShort: null,
        country: 'MG',
        region: null,
        status: 'APPROVED',
        searchIndexHash: null,
        searchIndexedAt: null,
        createdAt: NOW,
      }),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
    },
  };
}

describe('SearchIndexerService', () => {
  let service: SearchIndexerService;
  let meiliMock: MeiliSearchClientWrapper;
  let prismaMock: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    jest.clearAllMocks();
    meiliMock = makeMeiliMock();
    prismaMock = makePrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchIndexerService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: MEILISEARCH_CLIENT, useValue: meiliMock },
      ],
    }).compile();

    service = module.get(SearchIndexerService);
  });

  it('indexProduct sends document to MeiliSearch', async () => {
    const indexed = await service.indexProduct('p1');
    expect(indexed).toBe(true);
    expect(addDocumentsMock).toHaveBeenCalledTimes(1);
    expect(prismaMock.marketplaceProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p1' } }),
    );
  });

  it('indexProduct skips if hash unchanged', async () => {
    // Simulate existing hash match — need to compute the expected hash
    const result = await service.indexProduct('p1');
    expect(result).toBe(true);

    // Get the hash that was written
    const updateCall = prismaMock.marketplaceProduct.update.mock.calls[0][0];
    const savedHash = updateCall.data.searchIndexHash;

    // Reset and set up product with matching hash
    jest.clearAllMocks();
    prismaMock.marketplaceProduct.findUnique.mockResolvedValue({
      id: 'p1',
      commercialName: 'Vanilla',
      subtitle: null,
      slug: 'vanilla',
      varietySpecies: null,
      productionMethod: null,
      descriptionShort: null,
      originCountry: 'MG',
      originRegion: null,
      categoryId: null,
      category: null,
      qualityAttributes: [],
      temperatureRequirements: null,
      availabilityMonths: [],
      isYearRound: true,
      minimumOrderQuantity: null,
      publicationStatus: 'PUBLISHED',
      exportReadinessStatus: 'READY',
      sellerProfileId: 's1',
      sellerProfile: { publicDisplayName: 'Seller A', status: 'APPROVED' },
      searchIndexHash: savedHash,
      searchIndexedAt: NOW,
      createdAt: NOW,
    });

    const skipped = await service.indexProduct('p1');
    expect(skipped).toBe(false);
    expect(addDocumentsMock).not.toHaveBeenCalled();
  });

  it('indexProduct returns false when product not found', async () => {
    prismaMock.marketplaceProduct.findUnique.mockResolvedValue(null);
    const result = await service.indexProduct('nonexistent');
    expect(result).toBe(false);
  });

  it('indexSeller sends document to MeiliSearch', async () => {
    const indexed = await service.indexSeller('s1');
    expect(indexed).toBe(true);
    expect(addDocumentsMock).toHaveBeenCalledTimes(1);
  });

  it('indexProduct returns false when MeiliSearch not configured', async () => {
    meiliMock = makeMeiliMock({ configured: false });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchIndexerService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: MEILISEARCH_CLIENT, useValue: meiliMock },
      ],
    }).compile();

    const svc = module.get(SearchIndexerService);
    const result = await svc.indexProduct('p1');
    expect(result).toBe(false);
  });
});
