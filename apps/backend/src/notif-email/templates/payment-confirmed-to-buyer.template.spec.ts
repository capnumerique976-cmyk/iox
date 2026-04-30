// PAY-1 phase 1 LOT 3 — Spec template payment-confirmed-to-buyer (FR + EN).

import { paymentConfirmedToBuyerTemplate } from './payment-confirmed-to-buyer.template';
import { paymentConfirmedToBuyerEnTemplate } from './payment-confirmed-to-buyer.en.template';

const sampleData = {
  buyerDisplayName: 'Alice Buyer',
  sellerDisplayName: 'Coop X',
  offerTitle: 'Vanille premium 1kg',
  amountFormatted: '100,00 €',
  paymentId: 'pay-uuid-123',
  ctaUrl: 'https://iox.test/buyer/payments/return/pay-uuid-123',
  unsubscribeUrl: 'https://iox.test/unsub?token=xxx',
};

describe('payment-confirmed-to-buyer FR', () => {
  it('subject contient titre offre', () => {
    expect(paymentConfirmedToBuyerTemplate.subject(sampleData)).toBe(
      'Paiement confirmé — Vanille premium 1kg',
    );
  });

  it('html contient buyer + seller + montant + paymentId + CTA', () => {
    const html = paymentConfirmedToBuyerTemplate.html(sampleData);
    expect(html).toContain('Alice Buyer');
    expect(html).toContain('Coop X');
    expect(html).toContain('100,00 €');
    expect(html).toContain('pay-uuid-123');
    expect(html).toContain('Suivre ma commande');
    expect(html).toContain('lang="fr"');
  });

  it('text contient sections clés + footer', () => {
    const text = paymentConfirmedToBuyerTemplate.text(sampleData);
    expect(text).toContain('Bonjour Alice Buyer');
    expect(text).toContain('100,00 €');
    expect(text).toContain('pay-uuid-123');
    expect(text).toContain('IOX');
  });
});

describe('payment-confirmed-to-buyer EN', () => {
  it('subject EN', () => {
    expect(paymentConfirmedToBuyerEnTemplate.subject(sampleData)).toBe(
      'Payment confirmed — Vanille premium 1kg',
    );
  });

  it('html EN : lang="en" + Hello + Track my order', () => {
    const html = paymentConfirmedToBuyerEnTemplate.html(sampleData);
    expect(html).toContain('lang="en"');
    expect(html).toContain('Hello Alice Buyer');
    expect(html).toContain('Track my order');
  });

  it('text EN : Hello greeting + footer EN', () => {
    const text = paymentConfirmedToBuyerEnTemplate.text(sampleData);
    expect(text).toContain('Hello Alice Buyer');
    expect(text).toContain("You're receiving this email");
  });
});
