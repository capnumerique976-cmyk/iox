import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CodeGeneratorService } from '../common/services/code-generator.service';
import { ProductsService } from '../products/products.service';
import {
  CreateProductBatchDto,
  UpdateProductBatchDto,
  ChangeProductBatchStatusDto,
  QueryProductBatchesDto,
} from './dto/product-batch.dto';
import { ProductBatchStatus, PRODUCT_BATCH_STATUS_TRANSITIONS } from '@iox/shared';
import { EntityType } from '@iox/shared';

const BATCH_INCLUDE = {
  product: { select: { id: true, code: true, name: true, status: true } },
  transformationOp: {
    select: {
      id: true,
      code: true,
      name: true,
      inboundBatch: { select: { id: true, code: true, supplier: { select: { name: true } } } },
    },
  },
  _count: { select: { labelValidations: true, marketReleaseDecisions: true, documents: true } },
};

@Injectable()
export class ProductBatchesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private codeGenerator: CodeGeneratorService,
    private productsService: ProductsService,
  ) {}

  async findAll(query: QueryProductBatchesDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };
    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { product: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }
    if (query.status) where.status = query.status;
    if (query.productId) where.productId = query.productId;
    if (query.transformationOpId) where.transformationOpId = query.transformationOpId;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.productBatch.findMany({
        where,
        include: BATCH_INCLUDE,
        skip,
        take: limit,
        orderBy: { productionDate: 'desc' },
      }),
      this.prisma.productBatch.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string) {
    const batch = await this.prisma.productBatch.findFirst({
      where: { id, deletedAt: null },
      include: {
        ...BATCH_INCLUDE,
        labelValidations: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, isValid: true, validatedAt: true, reservations: true, notes: true },
        },
        marketReleaseDecisions: {
          where: { isActive: true },
          take: 1,
          select: {
            id: true,
            decision: true,
            isActive: true,
            reservations: true,
            blockingReason: true,
          },
        },
        documents: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!batch) throw new NotFoundException('Lot produit introuvable');
    return batch;
  }

  async create(dto: CreateProductBatchDto, actorId?: string) {
    // Règle métier : le produit doit être éligible (non BLOCKED / ARCHIVED)
    await this.productsService.assertProductEligible(dto.productId);

    // Vérifier l'opération de transformation si fournie
    if (dto.transformationOpId) {
      const op = await this.prisma.transformationOperation.findFirst({
        where: { id: dto.transformationOpId },
      });
      if (!op) throw new NotFoundException('Opération de transformation introuvable');
    }

    const code = await this.codeGenerator.generate('productBatch');

    const batch = await this.prisma.productBatch.create({
      data: {
        code,
        productId: dto.productId,
        transformationOpId: dto.transformationOpId,
        quantity: dto.quantity,
        unit: dto.unit,
        productionDate: new Date(dto.productionDate),
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        storageLocation: dto.storageLocation,
        notes: dto.notes,
        status: ProductBatchStatus.CREATED,
        createdById: actorId,
        updatedById: actorId,
      },
      include: BATCH_INCLUDE,
    });

    await this.auditService.log({
      action: 'PRODUCT_BATCH_CREATED',
      entityType: EntityType.PRODUCT_BATCH,
      entityId: batch.id,
      userId: actorId,
      newData: {
        code: batch.code,
        productId: dto.productId,
        quantity: dto.quantity,
        unit: dto.unit,
      },
    });

    return batch;
  }

  async update(id: string, dto: UpdateProductBatchDto, actorId?: string) {
    const batch = await this.prisma.productBatch.findFirst({ where: { id, deletedAt: null } });
    if (!batch) throw new NotFoundException('Lot produit introuvable');

    // Seuls les lots CREATED peuvent encore être modifiés librement
    if (batch.status !== ProductBatchStatus.CREATED) {
      throw new BadRequestException(
        'Un lot en cours de validation ou commercialisé ne peut plus être modifié directement.',
      );
    }

    const updated = await this.prisma.productBatch.update({
      where: { id },
      data: {
        ...dto,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        updatedById: actorId,
      },
      include: BATCH_INCLUDE,
    });

    await this.auditService.log({
      action: 'PRODUCT_BATCH_UPDATED',
      entityType: EntityType.PRODUCT_BATCH,
      entityId: id,
      userId: actorId,
      previousData: { quantity: String(batch.quantity), unit: batch.unit },
      newData: { quantity: String(updated.quantity), unit: updated.unit },
    });

    return updated;
  }

  async changeStatus(id: string, dto: ChangeProductBatchStatusDto, actorId?: string) {
    const batch = await this.prisma.productBatch.findFirst({ where: { id, deletedAt: null } });
    if (!batch) throw new NotFoundException('Lot produit introuvable');

    const allowed = PRODUCT_BATCH_STATUS_TRANSITIONS[batch.status as ProductBatchStatus];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Transition ${batch.status} → ${dto.status} non autorisée. ` +
          `Transitions valides : ${allowed.join(', ') || 'aucune'}`,
      );
    }

    const updated = await this.prisma.productBatch.update({
      where: { id },
      data: { status: dto.status, updatedById: actorId },
      include: BATCH_INCLUDE,
    });

    await this.auditService.log({
      action: 'PRODUCT_BATCH_STATUS_CHANGED',
      entityType: EntityType.PRODUCT_BATCH,
      entityId: id,
      userId: actorId,
      previousData: { status: batch.status },
      newData: { status: dto.status, reason: dto.reason },
    });

    return updated;
  }
}
