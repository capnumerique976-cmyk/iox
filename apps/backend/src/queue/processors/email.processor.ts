// EmailProcessor — BullMQ worker for the iox.email queue.
//
// Pulls EmailJobPayload jobs and calls NotifEmailService.send().
// Failures are logged; BullMQ handles retries via the configured backoff.
// All errors are surfaced as thrown exceptions so BullMQ can track them.

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotifEmailService } from '../../notif-email/notif-email.service';
import { QUEUE_NAMES, EMAIL_JOB_NAMES } from '../queue.constants';
import type { EmailJobPayload } from '../jobs/email.job';

@Processor(QUEUE_NAMES.EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly notifEmail: NotifEmailService) {
    super();
  }

  async process(job: Job<EmailJobPayload>): Promise<void> {
    if (job.name !== EMAIL_JOB_NAMES.SEND) {
      this.logger.warn(`EmailProcessor: unknown job name ${job.name}`);
      return;
    }

    const { templateId, to, templateData, locale } = job.data;
    this.logger.log(`EmailProcessor: processing job=${job.id} template=${templateId} to=${to}`);

    const result = await this.notifEmail.send({ to, templateId, templateData, locale });

    if (!result.success) {
      const err = result.error ?? 'unknown error';
      this.logger.error(
        `EmailProcessor: send failed job=${job.id} template=${templateId} to=${to} error=${err}`,
      );
      // Throw to allow BullMQ retry logic to kick in.
      throw new Error(`Email send failed: ${err}`);
    }

    this.logger.log(
      `EmailProcessor: sent job=${job.id} template=${templateId} to=${to} transport=${result.transport}`,
    );
  }
}
