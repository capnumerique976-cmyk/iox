import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../common/services/storage.service';
import { UploadDocumentDto, UpdateDocumentStatusDto, QueryDocumentsDto } from './dto/document.dto';
import { EntityType, DocumentStatus } from '@iox/shared';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

/** Map EntityType → the FK field name on the Document model */
const ENTITY_FK: Partial<Record<EntityType, string>> = {
  [EntityType.BENEFICIARY]: 'beneficiaryId',
  [EntityType.PRODUCT]: 'productId',
  [EntityType.INBOUND_BATCH]: 'inboundBatchId',
  [EntityType.PRODUCT_BATCH]: 'productBatchId',
  [EntityType.SUPPLY_CONTRACT]: 'supplyContractId',
  [EntityType.INCIDENT]: 'incidentId',
};

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private storage: StorageService,
  ) {}

  async findAll(query: QueryDocumentsDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.linkedEntityType) where.linkedEntityType = query.linkedEntityType;
    if (query.linkedEntityId) where.linkedEntityId = query.linkedEntityId;
    if (query.status) where.status = query.status;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.document.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.document.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document introuvable');
    return doc;
  }

  async upload(dto: UploadDocumentDto, file: Express.Multer.File, actorId?: string) {
    if (!file) throw new BadRequestException('Aucun fichier fourni.');

    // Taille max
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `Fichier trop volumineux. Maximum ${MAX_FILE_SIZE_BYTES / 1024 / 1024} Mo.`,
      );
    }

    // Type MIME autorisé
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Type de fichier non autorisé : ${file.mimetype}. ` +
          `Types acceptés : PDF, images (JPEG/PNG/WebP), Word, Excel, CSV.`,
      );
    }

    const storageKey = StorageService.buildKey(
      dto.linkedEntityType,
      dto.linkedEntityId,
      file.originalname,
    );

    // Upload vers MinIO
    await this.storage.upload(storageKey, file.buffer, file.mimetype);

    // FK optionnelle selon l'entité parente
    const fkField = ENTITY_FK[dto.linkedEntityType];
    const fkData = fkField ? { [fkField]: dto.linkedEntityId } : {};

    const document = await this.prisma.document.create({
      data: {
        name: dto.name,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        storageKey,
        sizeBytes: file.size,
        status: DocumentStatus.ACTIVE,
        notes: dto.notes,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        linkedEntityType: dto.linkedEntityType,
        linkedEntityId: dto.linkedEntityId,
        createdById: actorId,
        ...fkData,
      },
    });

    try {
      await this.auditService.log({
        action: 'DOCUMENT_UPLOADED',
        entityType: dto.linkedEntityType as unknown as EntityType,
        entityId: dto.linkedEntityId,
        userId: actorId,
        newData: { documentId: document.id, name: dto.name, storageKey },
      });
    } catch {
      /* non-bloquant */
    }

    return document;
  }

  async getDownloadUrl(id: string): Promise<{ url: string }> {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document introuvable');

    if (doc.status !== DocumentStatus.ACTIVE) {
      throw new BadRequestException("Ce document n'est plus actif.");
    }

    const url = await this.storage.getPresignedUrl(doc.storageKey);
    return { url };
  }

  async updateStatus(id: string, dto: UpdateDocumentStatusDto, actorId?: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document introuvable');

    // Ne peut pas "réactiver" un document REJECTED
    if (doc.status === DocumentStatus.REJECTED && dto.status === DocumentStatus.ACTIVE) {
      throw new BadRequestException('Un document rejeté ne peut pas être réactivé directement.');
    }

    const updated = await this.prisma.document.update({
      where: { id },
      data: { status: dto.status, notes: dto.notes ?? doc.notes },
    });

    try {
      await this.auditService.log({
        action: 'DOCUMENT_STATUS_CHANGED',
        entityType: doc.linkedEntityType as unknown as EntityType,
        entityId: doc.linkedEntityId,
        userId: actorId,
        previousData: { status: doc.status },
        newData: { status: dto.status },
      });
    } catch {
      /* non-bloquant */
    }

    return updated;
  }

  async delete(id: string, actorId?: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document introuvable');

    // Soft-delete via statut ARCHIVED + suppression physique MinIO
    await this.prisma.document.update({
      where: { id },
      data: { status: DocumentStatus.ARCHIVED },
    });

    await this.storage.delete(doc.storageKey);

    try {
      await this.auditService.log({
        action: 'DOCUMENT_DELETED',
        entityType: doc.linkedEntityType as unknown as EntityType,
        entityId: doc.linkedEntityId,
        userId: actorId,
        newData: { documentId: id },
      });
    } catch {
      /* non-bloquant */
    }

    return { success: true };
  }
}
