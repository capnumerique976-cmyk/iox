import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CodeGeneratorService } from '../common/services/code-generator.service';
import { CreateCompanyDto, UpdateCompanyDto, QueryCompaniesDto } from './dto/company.dto';
import { EntityType } from '@iox/shared';

const COMPANY_INCLUDE = {
  _count: { select: { supplyContracts: true, inboundBatches: true, documents: true } },
};

@Injectable()
export class CompaniesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private codeGenerator: CodeGeneratorService,
  ) {}

  async findAll(query: QueryCompaniesDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.type) where.types = { has: query.type };
    if (query.isActive !== undefined) where.isActive = query.isActive;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.company.findMany({
        where,
        include: COMPANY_INCLUDE,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.company.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string) {
    const company = await this.prisma.company.findFirst({
      where: { id, deletedAt: null },
      include: {
        ...COMPANY_INCLUDE,
        supplyContracts: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, code: true, status: true, startDate: true, endDate: true },
        },
        documents: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!company) throw new NotFoundException('Entreprise introuvable');
    return company;
  }

  async create(dto: CreateCompanyDto, actorId?: string) {
    const code = await this.codeGenerator.generate('company');

    const company = await this.prisma.company.create({
      data: {
        code,
        name: dto.name,
        types: dto.types,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        city: dto.city,
        country: dto.country,
        vatNumber: dto.vatNumber,
        website: dto.website,
        notes: dto.notes,
        createdById: actorId,
        updatedById: actorId,
      },
      include: COMPANY_INCLUDE,
    });

    await this.auditService.log({
      action: 'COMPANY_CREATED',
      entityType: EntityType.COMPANY,
      entityId: company.id,
      userId: actorId,
      newData: { code: company.code, name: company.name, types: company.types },
    });

    return company;
  }

  async update(id: string, dto: UpdateCompanyDto, actorId?: string) {
    const company = await this.prisma.company.findFirst({ where: { id, deletedAt: null } });
    if (!company) throw new NotFoundException('Entreprise introuvable');

    const updated = await this.prisma.company.update({
      where: { id },
      data: { ...dto, updatedById: actorId },
      include: COMPANY_INCLUDE,
    });

    await this.auditService.log({
      action: 'COMPANY_UPDATED',
      entityType: EntityType.COMPANY,
      entityId: id,
      userId: actorId,
      previousData: { name: company.name, isActive: company.isActive },
      newData: { name: updated.name, isActive: updated.isActive },
    });

    return updated;
  }

  async deactivate(id: string, actorId?: string) {
    const company = await this.prisma.company.findFirst({ where: { id, deletedAt: null } });
    if (!company) throw new NotFoundException('Entreprise introuvable');

    const updated = await this.prisma.company.update({
      where: { id },
      data: { isActive: false, updatedById: actorId },
      include: COMPANY_INCLUDE,
    });

    await this.auditService.log({
      action: 'COMPANY_DEACTIVATED',
      entityType: EntityType.COMPANY,
      entityId: id,
      userId: actorId,
      previousData: { isActive: true },
      newData: { isActive: false },
    });

    return updated;
  }
}
