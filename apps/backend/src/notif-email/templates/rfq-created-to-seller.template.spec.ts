// MP-NOTIF-1 phase 1 — Couverture template rfq-created-to-seller.
import { rfqCreatedToSellerTemplate } from './rfq-created-to-seller.template';

const baseData = {
  sellerDisplayName: 'Coopérative Vanille',
  buyerCompanyName: 'Acme Foods SAS',
  offerTitle: 'Vanille Bourbon Grade A — offre principale',
  requestedQuantity: 100,
  requestedUnit: 'kg',
  deliveryCountry: 'FR',
  message: 'Bonjour, demande pour début juin.',
  ctaUrl: 'https://iox.mycloud.yt/seller/quote-requests/rfq-1',
};

describe('rfq-created-to-seller template', () => {
  it('subject contient offerTitle', () => {
    const subject = rfqCreatedToSellerTemplate.subject(baseData);
    expect(subject).toBe(
      'Nouvelle demande de devis pour : Vanille Bourbon Grade A — offre principale',
    );
  });

  it('html contient ctaUrl + buyerCompanyName + quantity + recipient name', () => {
    const html = rfqCreatedToSellerTemplate.html(baseData);
    expect(html).toContain(baseData.ctaUrl);
    expect(html).toContain('Acme Foods SAS');
    expect(html).toContain('100 kg');
    expect(html).toContain('Coopérative Vanille');
  });

  it('text inclut le message + le CTA en clair', () => {
    const text = rfqCreatedToSellerTemplate.text(baseData);
    expect(text).toContain('Coopérative Vanille');
    expect(text).toContain('Acme Foods SAS');
    expect(text).toContain('Bonjour, demande pour début juin.');
    expect(text).toContain(baseData.ctaUrl);
  });

  it('échappe les caractères HTML dangereux dans buyerCompanyName', () => {
    const html = rfqCreatedToSellerTemplate.html({
      ...baseData,
      buyerCompanyName: '<script>alert(1)</script>Evil Inc',
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('quantity null → "Non précisée"', () => {
    const html = rfqCreatedToSellerTemplate.html({
      ...baseData,
      requestedQuantity: null,
      requestedUnit: null,
    });
    expect(html).toContain('Non précisée');
  });
});
