// MP-NOTIF-1 phase 1 — Couverture du service emails transactionnels.
//
// Pas d'I/O réseau (transport mock). Vérifie :
//   - send happy path avec template
//   - template inconnu → success=false code=TEMPLATE_NOT_FOUND
//   - to vide → success=false code=NO_RECIPIENT
//   - factory respecte NOTIF_EMAIL_TRANSPORT (mock vs smtp-stream)
//   - send raw (sans templateId) avec subject + text → OK
//   - send raw sans subject → success=false code=INVALID_INPUT

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotifEmailService } from './notif-email.service';
import { NotifEmailTransportFactory } from './transport.factory';
import { MockEmailTransport } from './transports/mock.transport';
import { SmtpStreamEmailTransport } from './transports/smtp-stream.transport';

describe('NotifEmailService', () => {
  let service: NotifEmailService;
  let mockTransport: MockEmailTransport;
  let smtpStreamTransport: SmtpStreamEmailTransport;
  let config: { get: jest.Mock };

  beforeEach(async () => {
    config = {
      get: jest.fn((key: string) => {
        if (key === 'NOTIF_EMAIL_FROM') return 'noreply@iox.test';
        if (key === 'NOTIF_EMAIL_TRANSPORT') return 'mock';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotifEmailService,
        NotifEmailTransportFactory,
        MockEmailTransport,
        SmtpStreamEmailTransport,
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get(NotifEmailService);
    mockTransport = module.get(MockEmailTransport);
    smtpStreamTransport = module.get(SmtpStreamEmailTransport);
    mockTransport.clear();
    smtpStreamTransport.clear();
  });

  it('send happy path avec template → success + accumulé sur mock', async () => {
    const res = await service.send({
      to: 'seller@x.test',
      templateId: 'rfq-created-to-seller',
      templateData: {
        sellerDisplayName: 'Coop Vanille',
        buyerCompanyName: 'Acme',
        offerTitle: 'Vanille A',
        requestedQuantity: 100,
        requestedUnit: 'kg',
        deliveryCountry: 'FR',
        message: 'Bonjour',
        ctaUrl: 'https://iox.mycloud.yt/seller/quote-requests/rfq-1',
      },
    });
    expect(res.success).toBe(true);
    expect(res.transport).toBe('mock');
    expect(res.messageId).toBe('mock-1');
    const sent = mockTransport.getSent();
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toEqual(['seller@x.test']);
    expect(sent[0].subject).toContain('Vanille A');
  });

  it('template inconnu → success=false code=TEMPLATE_NOT_FOUND', async () => {
    const res = await service.send({
      to: 'x@y.test',
      templateId: 'inconnu-template',
      templateData: {},
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe('TEMPLATE_NOT_FOUND');
    expect(mockTransport.getSent()).toHaveLength(0);
  });

  it('to vide → success=false code=NO_RECIPIENT', async () => {
    const res = await service.send({
      to: '',
      subject: 'X',
      text: 'Y',
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe('NO_RECIPIENT');
  });

  it('to liste vide → success=false code=NO_RECIPIENT', async () => {
    const res = await service.send({
      to: ['', '  '],
      subject: 'X',
      text: 'Y',
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe('NO_RECIPIENT');
  });

  it('mode raw OK avec subject + text', async () => {
    const res = await service.send({
      to: 'x@y.test',
      subject: 'Bonjour',
      text: 'Test',
    });
    expect(res.success).toBe(true);
    const sent = mockTransport.getSent();
    expect(sent[0].subject).toBe('Bonjour');
    expect(sent[0].text).toBe('Test');
    expect(sent[0].html).toBe('');
  });

  it('mode raw sans subject → success=false code=INVALID_INPUT', async () => {
    const res = await service.send({
      to: 'x@y.test',
      text: 'Test sans subject',
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe('INVALID_INPUT');
  });

  it('factory respecte NOTIF_EMAIL_TRANSPORT=smtp-stream', async () => {
    config.get.mockImplementation((k: string) => {
      if (k === 'NOTIF_EMAIL_TRANSPORT') return 'smtp-stream';
      if (k === 'NOTIF_EMAIL_FROM') return 'noreply@iox.test';
      return undefined;
    });
    const res = await service.send({
      to: 'seller@x.test',
      subject: 'Hello',
      text: 'World',
    });
    expect(res.success).toBe(true);
    expect(res.transport).toBe('smtp-stream');
    // Le mock ne doit PAS avoir été utilisé
    expect(mockTransport.getSent()).toHaveLength(0);
    // smtp-stream doit avoir un buffer MIME accumulé
    expect(smtpStreamTransport.getMimeBuffers().length).toBeGreaterThan(0);
  });

  it('factory normalise valeurs inconnues vers mock (default)', async () => {
    config.get.mockImplementation((k: string) => {
      if (k === 'NOTIF_EMAIL_TRANSPORT') return 'foobar-invalid';
      if (k === 'NOTIF_EMAIL_FROM') return 'noreply@iox.test';
      return undefined;
    });
    const res = await service.send({
      to: 'x@y.test',
      subject: 'X',
      text: 'Y',
    });
    expect(res.success).toBe(true);
    expect(res.transport).toBe('mock');
  });
});
