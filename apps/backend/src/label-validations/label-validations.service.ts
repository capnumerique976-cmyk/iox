import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateLabelValidationDto,
  UpdateLabelValidationDto,
  QueryLabelValidationsDto,
} from './dto/label-validation.dto';
import { EntityType } from '@iox/shared';

const VALIDATION_INCLUDE = {
  productBatch: {
    select: { id: true, code: true, status: true, product: { select: { id: true, name: true } } },
  },
  validatedBy: { select: { id: true, firstName: true, lastName: true } },
};

@Injectable()
export class LabelValidationsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(query: QueryLabelValidationsDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.productBatchId) where.productBatchId = query.productBatchId;
    if (query.isValid !== undefined) where.isValid = query.isValid === 'true';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.labelValidation.findMany({
        where,
        include: VALIDATION_INCLUDE,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.labelValidation.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string) {
    const v = await this.prisma.labelValidation.findUnique({
      where: { id },
      include: VALIDATION_INCLUDE,
    });
    if (!v) throw new NotFoundException("Validation d'étiquetage introuvable");
    return v;
  }

  async create(dto: CreateLabelValidationDto, actorId?: string) {
    // Vérifier que le lot existe
    const batch = await this.prisma.productBatch.findFirst({
      where: { id: dto.productBatchId, deletedAt: null },
    });
    if (!batch) throw new NotFoundException('Lot produit introuvable');

    // Un lot doit être au moins CREATED pour recevoir une validation
    const FORBIDDEN_STATUSES = ['SHIPPED', 'DESTROYED'];
    if (FORBIDDEN_STATUSES.includes(batch.status)) {
      throw new BadRequestException(
        `Impossible de valider l'étiquetage d'un lot au statut ${batch.status}.`,
      );
    }

    const validation = await this.prisma.labelValidation.create({
      data: {
        productBatchId: dto.productBatchId,
        isValid: dto.isValid,
        notes: dto.notes,
        reservations: dto.reservations ?? [],
        validatedAt: new Date(),
        validatedById: actorId,
        createdById: actorId,
      },
      include: VALIDATION_INCLUDE,
    });

    try {
      await this.auditService.log({
        action: 'LABEL_VALIDATION_CREATED',
        entityType: EntityType.PRODUCT_BATCH,
        entityId: dto.productBatchId,
        userId: actorId,
        newData: {
          validationId: validation.id,
          isValid: String(dto.isValid),
          reservations: (dto.reservations ?? []).join(', '),
        },
      });
    } catch {
      /* non-bloquant */
    }

    return validation;
  }

  async update(id: string, dto: UpdateLabelValidationDto, actorId?: string) {
    const existing = await this.prisma.labelValidation.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Validation d'étiquetage introuvable");

    const updated = await this.prisma.labelValidation.update({
      where: { id },
      data: {
        ...(dto.isValid !== undefined && { isValid: dto.isValid }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.reservations !== undefined && { reservations: dto.reservations }),
        validatedAt: new Date(),
        validatedById: actorId,
      },
      include: VALIDATION_INCLUDE,
    });

    try {
      await this.auditService.log({
        action: 'LABEL_VALIDATION_UPDATED',
        entityType: EntityType.PRODUCT_BATCH,
        entityId: existing.productBatchId,
        userId: actorId,
        previousData: { isValid: String(existing.isValid) },
        newData: { isValid: String(updated.isValid) },
      });
    } catch {
      /* non-bloquant */
    }

    return updated;
  }
}
