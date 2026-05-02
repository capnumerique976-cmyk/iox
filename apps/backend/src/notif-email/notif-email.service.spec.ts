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

// MP-NOTIF-3 — Couverture `listLogs` (vue admin).
describe('NotifEmailService.listLogs', () => {
  let service: NotifEmailService;
  let prisma: {
    emailLog: {
      count: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      groupBy: jest.Mock;
      create: jest.Mock;
    };
    $queryRaw: jest.Mock;
  };

  const makeRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'log-1',
    transport: 'mock',
    templateId: 'rfq-message-created',
    recipientEmail: 'buyer@ex.com',
    recipientUserId: 'u-1',
    subject: 'Sujet',
    status: 'SENT',
    errorCode: null,
    errorMessage: null,
    providerMessageId: 'mid-1',
    metadataJson: { sourceEntity: 'QuoteRequest', sourceId: 'q-1' },
    createdAt: new Date('2026-04-25T12:00:00Z'),
    ...overrides,
  });

  beforeEach(async () => {
    const config = { get: jest.fn(() => 'mock') };
    prisma = {
      emailLog: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        groupBy: jest.fn(),
        create: jest.fn(),
      },
      $queryRaw: jest.fn(),
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
        // MP-NOTIF-3 phase 2b — listLogs n'utilise pas UnsubscribeService,
        // mais le constructeur de NotifEmailService l'exige depuis MP-NOTIF-2 LOT 2.
        {
          provide: UnsubscribeService,
          useValue: { isUnsubscribed: jest.fn().mockResolvedValue(false) },
        },
      ],
    }).compile();
    service = module.get(NotifEmailService);
  });

  it('paginé par défaut (page=1, limit=20) — orderBy createdAt desc', async () => {
    prisma.emailLog.count.mockResolvedValue(0);
    prisma.emailLog.findMany.mockResolvedValue([]);
    const res = await service.listLogs({});
    expect(res.meta).toEqual({ total: 0, page: 1, limit: 20, totalPages: 0 });
    const args = prisma.emailLog.findMany.mock.calls[0][0];
    expect(args.skip).toBe(0);
    expect(args.take).toBe(20);
    expect(args.orderBy).toEqual({ createdAt: 'desc' });
  });

  it('limit cappé à 100 et page minimum à 1', async () => {
    prisma.emailLog.count.mockResolvedValue(0);
    prisma.emailLog.findMany.mockResolvedValue([]);
    await service.listLogs({ page: 0, limit: 9999 });
    const args = prisma.emailLog.findMany.mock.calls[0][0];
    expect(args.take).toBe(100);
    expect(args.skip).toBe(0); // page=1 → (1-1)*100
  });

  it('filtre status + templateId + recipientEmail + createdAtAfter', async () => {
    prisma.emailLog.count.mockResolvedValue(1);
    prisma.emailLog.findMany.mockResolvedValue([makeRow()]);
    await service.listLogs({
      status: 'FAILED',
      templateId: 'rfq-message-created',
      recipientEmail: 'BUYER',
      createdAtAfter: '2026-04-01T00:00:00Z',
    });
    const args = prisma.emailLog.findMany.mock.calls[0][0];
    expect(args.where.status).toBe('FAILED');
    expect(args.where.templateId).toBe('rfq-message-created');
    expect(args.where.recipientEmail).toEqual({ contains: 'BUYER', mode: 'insensitive' });
    expect(args.where.createdAt.gte).toBeInstanceOf(Date);
  });

  it('mappe les rows en items normalisés (createdAt ISO string)', async () => {
    prisma.emailLog.count.mockResolvedValue(1);
    prisma.emailLog.findMany.mockResolvedValue([makeRow()]);
    const res = await service.listLogs({});
    expect(res.data).toHaveLength(1);
    expect(res.data[0].createdAt).toBe('2026-04-25T12:00:00.000Z');
    expect(res.data[0].status).toBe('SENT');
    expect(res.data[0].metadataJson).toEqual({
      sourceEntity: 'QuoteRequest',
      sourceId: 'q-1',
    });
  });

  it('totalPages = ceil(total / limit)', async () => {
    prisma.emailLog.count.mockResolvedValue(45);
    prisma.emailLog.findMany.mockResolvedValue([]);
    const res = await service.listLogs({ limit: 20 });
    expect(res.meta.totalPages).toBe(3);
  });

  // MP-NOTIF-3 phase 3 — getLogById
  it('getLogById retourne EmailLogItem normalisé (createdAt ISO)', async () => {
    prisma.emailLog.findUnique.mockResolvedValue(makeRow({ id: 'log-42' }));
    const res = await service.getLogById('log-42');
    expect(res.id).toBe('log-42');
    expect(res.createdAt).toBe('2026-04-25T12:00:00.000Z');
    expect(res.transport).toBe('mock');
    expect(prisma.emailLog.findUnique).toHaveBeenCalledWith({ where: { id: 'log-42' } });
  });

  it('getLogById throws NotFoundException si introuvable', async () => {
    prisma.emailLog.findUnique.mockResolvedValue(null);
    await expect(service.getLogById('absent')).rejects.toThrow(/introuvable/i);
  });

  // MP-NOTIF-3 phase 5 — getLogsStats
  describe('getLogsStats', () => {
    it('compose byStatus + byTemplate + byDay', async () => {
      prisma.emailLog.groupBy
        .mockResolvedValueOnce([
          { status: 'SENT', _count: { _all: 10 } },
          { status: 'FAILED', _count: { _all: 2 } },
        ])
        .mockResolvedValueOnce([
          { templateId: 'rfq-message-created', _count: { _all: 7 } },
          { templateId: 'rfq-qualified', _count: { _all: 3 } },
        ]);
      prisma.$queryRaw.mockResolvedValue([
        { day: new Date('2026-04-25T00:00:00Z'), status: 'SENT', count: BigInt(5) },
        { day: new Date('2026-04-25T00:00:00Z'), status: 'FAILED', count: BigInt(1) },
        { day: new Date('2026-04-26T00:00:00Z'), status: 'SENT', count: BigInt(5) },
      ]);

      const res = await service.getLogsStats();
      expect(res.byStatus).toEqual([
        { status: 'SENT', count: 10 },
        { status: 'FAILED', count: 2 },
      ]);
      expect(res.byTemplate).toEqual([
        { templateId: 'rfq-message-created', count: 7 },
        { templateId: 'rfq-qualified', count: 3 },
      ]);
      expect(res.byDay).toEqual([
        { day: '2026-04-25', sent: 5, failed: 1, skipped: 0 },
        { day: '2026-04-26', sent: 5, failed: 0, skipped: 0 },
      ]);
    });

    it('byTemplate top 10 (orderBy desc + take 10)', async () => {
      prisma.emailLog.groupBy.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      prisma.$queryRaw.mockResolvedValue([]);
      await service.getLogsStats();
      const args = prisma.emailLog.groupBy.mock.calls[1][0];
      expect(args.take).toBe(10);
      expect(args.orderBy).toEqual({ _count: { templateId: 'desc' } });
    });

    it('vide → byStatus=[], byTemplate=[], byDay=[]', async () => {
      prisma.emailLog.groupBy.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      prisma.$queryRaw.mockResolvedValue([]);
      const res = await service.getLogsStats();
      expect(res.byStatus).toEqual([]);
      expect(res.byTemplate).toEqual([]);
      expect(res.byDay).toEqual([]);
    });
  });

  // MP-NOTIF-3 phase 7 — replayFailedLog
  describe('replayFailedLog', () => {
    it('replay FAILED log → resend + returns originalId + status', async () => {
      const failedRow = makeRow({
        id: 'fail-1',
        status: 'FAILED',
        templateId: 'raw',
        subject: 'Hello',
        recipientEmail: 'buyer@ex.com',
        errorCode: 'TRANSPORT_FAILURE',
        metadataJson: { data: {} },
      });
      prisma.emailLog.findUnique.mockResolvedValue(failedRow);
      prisma.emailLog.create.mockResolvedValue({ id: 'log-new' });

      const res = await service.replayFailedLog('fail-1', { id: 'admin-1' });
      expect(res.originalId).toBe('fail-1');
      expect(res.status).toBe('SENT');
      // send() was called which triggers persistLog → emailLog.create
      expect(prisma.emailLog.create).toHaveBeenCalled();
    });

    it('replay non-FAILED log → throws BadRequestException', async () => {
      prisma.emailLog.findUnique.mockResolvedValue(makeRow({ id: 'sent-1', status: 'SENT' }));
      await expect(service.replayFailedLog('sent-1')).rejects.toThrow(/Only FAILED/);
    });

    it('replay unknown id → throws NotFoundException', async () => {
      prisma.emailLog.findUnique.mockResolvedValue(null);
      await expect(service.replayFailedLog('absent')).rejects.toThrow(/introuvable/i);
    });
  });

  // MP-NOTIF-3 phase 6 — exportLogsCsv
  describe('exportLogsCsv', () => {
    it('retourne header + 0 ligne quand findMany vide', async () => {
      prisma.emailLog.findMany.mockResolvedValue([]);
      const csv = await service.exportLogsCsv({});
      expect(csv).toBe(
        'id,createdAt,transport,templateId,status,recipientEmail,subject,errorCode,errorMessage,providerMessageId',
      );
    });

    it('échappe les cellules avec virgule, double-quote, newline', async () => {
      prisma.emailLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          createdAt: new Date('2026-04-25T12:00:00Z'),
          transport: 'mock',
          templateId: 'rfq-message-created',
          status: 'SENT',
          recipientEmail: 'buyer@ex.com',
          subject: 'Sujet "spécial", avec virgule',
          errorCode: null,
          errorMessage: null,
          providerMessageId: 'mid-1',
          recipientUserId: null,
          metadataJson: null,
        },
      ]);
      const csv = await service.exportLogsCsv({});
      const lines = csv.split('\n');
      expect(lines).toHaveLength(2);
      expect(lines[1]).toContain('"Sujet ""spécial"", avec virgule"');
      expect(lines[1]).toContain('log-1');
      expect(lines[1]).toContain('2026-04-25T12:00:00.000Z');
    });

    it('cap 10000 dans take', async () => {
      prisma.emailLog.findMany.mockResolvedValue([]);
      await service.exportLogsCsv({});
      const args = prisma.emailLog.findMany.mock.calls[0][0];
      expect(args.take).toBe(10000);
    });

    it('applique les filtres status + templateId + recipientEmail + createdAtAfter', async () => {
      prisma.emailLog.findMany.mockResolvedValue([]);
      await service.exportLogsCsv({
        status: 'FAILED',
        templateId: 'rfq-quoted',
        recipientEmail: 'X@',
        createdAtAfter: '2026-04-01T00:00:00Z',
      });
      const args = prisma.emailLog.findMany.mock.calls[0][0];
      expect(args.where.status).toBe('FAILED');
      expect(args.where.templateId).toBe('rfq-quoted');
      expect(args.where.recipientEmail).toEqual({ contains: 'X@', mode: 'insensitive' });
      expect(args.where.createdAt.gte).toBeInstanceOf(Date);
    });
  });
});
