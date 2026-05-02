import { describe, it, expect } from 'vitest';
import { getActiveSection, SECTIONS, HOME_SECTION } from './nav-config';

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
});
