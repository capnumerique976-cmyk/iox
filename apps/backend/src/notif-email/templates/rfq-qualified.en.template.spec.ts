// I18N-4 phase 2 — Couverture template EN rfq-qualified.
import { rfqQualifiedEnTemplate } from './rfq-qualified.en.template';

describe('rfq-qualified.en template (I18N-4 phase 2)', () => {
  const baseData = {
    recipientDisplayName: 'Alice Buyer',
    senderDisplayName: 'Coop X',
    offerTitle: 'Premium Vanilla',
    note: null,
    ctaUrl: 'https://iox.test/buyer/quote-requests/abc',
    unsubscribeUrl: 'https://iox.test/unsubscribe?token=xxx',
  };

  it('subject EN inclut titre offre', () => {
    expect(rfqQualifiedEnTemplate.subject(baseData)).toBe(
      'Your quote request has been qualified — Premium Vanilla',
    );
  });

  it('html EN : lang="en" + greeting + intro + CTA', () => {
    const html = rfqQualifiedEnTemplate.html(baseData);
    expect(html).toContain('lang="en"');
    expect(html).toContain('Hello Alice Buyer');
    expect(html).toContain('Coop X has qualified your quote request');
    expect(html).toContain('Premium Vanilla');
    expect(html).toContain('Track my request');
  });

  it('text EN : greeting Hello + intro + CTA URL', () => {
    const text = rfqQualifiedEnTemplate.text(baseData);
    expect(text).toContain('Hello Alice Buyer');
    expect(text).toContain('Coop X has qualified');
    expect(text).toContain('https://iox.test/buyer/quote-requests/abc');
  });

  it("note seller : label EN \"Seller's note:\" si note présente", () => {
    const html = rfqQualifiedEnTemplate.html({ ...baseData, note: 'Premium grade A' });
    expect(html).toContain("Seller's note:");
    expect(html).toContain('Premium grade A');
  });
});
