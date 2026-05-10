// Spec — SearchProcessor (Mandat 53)

import { SearchProcessor } from './search.processor';
import { SearchIndexerService } from '../../search/search-indexer.service';
import { SEARCH_JOB_NAMES } from '../queue.constants';
import type { Job } from 'bullmq';

const makeJob = (name: string, data: object): Job =>
  ({ id: 'job-1', name, data } as unknown as Job);

describe('SearchProcessor', () => {
  let processor: SearchProcessor;
  let indexer: { indexProduct: jest.Mock; indexSeller: jest.Mock };

  beforeEach(() => {
    indexer = {
      indexProduct: jest.fn().mockResolvedValue(true),
      indexSeller: jest.fn().mockResolvedValue(true),
    };
    processor = new SearchProcessor(indexer as unknown as SearchIndexerService);
  });

  it('calls indexProduct for INDEX_PRODUCT job', async () => {
    await processor.process(
      makeJob(SEARCH_JOB_NAMES.INDEX_PRODUCT, { entityId: 'prod-42' }),
    );
    expect(indexer.indexProduct).toHaveBeenCalledWith('prod-42');
    expect(indexer.indexSeller).not.toHaveBeenCalled();
  });

  it('calls indexSeller for INDEX_SELLER job', async () => {
    await processor.process(
      makeJob(SEARCH_JOB_NAMES.INDEX_SELLER, { entityId: 'seller-7' }),
    );
    expect(indexer.indexSeller).toHaveBeenCalledWith('seller-7');
    expect(indexer.indexProduct).not.toHaveBeenCalled();
  });

  it('propagates error from indexProduct (triggers BullMQ retry)', async () => {
    indexer.indexProduct.mockRejectedValue(new Error('MeiliSearch down'));

    await expect(
      processor.process(makeJob(SEARCH_JOB_NAMES.INDEX_PRODUCT, { entityId: 'prod-1' })),
    ).rejects.toThrow('MeiliSearch down');
  });

  it('propagates error from indexSeller (triggers BullMQ retry)', async () => {
    indexer.indexSeller.mockRejectedValue(new Error('MeiliSearch timeout'));

    await expect(
      processor.process(makeJob(SEARCH_JOB_NAMES.INDEX_SELLER, { entityId: 'seller-1' })),
    ).rejects.toThrow('MeiliSearch timeout');
  });

  it('does nothing for unknown job names', async () => {
    await processor.process(makeJob('unknown', { entityId: 'x' }));
    expect(indexer.indexProduct).not.toHaveBeenCalled();
    expect(indexer.indexSeller).not.toHaveBeenCalled();
  });
});
