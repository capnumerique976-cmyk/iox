// SearchQueueService — pushes search index jobs onto iox.search BullMQ queue.
//
// SearchEventListener calls this instead of SearchIndexerService directly.
// The processor handles the actual indexing + retry.

import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, SEARCH_JOB_NAMES } from '../queue.constants';
import type { SearchIndexJobPayload } from '../jobs/search.job';

/** Retry policy: 3 attempts with exponential backoff (1s, 2s, 4s). */
const SEARCH_JOB_OPTS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 1000 },
  removeOnComplete: { count: 200 },
  removeOnFail: { count: 100 },
  // Deduplicate: if a job for the same entity is already waiting, skip.
  jobId: undefined as string | undefined,
};

@Injectable()
export class SearchQueueService {
  private readonly logger = new Logger(SearchQueueService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.SEARCH)
    private readonly queue: Queue<SearchIndexJobPayload>,
  ) {}

  async enqueueProduct(entityId: string): Promise<void> {
    await this.enqueue(SEARCH_JOB_NAMES.INDEX_PRODUCT, entityId);
  }

  async enqueueSeller(entityId: string): Promise<void> {
    await this.enqueue(SEARCH_JOB_NAMES.INDEX_SELLER, entityId);
  }

  private async enqueue(jobName: string, entityId: string): Promise<void> {
    try {
      const opts = {
        ...SEARCH_JOB_OPTS,
        // Deduplicate: stable jobId per entity — if already queued, BullMQ skips.
        jobId: `${jobName}:${entityId}`,
      };
      const job = await this.queue.add(jobName, { entityId }, opts);
      this.logger.log(
        `SearchQueueService: enqueued job=${job.id} name=${jobName} entityId=${entityId}`,
      );
    } catch (err) {
      // Enqueue failure must not crash the calling request.
      this.logger.error(
        `SearchQueueService: failed to enqueue ${jobName} entityId=${entityId} error=${(err as Error).message}`,
      );
    }
  }
}
