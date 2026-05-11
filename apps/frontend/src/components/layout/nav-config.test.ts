import { describe, it, expect } from 'vitest';
import { getActiveSection, getVisibleSections, getDefaultLanding, SECTIONS, HOME_SECTION } from './nav-config';
import { UserRole } from '@iox/shared';

describe('nav-config', () => {
  it('detects buyer section from /buyer path', () => {
    const section = getActiveSection('/buyer');
    expect(section.id).toBe('buyer');
  });

  it('detects buyer section from /buyer/orders', () => {
    const section = getActiveSection('/buyer/orders');
    expect(section.id).toBe('buyer');
  });

  it('detects buyer section from /buyer/invoices', () => {
    const section = getActiveSection('/buyer/invoices');
    expect(section.id).toBe('buyer');
  });

  it('detects marketplace section from /seller/dashboard', () => {
    const section = getActiveSection('/seller/dashboard');
    expect(section.id).toBe('marketplace');
  });

  it('detects admin section from /admin/audit-logs', () => {
    const section = getActiveSection('/admin/audit-logs');
    expect(section.id).toBe('admin');
  });

  it('falls back to home for unknown paths', () => {
    const section = getActiveSection('/unknown-route');
    expect(section.id).toBe('home');
  });

  it('buyer section has 6 nav items', () => {
    const buyer = SECTIONS.find((s) => s.id === 'buyer');
    expect(buyer).toBeDefined();
    expect(buyer!.items).toHaveLength(6);
  });

  it('buyer section includes /buyer/quote-requests', () => {
    const buyer = SECTIONS.find((s) => s.id === 'buyer');
    const item = buyer!.items.find((i) => i.href === '/buyer/quote-requests');
    expect(item).toBeDefined();
  });

  it('all sections have unique ids', () => {
    const ids = [HOME_SECTION.id, ...SECTIONS.map((s) => s.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('no duplicate pathPrefixes across sections', () => {
    const all = [HOME_SECTION, ...SECTIONS];
    const allPrefixes = all.flatMap((s) => s.pathPrefixes);
    // Each prefix should only appear once
    const seen = new Set<string>();
    for (const p of allPrefixes) {
      expect(seen.has(p), `Duplicate prefix: ${p}`).toBe(false);
      seen.add(p);
    }
  });

  describe('getVisibleSections', () => {
    it('ADMIN sees all sections', () => {
      const visible = getVisibleSections(UserRole.ADMIN);
      expect(visible).toEqual(SECTIONS);
    });

    it('MARKETPLACE_SELLER sees marketplace but not referentiel', () => {
      const visible = getVisibleSections(UserRole.MARKETPLACE_SELLER);
      const ids = visible.map((s) => s.id);
      expect(ids).toContain('marketplace');
      expect(ids).not.toContain('referentiel');
      expect(ids).not.toContain('production');
    });

    it('MARKETPLACE_BUYER sees buyer section but not distribution', () => {
      const visible = getVisibleSections(UserRole.MARKETPLACE_BUYER);
      const ids = visible.map((s) => s.id);
      expect(ids).toContain('buyer');
      expect(ids).not.toContain('distribution');
      expect(ids).not.toContain('marketplace');
    });

    it('COORDINATOR sees staff sections', () => {
      const visible = getVisibleSections(UserRole.COORDINATOR);
      const ids = visible.map((s) => s.id);
      expect(ids).toContain('referentiel');
      expect(ids).toContain('production');
      expect(ids).toContain('distribution');
    });
  });

  describe('getDefaultLanding', () => {
    it('seller lands on /seller/dashboard', () => {
      expect(getDefaultLanding(UserRole.MARKETPLACE_SELLER)).toBe('/seller/dashboard');
    });

    it('buyer lands on /buyer', () => {
      expect(getDefaultLanding(UserRole.MARKETPLACE_BUYER)).toBe('/buyer');
    });

    it('admin lands on /dashboard', () => {
      expect(getDefaultLanding(UserRole.ADMIN)).toBe('/dashboard');
    });

    it('coordinator lands on /dashboard', () => {
      expect(getDefaultLanding(UserRole.COORDINATOR)).toBe('/dashboard');
    });
  });
});
