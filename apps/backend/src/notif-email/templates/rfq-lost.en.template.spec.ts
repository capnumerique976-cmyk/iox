// I18N-4 phase 3 — Couverture template EN rfq-lost. Ton neutre.
import { rfqLostEnTemplate } from './rfq-lost.en.template';

describe('rfq-lost.en template (I18N-4 phase 3)', () => {
  const baseData = {
    recipientDisplayName: 'Alice Buyer',
    senderDisplayName: 'Coop X',
    offerTitle: 'Premium Vanilla',
    note: null,
    ctaUrl: 'https://iox.test/marketplace/products',
    unsubscribeUrl: 'https://iox.test/unsubscribe?token=xxx',
  };

  it('subject EN neutre', () => {
    expect(rfqLostEnTemplate.subject(baseData)).toBe(
      'Update on your request — Premium Vanilla',
    );
  });

  it('ton neutre : aucun mot négatif (rejected/denied/refused)', () => {
    const html = rfqLostEnTemplate.html(baseData);
    const text = rfqLostEnTemplate.text(baseData);
    for (const word of ['rejected', 'denied', 'refused', 'declined']) {
      expect(html.toLowerCase()).not.toContain(word);
      expect(text.toLowerCase()).not.toContain(word);
    }
  });

  it('html EN : lang="en" + greeting Hello + CTA "Browse catalog" + footer EN', () => {
    const html = rfqLostEnTemplate.html(baseData);
    expect(html).toContain('lang="en"');
    expect(html).toContain('Hello Alice Buyer');
    expect(html).toContain('Browse catalog');
    expect(html).toContain('https://iox.test/marketplace/products');
    expect(html).toContain('Unsubscribe from these notifications');
  });

  it('text EN : greeting + intro + CTA URL', () => {
    const text = rfqLostEnTemplate.text(baseData);
    expect(text).toContain('Hello Alice Buyer');
    expect(text).toContain('Browse catalog : https://iox.test/marketplace/products');
    expect(text).toContain("You're receiving this email");
  });
});
