import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  listMemberships,
  listOrphanSellers,
  createMembership,
  deleteMembership,
  setPrimaryMembership,
  getMembershipsDiagnostic,
} from './memberships';

const originalFetch = globalThis.fetch;

function mockResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe('memberships api client', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('listMemberships : construit la query avec pagination et filtres', async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(mockResponse({ data: [], meta: { total: 0 } }));

    await listMemberships('tok', { userId: 'u1', companyId: 'c1', page: 2, limit: 30 });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('/admin/memberships');
    expect(url).toContain('userId=u1');
    expect(url).toContain('companyId=c1');
    expect(url).toContain('page=2');
    expect(url).toContain('limit=30');
  });

  it('createMembership : POST avec payload', async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(mockResponse({ data: { id: 'm1' } }));

    await createMembership('tok', { userId: 'u1', companyId: 'c1', isPrimary: true });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      userId: 'u1',
      companyId: 'c1',
      isPrimary: true,
    });
  });

  it('deleteMembership : DELETE sur /:id', async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      mockResponse({ data: { success: true, autoPromotedMembershipId: null } }),
    );
    await deleteMembership('tok', 'm1');
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('/admin/memberships/m1');
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('DELETE');
  });

  it('setPrimaryMembership : PATCH /:id/primary', async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(mockResponse({ data: { id: 'm1', isPrimary: true } }));
    await setPrimaryMembership('tok', 'm1');
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('/admin/memberships/m1/primary');
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('PATCH');
  });

  it('listOrphanSellers : GET /admin/memberships/orphan-sellers', async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(mockResponse({ data: [], meta: { total: 0 } }));
    await listOrphanSellers('tok');
    expect(fetchMock.mock.calls[0][0] as string).toContain('/admin/memberships/orphan-sellers');
  });

  it('getMembershipsDiagnostic : GET /admin/memberships/diagnostic', async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      mockResponse({
        data: {
          totalSellerUsers: 5,
          sellersWithMembership: 3,
          sellersWithoutMembership: 2,
          totalMemberships: 4,
          membershipsWithoutSellerProfile: 0,
        },
      }),
    );
    const d = await getMembershipsDiagnostic('tok');
    expect(d.totalSellerUsers).toBe(5);
  });
});
