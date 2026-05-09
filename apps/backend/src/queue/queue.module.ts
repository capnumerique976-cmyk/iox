// QueueModule — BullMQ setup for IOX async job processing.
//
// Queues created:
//   - iox.email   : transactional email sends (retries, no request blocking)
//   - iox.search  : MeiliSearch index sync (deduplication, retries)
//
// Redis connection:
//   - Uses REDIS_URL env var (default: redis://localhost:6381).
//   - If Redis is unavailable, BullMQ workers will fail loudly at startup.
//     Set QUEUE_ENABLED=false to skip queue registration in environments
//     that do not have Redis (e.g. CI without Redis service).
//
// Bull Board admin UI:
//   - Mounted at /admin/queues (bypasses api/v1 global prefix).
//   - Protected by bullBoardAuthMiddleware: requires ADMIN JWT role.
//
// Exports EmailQueueService + SearchQueueService for use in other modules.

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule as BullBoard } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotifEmailModule } from '../notif-email/notif-email.module';
import { SearchModule } from '../search/search.module';
import { SearchEventListener } from '../search/search-event.listener';
import { QUEUE_NAMES } from './queue.constants';
import { EmailProcessor } from './processors/email.processor';
import { SearchProcessor } from './processors/search.processor';
import { EmailQueueService } from './services/email-queue.service';
import { SearchQueueService } from './services/search-queue.service';
import { bullBoardAuthMiddleware } from './bull-board-auth.middleware';
import { BullBoardEmailFeature, BullBoardSearchFeature } from './bull-board.module';
import { QueueEventsService } from './services/queue-events.service';

@Module({
  imports: [
    ConfigModule,
    NotifEmailModule,
    SearchModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL') ?? 'redis://localhost:6381';
        const url = new URL(redisUrl);
        return {
          connection: {
            host: url.hostname,
            port: Number(url.port) || 6379,
            password: url.password || undefined,
            // Graceful reconnect: don't crash on temporary Redis loss.
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
          },
        };
      },
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.EMAIL },
      { name: QUEUE_NAMES.SEARCH },
    ),
    // Bull Board admin UI — async so ConfigService can provide the JWT secret.
    BullBoard.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        route: '/admin/queues',
        adapter: ExpressAdapter,
        middleware: bullBoardAuthMiddleware(
          config.get<string>('JWT_SECRET') ?? '',
        ),
        boardOptions: {
          uiConfig: { boardTitle: 'IOX Job Queues' },
        },
      }),
    }),
    BullBoardEmailFeature,
    BullBoardSearchFeature,
  ],
  providers: [
    EmailProcessor,
    SearchProcessor,
    EmailQueueService,
    SearchQueueService,
    // Mandat 53: SearchEventListener moved here to inject SearchQueueService
    // without creating a circular dep with SearchModule.
    SearchEventListener,
    // Mandat 54: listens to failed events on both queues.
    QueueEventsService,
  ],
  exports: [EmailQueueService, SearchQueueService],
})
export class QueueModule {}
