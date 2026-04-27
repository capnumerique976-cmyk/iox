// MP-NOTIF-1 phase 1 — Email : "Nouveau message sur votre demande de devis".
//
// Déclenché quand un participant ajoute un `QuoteRequestMessage` non
// interne (`QuoteRequestsService.addMessage`). L'email est envoyé à
// l'autre partie (buyer si l'auteur est seller, et vice-versa).

import type { EmailTemplate } from '../notif-email.types';

export interface RfqMessageCreatedTemplateData {
  recipientDisplayName: string;
  senderDisplayName: string;
  offerTitle: string;
  messageBody: string;
  ctaUrl: string;
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

export const rfqMessageCreatedTemplate: EmailTemplate<RfqMessageCreatedTemplateData> = {
  id: 'rfq-message-created',

  subject(data) {
    return `Nouveau message sur votre demande de devis — ${data.offerTitle}`;
  },

  text(data) {
    return [
      `Bonjour ${data.recipientDisplayName},`,
      '',
      `${data.senderDisplayName} vient de répondre à votre demande de devis "${data.offerTitle}".`,
      '',
      'Message :',
      data.messageBody,
      '',
      `Voir et répondre : ${data.ctaUrl}`,
      '',
      '— IOX (Indian Ocean Xchange)',
      'Vous recevez cet email parce que vous participez à cette demande de devis.',
      // TODO MP-NOTIF-2 : lien de désinscription / préférences
    ].join('\n');
  },

  html(data) {
    const safe = {
      recipient: escapeHtml(data.recipientDisplayName),
      sender: escapeHtml(data.senderDisplayName),
      offerTitle: escapeHtml(data.offerTitle),
      messageBody: escapeHtml(data.messageBody).replace(/\n/g, '<br>'),
      ctaUrl: escapeHtml(data.ctaUrl),
    };
    return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Nouveau message — ${safe.offerTitle}</title>
</head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f2937;">
<div style="max-width:600px;margin:0 auto;padding:24px;">
  <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a;">Nouveau message sur votre demande de devis</h1>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">Bonjour ${safe.recipient},</p>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">
    <strong>${safe.sender}</strong> vient de répondre à votre demande de devis
    <strong>${safe.offerTitle}</strong>.
  </p>
  <div style="background:#f9fafb;border-left:3px solid #0ea5e9;padding:14px 18px;margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151;border-radius:0 6px 6px 0;">
    ${safe.messageBody}
  </div>
  <div style="text-align:center;margin:24px 0;">
    <a href="${safe.ctaUrl}" style="display:inline-block;padding:12px 24px;background:#0ea5e9;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;">Voir et répondre</a>
  </div>
  <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;line-height:1.5;border-top:1px solid #e5e7eb;padding-top:16px;">
    IOX — Indian Ocean Xchange<br>
    Vous recevez cet email parce que vous participez à cette demande de devis.
    <!-- TODO MP-NOTIF-2 : lien de désinscription / préférences -->
  </p>
</div>
</body>
</html>`;
  },
};
