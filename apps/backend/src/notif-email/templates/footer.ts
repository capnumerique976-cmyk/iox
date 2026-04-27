// MP-NOTIF-2 phase 2 — Footer commun aux templates emails.
//
// Le service `NotifEmailService` injecte `unsubscribeUrl` dans
// `templateData` automatiquement (LOT 2). Si l'URL est vide (config
// minimale, échec génération token), le footer affiche le placeholder
// historique sans lien.

export interface FooterData {
  unsubscribeUrl?: string;
  [key: string]: unknown;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderFooterHtml(data: FooterData): string {
  const url = data.unsubscribeUrl;
  const link =
    url && url.length > 0
      ? `<a href="${escapeHtml(url)}" style="color:#9ca3af;text-decoration:underline;">Se désabonner de ces notifications</a>`
      : '';
  return `<p style="margin:24px 0 0;font-size:12px;color:#9ca3af;line-height:1.5;border-top:1px solid #e5e7eb;padding-top:16px;">
    IOX — Indian Ocean Xchange<br>
    Vous recevez cet email parce que votre compte est rattaché à cette demande.${
      link ? `<br>${link}` : ''
    }
  </p>`;
}

export function renderFooterText(data: FooterData): string {
  const url = data.unsubscribeUrl;
  const lines = [
    '— IOX (Indian Ocean Xchange)',
    'Vous recevez cet email parce que votre compte est rattaché à cette demande.',
  ];
  if (url && url.length > 0) {
    lines.push('');
    lines.push(`Se désabonner : ${url}`);
  }
  return lines.join('\n');
}
