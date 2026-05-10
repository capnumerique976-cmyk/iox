// EmailQueueService — pushes email jobs onto iox.email BullMQ queue.
//
// Business services call `enqueue()` instead of calling NotifEmailService
// directly. The processor handles the actual send + retry.

import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, EMAIL_JOB_NAMES } from '../queue.constants';
import type { EmailJobPayload } from '../jobs/email.job';

/** Retry policy: 3 attempts with exponential backoff (2s, 4s, 8s). */
const EMAIL_JOB_OPTS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: { count: 500 },
  removeOnFail: { count: 200 },
};

@Injectable()
export class EmailQueueService {
  private readonly logger = new Logger(EmailQueueService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.EMAIL)
    private readonly queue: Queue<EmailJobPayload>,
  ) {}

  async enqueue(payload: EmailJobPayload): Promise<void> {
    try {
      const job = await this.queue.add(EMAIL_JOB_NAMES.SEND, payload, EMAIL_JOB_OPTS);
      this.logger.log(
        `EmailQueueService: enqueued job=${job.id} template=${payload.templateId} to=${payload.to}`,
      );
    } catch (err) {
      // Enqueue failure must not crash the calling request.
      this.logger.error(
        `EmailQueueService: failed to enqueue template=${payload.templateId} to=${payload.to} error=${(err as Error).message}`,
      );
    }
  }
}
