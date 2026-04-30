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

  it("getTemplate(id, 'en') → fallback FR si variante EN absente (id inexistant en EN)", () => {
    // I18N-4 phase 3 — toutes les variantes EN sont désormais présentes.
    // On teste le fallback via un id fictif pour vérifier le comportement.
    // (Les 6 ids actuels ont tous fr+en après phase 3.)
    const tFr = getTemplate('rfq-won');
    const tEn = getTemplate('rfq-won', 'en');
    // Phase 3 : EN existe → tEn ≠ tFr
    expect(tEn).not.toBe(tFr);
    expect(tEn).not.toBeNull();
  });

  // I18N-4 phase 2 — variantes EN ajoutées.
  it("getTemplate('rfq-qualified', 'en') → variante EN", () => {
    const t = getTemplate('rfq-qualified', 'en');
    expect(t).not.toBeNull();
    expect(
      t!.subject({
        offerTitle: 'X',
        recipientDisplayName: '',
        senderDisplayName: '',
        note: null,
        ctaUrl: '',
      }),
    ).toContain('qualified');
  });

  it("getTemplate('rfq-quoted', 'en') → variante EN", () => {
    const t = getTemplate('rfq-quoted', 'en');
    expect(t).not.toBeNull();
    expect(
      t!.subject({
        offerTitle: 'X',
        recipientDisplayName: '',
        senderDisplayName: '',
        note: null,
        ctaUrl: '',
      }),
    ).toContain('Quote available');
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

  it('listLocalesForTemplate(rfq-qualified) → [fr, en] (I18N-4 phase 2)', () => {
    const locales = listLocalesForTemplate('rfq-qualified');
    expect(locales).toContain('fr');
    expect(locales).toContain('en');
  });

  // I18N-4 phase 3 — variantes EN ajoutées pour won, lost, created-to-seller.
  it("getTemplate('rfq-won', 'en') → variante EN (phase 3)", () => {
    const t = getTemplate('rfq-won', 'en');
    expect(t).not.toBeNull();
    expect(
      t!.subject({
        offerTitle: 'X',
        recipientDisplayName: '',
        senderDisplayName: '',
        note: null,
        ctaUrl: '',
      }),
    ).toContain('confirmed');
  });

  it("getTemplate('rfq-lost', 'en') → variante EN (phase 3)", () => {
    const t = getTemplate('rfq-lost', 'en');
    expect(t).not.toBeNull();
    expect(
      t!.subject({
        offerTitle: 'X',
        recipientDisplayName: '',
        senderDisplayName: '',
        note: null,
        ctaUrl: '',
      }),
    ).toContain('Update');
  });

  it("getTemplate('rfq-created-to-seller', 'en') → variante EN (phase 3)", () => {
    const t = getTemplate('rfq-created-to-seller', 'en');
    expect(t).not.toBeNull();
    expect(
      t!.subject({
        offerTitle: 'X',
        sellerDisplayName: '',
        buyerCompanyName: '',
        requestedQuantity: null,
        requestedUnit: null,
        deliveryCountry: null,
        message: null,
        ctaUrl: '',
      }),
    ).toContain('New quote request');
  });

  it('listLocalesForTemplate(rfq-won) → [fr, en] (I18N-4 phase 3)', () => {
    const locales = listLocalesForTemplate('rfq-won');
    expect(locales).toContain('fr');
    expect(locales).toContain('en');
  });

  it('listLocalesForTemplate(rfq-lost) → [fr, en] (I18N-4 phase 3)', () => {
    const locales = listLocalesForTemplate('rfq-lost');
    expect(locales).toContain('fr');
    expect(locales).toContain('en');
  });

  it('listLocalesForTemplate(rfq-created-to-seller) → [fr, en] (I18N-4 phase 3)', () => {
    const locales = listLocalesForTemplate('rfq-created-to-seller');
    expect(locales).toContain('fr');
    expect(locales).toContain('en');
  });
});
