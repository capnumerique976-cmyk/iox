import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CodeGeneratorService } from '../common/services/code-generator.service';
import {
  CreateSupplyContractDto,
  UpdateSupplyContractDto,
  ChangeSupplyContractStatusDto,
  QuerySupplyContractsDto,
} from './dto/supply-contract.dto';
import { SupplyContractStatus, SUPPLY_CONTRACT_STATUS_TRANSITIONS } from '@iox/shared';
import { EntityType } from '@iox/shared';

const CONTRACT_INCLUDE = {
  supplier: { select: { id: true, code: true, name: true, types: true } },
  products: { select: { id: true, code: true, name: true, status: true } },
  _count: { select: { inboundBatches: true, documents: true } },
};

@Injectable()
export class SupplyContractsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private codeGenerator: CodeGeneratorService,
  ) {}

  async findAll(query: QuerySupplyContractsDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };
    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }
    if (query.status) where.status = query.status;
    if (query.supplierId) where.supplierId = query.supplierId;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.supplyContract.findMany({
        where,
        include: CONTRACT_INCLUDE,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supplyContract.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string) {
    const contract = await this.prisma.supplyContract.findFirst({
      where: { id, deletedAt: null },
      include: {
        ...CONTRACT_INCLUDE,
        inboundBatches: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            code: true,
            status: true,
            receivedAt: true,
            quantity: true,
            unit: true,
          },
        },
        documents: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!contract) throw new NotFoundException('Contrat introuvable');
    return contract;
  }

  async create(dto: CreateSupplyContractDto, actorId?: string) {
    // Vérifier que le fournisseur existe
    const supplier = await this.prisma.company.findFirst({
      where: { id: dto.supplierId, deletedAt: null, isActive: true },
    });
    if (!supplier) throw new NotFoundException('Fournisseur introuvable ou inactif');

    const code = await this.codeGenerator.generate('supplyContract');

    const contract = await this.prisma.supplyContract.create({
      data: {
        code,
        supplierId: dto.supplierId,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        volumeCommitted: dto.volumeCommitted,
        unit: dto.unit,
        paymentTerms: dto.paymentTerms,
        notes: dto.notes,
        status: SupplyContractStatus.DRAFT,
        ...(dto.productIds?.length
          ? { products: { connect: dto.productIds.map((id) => ({ id })) } }
          : {}),
        createdById: actorId,
        updatedById: actorId,
      },
      include: CONTRACT_INCLUDE,
    });

    await this.auditService.log({
      action: 'SUPPLY_CONTRACT_CREATED',
      entityType: EntityType.SUPPLY_CONTRACT,
      entityId: contract.id,
      userId: actorId,
      newData: { code: contract.code, supplierId: dto.supplierId, status: contract.status },
    });

    return contract;
  }

  async update(id: string, dto: UpdateSupplyContractDto, actorId?: string) {
    const contract = await this.prisma.supplyContract.findFirst({ where: { id, deletedAt: null } });
    if (!contract) throw new NotFoundException('Contrat introuvable');

    const updated = await this.prisma.supplyContract.update({
      where: { id },
      data: {
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        volumeCommitted: dto.volumeCommitted,
        unit: dto.unit,
        paymentTerms: dto.paymentTerms,
        notes: dto.notes,
        ...(dto.productIds
          ? { products: { set: dto.productIds.map((pid) => ({ id: pid })) } }
          : {}),
        updatedById: actorId,
      },
      include: CONTRACT_INCLUDE,
    });

    await this.auditService.log({
      action: 'SUPPLY_CONTRACT_UPDATED',
      entityType: EntityType.SUPPLY_CONTRACT,
      entityId: id,
      userId: actorId,
      previousData: { status: contract.status },
      newData: { status: updated.status },
    });

    return updated;
  }

  async changeStatus(id: string, dto: ChangeSupplyContractStatusDto, actorId?: string) {
    const contract = await this.prisma.supplyContract.findFirst({ where: { id, deletedAt: null } });
    if (!contract) throw new NotFoundException('Contrat introuvable');

    const allowed = SUPPLY_CONTRACT_STATUS_TRANSITIONS[contract.status as SupplyContractStatus];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Transition ${contract.status} → ${dto.status} non autorisée. ` +
          `Transitions valides : ${allowed.join(', ') || 'aucune'}`,
      );
    }

    const updated = await this.prisma.supplyContract.update({
      where: { id },
      data: { status: dto.status, updatedById: actorId },
      include: CONTRACT_INCLUDE,
    });

    await this.auditService.log({
      action: 'SUPPLY_CONTRACT_STATUS_CHANGED',
      entityType: EntityType.SUPPLY_CONTRACT,
      entityId: id,
      userId: actorId,
      previousData: { status: contract.status },
      newData: { status: dto.status, reason: dto.reason },
    });

    return updated;
  }
}
