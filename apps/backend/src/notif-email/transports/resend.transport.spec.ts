// MP-NOTIF-2 phase 2 — Couverture du transport Resend.
//
// Aucun appel réseau réel : la `RESEND_CLIENT_FACTORY` est remplacée par
// un mock qui simule le SDK officiel.

import { ConfigService } from '@nestjs/config';
import {
  ResendEmailTransport,
  type ResendClientFactory,
} from './resend.transport';

function makeConfig(values: Record<string, string | undefined>): ConfigService {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

describe('ResendEmailTransport', () => {
  it('apiKey absent → send() throw avec message explicite', async () => {
    const transport = new ResendEmailTransport(
      makeConfig({ RESEND_API_KEY: '', NOTIF_EMAIL_FROM: 'noreply@iox.test' }),
    );
    await expect(
      transport.send({
        to: ['x@y.test'],
        from: 'noreply@iox.test',
        subject: 'X',
        html: '<p>X</p>',
        text: 'X',
      }),
    ).rejects.toThrow(/RESEND_API_KEY missing/);
  });

  it('send happy path : retourne le messageId du SDK', async () => {
    const sendMock = jest.fn().mockResolvedValue({
      data: { id: 'resend-msg-123' },
      error: null,
    });
    const factory: ResendClientFactory = () =>
      ({
        emails: { send: sendMock },
      }) as unknown as ReturnType<ResendClientFactory>;
    const transport = new ResendEmailTransport(
      makeConfig({ RESEND_API_KEY: 'rs_test_xxx', NOTIF_EMAIL_FROM: 'noreply@iox.test' }),
      factory,
    );
    const res = await transport.send({
      to: ['x@y.test'],
      from: 'noreply@iox.test',
      replyTo: 'support@iox.test',
      subject: 'Hello',
      html: '<p>Hello</p>',
      text: 'Hello',
    });
    expect(res.messageId).toBe('resend-msg-123');
    expect(sendMock).toHaveBeenCalledTimes(1);
    const arg = sendMock.mock.calls[0][0];
    expect(arg).toMatchObject({
      from: 'noreply@iox.test',
      to: ['x@y.test'],
      replyTo: 'support@iox.test',
      subject: 'Hello',
      html: '<p>Hello</p>',
      text: 'Hello',
    });
  });

  it("send échec SDK : throw avec code+message du SDK", async () => {
    const sendMock = jest.fn().mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'Invalid `to` field' },
    });
    const factory: ResendClientFactory = () =>
      ({
        emails: { send: sendMock },
      }) as unknown as ReturnType<ResendClientFactory>;
    const transport = new ResendEmailTransport(
      makeConfig({ RESEND_API_KEY: 'rs_test_xxx', NOTIF_EMAIL_FROM: 'noreply@iox.test' }),
      factory,
    );
    await expect(
      transport.send({
        to: ['malformed'],
        from: 'noreply@iox.test',
        subject: 'X',
        html: '<p>X</p>',
        text: 'X',
      }),
    ).rejects.toThrow(/validation_error: Invalid `to` field/);
  });
});
