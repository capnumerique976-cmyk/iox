import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CodeGeneratorService } from '../common/services/code-generator.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ChangeProductStatusDto,
  QueryProductsDto,
} from './dto/product.dto';
import { ProductStatus, PRODUCT_STATUS_TRANSITIONS } from '@iox/shared';
import { EntityType } from '@iox/shared';

const PRODUCT_INCLUDE = {
  beneficiary: { select: { id: true, code: true, name: true, type: true } },
  _count: { select: { productBatches: true, documents: true } },
};

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private codeGenerator: CodeGeneratorService,
  ) {}

  async findAll(query: QueryProductsDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { commercialName: { contains: query.search, mode: 'insensitive' } },
        { category: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.status) where.status = query.status;
    if (query.category) where.category = { contains: query.category, mode: 'insensitive' };
    if (query.beneficiaryId) where.beneficiaryId = query.beneficiaryId;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: PRODUCT_INCLUDE,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        ...PRODUCT_INCLUDE,
        documents: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
        },
        productBatches: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });
    if (!product) throw new NotFoundException('Produit introuvable');
    return product;
  }

  async create(dto: CreateProductDto, actorId?: string) {
    // Vérifier que le bénéficiaire existe
    const beneficiary = await this.prisma.beneficiary.findFirst({
      where: { id: dto.beneficiaryId, deletedAt: null },
    });
    if (!beneficiary) throw new NotFoundException('Bénéficiaire introuvable');

    const code = await this.codeGenerator.generate('product');

    const product = await this.prisma.product.create({
      data: {
        code,
        name: dto.name,
        commercialName: dto.commercialName,
        category: dto.category,
        description: dto.description,
        origin: dto.origin,
        transformationSite: dto.transformationSite,
        packagingSpec: dto.packagingSpec,
        productionCapacity: dto.productionCapacity,
        unit: dto.unit,
        ingredients: dto.ingredients,
        allergens: dto.allergens ?? [],
        shelfLife: dto.shelfLife,
        storageConditions: dto.storageConditions,
        labelingInfo: dto.labelingInfo,
        nutritionalInfo: dto.nutritionalInfo,
        technicalNotes: dto.technicalNotes,
        beneficiaryId: dto.beneficiaryId,
        status: ProductStatus.DRAFT,
        version: 1,
        createdById: actorId,
        updatedById: actorId,
      },
      include: PRODUCT_INCLUDE,
    });

    await this.auditService.log({
      action: 'PRODUCT_CREATED',
      entityType: EntityType.PRODUCT,
      entityId: product.id,
      userId: actorId,
      newData: { code: product.code, name: product.name, beneficiaryId: product.beneficiaryId },
    });

    return product;
  }

  async update(id: string, dto: UpdateProductDto, actorId?: string) {
    const product = await this.prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!product) throw new NotFoundException('Produit introuvable');

    // Chaque modification substantielle incrémente la version
    const shouldIncrementVersion =
      dto.versionNotes ||
      dto.packagingSpec !== undefined ||
      dto.labelingInfo !== undefined ||
      dto.ingredients !== undefined;

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...dto,
        allergens: dto.allergens,
        version: shouldIncrementVersion ? { increment: 1 } : undefined,
        updatedById: actorId,
      },
      include: PRODUCT_INCLUDE,
    });

    await this.auditService.log({
      action: 'PRODUCT_UPDATED',
      entityType: EntityType.PRODUCT,
      entityId: id,
      userId: actorId,
      previousData: { name: product.name, version: product.version },
      newData: { name: updated.name, version: updated.version },
    });

    return updated;
  }

  async changeStatus(id: string, dto: ChangeProductStatusDto, actorId?: string) {
    const product = await this.prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!product) throw new NotFoundException('Produit introuvable');

    const allowed = PRODUCT_STATUS_TRANSITIONS[product.status as ProductStatus];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Transition ${product.status} → ${dto.status} non autorisée. ` +
          `Transitions valides : ${allowed.join(', ') || 'aucune'}`,
      );
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: { status: dto.status, updatedById: actorId },
      include: PRODUCT_INCLUDE,
    });

    await this.auditService.log({
      action: 'PRODUCT_STATUS_CHANGED',
      entityType: EntityType.PRODUCT,
      entityId: id,
      userId: actorId,
      previousData: { status: product.status },
      newData: { status: dto.status, reason: dto.reason },
    });

    return updated;
  }

  // Utilisé par les modules Lot et Mise en marché pour vérifier le statut
  async assertProductEligible(id: string): Promise<void> {
    const product = await this.prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!product) throw new NotFoundException('Produit introuvable');
    if (product.status === ProductStatus.BLOCKED || product.status === ProductStatus.ARCHIVED) {
      throw new BadRequestException(
        `Le produit ${product.code} est ${product.status.toLowerCase()} et ne peut pas être utilisé.`,
      );
    }
  }
}
