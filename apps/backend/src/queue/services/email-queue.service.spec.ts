// Spec — EmailQueueService (Mandat 53)

import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { EmailQueueService } from './email-queue.service';
import { QUEUE_NAMES, EMAIL_JOB_NAMES } from '../queue.constants';

describe('EmailQueueService', () => {
  let service: EmailQueueService;
  let queueAdd: jest.Mock;

  beforeEach(async () => {
    queueAdd = jest.fn().mockResolvedValue({ id: 'job-1' });

    const module = await Test.createTestingModule({
      providers: [
        EmailQueueService,
        {
          provide: getQueueToken(QUEUE_NAMES.EMAIL),
          useValue: { add: queueAdd },
        },
      ],
    }).compile();

    service = module.get(EmailQueueService);
  });

  it('adds a SEND job to the email queue', async () => {
    const payload = {
      templateId: 'rfq-created-to-seller',
      to: 'seller@coop.yt',
      templateData: { offerTitle: 'Ylang BIO' },
    };

    await service.enqueue(payload);

    expect(queueAdd).toHaveBeenCalledWith(
      EMAIL_JOB_NAMES.SEND,
      payload,
      expect.objectContaining({ attempts: 3 }),
    );
  });

  it('does not throw when queue.add fails (non-blocking)', async () => {
    queueAdd.mockRejectedValue(new Error('Redis connection refused'));

    await expect(
      service.enqueue({ templateId: 'x', to: 'a@b.com', templateData: {} }),
    ).resolves.not.toThrow();
  });
});
