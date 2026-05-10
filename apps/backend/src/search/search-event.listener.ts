// SearchEventListener — subscribes to domain events and enqueues search index jobs.
//
// Mandat 53: delegates to SearchQueueService (BullMQ) instead of calling
// SearchIndexerService directly. This adds retry capability and decouples
// the indexing latency from the request cycle.
//
// Fire-and-forget: errors from queue enqueue are logged and swallowed by
// SearchQueueService.enqueue() — the user request is never blocked.

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SearchQueueService } from '../queue/services/search-queue.service';
import {
  PRODUCT_CREATED,
  PRODUCT_UPDATED,
  PRODUCT_STATUS_CHANGED,
  SELLER_CREATED,
  SELLER_UPDATED,
  SELLER_STATUS_CHANGED,
  type SearchEntityEvent,
} from './search.events';

@Injectable()
export class SearchEventListener {
  private readonly logger = new Logger(SearchEventListener.name);

  constructor(private readonly searchQueue: SearchQueueService) {}

  @OnEvent(PRODUCT_CREATED)
  @OnEvent(PRODUCT_UPDATED)
  @OnEvent(PRODUCT_STATUS_CHANGED)
  async handleProductChange(event: SearchEntityEvent): Promise<void> {
    this.logger.debug(`SearchEventListener: product event entityId=${event.entityId}`);
    try {
      await this.searchQueue.enqueueProduct(event.entityId);
    } catch (err) {
      this.logger.error(
        `SearchEventListener: failed to enqueue product ${event.entityId}: ${(err as Error).message}`,
      );
    }
  }

  @OnEvent(SELLER_CREATED)
  @OnEvent(SELLER_UPDATED)
  @OnEvent(SELLER_STATUS_CHANGED)
  async handleSellerChange(event: SearchEntityEvent): Promise<void> {
    this.logger.debug(`SearchEventListener: seller event entityId=${event.entityId}`);
    try {
      await this.searchQueue.enqueueSeller(event.entityId);
    } catch (err) {
      this.logger.error(
        `SearchEventListener: failed to enqueue seller ${event.entityId}: ${(err as Error).message}`,
      );
    }
  }
}
