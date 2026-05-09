// Spec — QueueEventsService (Mandat 54)
//
// Verifies that the service creates one QueueEvents listener per queue,
// attaches a 'failed' handler on each, and closes all connections on destroy.
// BullMQ is mocked so no Redis connection is attempted in tests.

import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { QueueEventsService } from './queue-events.service';
import { QUEUE_NAMES } from '../queue.constants';

// ─── Mock bullmq.QueueEvents ─────────────────────────────────────────────────

const mockOn = jest.fn();
const mockClose = jest.fn().mockResolvedValue(undefined);

jest.mock('bullmq', () => ({
  QueueEvents: jest.fn().mockImplementation(() => ({
    on: mockOn,
    close: mockClose,
  })),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { QueueEvents: MockQueueEvents } = require('bullmq') as {
  QueueEvents: jest.Mock;
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('QueueEventsService', () => {
  let service: QueueEventsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        QueueEventsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('redis://localhost:6381'),
          },
        },
      ],
    }).compile();

    service = module.get(QueueEventsService);
  });

  it('creates one QueueEvents instance per queue on init', () => {
    service.onModuleInit();

    const queueCount = Object.values(QUEUE_NAMES).length;
    expect(MockQueueEvents).toHaveBeenCalledTimes(queueCount);
  });

  it('attaches a failed listener to every queue', () => {
    service.onModuleInit();

    const failedCalls = (mockOn.mock.calls as [string, unknown][]).filter(
      ([event]) => event === 'failed',
    );
    expect(failedCalls).toHaveLength(Object.values(QUEUE_NAMES).length);
  });

  it('passes correct Redis connection options to QueueEvents', () => {
    service.onModuleInit();

    expect(MockQueueEvents).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        connection: expect.objectContaining({
          host: 'localhost',
          port: 6381,
        }),
      }),
    );
  });

  it('closes all QueueEvents connections on destroy', async () => {
    service.onModuleInit();
    await service.onModuleDestroy();

    expect(mockClose).toHaveBeenCalledTimes(Object.values(QUEUE_NAMES).length);
  });
});
