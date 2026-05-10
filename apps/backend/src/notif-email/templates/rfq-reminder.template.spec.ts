// M56 — Spec template rfq-reminder (FR + EN).
import { rfqReminderTemplate } from './rfq-reminder.template';
import { rfqReminderEnTemplate } from './rfq-reminder.en.template';

const baseData = {
  recipientDisplayName: 'Alice Buyer',
  senderDisplayName: 'Coop Vanille',
  offerTitle: 'Vanille Bourbon Grade A',
  note: null,
  ctaUrl: 'https://iox.example/buyer/quote-requests/rfq-1',
  unsubscribeUrl: 'https://iox.example/unsubscribe?token=tok',
};

describe('rfq-reminder template (M56)', () => {
  describe('FR', () => {
    it('subject contient Rappel + offerTitle', () => {
      expect(rfqReminderTemplate.subject(baseData)).toMatch(/Rappel.*Vanille Bourbon/i);
    });
    it('html contient ctaUrl + senderDisplayName + footer unsubscribe', () => {
      const html = rfqReminderTemplate.html(baseData);
      expect(html).toContain(baseData.ctaUrl);
      expect(html).toContain('Coop Vanille');
      expect(html).toContain(baseData.unsubscribeUrl);
    });
    it('text contient sender + CTA', () => {
      const text = rfqReminderTemplate.text(baseData);
      expect(text).toContain('Coop Vanille');
      expect(text).toContain(baseData.ctaUrl);
    });
    it('échappe HTML dans senderDisplayName (XSS guard)', () => {
      const html = rfqReminderTemplate.html({
        ...baseData,
        senderDisplayName: '<script>alert(1)</script>Evil',
      });
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });

  describe('EN', () => {
    it('subject EN contient Reminder + offerTitle', () => {
      expect(rfqReminderEnTemplate.subject(baseData)).toMatch(/Reminder.*Vanille Bourbon/i);
    });
    it('html EN contient "View quote"', () => {
      const html = rfqReminderEnTemplate.html(baseData);
      expect(html).toContain('View quote');
    });
    it('html EN utilise lang="en"', () => {
      const html = rfqReminderEnTemplate.html(baseData);
      expect(html).toContain('lang="en"');
    });
  });
});
