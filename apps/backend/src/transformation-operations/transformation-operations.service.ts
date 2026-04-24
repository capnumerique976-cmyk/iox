import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CodeGeneratorService } from '../common/services/code-generator.service';
import {
  CreateTransformationOperationDto,
  UpdateTransformationOperationDto,
  QueryTransformationOperationsDto,
} from './dto/transformation-operation.dto';
import { InboundBatchStatus } from '@iox/shared';
import { EntityType } from '@iox/shared';

const OP_INCLUDE = {
  inboundBatch: {
    select: {
      id: true,
      code: true,
      status: true,
      quantity: true,
      unit: true,
      product: { select: { id: true, code: true, name: true } },
      supplier: { select: { id: true, code: true, name: true } },
    },
  },
  _count: { select: { productBatches: true } },
};

@Injectable()
export class TransformationOperationsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private codeGenerator: CodeGeneratorService,
  ) {}

  async findAll(query: QueryTransformationOperationsDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
        { site: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.inboundBatchId) where.inboundBatchId = query.inboundBatchId;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.transformationOperation.findMany({
        where,
        include: OP_INCLUDE,
        skip,
        take: limit,
        orderBy: { operationDate: 'desc' },
      }),
      this.prisma.transformationOperation.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string) {
    const op = await this.prisma.transformationOperation.findFirst({
      where: { id },
      include: {
        ...OP_INCLUDE,
        productBatches: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            code: true,
            status: true,
            quantity: true,
            unit: true,
            productionDate: true,
          },
        },
      },
    });
    if (!op) throw new NotFoundException('Opération de transformation introuvable');
    return op;
  }

  async create(dto: CreateTransformationOperationDto, actorId?: string) {
    // Le lot entrant doit être ACCEPTED
    const inboundBatch = await this.prisma.inboundBatch.findFirst({
      where: { id: dto.inboundBatchId, deletedAt: null },
    });
    if (!inboundBatch) throw new NotFoundException('Lot entrant introuvable');
    if (inboundBatch.status !== InboundBatchStatus.ACCEPTED) {
      throw new BadRequestException(
        `Le lot ${inboundBatch.code} doit être au statut ACCEPTED pour lancer une transformation. ` +
          `Statut actuel : ${inboundBatch.status}`,
      );
    }

    const code = await this.codeGenerator.generate('transformationOperation');

    const op = await this.prisma.transformationOperation.create({
      data: {
        code,
        inboundBatchId: dto.inboundBatchId,
        name: dto.name,
        description: dto.description,
        operationDate: new Date(dto.operationDate),
        site: dto.site,
        yieldRate: dto.yieldRate,
        operatorNotes: dto.operatorNotes,
        createdById: actorId,
        updatedById: actorId,
      },
      include: OP_INCLUDE,
    });

    await this.auditService.log({
      action: 'TRANSFORMATION_OP_CREATED',
      entityType: EntityType.TRANSFORMATION_OPERATION,
      entityId: op.id,
      userId: actorId,
      newData: { code: op.code, name: op.name, inboundBatchId: dto.inboundBatchId },
    });

    return op;
  }

  async update(id: string, dto: UpdateTransformationOperationDto, actorId?: string) {
    const op = await this.prisma.transformationOperation.findFirst({ where: { id } });
    if (!op) throw new NotFoundException('Opération de transformation introuvable');

    const updated = await this.prisma.transformationOperation.update({
      where: { id },
      data: {
        ...dto,
        operationDate: dto.operationDate ? new Date(dto.operationDate) : undefined,
        updatedById: actorId,
      },
      include: OP_INCLUDE,
    });

    await this.auditService.log({
      action: 'TRANSFORMATION_OP_UPDATED',
      entityType: EntityType.TRANSFORMATION_OPERATION,
      entityId: id,
      userId: actorId,
      previousData: { name: op.name, yieldRate: String(op.yieldRate) },
      newData: { name: updated.name, yieldRate: String(updated.yieldRate) },
    });

    return updated;
  }
}
