// I18N-4 phase 2 — Couverture template EN rfq-quoted.
import { rfqQuotedEnTemplate } from './rfq-quoted.en.template';

describe('rfq-quoted.en template (I18N-4 phase 2)', () => {
  const baseData = {
    recipientDisplayName: 'Alice Buyer',
    senderDisplayName: 'Coop X',
    offerTitle: 'Premium Vanilla',
    note: null,
    ctaUrl: 'https://iox.test/buyer/quote-requests/abc',
    unsubscribeUrl: 'https://iox.test/unsubscribe?token=xxx',
  };

  it('subject EN inclut titre offre', () => {
    expect(rfqQuotedEnTemplate.subject(baseData)).toBe(
      'Quote available for your request — Premium Vanilla',
    );
  });

  it('html EN : lang="en" + greeting Hello + intro + CTA Review quote', () => {
    const html = rfqQuotedEnTemplate.html(baseData);
    expect(html).toContain('lang="en"');
    expect(html).toContain('Hello Alice Buyer');
    expect(html).toContain('Coop X just published a quote');
    expect(html).toContain('Review quote');
  });

  it('text EN : greeting + intro + CTA', () => {
    const text = rfqQuotedEnTemplate.text(baseData);
    expect(text).toContain('Hello Alice Buyer');
    expect(text).toContain('just published a quote');
    expect(text).toContain('Review quote');
  });

  it('XSS escape sur senderDisplayName', () => {
    const html = rfqQuotedEnTemplate.html({
      ...baseData,
      senderDisplayName: '<img src=x onerror=alert(1)>',
    });
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).toContain('&lt;img');
  });
});
