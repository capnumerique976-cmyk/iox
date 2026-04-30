// MP-NOTIF-2 phase 2 — Footer commun aux templates emails.
// I18N-4 phase 3 — Multi-locale (FR / EN). Le helper accepte
// `locale: 'fr' | 'en'` (défaut FR si absent → rétrocompat templates
// existants qui n'ont pas encore migré).
//
// Le service `NotifEmailService` injecte `unsubscribeUrl` dans
// `templateData` automatiquement (LOT 2). Si l'URL est vide (config
// minimale, échec génération token), le footer affiche le texte sans
// lien.

export interface FooterData {
  unsubscribeUrl?: string;
  /**
   * I18N-4 phase 3 — Locale du footer. `'fr'` (défaut) ou `'en'`.
   * Typiquement injecté par les templates EN qui passent
   * `{ ...data, locale: 'en' }` dans leur appel `renderFooter*`.
   */
  locale?: 'fr' | 'en';
  [key: string]: unknown;
}

const FOOTER_I18N = {
  fr: {
    tagline: 'IOX — Indian Ocean Xchange',
    taglineText: '— IOX (Indian Ocean Xchange)',
    transactionalNote:
      'Vous recevez cet email parce que votre compte est rattaché à cette demande.',
    unsubLinkLabel: 'Se désabonner de ces notifications',
    unsubTextLabel: 'Se désabonner',
  },
  en: {
    tagline: 'IOX — Indian Ocean Xchange',
    taglineText: '— IOX (Indian Ocean Xchange)',
    transactionalNote:
      "You're receiving this email because your account is linked to this request.",
    unsubLinkLabel: 'Unsubscribe from these notifications',
    unsubTextLabel: 'Unsubscribe',
  },
} as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function pickLocale(data: FooterData): 'fr' | 'en' {
  return data.locale === 'en' ? 'en' : 'fr';
}

export function renderFooterHtml(data: FooterData): string {
  const locale = pickLocale(data);
  const strings = FOOTER_I18N[locale];
  const url = data.unsubscribeUrl;
  const link =
    url && url.length > 0
      ? `<a href="${escapeHtml(url)}" style="color:#9ca3af;text-decoration:underline;">${strings.unsubLinkLabel}</a>`
      : '';
  return `<p style="margin:24px 0 0;font-size:12px;color:#9ca3af;line-height:1.5;border-top:1px solid #e5e7eb;padding-top:16px;">
    ${strings.tagline}<br>
    ${strings.transactionalNote}${link ? `<br>${link}` : ''}
  </p>`;
}

export function renderFooterText(data: FooterData): string {
  const locale = pickLocale(data);
  const strings = FOOTER_I18N[locale];
  const url = data.unsubscribeUrl;
  const lines: string[] = [strings.taglineText, strings.transactionalNote];
  if (url && url.length > 0) {
    lines.push('');
    lines.push(`${strings.unsubTextLabel} : ${url}`);
  }
  return lines.join('\n');
}
