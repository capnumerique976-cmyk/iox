// I18N-4 — Email EN : "New message on your quote request".
//
// Mirror du template FR `rfq-message-created.template.ts`. Sélectionné
// quand `recipientLocale === 'en'` ou `User.preferredLocale === 'en'`.

import type { EmailTemplate } from '../notif-email.types';
import { renderFooterHtml, renderFooterText } from './footer';
import type { RfqMessageCreatedTemplateData } from './rfq-message-created.template';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const rfqMessageCreatedEnTemplate: EmailTemplate<RfqMessageCreatedTemplateData> = {
  id: 'rfq-message-created',

  subject(data) {
    return `New message on your quote request — ${data.offerTitle}`;
  },

  text(data) {
    return [
      `Hello ${data.recipientDisplayName},`,
      '',
      `${data.senderDisplayName} just replied to your quote request "${data.offerTitle}".`,
      '',
      'Message:',
      data.messageBody,
      '',
      `View and reply: ${data.ctaUrl}`,
      '',
      renderFooterText(data),
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
<html lang="en">
<head>
<meta charset="utf-8">
<title>New message — ${safe.offerTitle}</title>
</head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f2937;">
<div style="max-width:600px;margin:0 auto;padding:24px;">
  <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a;">New message on your quote request</h1>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">Hello ${safe.recipient},</p>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">
    <strong>${safe.sender}</strong> just replied to your quote request
    <strong>${safe.offerTitle}</strong>.
  </p>
  <div style="background:#f9fafb;border-left:3px solid #0ea5e9;padding:14px 18px;margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151;border-radius:0 6px 6px 0;">
    ${safe.messageBody}
  </div>
  <div style="text-align:center;margin:24px 0;">
    <a href="${safe.ctaUrl}" style="display:inline-block;padding:12px 24px;background:#0ea5e9;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;">View and reply</a>
  </div>
  ${renderFooterHtml(data)}
</div>
</body>
</html>`;
  },
};
