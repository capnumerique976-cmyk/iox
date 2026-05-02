// MP-CATEGORY-1 — Service admin CRUD catégories marketplace.
//
// Tree structure : 1 niveau parent/children via FK self.
// Soft delete : si products attachés, isActive=false. Hard delete sinon.

import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateMarketplaceCategoryDto,
  UpdateMarketplaceCategoryDto,
} from './dto/marketplace-category.dto';

export interface CategoryNode {
  id: string;
  slug: string;
  nameFr: string;
  nameEn: string | null;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  productsCount: number;
  children: CategoryNode[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class MarketplaceCategoriesService {
  private readonly logger = new Logger(MarketplaceCategoriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Liste complète arborescente (tree). Retourne uniquement la racine
   * (parentId null), avec children récursifs.
   * Inclut productsCount sur chaque node pour UI delete protection.
   */
  async findAllTree(includeInactive = false): Promise<CategoryNode[]> {
    const where: Prisma.MarketplaceCategoryWhereInput = includeInactive
      ? {}
      : { isActive: true };
    const categories = await this.prisma.marketplaceCategory.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { nameFr: 'asc' }],
      include: {
        _count: { select: { marketplaceProducts: true } },
      },
    });

    const nodeMap = new Map<string, CategoryNode>();
    for (const cat of categories) {
      nodeMap.set(cat.id, {
        id: cat.id,
        slug: cat.slug,
        nameFr: cat.nameFr,
        nameEn: cat.nameEn,
        description: cat.description,
        parentId: cat.parentId,
        sortOrder: cat.sortOrder,
        isActive: cat.isActive,
        productsCount: cat._count.marketplaceProducts,
        children: [],
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt,
      });
    }

    const roots: CategoryNode[] = [];
    for (const node of nodeMap.values()) {
      if (node.parentId) {
        const parent = nodeMap.get(node.parentId);
        if (parent) parent.children.push(node);
        else roots.push(node); // parent inactif filtré : node devient orphan racine
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  async findById(id: string) {
    const cat = await this.prisma.marketplaceCategory.findUnique({
      where: { id },
      include: { _count: { select: { marketplaceProducts: true } } },
    });
    if (!cat) throw new NotFoundException('Catégorie introuvable');
    return cat;
  }

  async create(dto: CreateMarketplaceCategoryDto, actorId: string) {
    // Slug unique check (DB constraint mais on retourne 409 propre).
    const existing = await this.prisma.marketplaceCategory.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Slug "${dto.slug}" déjà utilisé`);
    }

    if (dto.parentId) {
      const parent = await this.prisma.marketplaceCategory.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) throw new BadRequestException('Catégorie parente introuvable');
    }

    const cat = await this.prisma.marketplaceCategory.create({
      data: {
        slug: dto.slug,
        nameFr: dto.nameFr,
        nameEn: dto.nameEn,
        description: dto.description ?? null,
        parentId: dto.parentId ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });

    await this.audit.log({
      action: 'MARKETPLACE_CATEGORY_CREATED',
      entityType: 'MARKETPLACE_PRODUCT' as never, // pas d'enum dédié, on réutilise
      entityId: cat.id,
      userId: actorId,
      newData: { slug: cat.slug, nameFr: cat.nameFr, parentId: cat.parentId },
    });

    this.logger.log(`Category created id=${cat.id} slug=${cat.slug}`);
    return cat;
  }

  async update(id: string, dto: UpdateMarketplaceCategoryDto, actorId: string) {
    const existing = await this.findById(id);

    // Validation parent : ne pas créer de cycle (parent ≠ self).
    if (dto.parentId === id) {
      throw new BadRequestException('Catégorie ne peut pas être son propre parent');
    }
    if (dto.parentId) {
      const parent = await this.prisma.marketplaceCategory.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) throw new BadRequestException('Catégorie parente introuvable');
      // V1 : pas de check cycle profond (parent → grandparent → self).
      // À ajouter en V2 si arbre devient profond.
    }

    const updated = await this.prisma.marketplaceCategory.update({
      where: { id },
      data: {
        ...(dto.nameFr !== undefined ? { nameFr: dto.nameFr } : {}),
        ...(dto.nameEn !== undefined ? { nameEn: dto.nameEn } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    await this.audit.log({
      action: 'MARKETPLACE_CATEGORY_UPDATED',
      entityType: 'MARKETPLACE_PRODUCT' as never,
      entityId: id,
      userId: actorId,
      previousData: {
        nameFr: existing.nameFr,
        parentId: existing.parentId,
        isActive: existing.isActive,
      },
      newData: {
        nameFr: updated.nameFr,
        parentId: updated.parentId,
        isActive: updated.isActive,
      },
    });

    return updated;
  }

  /**
   * Suppression : si products attachés OU children → soft delete (isActive=false).
   * Sinon hard delete.
   */
  async delete(id: string, actorId: string) {
    const cat = await this.findById(id);
    const childrenCount = await this.prisma.marketplaceCategory.count({
      where: { parentId: id },
    });

    if (cat._count.marketplaceProducts > 0 || childrenCount > 0) {
      // Soft delete
      const updated = await this.prisma.marketplaceCategory.update({
        where: { id },
        data: { isActive: false },
      });
      await this.audit.log({
        action: 'MARKETPLACE_CATEGORY_DEACTIVATED',
        entityType: 'MARKETPLACE_PRODUCT' as never,
        entityId: id,
        userId: actorId,
        newData: {
          reason: 'has_products_or_children',
          productsCount: cat._count.marketplaceProducts,
          childrenCount,
        },
      });
      this.logger.log(
        `Category soft-deleted id=${id} products=${cat._count.marketplaceProducts} children=${childrenCount}`,
      );
      return { id: updated.id, deleted: false, deactivated: true };
    }

    // Hard delete
    await this.prisma.marketplaceCategory.delete({ where: { id } });
    await this.audit.log({
      action: 'MARKETPLACE_CATEGORY_DELETED',
      entityType: 'MARKETPLACE_PRODUCT' as never,
      entityId: id,
      userId: actorId,
      previousData: { slug: cat.slug, nameFr: cat.nameFr },
    });
    this.logger.log(`Category hard-deleted id=${id}`);
    return { id, deleted: true, deactivated: false };
  }
}
