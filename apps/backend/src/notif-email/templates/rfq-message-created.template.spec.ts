// MP-NOTIF-1 phase 1 — Couverture template rfq-message-created.
import { rfqMessageCreatedTemplate } from './rfq-message-created.template';

const baseData = {
  recipientDisplayName: 'Boris Vendeur',
  senderDisplayName: 'Alice Acheteuse',
  offerTitle: 'Vanille Bourbon Grade A',
  messageBody: 'Pouvez-vous me chiffrer 500kg pour fin mai ?',
  ctaUrl: 'https://iox.mycloud.yt/seller/quote-requests/rfq-2',
};

describe('rfq-message-created template', () => {
  it('subject contient offerTitle', () => {
    const subject = rfqMessageCreatedTemplate.subject(baseData);
    expect(subject).toBe('Nouveau message sur votre demande de devis — Vanille Bourbon Grade A');
  });

  it('html contient ctaUrl + sender + recipient + body', () => {
    const html = rfqMessageCreatedTemplate.html(baseData);
    expect(html).toContain(baseData.ctaUrl);
    expect(html).toContain('Boris Vendeur');
    expect(html).toContain('Alice Acheteuse');
    expect(html).toContain('Pouvez-vous me chiffrer');
  });

  it('text inclut sender + body + CTA', () => {
    const text = rfqMessageCreatedTemplate.text(baseData);
    expect(text).toContain('Boris Vendeur');
    expect(text).toContain('Alice Acheteuse');
    expect(text).toContain(baseData.messageBody);
    expect(text).toContain(baseData.ctaUrl);
  });

  it('échappe les caractères HTML dangereux dans messageBody', () => {
    const html = rfqMessageCreatedTemplate.html({
      ...baseData,
      messageBody: '<img src=x onerror=alert(1)>Test',
    });
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).toContain('&lt;img');
  });
});
