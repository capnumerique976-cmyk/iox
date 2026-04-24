import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
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

  beforeAll(async () => {
    mockUser.passwordHash = await bcrypt.hash('Password@123', 12);
  });

  beforeEach(async () => {
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
          useValue: { sign: jest.fn().mockReturnValue('mock-token') },
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

  describe('logout', () => {
    it("trace la déconnexion dans l'audit", async () => {
      auditService.log.mockResolvedValue(undefined);
      await service.logout(mockUser.id, '127.0.0.1');
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_LOGOUT', entityId: mockUser.id }),
      );
    });
  });
});
