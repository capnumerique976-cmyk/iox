import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../database/prisma.service';
import { UserRole } from '@iox/shared';

const mockUser = {
  id: 'uuid-test',
  email: 'test@iox.mch',
  passwordHash: '',
  firstName: 'Test',
  lastName: 'User',
  role: UserRole.ADMIN,
  isActive: true,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  createdById: null,
  updatedById: null,
};

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let auditService: jest.Mocked<AuditService>;
  let prisma: {
    revokedRefreshToken: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
  };

  beforeAll(async () => {
    mockUser.passwordHash = await bcrypt.hash('Password@123', 12);
  });

  beforeEach(async () => {
    prisma = {
      revokedRefreshToken: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn(),
            findByEmail: jest.fn(),
            updateLastLogin: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-token'),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('test-secret'),
            get: jest.fn().mockReturnValue('15m'),
          },
        },
        {
          provide: AuditService,
          useValue: { log: jest.fn() },
        },
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    auditService = module.get(AuditService);
  });

  describe('validateUser', () => {
    it('retourne le user si email + mot de passe corrects', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      const result = await service.validateUser('test@iox.mch', 'Password@123');
      expect(result).toEqual(mockUser);
    });

    it('retourne null si mot de passe incorrect', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      const result = await service.validateUser('test@iox.mch', 'MauvaisMotDePasse');
      expect(result).toBeNull();
    });

    it('retourne null si utilisateur inexistant', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      const result = await service.validateUser('inconnu@iox.mch', 'Password@123');
      expect(result).toBeNull();
    });

    it('retourne null si utilisateur désactivé', async () => {
      usersService.findByEmail.mockResolvedValue({ ...mockUser, isActive: false });
      const result = await service.validateUser('test@iox.mch', 'Password@123');
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it("retourne access + refresh token et trace dans l'audit", async () => {
      usersService.findById.mockResolvedValue(mockUser);
      usersService.updateLastLogin.mockResolvedValue(mockUser);
      auditService.log.mockResolvedValue(undefined);

      const result = await service.login(mockUser.id, '127.0.0.1');

      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
      expect(result.user.email).toBe(mockUser.email);
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_LOGIN', entityId: mockUser.id }),
      );
    });
  });

  describe('logout (L9-4)', () => {
    it("trace la déconnexion dans l'audit (sans refresh token)", async () => {
      auditService.log.mockResolvedValue(undefined);
      await service.logout(mockUser.id, undefined, '127.0.0.1');
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_LOGOUT', entityId: mockUser.id }),
      );
      expect(prisma.revokedRefreshToken.create).not.toHaveBeenCalled();
    });

    it('persiste le hash du refresh token dans la liste de révocation', async () => {
      auditService.log.mockResolvedValue(undefined);
      const token = 'refresh.jwt.token';
      const expSeconds = Math.floor(Date.now() / 1000) + 3600;
      jwtService.verify.mockReturnValue({ sub: mockUser.id, exp: expSeconds });

      await service.logout(mockUser.id, token);

      const expectedHash = crypto.createHash('sha256').update(token).digest('hex');
      expect(prisma.revokedRefreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tokenHash: expectedHash,
          userId: mockUser.id,
        }),
      });
    });

    it("ignore un refresh token dont le sub diffère du user authentifié", async () => {
      auditService.log.mockResolvedValue(undefined);
      jwtService.verify.mockReturnValue({ sub: 'autre-user', exp: 9999999999 });
      await service.logout(mockUser.id, 'forged.token');
      expect(prisma.revokedRefreshToken.create).not.toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalled();
    });

    it('logout idempotent : P2002 sur révocation déjà présente est silencieux', async () => {
      auditService.log.mockResolvedValue(undefined);
      jwtService.verify.mockReturnValue({ sub: mockUser.id, exp: 9999999999 });
      prisma.revokedRefreshToken.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Unique constraint', {
          code: 'P2002',
          clientVersion: '5.x',
        }),
      );
      await expect(service.logout(mockUser.id, 'a.b.c')).resolves.toBeUndefined();
      expect(auditService.log).toHaveBeenCalled();
    });

    it('refresh token JWT invalide : on log debug et on poursuit (pas de throw)', async () => {
      auditService.log.mockResolvedValue(undefined);
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });
      await expect(service.logout(mockUser.id, 'bad')).resolves.toBeUndefined();
      expect(prisma.revokedRefreshToken.create).not.toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalled();
    });
  });

  describe('refresh (L9-4)', () => {
    it('refuse un refresh token révoqué (401)', async () => {
      jwtService.verify.mockReturnValue({ sub: mockUser.id, email: mockUser.email, role: mockUser.role });
      const token = 'r.t.tok';
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      prisma.revokedRefreshToken.findUnique.mockResolvedValue({
        tokenHash,
        userId: mockUser.id,
      });

      await expect(service.refresh(token)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(usersService.findById).not.toHaveBeenCalled();
    });

    it('accepte un refresh token non révoqué et retourne un nouvel accessToken', async () => {
      jwtService.verify.mockReturnValue({ sub: mockUser.id, email: mockUser.email, role: mockUser.role });
      prisma.revokedRefreshToken.findUnique.mockResolvedValue(null);
      usersService.findById.mockResolvedValue(mockUser);

      const result = await service.refresh('valid.refresh.token');
      expect(result).toEqual({ accessToken: 'mock-token', expiresIn: 900 });
    });

    it('refuse un refresh token JWT invalide', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('expired');
      });
      await expect(service.refresh('bad')).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.revokedRefreshToken.findUnique).not.toHaveBeenCalled();
    });

    it("refuse si l'utilisateur est désactivé", async () => {
      jwtService.verify.mockReturnValue({ sub: mockUser.id, email: mockUser.email, role: mockUser.role });
      prisma.revokedRefreshToken.findUnique.mockResolvedValue(null);
      usersService.findById.mockResolvedValue({ ...mockUser, isActive: false });
      await expect(service.refresh('valid')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
