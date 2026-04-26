// FP-2 — couverture du composant lecture seule CertificationBadgeList.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CertificationBadgeList } from './CertificationBadgeList';
import type { Certification } from '@/lib/marketplace/types';

const baseCert: Certification = {
  id: 'c1',
  relatedType: 'SELLER_PROFILE',
  relatedId: 's1',
  type: 'BIO_EU',
  code: 'FR-BIO-01-2026-001',
  issuingBody: 'Ecocert',
  issuedAt: '2026-01-15',
  validFrom: '2026-01-15',
  validUntil: '2027-01-14',
  documentMediaId: null,
};

describe('CertificationBadgeList (FP-2)', () => {
  it('ne rend rien si la liste est vide', () => {
    const { container } = render(<CertificationBadgeList certifications={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('rend un badge par certification avec scope, id, et label FR', () => {
    const certs: Certification[] = [
      baseCert,
      {
        ...baseCert,
        id: 'c2',
        relatedType: 'MARKETPLACE_PRODUCT',
        relatedId: 'p1',
        type: 'GLOBALGAP',
        code: null,
        validUntil: null,
      },
    ];
    render(<CertificationBadgeList certifications={certs} />);

    const bio = screen.getByTestId('certification-badge-BIO_EU');
    expect(bio.getAttribute('data-scope')).toBe('SELLER_PROFILE');
    expect(bio.getAttribute('data-cert-id')).toBe('c1');
    expect(bio.textContent).toMatch(/Bio \(UE\)/);
    expect(bio.textContent).toMatch(/2027-01/);

    const gg = screen.getByTestId('certification-badge-GLOBALGAP');
    expect(gg.getAttribute('data-scope')).toBe('MARKETPLACE_PRODUCT');
    expect(gg.textContent).toMatch(/GLOBALG\.A\.P\./);
  });

  it('expose un libellé a11y avec organisme + code + validité', () => {
    render(<CertificationBadgeList certifications={[baseCert]} />);
    const badge = screen.getByTestId('certification-badge-BIO_EU');
    const aria = badge.getAttribute('aria-label') ?? '';
    expect(aria).toMatch(/Bio \(UE\)/);
    expect(aria).toMatch(/Ecocert/);
    expect(aria).toMatch(/FR-BIO-01-2026-001/);
    expect(aria).toMatch(/2027-01/);
  });

  it("masque le titre quand title=null", () => {
    render(<CertificationBadgeList certifications={[baseCert]} title={null} />);
    expect(screen.queryByText('Certifications')).toBeNull();
  });
});
