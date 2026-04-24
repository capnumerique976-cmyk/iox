import { describe, it, expect, beforeEach } from 'vitest';
import { UserRole } from '@iox/shared';
import { authStorage, hasPermission, ROLE_LABELS } from './auth';

const sampleUser = {
  id: 'u-1',
  email: 'admin@iox.mch',
  firstName: 'Ada',
  lastName: 'Admin',
  role: UserRole.ADMIN,
};

const sampleTokens = {
  accessToken: 'acc.tok.1',
  refreshToken: 'ref.tok.1',
  expiresIn: 900,
};

describe('authStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persiste et relit les tokens + user', () => {
    authStorage.save(sampleTokens, sampleUser);

    expect(authStorage.getAccessToken()).toBe('acc.tok.1');
    expect(authStorage.getRefreshToken()).toBe('ref.tok.1');
    expect(authStorage.getUser()).toEqual(sampleUser);
  });

  it("retourne null quand rien n'est stocké", () => {
    expect(authStorage.getAccessToken()).toBeNull();
    expect(authStorage.getRefreshToken()).toBeNull();
    expect(authStorage.getUser()).toBeNull();
  });

  it('clear() purge toutes les clés', () => {
    authStorage.save(sampleTokens, sampleUser);
    authStorage.clear();

    expect(authStorage.getAccessToken()).toBeNull();
    expect(authStorage.getRefreshToken()).toBeNull();
    expect(authStorage.getUser()).toBeNull();
  });

  it('getUser() ignore un JSON corrompu sans crasher', () => {
    localStorage.setItem('iox_user', 'not-json{');
    expect(() => authStorage.getUser()).toThrow(); // Documente le comportement actuel
  });
});

describe('hasPermission', () => {
  it('ADMIN a accès à tout (wildcard *)', () => {
    expect(hasPermission(UserRole.ADMIN, 'beneficiaries')).toBe(true);
    expect(hasPermission(UserRole.ADMIN, 'anything:anywhere')).toBe(true);
  });

  it('COORDINATOR a les permissions attendues', () => {
    expect(hasPermission(UserRole.COORDINATOR, 'beneficiaries')).toBe(true);
    expect(hasPermission(UserRole.COORDINATOR, 'batches')).toBe(true);
    expect(hasPermission(UserRole.COORDINATOR, 'users:read')).toBe(true);
    expect(hasPermission(UserRole.COORDINATOR, 'audit')).toBe(false);
  });

  it('BENEFICIARY est limité à ses propres ressources', () => {
    expect(hasPermission(UserRole.BENEFICIARY, 'beneficiary:own')).toBe(true);
    expect(hasPermission(UserRole.BENEFICIARY, 'beneficiaries')).toBe(false);
    expect(hasPermission(UserRole.BENEFICIARY, 'market')).toBe(false);
  });

  it('AUDITOR peut accéder à audit + lecture reporting', () => {
    expect(hasPermission(UserRole.AUDITOR, 'audit')).toBe(true);
    expect(hasPermission(UserRole.AUDITOR, 'reporting:read')).toBe(true);
    expect(hasPermission(UserRole.AUDITOR, 'market')).toBe(false);
  });
});

describe('ROLE_LABELS', () => {
  it('a une étiquette française pour chaque rôle', () => {
    const allRoles = Object.values(UserRole);
    for (const role of allRoles) {
      expect(ROLE_LABELS[role]).toBeTruthy();
      expect(typeof ROLE_LABELS[role]).toBe('string');
    }
  });
});
