// Bull Board queue feature registrations.
//
// BullBoardModule.forRootAsync() is wired in QueueModule to allow async
// injection of ConfigService (needed for JWT secret in the auth middleware).
// BullBoardEmailFeature / BullBoardSearchFeature add the two queues to the UI.

import { BullBoardModule as BullBoard } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { QUEUE_NAMES } from './queue.constants';

export const BullBoardEmailFeature = BullBoard.forFeature({
  name: QUEUE_NAMES.EMAIL,
  adapter: BullMQAdapter,
});

export const BullBoardSearchFeature = BullBoard.forFeature({
  name: QUEUE_NAMES.SEARCH,
  adapter: BullMQAdapter,
});
