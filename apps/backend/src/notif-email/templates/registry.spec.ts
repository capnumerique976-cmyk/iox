// I18N-4 — Couverture registry templates avec résolution locale.

import { getTemplate, listTemplateIds, listLocalesForTemplate } from './index';

describe('templates registry — i18n locale resolution', () => {
  it('getTemplate(unknown id) → null', () => {
    expect(getTemplate('nope')).toBeNull();
  });

  it('getTemplate(id) sans locale → variante FR', () => {
    const t = getTemplate('rfq-message-created');
    expect(t).not.toBeNull();
    // Le subject FR contient "Nouveau message"
    expect(t!.subject({ offerTitle: 'X', recipientDisplayName: '', senderDisplayName: '', messageBody: '', ctaUrl: '' })).toContain(
      'Nouveau message',
    );
  });

  it("getTemplate(id, 'en') → variante EN si présente", () => {
    const t = getTemplate('rfq-message-created', 'en');
    expect(t).not.toBeNull();
    expect(t!.subject({ offerTitle: 'X', recipientDisplayName: '', senderDisplayName: '', messageBody: '', ctaUrl: '' })).toContain(
      'New message',
    );
  });

  it("getTemplate(id, 'en') → fallback FR si variante EN absente", () => {
    // rfq-qualified n'a pas encore de variante EN (à faire en I18N-4 phase 2).
    const tFr = getTemplate('rfq-qualified');
    const tEn = getTemplate('rfq-qualified', 'en');
    expect(tEn).toBe(tFr); // même référence (fallback)
  });

  it("getTemplate(id, 'fr') explicite → variante FR", () => {
    const tFr = getTemplate('rfq-message-created', 'fr');
    expect(tFr).not.toBeNull();
    expect(tFr!.subject({ offerTitle: 'X', recipientDisplayName: '', senderDisplayName: '', messageBody: '', ctaUrl: '' })).toContain(
      'Nouveau message',
    );
  });

  it('listTemplateIds() retourne tous les ids', () => {
    const ids = listTemplateIds();
    expect(ids).toContain('rfq-message-created');
    expect(ids).toContain('rfq-created-to-seller');
    expect(ids).toContain('rfq-qualified');
    expect(ids).toContain('rfq-quoted');
    expect(ids).toContain('rfq-won');
    expect(ids).toContain('rfq-lost');
  });

  it('listLocalesForTemplate(rfq-message-created) → [fr, en]', () => {
    const locales = listLocalesForTemplate('rfq-message-created');
    expect(locales).toContain('fr');
    expect(locales).toContain('en');
  });

  it('listLocalesForTemplate(rfq-qualified) → [fr] (EN à faire)', () => {
    const locales = listLocalesForTemplate('rfq-qualified');
    expect(locales).toEqual(['fr']);
  });
});
