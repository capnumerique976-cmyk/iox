// QueueEventsService — listens to BullMQ job lifecycle events.
//
// Subscribes to the `failed` event on every managed queue. BullMQ fires
// `failed` only when a job has exhausted ALL its retries and is permanently
// moved to the failed set. A simple attempt failure (with retries remaining)
// does NOT trigger this event.
//
// Current behaviour: log at ERROR level (visible in production alerting tools
// that scrape structured logs). Extend here to send Slack/PagerDuty alerts.

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueEvents } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';

@Injectable()
export class QueueEventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueEventsService.name);
  private readonly queueEventListeners: QueueEvents[] = [];

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const redisUrl = this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6381';
    const url = new URL(redisUrl);
    const connection = {
      host: url.hostname,
      port: Number(url.port) || 6379,
      password: url.password || undefined,
      // Graceful reconnect — same flags as the BullModule root config.
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };

    for (const queueName of Object.values(QUEUE_NAMES)) {
      const queueEvents = new QueueEvents(queueName, { connection });

      queueEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
        this.logger.error(
          `[Queue:${queueName}] Job ${jobId} failed permanently. Reason: ${failedReason}`,
        );
      });

      this.queueEventListeners.push(queueEvents);
    }

    this.logger.log(
      `QueueEventsService: monitoring failed events on ${this.queueEventListeners.length} queue(s)`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(this.queueEventListeners.map((qe) => qe.close()));
    this.logger.log('QueueEventsService: all QueueEvents connections closed');
  }
}
