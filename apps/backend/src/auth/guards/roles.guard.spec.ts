import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@iox/shared';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createContext(user: { role: string } | null, roles?: UserRole[]) {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles ?? null);
    return {
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as any;
  }

  it('should allow access when no roles are required', () => {
    const ctx = createContext({ role: UserRole.MARKETPLACE_BUYER }, undefined);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow access when empty roles array', () => {
    const ctx = createContext({ role: UserRole.MARKETPLACE_SELLER }, []);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow ADMIN access to any endpoint', () => {
    const ctx = createContext({ role: UserRole.ADMIN }, [UserRole.QUALITY_MANAGER]);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow access when user has required role', () => {
    const ctx = createContext({ role: UserRole.MARKETPLACE_SELLER }, [
      UserRole.MARKETPLACE_SELLER,
      UserRole.COORDINATOR,
    ]);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should throw ForbiddenException when user lacks required role', () => {
    const ctx = createContext({ role: UserRole.MARKETPLACE_BUYER }, [
      UserRole.MARKETPLACE_SELLER,
    ]);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should return false when no user on request', () => {
    const ctx = createContext(null, [UserRole.ADMIN]);
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('should include required roles in error message', () => {
    const ctx = createContext({ role: UserRole.MARKETPLACE_BUYER }, [
      UserRole.QUALITY_MANAGER,
      UserRole.COORDINATOR,
    ]);
    try {
      guard.canActivate(ctx);
      fail('Expected ForbiddenException');
    } catch (e) {
      expect((e as ForbiddenException).message).toContain('QUALITY_MANAGER');
      expect((e as ForbiddenException).message).toContain('COORDINATOR');
    }
  });
});
