// I18N-4 phase 3 — Couverture footer multi-locale.
import { renderFooterHtml, renderFooterText } from './footer';

describe('footer i18n (I18N-4 phase 3)', () => {
  const url = 'https://iox.test/unsubscribe?token=xxx';

  describe('FR (défaut)', () => {
    it('html FR contient tagline + note FR + lien Se désabonner', () => {
      const html = renderFooterHtml({ unsubscribeUrl: url });
      expect(html).toContain('IOX — Indian Ocean Xchange');
      expect(html).toContain('Vous recevez cet email parce que');
      expect(html).toContain('Se désabonner de ces notifications');
      expect(html).toContain(url);
    });

    it('text FR contient note + label Se désabonner', () => {
      const text = renderFooterText({ unsubscribeUrl: url });
      expect(text).toContain('IOX (Indian Ocean Xchange)');
      expect(text).toContain('Vous recevez cet email');
      expect(text).toContain('Se désabonner :');
    });

    it('html FR sans url → pas de lien rendu', () => {
      const html = renderFooterHtml({});
      expect(html).not.toContain('<a href');
    });
  });

  describe('EN', () => {
    it('html EN contient tagline + note EN + lien Unsubscribe', () => {
      const html = renderFooterHtml({ unsubscribeUrl: url, locale: 'en' });
      expect(html).toContain('IOX — Indian Ocean Xchange');
      expect(html).toContain("You're receiving this email");
      expect(html).toContain('Unsubscribe from these notifications');
      expect(html).toContain(url);
    });

    it('text EN contient note + label Unsubscribe', () => {
      const text = renderFooterText({ unsubscribeUrl: url, locale: 'en' });
      expect(text).toContain('IOX (Indian Ocean Xchange)');
      expect(text).toContain("You're receiving this email");
      expect(text).toContain('Unsubscribe :');
    });

    it('locale invalide → fallback FR', () => {
      // @ts-expect-error - test runtime fallback comportement
      const html = renderFooterHtml({ unsubscribeUrl: url, locale: 'es' });
      expect(html).toContain('Vous recevez cet email');
    });
  });
});
