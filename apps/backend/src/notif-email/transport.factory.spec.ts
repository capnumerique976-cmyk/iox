// MP-NOTIF-2 phase 2 — Couverture de la factory transport.

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotifEmailTransportFactory } from './transport.factory';
import { MockEmailTransport } from './transports/mock.transport';
import { SmtpStreamEmailTransport } from './transports/smtp-stream.transport';
import { ResendEmailTransport } from './transports/resend.transport';

async function build(values: Record<string, string | undefined>) {
  const config = { get: (key: string) => values[key] };
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      NotifEmailTransportFactory,
      MockEmailTransport,
      SmtpStreamEmailTransport,
      ResendEmailTransport,
      { provide: ConfigService, useValue: config },
    ],
  }).compile();
  return module.get(NotifEmailTransportFactory);
}

describe('NotifEmailTransportFactory', () => {
  it('default → mock', async () => {
    const factory = await build({});
    expect(factory.resolve().name).toBe('mock');
  });

  it('NOTIF_EMAIL_TRANSPORT=smtp-stream → smtp-stream', async () => {
    const factory = await build({ NOTIF_EMAIL_TRANSPORT: 'smtp-stream' });
    expect(factory.resolve().name).toBe('smtp-stream');
  });

  it('NOTIF_EMAIL_TRANSPORT=resend sans RESEND_API_KEY → throw au resolve', async () => {
    const factory = await build({ NOTIF_EMAIL_TRANSPORT: 'resend' });
    expect(() => factory.resolve()).toThrow(/RESEND_API_KEY manquant/);
  });

  it('NOTIF_EMAIL_TRANSPORT=resend + RESEND_API_KEY → instance ResendEmailTransport', async () => {
    const factory = await build({
      NOTIF_EMAIL_TRANSPORT: 'resend',
      RESEND_API_KEY: 'rs_test_xxx',
    });
    expect(factory.resolve().name).toBe('resend');
  });

  it('valeur inconnue → fallback mock', async () => {
    const factory = await build({ NOTIF_EMAIL_TRANSPORT: 'foo-bar' });
    expect(factory.resolve().name).toBe('mock');
  });
});
