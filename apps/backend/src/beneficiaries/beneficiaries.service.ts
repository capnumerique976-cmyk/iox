import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CodeGeneratorService } from '../common/services/code-generator.service';
import {
  CreateBeneficiaryDto,
  UpdateBeneficiaryDto,
  ChangeBeneficiaryStatusDto,
  UpsertDiagnosticDto,
  CreateActionDto,
  UpdateActionDto,
  QueryBeneficiariesDto,
} from './dto/beneficiary.dto';
import { BeneficiaryStatus, BENEFICIARY_STATUS_TRANSITIONS } from '@iox/shared';
import { EntityType } from '@iox/shared';

const BENEFICIARY_INCLUDE = {
  referent: { select: { id: true, firstName: true, lastName: true, email: true } },
  diagnostic: true,
  _count: { select: { actions: true, products: true, documents: true } },
};

@Injectable()
export class BeneficiariesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private codeGenerator: CodeGeneratorService,
  ) {}

  async findAll(query: QueryBeneficiariesDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { sector: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.status) where.status = query.status;
    if (query.sector) where.sector = { contains: query.sector, mode: 'insensitive' };
    if (query.referentId) where.referentId = query.referentId;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.beneficiary.findMany({
        where,
        include: BENEFICIARY_INCLUDE,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.beneficiary.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string) {
    const ben = await this.prisma.beneficiary.findFirst({
      where: { id, deletedAt: null },
      include: {
        ...BENEFICIARY_INCLUDE,
        actions: { orderBy: { createdAt: 'desc' } },
        documents: { where: { status: 'ACTIVE' }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!ben) throw new NotFoundException('Bénéficiaire introuvable');
    return ben;
  }

  async findByCode(code: string) {
    const ben = await this.prisma.beneficiary.findFirst({
      where: { code, deletedAt: null },
    });
    if (!ben) throw new NotFoundException(`Bénéficiaire ${code} introuvable`);
    return ben;
  }

  async create(dto: CreateBeneficiaryDto, actorId?: string) {
    const code = await this.codeGenerator.generate('beneficiary');

    const beneficiary = await this.prisma.beneficiary.create({
      data: {
        code,
        name: dto.name,
        type: dto.type,
        status: BeneficiaryStatus.DRAFT,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        city: dto.city,
        postalCode: dto.postalCode,
        siret: dto.siret,
        sector: dto.sector,
        description: dto.description,
        legalStatus: dto.legalStatus,
        establishedAt: dto.establishedAt ? new Date(dto.establishedAt) : undefined,
        employeeCount: dto.employeeCount,
        certifications: dto.certifications ?? [],
        capacityDescription: dto.capacityDescription,
        referentId: dto.referentId,
        createdById: actorId,
        updatedById: actorId,
      },
      include: BENEFICIARY_INCLUDE,
    });

    await this.auditService.log({
      action: 'BENEFICIARY_CREATED',
      entityType: EntityType.BENEFICIARY,
      entityId: beneficiary.id,
      userId: actorId,
      newData: { code: beneficiary.code, name: beneficiary.name, status: beneficiary.status },
    });

    return beneficiary;
  }

  async update(id: string, dto: UpdateBeneficiaryDto, actorId?: string) {
    const ben = await this.prisma.beneficiary.findFirst({ where: { id, deletedAt: null } });
    if (!ben) throw new NotFoundException('Bénéficiaire introuvable');

    const updated = await this.prisma.beneficiary.update({
      where: { id },
      data: {
        ...dto,
        establishedAt: dto.establishedAt ? new Date(dto.establishedAt) : undefined,
        updatedById: actorId,
      },
      include: BENEFICIARY_INCLUDE,
    });

    await this.auditService.log({
      action: 'BENEFICIARY_UPDATED',
      entityType: EntityType.BENEFICIARY,
      entityId: id,
      userId: actorId,
      previousData: { name: ben.name },
      newData: { name: updated.name },
    });

    return updated;
  }

  async changeStatus(id: string, dto: ChangeBeneficiaryStatusDto, actorId?: string) {
    const ben = await this.prisma.beneficiary.findFirst({ where: { id, deletedAt: null } });
    if (!ben) throw new NotFoundException('Bénéficiaire introuvable');

    const allowedTransitions = BENEFICIARY_STATUS_TRANSITIONS[ben.status as BeneficiaryStatus];
    if (!allowedTransitions.includes(dto.status)) {
      throw new BadRequestException(
        `Transition ${ben.status} → ${dto.status} non autorisée. ` +
          `Transitions valides : ${allowedTransitions.join(', ') || 'aucune'}`,
      );
    }

    const updated = await this.prisma.beneficiary.update({
      where: { id },
      data: { status: dto.status, updatedById: actorId },
      include: BENEFICIARY_INCLUDE,
    });

    await this.auditService.log({
      action: 'BENEFICIARY_STATUS_CHANGED',
      entityType: EntityType.BENEFICIARY,
      entityId: id,
      userId: actorId,
      previousData: { status: ben.status },
      newData: { status: dto.status, reason: dto.reason },
    });

    return updated;
  }

  // ─── DIAGNOSTIC ─────────────────────────────────────────────────────────────

  async upsertDiagnostic(beneficiaryId: string, dto: UpsertDiagnosticDto, actorId?: string) {
    const ben = await this.prisma.beneficiary.findFirst({
      where: { id: beneficiaryId, deletedAt: null },
    });
    if (!ben) throw new NotFoundException('Bénéficiaire introuvable');

    const diagnostic = await this.prisma.beneficiaryDiagnostic.upsert({
      where: { beneficiaryId },
      create: {
        beneficiaryId,
        maturityLevel: dto.maturityLevel,
        constraints: dto.constraints,
        needs: dto.needs,
        objectives: dto.objectives,
        risks: dto.risks,
        priorities: dto.priorities,
        notes: dto.notes,
        conductedAt: dto.conductedAt ? new Date(dto.conductedAt) : undefined,
        conductedById: actorId,
        createdById: actorId,
      },
      update: {
        maturityLevel: dto.maturityLevel,
        constraints: dto.constraints,
        needs: dto.needs,
        objectives: dto.objectives,
        risks: dto.risks,
        priorities: dto.priorities,
        notes: dto.notes,
        conductedAt: dto.conductedAt ? new Date(dto.conductedAt) : undefined,
        conductedById: actorId,
      },
    });

    await this.auditService.log({
      action: 'BENEFICIARY_DIAGNOSTIC_UPSERTED',
      entityType: EntityType.BENEFICIARY,
      entityId: beneficiaryId,
      userId: actorId,
      newData: { maturityLevel: diagnostic.maturityLevel },
    });

    return diagnostic;
  }

  // ─── ACTIONS D'ACCOMPAGNEMENT ────────────────────────────────────────────────

  async findActions(beneficiaryId: string) {
    const ben = await this.prisma.beneficiary.findFirst({
      where: { id: beneficiaryId, deletedAt: null },
    });
    if (!ben) throw new NotFoundException('Bénéficiaire introuvable');

    return this.prisma.accompanimentAction.findMany({
      where: { beneficiaryId },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    });
  }

  async createAction(beneficiaryId: string, dto: CreateActionDto, actorId?: string) {
    const ben = await this.prisma.beneficiary.findFirst({
      where: { id: beneficiaryId, deletedAt: null },
    });
    if (!ben) throw new NotFoundException('Bénéficiaire introuvable');

    const action = await this.prisma.accompanimentAction.create({
      data: {
        beneficiaryId,
        title: dto.title,
        description: dto.description,
        actionType: dto.actionType,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        notes: dto.notes,
        assignedToId: dto.assignedToId,
        createdById: actorId,
        updatedById: actorId,
      },
    });

    await this.auditService.log({
      action: 'ACCOMPANIMENT_ACTION_CREATED',
      entityType: EntityType.BENEFICIARY,
      entityId: beneficiaryId,
      userId: actorId,
      newData: { actionId: action.id, title: action.title, actionType: action.actionType },
    });

    return action;
  }

  async updateAction(
    beneficiaryId: string,
    actionId: string,
    dto: UpdateActionDto,
    actorId?: string,
  ) {
    const action = await this.prisma.accompanimentAction.findFirst({
      where: { id: actionId, beneficiaryId },
    });
    if (!action) throw new NotFoundException('Action introuvable');

    const updated = await this.prisma.accompanimentAction.update({
      where: { id: actionId },
      data: {
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        completedAt: dto.completedAt ? new Date(dto.completedAt) : undefined,
        updatedById: actorId,
      },
    });

    await this.auditService.log({
      action: 'ACCOMPANIMENT_ACTION_UPDATED',
      entityType: EntityType.BENEFICIARY,
      entityId: beneficiaryId,
      userId: actorId,
      previousData: { status: action.status },
      newData: { status: updated.status },
    });

    return updated;
  }
}
