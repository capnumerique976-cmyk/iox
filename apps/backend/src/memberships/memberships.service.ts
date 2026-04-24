import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EntityType, UserRole } from '@iox/shared';
import { CreateMembershipDto, QueryMembershipsDto } from './dto/membership.dto';

/**
 * Gestion admin des `UserCompanyMembership`.
 *
 * Règles métier :
 *  - (userId, companyId) unique → conflit 409 si déjà existant ;
 *  - un seul `isPrimary=true` par user : toute mutation marquant une appartenance
 *    primaire bascule automatiquement les autres à `false` ;
 *  - suppression d'une membership primary : si d'autres memberships existent
 *    pour le user, la plus ancienne est auto-promue primaire.
 *
 * Toutes les mutations sont auditées via `AuditService` avec
 * `entityType = EntityType.USER` (l'entité cible fonctionnelle est bien
 * l'utilisateur dont on modifie le périmètre ownership). Le `notes` et le
 * champ `newData` détaillent la membership concernée.
 */
const MEMBERSHIP_INCLUDE = {
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  },
  company: {
    select: {
      id: true,
      code: true,
      name: true,
      sellerProfile: {
        select: { id: true, publicDisplayName: true, status: true },
      },
    },
  },
} as const;

@Injectable()
export class MembershipsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(query: QueryMembershipsDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.userId) where.userId = query.userId;
    if (query.companyId) where.companyId = query.companyId;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.userCompanyMembership.findMany({
        where,
        include: MEMBERSHIP_INCLUDE,
        skip,
        take: limit,
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      }),
      this.prisma.userCompanyMembership.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Users de rôle MARKETPLACE_SELLER sans aucun membership actif.
   * Diagnostic : ces users ont un compte mais aucune ressource marketplace
   * accessible (scope vide → zéro donnée exposée côté ownership service).
   */
  async findOrphanSellers() {
    const sellers = await this.prisma.user.findMany({
      where: {
        role: UserRole.MARKETPLACE_SELLER as unknown as 'MARKETPLACE_SELLER',
        deletedAt: null,
        companyMemberships: { none: {} },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return { data: sellers, meta: { total: sellers.length } };
  }

  /**
   * Memberships pointant vers une Company qui n'a pas de SellerProfile.
   * Ces rattachements n'apportent aucun `sellerProfileId` au user : utiles
   * pour diagnostiquer les sellers non effectifs.
   */
  async findOrphanMemberships() {
    const rows = await this.prisma.userCompanyMembership.findMany({
      where: { company: { sellerProfile: null } },
      include: MEMBERSHIP_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return { data: rows, meta: { total: rows.length } };
  }

  async diagnostic() {
    const [
      totalSellerUsers,
      totalMemberships,
      membershipsWithoutSellerProfile,
      sellersWithoutMembership,
    ] = await Promise.all([
      this.prisma.user.count({
        where: {
          role: UserRole.MARKETPLACE_SELLER as unknown as 'MARKETPLACE_SELLER',
          deletedAt: null,
        },
      }),
      this.prisma.userCompanyMembership.count(),
      this.prisma.userCompanyMembership.count({
        where: { company: { sellerProfile: null } },
      }),
      this.prisma.user.count({
        where: {
          role: UserRole.MARKETPLACE_SELLER as unknown as 'MARKETPLACE_SELLER',
          deletedAt: null,
          companyMemberships: { none: {} },
        },
      }),
    ]);
    return {
      totalSellerUsers,
      sellersWithMembership: totalSellerUsers - sellersWithoutMembership,
      sellersWithoutMembership,
      totalMemberships,
      membershipsWithoutSellerProfile,
    };
  }

  async create(dto: CreateMembershipDto, actorId?: string) {
    const [user, company] = await Promise.all([
      this.prisma.user.findFirst({
        where: { id: dto.userId, deletedAt: null },
        select: { id: true, email: true, role: true },
      }),
      this.prisma.company.findFirst({
        where: { id: dto.companyId, deletedAt: null },
        select: { id: true, code: true, name: true },
      }),
    ]);
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    if (!company) throw new NotFoundException('Entreprise introuvable');

    const existing = await this.prisma.userCompanyMembership.findUnique({
      where: {
        userId_companyId: { userId: dto.userId, companyId: dto.companyId },
      },
    });
    if (existing) {
      throw new ConflictException('Cet utilisateur est déjà rattaché à cette entreprise');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.userCompanyMembership.updateMany({
          where: { userId: dto.userId, isPrimary: true },
          data: { isPrimary: false },
        });
      }
      return tx.userCompanyMembership.create({
        data: {
          userId: dto.userId,
          companyId: dto.companyId,
          isPrimary: dto.isPrimary ?? false,
          createdById: actorId,
        },
        include: MEMBERSHIP_INCLUDE,
      });
    });

    await this.auditService.log({
      action: 'MEMBERSHIP_CREATED',
      entityType: EntityType.USER,
      entityId: user.id,
      userId: actorId,
      newData: {
        membershipId: created.id,
        companyCode: company.code,
        isPrimary: created.isPrimary,
      },
      notes: `Rattachement ${user.email} → ${company.code}`,
    });

    return created;
  }

  async delete(id: string, actorId?: string) {
    const membership = await this.prisma.userCompanyMembership.findUnique({
      where: { id },
      include: MEMBERSHIP_INCLUDE,
    });
    if (!membership) throw new NotFoundException('Rattachement introuvable');

    let autoPromotedId: string | null = null;

    await this.prisma.$transaction(async (tx) => {
      await tx.userCompanyMembership.delete({ where: { id } });

      if (membership.isPrimary) {
        const remaining = await tx.userCompanyMembership.findMany({
          where: { userId: membership.userId },
          orderBy: { createdAt: 'asc' },
          take: 1,
        });
        if (remaining.length > 0) {
          autoPromotedId = remaining[0].id;
          await tx.userCompanyMembership.update({
            where: { id: autoPromotedId },
            data: { isPrimary: true },
          });
        }
      }
    });

    await this.auditService.log({
      action: 'MEMBERSHIP_DELETED',
      entityType: EntityType.USER,
      entityId: membership.userId,
      userId: actorId,
      previousData: {
        membershipId: membership.id,
        companyCode: membership.company.code,
        wasPrimary: membership.isPrimary,
      },
      notes: autoPromotedId
        ? `Suppression + auto-promotion du membership ${autoPromotedId} comme primary`
        : 'Suppression du rattachement',
    });

    return { success: true, autoPromotedMembershipId: autoPromotedId };
  }

  async setPrimary(id: string, actorId?: string) {
    const membership = await this.prisma.userCompanyMembership.findUnique({
      where: { id },
      include: MEMBERSHIP_INCLUDE,
    });
    if (!membership) throw new NotFoundException('Rattachement introuvable');

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.userCompanyMembership.updateMany({
        where: { userId: membership.userId, isPrimary: true },
        data: { isPrimary: false },
      });
      return tx.userCompanyMembership.update({
        where: { id },
        data: { isPrimary: true },
        include: MEMBERSHIP_INCLUDE,
      });
    });

    await this.auditService.log({
      action: 'MEMBERSHIP_PRIMARY_CHANGED',
      entityType: EntityType.USER,
      entityId: membership.userId,
      userId: actorId,
      newData: {
        membershipId: membership.id,
        companyCode: membership.company.code,
      },
    });

    return updated;
  }
}
