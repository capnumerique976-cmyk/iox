import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateMyProfileDto,
  QueryUsersDto,
} from './dto/create-user.dto';
import { EntityType, UserRole } from '@iox/shared';
import type { Prisma } from '@prisma/client';

const SAFE_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(params: QueryUsersDto = {}) {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = { deletedAt: null };

    if (params.search) {
      where.OR = [
        { email: { contains: params.search, mode: 'insensitive' } },
        { firstName: { contains: params.search, mode: 'insensitive' } },
        { lastName: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.role) {
      where.role = params.role as UserRole;
    }

    if (typeof params.isActive === 'boolean') {
      where.isActive = params.isActive;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: SAFE_SELECT,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
  }

  async create(dto: CreateUserDto, actorId?: string) {
    const existing = await this.findByEmail(dto.email);
    if (existing) throw new ConflictException('Cet email est déjà utilisé');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        createdById: actorId,
        updatedById: actorId,
      },
      select: SAFE_SELECT,
    });

    await this.auditService.log({
      action: 'USER_CREATED',
      entityType: EntityType.USER,
      entityId: user.id,
      userId: actorId,
      newData: { email: user.email, role: user.role },
    });

    return user;
  }

  async update(id: string, dto: UpdateUserDto, actorId?: string) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const updateData: Record<string, unknown> = {
      updatedById: actorId,
    };

    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.password) updateData.passwordHash = await bcrypt.hash(dto.password, 12);

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: SAFE_SELECT,
    });

    await this.auditService.log({
      action: 'USER_UPDATED',
      entityType: EntityType.USER,
      entityId: id,
      userId: actorId,
      previousData: { role: user.role },
      newData: { role: updated.role },
    });

    return updated;
  }

  async updateMyProfile(id: string, dto: UpdateMyProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const updateData: Record<string, unknown> = { updatedById: id };

    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;

    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException(
          'Le mot de passe actuel est requis pour en définir un nouveau.',
        );
      }
      const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
      if (!valid) throw new BadRequestException('Mot de passe actuel incorrect.');
      updateData.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: SAFE_SELECT,
    });
  }

  async deactivate(id: string, actorId?: string) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    if (id === actorId) throw new BadRequestException('Impossible de se désactiver soi-même');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: false, updatedById: actorId },
      select: SAFE_SELECT,
    });

    await this.auditService.log({
      action: 'USER_DEACTIVATED',
      entityType: EntityType.USER,
      entityId: id,
      userId: actorId,
    });

    return updated;
  }

  async activate(id: string, actorId?: string) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: true, updatedById: actorId },
      select: SAFE_SELECT,
    });

    await this.auditService.log({
      action: 'USER_ACTIVATED',
      entityType: EntityType.USER,
      entityId: id,
      userId: actorId,
    });

    return updated;
  }

  async updateLastLogin(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }
}
