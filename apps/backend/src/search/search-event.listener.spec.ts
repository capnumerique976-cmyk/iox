// Spec — SearchEventListener (Mandat 53: delegates to SearchQueueService)

import { SearchEventListener } from './search-event.listener';
import { SearchQueueService } from '../queue/services/search-queue.service';

describe('SearchEventListener', () => {
  let listener: SearchEventListener;
  let searchQueue: { enqueueProduct: jest.Mock; enqueueSeller: jest.Mock };

  beforeEach(() => {
    searchQueue = {
      enqueueProduct: jest.fn().mockResolvedValue(undefined),
      enqueueSeller: jest.fn().mockResolvedValue(undefined),
    };
    listener = new SearchEventListener(searchQueue as unknown as SearchQueueService);
  });

  describe('handleProductChange', () => {
    it('enqueues product index job with entityId', async () => {
      await listener.handleProductChange({ entityId: 'prod-1' });
      expect(searchQueue.enqueueProduct).toHaveBeenCalledWith('prod-1');
    });

    it('does not throw when queue enqueue fails', async () => {
      searchQueue.enqueueProduct.mockRejectedValue(new Error('Redis unavailable'));
      await expect(
        listener.handleProductChange({ entityId: 'prod-1' }),
      ).resolves.not.toThrow();
    });
  });

  describe('handleSellerChange', () => {
    it('enqueues seller index job with entityId', async () => {
      await listener.handleSellerChange({ entityId: 'seller-1' });
      expect(searchQueue.enqueueSeller).toHaveBeenCalledWith('seller-1');
    });

    it('does not throw when queue enqueue fails', async () => {
      searchQueue.enqueueSeller.mockRejectedValue(new Error('Redis unavailable'));
      await expect(
        listener.handleSellerChange({ entityId: 'seller-1' }),
      ).resolves.not.toThrow();
    });
  });
});
