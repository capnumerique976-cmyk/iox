// SearchProcessor — BullMQ worker for the iox.search queue.
//
// Pulls index_product / index_seller jobs and calls SearchIndexerService.
// Errors are logged and thrown for BullMQ retry; they NEVER propagate to
// the caller (user request was already completed at job-enqueue time).

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SearchIndexerService } from '../../search/search-indexer.service';
import { QUEUE_NAMES, SEARCH_JOB_NAMES } from '../queue.constants';
import type { SearchIndexJobPayload } from '../jobs/search.job';

@Processor(QUEUE_NAMES.SEARCH)
export class SearchProcessor extends WorkerHost {
  private readonly logger = new Logger(SearchProcessor.name);

  constructor(private readonly indexer: SearchIndexerService) {
    super();
  }

  async process(job: Job<SearchIndexJobPayload>): Promise<void> {
    const { entityId } = job.data;

    switch (job.name) {
      case SEARCH_JOB_NAMES.INDEX_PRODUCT: {
        this.logger.log(`SearchProcessor: index product job=${job.id} entityId=${entityId}`);
        const indexed = await this.indexer.indexProduct(entityId);
        if (indexed) {
          this.logger.log(`SearchProcessor: product indexed job=${job.id} entityId=${entityId}`);
        }
        break;
      }

      case SEARCH_JOB_NAMES.INDEX_SELLER: {
        this.logger.log(`SearchProcessor: index seller job=${job.id} entityId=${entityId}`);
        const indexed = await this.indexer.indexSeller(entityId);
        if (indexed) {
          this.logger.log(`SearchProcessor: seller indexed job=${job.id} entityId=${entityId}`);
        }
        break;
      }

      default:
        this.logger.warn(`SearchProcessor: unknown job name ${job.name}`);
    }
  }
}
