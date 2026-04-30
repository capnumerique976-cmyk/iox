// I18N-4 phase 3 — Couverture template EN rfq-created-to-seller.
import { rfqCreatedToSellerEnTemplate } from './rfq-created-to-seller.en.template';

describe('rfq-created-to-seller.en template (I18N-4 phase 3)', () => {
  const baseData = {
    sellerDisplayName: 'Bob Seller',
    buyerCompanyName: 'Acme Corp',
    offerTitle: 'Premium Vanilla',
    requestedQuantity: 100,
    requestedUnit: 'kg',
    deliveryCountry: 'France',
    message: null,
    ctaUrl: 'https://iox.test/seller/quote-requests/abc',
    unsubscribeUrl: 'https://iox.test/unsubscribe?token=xxx',
  };

  it('subject EN inclut titre offre', () => {
    expect(rfqCreatedToSellerEnTemplate.subject(baseData)).toBe(
      'New quote request for: Premium Vanilla',
    );
  });

  it('html EN : lang="en" + greeting Hello + buyerCompanyName + quantity + delivery country + CTA', () => {
    const html = rfqCreatedToSellerEnTemplate.html(baseData);
    expect(html).toContain('lang="en"');
    expect(html).toContain('Hello Bob Seller');
    expect(html).toContain('Acme Corp');
    expect(html).toContain('100 kg');
    expect(html).toContain('France');
    expect(html).toContain('Buyer');
    expect(html).toContain('Quantity');
    expect(html).toContain('Delivery country');
    expect(html).toContain('View and reply');
    expect(html).toContain('https://iox.test/seller/quote-requests/abc');
  });

  it('html EN : footer EN présent', () => {
    const html = rfqCreatedToSellerEnTemplate.html(baseData);
    expect(html).toContain("You're receiving this email because your account is linked");
    expect(html).toContain('Unsubscribe from these notifications');
  });

  it('text EN : greeting + buyer + quantité + footer EN', () => {
    const text = rfqCreatedToSellerEnTemplate.text(baseData);
    expect(text).toContain('Hello Bob Seller');
    expect(text).toContain('Buyer: Acme Corp');
    expect(text).toContain('Requested quantity: 100 kg');
    expect(text).toContain('Delivery country: France');
    expect(text).toContain('View and reply: https://iox.test/seller/quote-requests/abc');
    expect(text).toContain("You're receiving this email");
  });

  it('fallback "Not specified" si quantity/country null', () => {
    const html = rfqCreatedToSellerEnTemplate.html({
      ...baseData,
      requestedQuantity: null,
      requestedUnit: null,
      deliveryCountry: null,
    });
    expect(html).toContain('Not specified');
  });
});
