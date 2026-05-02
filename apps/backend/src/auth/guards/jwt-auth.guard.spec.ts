import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  function createContext(isPublic: boolean) {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(isPublic);
    return {
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({}),
        getResponse: () => ({}),
      }),
    } as any;
  }

  it('should return true immediately for @Public() routes', () => {
    const ctx = createContext(true);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should call parent canActivate for non-public routes', () => {
    const ctx = createContext(false);
    // Parent AuthGuard('jwt').canActivate will try to validate JWT
    // In unit test without passport strategy, this throws or returns false
    const parentSpy = jest.spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate');
    parentSpy.mockReturnValue(true);

    const result = guard.canActivate(ctx);
    expect(parentSpy).toHaveBeenCalledWith(ctx);
    expect(result).toBe(true);

    parentSpy.mockRestore();
  });

  it('should check isPublic metadata on both handler and class', () => {
    const spy = jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const handler = jest.fn();
    const cls = jest.fn();
    const ctx = {
      getHandler: () => handler,
      getClass: () => cls,
      switchToHttp: () => ({ getRequest: () => ({}), getResponse: () => ({}) }),
    } as any;

    guard.canActivate(ctx);

    expect(spy).toHaveBeenCalledWith('isPublic', [handler, cls]);
  });
});
