// I18N-4 — Couverture template EN rfq-message-created.
import { rfqMessageCreatedEnTemplate } from './rfq-message-created.en.template';

describe('rfq-message-created.en template', () => {
  const baseData = {
    recipientDisplayName: 'Alice Buyer',
    senderDisplayName: 'Boris Seller',
    offerTitle: 'Premium Vanilla',
    messageBody: 'Could you confirm 5kg pricing?',
    ctaUrl: 'https://iox.test/buyer/quote-requests/abc',
    unsubscribeUrl: 'https://iox.test/unsubscribe?token=xxx',
  };

  it('subject EN inclut le titre offre', () => {
    expect(rfqMessageCreatedEnTemplate.subject(baseData)).toBe(
      'New message on your quote request — Premium Vanilla',
    );
  });

  it('html EN inclut greeting + sender + body + CTA + lang="en"', () => {
    const html = rfqMessageCreatedEnTemplate.html(baseData);
    expect(html).toContain('lang="en"');
    expect(html).toContain('Hello Alice Buyer');
    expect(html).toContain('Boris Seller');
    expect(html).toContain('Could you confirm 5kg pricing?');
    expect(html).toContain('View and reply');
    expect(html).toContain('https://iox.test/buyer/quote-requests/abc');
  });

  it('text EN inclut greeting + sender + body + CTA', () => {
    const text = rfqMessageCreatedEnTemplate.text(baseData);
    expect(text).toContain('Hello Alice Buyer');
    expect(text).toContain('Boris Seller');
    expect(text).toContain('Could you confirm 5kg pricing?');
    expect(text).toContain('https://iox.test/buyer/quote-requests/abc');
  });

  it('échappe les caractères HTML dangereux dans messageBody', () => {
    const html = rfqMessageCreatedEnTemplate.html({
      ...baseData,
      messageBody: '<img src=x onerror=alert(1)>Test',
    });
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).toContain('&lt;img');
  });
});
