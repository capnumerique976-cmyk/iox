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
import { ResendEmailTransport } from './transports/resend.transport';
import { PrismaService } from '../database/prisma.service';
import { UnsubscribeService } from './unsubscribe.service';

describe('NotifEmailService', () => {
  let service: NotifEmailService;
  let mockTransport: MockEmailTransport;
  let smtpStreamTransport: SmtpStreamEmailTransport;
  let config: { get: jest.Mock };
  let prisma: { emailLog: { create: jest.Mock } };
  let unsubscribeService: {
    isUnsubscribed: jest.Mock;
    generateToken: jest.Mock;
  };

  beforeEach(async () => {
    config = {
      get: jest.fn((key: string) => {
        if (key === 'NOTIF_EMAIL_FROM') return 'noreply@iox.test';
        if (key === 'NOTIF_EMAIL_TRANSPORT') return 'mock';
        return undefined;
      }),
    };
    prisma = {
      emailLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-1' }),
      },
    };
    unsubscribeService = {
      isUnsubscribed: jest.fn().mockResolvedValue(false),
      generateToken: jest.fn().mockReturnValue('jwt.token.signed'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotifEmailService,
        NotifEmailTransportFactory,
        MockEmailTransport,
        SmtpStreamEmailTransport,
        ResendEmailTransport,
        { provide: ConfigService, useValue: config },
        { provide: PrismaService, useValue: prisma },
        { provide: UnsubscribeService, useValue: unsubscribeService },
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

  // ── MP-NOTIF-2 — EmailLog persistence ─────────────────────────────────

  it('MP-NOTIF-2 — send happy path → persiste 1 EmailLog SENT par destinataire', async () => {
    const res = await service.send({
      to: ['a@x.test', 'b@x.test'],
      subject: 'Hello',
      text: 'World',
      recipientUserId: 'user-1',
      metadata: { sourceEntity: 'QuoteRequest', sourceId: 'rfq-9' },
    });
    expect(res.success).toBe(true);
    expect(prisma.emailLog.create).toHaveBeenCalledTimes(2);
    const args = prisma.emailLog.create.mock.calls.map((c) => c[0].data);
    expect(args[0]).toMatchObject({
      transport: 'mock',
      templateId: 'raw',
      recipientEmail: 'a@x.test',
      recipientUserId: 'user-1',
      subject: 'Hello',
      status: 'SENT',
    });
    expect(args[0].metadataJson).toMatchObject({
      sourceEntity: 'QuoteRequest',
      sourceId: 'rfq-9',
    });
    expect(args[1].recipientEmail).toBe('b@x.test');
  });

  it('MP-NOTIF-2 — send échec template inconnu → EmailLog FAILED avec errorCode', async () => {
    const res = await service.send({
      to: 'x@y.test',
      templateId: 'unknown-template',
      templateData: {},
    });
    expect(res.success).toBe(false);
    expect(prisma.emailLog.create).toHaveBeenCalledTimes(1);
    const data = prisma.emailLog.create.mock.calls[0][0].data;
    expect(data.status).toBe('FAILED');
    expect(data.errorCode).toBe('TEMPLATE_NOT_FOUND');
    expect(data.errorMessage).toContain('unknown-template');
  });

  it('MP-NOTIF-2 — send transport throw runtime → EmailLog FAILED TRANSPORT_FAILURE', async () => {
    // Force le mock à throw au prochain send.
    jest.spyOn(mockTransport, 'send').mockRejectedValueOnce(new Error('boom'));
    const res = await service.send({
      to: 'x@y.test',
      subject: 'Hi',
      text: 'World',
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe('TRANSPORT_FAILURE');
    expect(prisma.emailLog.create).toHaveBeenCalledTimes(1);
    const data = prisma.emailLog.create.mock.calls[0][0].data;
    expect(data.status).toBe('FAILED');
    expect(data.errorCode).toBe('TRANSPORT_FAILURE');
    expect(data.errorMessage).toContain('boom');
  });

  it('MP-NOTIF-2 — persistance EmailLog échoue → log warn, send() retourne quand même success', async () => {
    prisma.emailLog.create.mockRejectedValueOnce(new Error('DB unreachable'));
    const res = await service.send({
      to: 'x@y.test',
      subject: 'Hi',
      text: 'World',
    });
    expect(res.success).toBe(true);
    expect(prisma.emailLog.create).toHaveBeenCalledTimes(1);
  });

  // ── MP-NOTIF-2 — Unsubscribe checks ──────────────────────────────────

  it('MP-NOTIF-2 — destinataire désinscrit → transport NOT called, EmailLog SKIPPED', async () => {
    unsubscribeService.isUnsubscribed.mockResolvedValueOnce(true);
    const sendSpy = jest.spyOn(mockTransport, 'send');
    const res = await service.send({
      to: 'optedout@x.test',
      subject: 'Hi',
      text: 'World',
      unsubscribeType: 'RFQ_NOTIFICATIONS',
    });
    expect(res.success).toBe(true);
    expect(sendSpy).not.toHaveBeenCalled();
    expect(prisma.emailLog.create).toHaveBeenCalledTimes(1);
    const data = prisma.emailLog.create.mock.calls[0][0].data;
    expect(data.status).toBe('SKIPPED');
    expect(data.errorCode).toBe('UNSUBSCRIBED');
    expect(data.errorMessage).toContain('RFQ_NOTIFICATIONS');
  });

  it('MP-NOTIF-2 — un destinataire désinscrit, l\'autre non → transport called pour le seul opt-in', async () => {
    unsubscribeService.isUnsubscribed.mockImplementation((email: string) =>
      Promise.resolve(email === 'optedout@x.test'),
    );
    const sendSpy = jest.spyOn(mockTransport, 'send');
    const res = await service.send({
      to: ['optedout@x.test', 'optin@x.test'],
      subject: 'Hi',
      text: 'World',
    });
    expect(res.success).toBe(true);
    expect(sendSpy).toHaveBeenCalledTimes(1);
    const renderedTo = sendSpy.mock.calls[0][0].to;
    expect(renderedTo).toEqual(['optin@x.test']);
    // 1 SKIPPED + 1 SENT
    const statuses = prisma.emailLog.create.mock.calls.map(
      (c) => c[0].data.status,
    );
    expect(statuses.sort()).toEqual(['SENT', 'SKIPPED']);
  });

  it('MP-NOTIF-2 — service template injecte unsubscribeUrl dans templateData', async () => {
    unsubscribeService.generateToken.mockReturnValue('signed.jwt');
    config.get.mockImplementation((k: string) => {
      if (k === 'NOTIF_EMAIL_FROM') return 'noreply@iox.test';
      if (k === 'NOTIF_EMAIL_TRANSPORT') return 'mock';
      if (k === 'FRONTEND_URL') return 'https://iox.mycloud.yt';
      return undefined;
    });
    const res = await service.send({
      to: 'x@y.test',
      templateId: 'rfq-created-to-seller',
      templateData: {
        sellerDisplayName: 'Coop',
        buyerCompanyName: 'Acme',
        offerTitle: 'Vanille',
        requestedQuantity: 100,
        requestedUnit: 'kg',
        deliveryCountry: 'FR',
        message: null,
        ctaUrl: 'https://iox.mycloud.yt/seller/quote-requests/x',
      },
    });
    expect(res.success).toBe(true);
    const sent = mockTransport.getSent();
    expect(sent[0].html).toContain('signed.jwt');
    expect(sent[0].html).toContain('Se désabonner');
    expect(sent[0].text).toContain('signed.jwt');
  });
});
