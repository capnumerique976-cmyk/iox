// Spec — EmailProcessor (Mandat 53)

import { EmailProcessor } from './email.processor';
import { NotifEmailService } from '../../notif-email/notif-email.service';
import { EMAIL_JOB_NAMES } from '../queue.constants';
import type { Job } from 'bullmq';

const makeJob = (name: string, data: object): Job =>
  ({ id: 'job-1', name, data } as unknown as Job);

describe('EmailProcessor', () => {
  let processor: EmailProcessor;
  let notifEmail: { send: jest.Mock };

  beforeEach(() => {
    notifEmail = {
      send: jest.fn().mockResolvedValue({ success: true, messageId: 'msg-1', transport: 'mock' }),
    };
    processor = new EmailProcessor(notifEmail as unknown as NotifEmailService);
  });

  it('calls notifEmail.send with correct payload', async () => {
    const payload = {
      templateId: 'rfq-created-to-seller',
      to: 'seller@example.com',
      templateData: { offerTitle: 'Vanille BIO', ctaUrl: 'https://iox.yt/rfq/1' },
      locale: 'fr',
    };
    await processor.process(makeJob(EMAIL_JOB_NAMES.SEND, payload));

    expect(notifEmail.send).toHaveBeenCalledWith({
      to: payload.to,
      templateId: payload.templateId,
      templateData: payload.templateData,
      locale: payload.locale,
    });
  });

  it('throws when notifEmail.send returns success=false (triggers BullMQ retry)', async () => {
    notifEmail.send.mockResolvedValue({ success: false, error: 'SMTP error' });

    await expect(
      processor.process(
        makeJob(EMAIL_JOB_NAMES.SEND, { templateId: 'x', to: 'a@b.com', templateData: {} }),
      ),
    ).rejects.toThrow('Email send failed: SMTP error');
  });

  it('propagates thrown errors from notifEmail.send (triggers BullMQ retry)', async () => {
    notifEmail.send.mockRejectedValue(new Error('transport crash'));

    await expect(
      processor.process(
        makeJob(EMAIL_JOB_NAMES.SEND, { templateId: 'x', to: 'a@b.com', templateData: {} }),
      ),
    ).rejects.toThrow('transport crash');
  });

  it('returns without calling send for unknown job names', async () => {
    await processor.process(makeJob('unknown-job', {}));
    expect(notifEmail.send).not.toHaveBeenCalled();
  });
});
