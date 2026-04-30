// I18N-4 phase 3 — Couverture template EN rfq-won.
import { rfqWonEnTemplate } from './rfq-won.en.template';

describe('rfq-won.en template (I18N-4 phase 3)', () => {
  const baseData = {
    recipientDisplayName: 'Alice Buyer',
    senderDisplayName: 'Coop X',
    offerTitle: 'Premium Vanilla',
    note: null,
    ctaUrl: 'https://iox.test/buyer/quote-requests/abc',
    unsubscribeUrl: 'https://iox.test/unsubscribe?token=xxx',
  };

  it('subject EN inclut titre offre', () => {
    expect(rfqWonEnTemplate.subject(baseData)).toBe(
      'Good news, your request is confirmed — Premium Vanilla',
    );
  });

  it('html EN : lang="en" + ctaUrl + greeting Hello + CTA label', () => {
    const html = rfqWonEnTemplate.html(baseData);
    expect(html).toContain('lang="en"');
    expect(html).toContain('Hello Alice Buyer');
    expect(html).toContain('Coop X has confirmed your order');
    expect(html).toContain('Premium Vanilla');
    expect(html).toContain('View my order');
    expect(html).toContain('https://iox.test/buyer/quote-requests/abc');
  });

  it('html EN : footer EN présent (transactional note + unsubscribe label)', () => {
    const html = rfqWonEnTemplate.html(baseData);
    expect(html).toContain("You're receiving this email because your account is linked");
    expect(html).toContain('Unsubscribe from these notifications');
  });

  it('text EN : greeting + intro + CTA URL + footer EN', () => {
    const text = rfqWonEnTemplate.text(baseData);
    expect(text).toContain('Hello Alice Buyer');
    expect(text).toContain('Coop X has confirmed');
    expect(text).toContain('View my order : https://iox.test/buyer/quote-requests/abc');
    expect(text).toContain("You're receiving this email");
  });
});
