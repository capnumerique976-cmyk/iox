import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../common/services/storage.service';
import { EntityType, DocumentStatus } from '@iox/shared';

const mockFile: Express.Multer.File = {
  fieldname: 'file',
  originalname: 'test.pdf',
  encoding: '7bit',
  mimetype: 'application/pdf',
  size: 1024,
  buffer: Buffer.from('fake-pdf'),
  stream: null as any,
  destination: '',
  filename: '',
  path: '',
};

const mockDoc = {
  id: 'uuid-doc1',
  name: 'Rapport qualité',
  originalFilename: 'test.pdf',
  mimeType: 'application/pdf',
  storageKey: 'documents/product_batch/uuid-pb1/12345-test.pdf',
  sizeBytes: 1024,
  status: DocumentStatus.ACTIVE,
  linkedEntityType: EntityType.PRODUCT_BATCH,
  linkedEntityId: 'uuid-pb1',
  notes: null,
  expiresAt: null,
  createdById: 'actor',
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  beneficiaryId: null,
  productId: null,
  companyId: null,
  supplyContractId: null,
  inboundBatchId: null,
  productBatchId: 'uuid-pb1',
  incidentId: null,
};

describe('DocumentsService', () => {
  let service: DocumentsService;
  let prisma: { document: jest.Mocked<Record<string, jest.Mock>>; $transaction: jest.Mock };
  let storage: jest.Mocked<StorageService>;
  let _auditService: jest.Mocked<AuditService>;

  beforeEach(async () => {
    prisma = {
      document: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn((fns: Array<Promise<unknown>>) => Promise.all(fns)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
        {
          provide: StorageService,
          useValue: {
            upload: jest.fn().mockResolvedValue(undefined),
            getPresignedUrl: jest.fn().mockResolvedValue('https://minio.example.com/presigned'),
            delete: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get(DocumentsService);
    storage = module.get(StorageService);
    _auditService = module.get(AuditService);
  });

  describe('upload', () => {
    it("uploade un PDF et crée l'enregistrement en base", async () => {
      prisma.document.create.mockResolvedValue(mockDoc);

      const result = await service.upload(
        {
          name: 'Rapport qualité',
          linkedEntityType: EntityType.PRODUCT_BATCH,
          linkedEntityId: 'uuid-pb1',
        },
        mockFile,
        'actor',
      );

      expect(storage.upload).toHaveBeenCalled();
      expect(prisma.document.create).toHaveBeenCalled();
      expect(result.name).toBe('Rapport qualité');
    });

    it('rejette un fichier trop volumineux', async () => {
      const bigFile = { ...mockFile, size: 20 * 1024 * 1024 };
      await expect(
        service.upload(
          { name: 'doc', linkedEntityType: EntityType.PRODUCT_BATCH, linkedEntityId: 'uuid-pb1' },
          bigFile,
          'actor',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejette un type MIME non autorisé', async () => {
      const badFile = { ...mockFile, mimetype: 'application/x-executable' };
      await expect(
        service.upload(
          { name: 'doc', linkedEntityType: EntityType.PRODUCT_BATCH, linkedEntityId: 'uuid-pb1' },
          badFile,
          'actor',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getDownloadUrl', () => {
    it('retourne une URL pré-signée pour un document ACTIVE', async () => {
      prisma.document.findUnique.mockResolvedValue(mockDoc);
      const { url } = await service.getDownloadUrl('uuid-doc1');
      expect(url).toContain('https://');
    });

    it('lève NotFoundException si le document est inexistant', async () => {
      prisma.document.findUnique.mockResolvedValue(null);
      await expect(service.getDownloadUrl('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('archive un document ACTIVE', async () => {
      prisma.document.findUnique.mockResolvedValue(mockDoc);
      prisma.document.update.mockResolvedValue({ ...mockDoc, status: DocumentStatus.ARCHIVED });

      const result = await service.updateStatus(
        'uuid-doc1',
        { status: DocumentStatus.ARCHIVED },
        'actor',
      );
      expect(result.status).toBe(DocumentStatus.ARCHIVED);
    });

    it("rejette la réactivation d'un document REJECTED", async () => {
      prisma.document.findUnique.mockResolvedValue({ ...mockDoc, status: DocumentStatus.REJECTED });
      await expect(
        service.updateStatus('uuid-doc1', { status: DocumentStatus.ACTIVE }, 'actor'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
