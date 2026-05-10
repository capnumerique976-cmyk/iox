// Spec — SearchQueueService (Mandat 53)

import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { SearchQueueService } from './search-queue.service';
import { QUEUE_NAMES, SEARCH_JOB_NAMES } from '../queue.constants';

describe('SearchQueueService', () => {
  let service: SearchQueueService;
  let queueAdd: jest.Mock;

  beforeEach(async () => {
    queueAdd = jest.fn().mockResolvedValue({ id: 'job-2' });

    const module = await Test.createTestingModule({
      providers: [
        SearchQueueService,
        {
          provide: getQueueToken(QUEUE_NAMES.SEARCH),
          useValue: { add: queueAdd },
        },
      ],
    }).compile();

    service = module.get(SearchQueueService);
  });

  it('enqueueProduct adds INDEX_PRODUCT job with stable jobId', async () => {
    await service.enqueueProduct('prod-99');

    expect(queueAdd).toHaveBeenCalledWith(
      SEARCH_JOB_NAMES.INDEX_PRODUCT,
      { entityId: 'prod-99' },
      expect.objectContaining({
        jobId: `${SEARCH_JOB_NAMES.INDEX_PRODUCT}:prod-99`,
        attempts: 3,
      }),
    );
  });

  it('enqueueSeller adds INDEX_SELLER job with stable jobId', async () => {
    await service.enqueueSeller('seller-42');

    expect(queueAdd).toHaveBeenCalledWith(
      SEARCH_JOB_NAMES.INDEX_SELLER,
      { entityId: 'seller-42' },
      expect.objectContaining({
        jobId: `${SEARCH_JOB_NAMES.INDEX_SELLER}:seller-42`,
        attempts: 3,
      }),
    );
  });

  it('does not throw when queue.add fails (non-blocking)', async () => {
    queueAdd.mockRejectedValue(new Error('Redis unavailable'));

    await expect(service.enqueueProduct('prod-1')).resolves.not.toThrow();
    await expect(service.enqueueSeller('seller-1')).resolves.not.toThrow();
  });
});
