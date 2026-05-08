// Search controller — 4 specs.

import { Test, TestingModule } from '@nestjs/testing';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SearchIndexerService } from './search-indexer.service';

const searchProductsMock = jest.fn().mockResolvedValue({
  data: [{ id: 'p1' }],
  meta: { total: 1, page: 1, limit: 24, totalPages: 1, backend: 'meilisearch' },
});

const searchSellersMock = jest.fn().mockResolvedValue({
  data: [{ id: 's1' }],
  meta: { total: 1, page: 1, limit: 24, totalPages: 1, backend: 'meilisearch' },
});

const reindexAllMock = jest.fn().mockResolvedValue({ products: 10, sellers: 3 });

describe('SearchController', () => {
  let controller: SearchController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        {
          provide: SearchService,
          useValue: {
            searchProducts: searchProductsMock,
            searchSellers: searchSellersMock,
          },
        },
        {
          provide: SearchIndexerService,
          useValue: {
            reindexAll: reindexAllMock,
          },
        },
      ],
    }).compile();

    controller = module.get(SearchController);
  });

  it('searchProducts delegates to SearchService with parsed params', async () => {
    const result = await controller.searchProducts('vanilla', 'spices', undefined, undefined, undefined, '50', undefined, '2', '10', 'createdAt:desc');
    expect(searchProductsMock).toHaveBeenCalledWith({
      q: 'vanilla',
      category: 'spices',
      country: undefined,
      certifications: undefined,
      availabilityMonth: undefined,
      moqMax: 50,
      availableOnly: false,
      page: 2,
      limit: 10,
      sort: 'createdAt:desc',
    });
    expect(result.data).toHaveLength(1);
  });

  it('searchSellers delegates to SearchService', async () => {
    const result = await controller.searchSellers('seller', 'MG', undefined, '1', '20');
    expect(searchSellersMock).toHaveBeenCalledWith({
      q: 'seller',
      country: 'MG',
      region: undefined,
      page: 1,
      limit: 20,
    });
    expect(result.data).toHaveLength(1);
  });

  it('reindex delegates to SearchIndexerService', async () => {
    const result = await controller.reindex();
    expect(reindexAllMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true, products: 10, sellers: 3 });
  });

  it('searchProducts handles missing optional params', async () => {
    await controller.searchProducts(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined);
    expect(searchProductsMock).toHaveBeenCalledWith({
      q: undefined,
      category: undefined,
      country: undefined,
      certifications: undefined,
      availabilityMonth: undefined,
      moqMax: undefined,
      availableOnly: false,
      page: undefined,
      limit: undefined,
      sort: undefined,
    });
  });
});
