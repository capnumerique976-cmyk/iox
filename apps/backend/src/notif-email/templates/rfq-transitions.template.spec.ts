// MP-NOTIF-2 phase 2 — Couverture des 4 templates de transition RFQ.
//
// Un seul fichier (au lieu de 4) car les templates partagent la même
// structure via `rfq-transition.helper.ts`. Tests : sujet contient
// `offerTitle`, HTML/texte contiennent CTA + footer + escapement, note
// optionnelle bien rendue.

import type { EmailTemplate } from '../notif-email.types';
import { rfqQualifiedTemplate } from './rfq-qualified.template';
import { rfqQuotedTemplate } from './rfq-quoted.template';
import { rfqWonTemplate } from './rfq-won.template';
import { rfqLostTemplate } from './rfq-lost.template';
import type { RfqTransitionTemplateData } from './rfq-transition.helper';

const baseData: RfqTransitionTemplateData = {
  recipientDisplayName: 'Alice Buyer',
  senderDisplayName: 'Coop Vanille',
  offerTitle: 'Vanille Bourbon Grade A',
  note: 'Échantillon disponible sur demande.',
  ctaUrl: 'https://iox.mycloud.yt/quote-requests/rfq-1',
  unsubscribeUrl:
    'https://iox.mycloud.yt/api/v1/notif-email/unsubscribe?token=signed.jwt',
};

interface Case {
  name: string;
  template: EmailTemplate<RfqTransitionTemplateData>;
  expectedSubject: RegExp;
}

const CASES: Case[] = [
  {
    name: 'rfq-qualified',
    template: rfqQualifiedTemplate as EmailTemplate<RfqTransitionTemplateData>,
    expectedSubject: /qualifiée.*Vanille Bourbon/i,
  },
  {
    name: 'rfq-quoted',
    template: rfqQuotedTemplate as EmailTemplate<RfqTransitionTemplateData>,
    expectedSubject: /Devis disponible.*Vanille Bourbon/i,
  },
  {
    name: 'rfq-won',
    template: rfqWonTemplate as EmailTemplate<RfqTransitionTemplateData>,
    expectedSubject: /Bonne nouvelle.*Vanille Bourbon/i,
  },
  {
    name: 'rfq-lost',
    template: rfqLostTemplate as EmailTemplate<RfqTransitionTemplateData>,
    expectedSubject: /Mise à jour.*Vanille Bourbon/i,
  },
];

describe('RFQ transition templates (MP-NOTIF-2 phase 2)', () => {
  for (const c of CASES) {
    describe(c.name, () => {
      it('subject contient offerTitle + libellé adapté', () => {
        expect(c.template.subject(baseData)).toMatch(c.expectedSubject);
      });

      it('html contient ctaUrl + senderDisplayName + footer unsubscribe', () => {
        const html = c.template.html(baseData);
        expect(html).toContain(baseData.ctaUrl);
        expect(html).toContain('Coop Vanille');
        expect(html).toContain(baseData.unsubscribeUrl);
        expect(html).toContain('Se désabonner');
      });

      it('text contient sender + note + CTA + footer', () => {
        const text = c.template.text(baseData);
        expect(text).toContain('Coop Vanille');
        expect(text).toContain('Échantillon disponible sur demande.');
        expect(text).toContain(baseData.ctaUrl);
        expect(text).toContain(baseData.unsubscribeUrl);
      });

      it('échappe HTML dans senderDisplayName (XSS guard)', () => {
        const html = c.template.html({
          ...baseData,
          senderDisplayName: '<script>alert(1)</script>Evil',
        });
        expect(html).not.toContain('<script>alert(1)</script>');
        expect(html).toContain('&lt;script&gt;');
      });

      it('note null → pas de section note (HTML + texte)', () => {
        const html = c.template.html({ ...baseData, note: null });
        const text = c.template.text({ ...baseData, note: null });
        expect(html).not.toContain('Note du vendeur');
        expect(text).not.toContain('Note du vendeur');
      });
    });
  }
});
