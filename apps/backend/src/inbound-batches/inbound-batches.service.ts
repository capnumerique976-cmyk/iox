import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CodeGeneratorService } from '../common/services/code-generator.service';
import {
  CreateInboundBatchDto,
  UpdateInboundBatchDto,
  ChangeInboundBatchStatusDto,
  QueryInboundBatchesDto,
} from './dto/inbound-batch.dto';
import { InboundBatchStatus, INBOUND_BATCH_STATUS_TRANSITIONS } from '@iox/shared';
import { EntityType } from '@iox/shared';

const BATCH_INCLUDE = {
  supplier: { select: { id: true, code: true, name: true } },
  product: { select: { id: true, code: true, name: true, status: true } },
  supplyContract: { select: { id: true, code: true, status: true } },
  _count: { select: { transformationOperations: true, documents: true } },
};

@Injectable()
export class InboundBatchesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private codeGenerator: CodeGeneratorService,
  ) {}

  async findAll(query: QueryInboundBatchesDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };
    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { origin: { contains: query.search, mode: 'insensitive' } },
        { product: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }
    if (query.status) where.status = query.status;
    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.productId) where.productId = query.productId;
    if (query.supplyContractId) where.supplyContractId = query.supplyContractId;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.inboundBatch.findMany({
        where,
        include: BATCH_INCLUDE,
        skip,
        take: limit,
        orderBy: { receivedAt: 'desc' },
      }),
      this.prisma.inboundBatch.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string) {
    const batch = await this.prisma.inboundBatch.findFirst({
      where: { id, deletedAt: null },
      include: {
        ...BATCH_INCLUDE,
        transformationOperations: {
          orderBy: { operationDate: 'desc' },
          take: 10,
          select: { id: true, code: true, name: true, operationDate: true, yieldRate: true },
        },
        documents: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!batch) throw new NotFoundException('Lot entrant introuvable');
    return batch;
  }

  async create(dto: CreateInboundBatchDto, actorId?: string) {
    // Vérifier fournisseur
    const supplier = await this.prisma.company.findFirst({
      where: { id: dto.supplierId, deletedAt: null, isActive: true },
    });
    if (!supplier) throw new NotFoundException('Fournisseur introuvable ou inactif');

    // Vérifier produit
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Produit introuvable');

    // Vérifier contrat si fourni
    if (dto.supplyContractId) {
      const contract = await this.prisma.supplyContract.findFirst({
        where: { id: dto.supplyContractId, deletedAt: null },
      });
      if (!contract) throw new NotFoundException("Contrat d'approvisionnement introuvable");
    }

    const code = await this.codeGenerator.generate('inboundBatch');

    const batch = await this.prisma.inboundBatch.create({
      data: {
        code,
        supplierId: dto.supplierId,
        productId: dto.productId,
        supplyContractId: dto.supplyContractId,
        receivedAt: new Date(dto.receivedAt),
        quantity: dto.quantity,
        unit: dto.unit,
        origin: dto.origin,
        notes: dto.notes,
        status: InboundBatchStatus.RECEIVED,
        createdById: actorId,
        updatedById: actorId,
      },
      include: BATCH_INCLUDE,
    });

    await this.auditService.log({
      action: 'INBOUND_BATCH_CREATED',
      entityType: EntityType.INBOUND_BATCH,
      entityId: batch.id,
      userId: actorId,
      newData: {
        code: batch.code,
        productId: dto.productId,
        quantity: dto.quantity,
        unit: dto.unit,
        status: batch.status,
      },
    });

    return batch;
  }

  async update(id: string, dto: UpdateInboundBatchDto, actorId?: string) {
    const batch = await this.prisma.inboundBatch.findFirst({ where: { id, deletedAt: null } });
    if (!batch) throw new NotFoundException('Lot entrant introuvable');

    // Seuls les lots RECEIVED peuvent encore être modifiés
    if (batch.status !== InboundBatchStatus.RECEIVED) {
      throw new BadRequestException(
        'Un lot en cours de contrôle ou clôturé ne peut plus être modifié.',
      );
    }

    const updated = await this.prisma.inboundBatch.update({
      where: { id },
      data: { ...dto, updatedById: actorId },
      include: BATCH_INCLUDE,
    });

    await this.auditService.log({
      action: 'INBOUND_BATCH_UPDATED',
      entityType: EntityType.INBOUND_BATCH,
      entityId: id,
      userId: actorId,
      previousData: { quantity: String(batch.quantity), unit: batch.unit },
      newData: { quantity: String(updated.quantity), unit: updated.unit },
    });

    return updated;
  }

  async changeStatus(id: string, dto: ChangeInboundBatchStatusDto, actorId?: string) {
    const batch = await this.prisma.inboundBatch.findFirst({ where: { id, deletedAt: null } });
    if (!batch) throw new NotFoundException('Lot entrant introuvable');

    const allowed = INBOUND_BATCH_STATUS_TRANSITIONS[batch.status as InboundBatchStatus];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Transition ${batch.status} → ${dto.status} non autorisée. ` +
          `Transitions valides : ${allowed.join(', ') || 'aucune'}`,
      );
    }

    const data: Record<string, unknown> = {
      status: dto.status,
      updatedById: actorId,
    };

    // Enregistrer les notes de contrôle + horodatage lors du passage IN_CONTROL
    if (dto.status === InboundBatchStatus.IN_CONTROL) {
      data.controlledAt = new Date();
      data.controlledById = actorId;
      if (dto.controlNotes) data.controlNotes = dto.controlNotes;
    }
    // Enrichir les notes de contrôle également pour ACCEPTED / REJECTED
    if (dto.controlNotes) data.controlNotes = dto.controlNotes;

    const updated = await this.prisma.inboundBatch.update({
      where: { id },
      data,
      include: BATCH_INCLUDE,
    });

    await this.auditService.log({
      action: 'INBOUND_BATCH_STATUS_CHANGED',
      entityType: EntityType.INBOUND_BATCH,
      entityId: id,
      userId: actorId,
      previousData: { status: batch.status },
      newData: { status: dto.status, controlNotes: dto.controlNotes },
    });

    return updated;
  }
}
