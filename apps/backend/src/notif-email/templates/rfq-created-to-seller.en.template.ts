// I18N-4 phase 3 — Email EN seller : "New quote request".
// Mirror du template FR `rfq-created-to-seller.template.ts`. Pas une
// transition (création initiale), donc HTML inline custom (pas via
// rfq-transition.helper).

import type { EmailTemplate } from '../notif-email.types';
import { renderFooterHtml, renderFooterText } from './footer';
import type { RfqCreatedToSellerTemplateData } from './rfq-created-to-seller.template';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtQuantity(qty: string | number | null, unit: string | null): string {
  if (qty == null || qty === '') return 'Not specified';
  const unitStr = unit ? ` ${unit}` : '';
  return `${String(qty)}${unitStr}`;
}

export const rfqCreatedToSellerEnTemplate: EmailTemplate<RfqCreatedToSellerTemplateData> = {
  id: 'rfq-created-to-seller',

  subject(data) {
    return `New quote request for: ${data.offerTitle}`;
  },

  text(data) {
    const lines = [
      `Hello ${data.sellerDisplayName},`,
      '',
      `You have received a new quote request on offer "${data.offerTitle}".`,
      '',
      `Buyer: ${data.buyerCompanyName}`,
      `Requested quantity: ${fmtQuantity(data.requestedQuantity, data.requestedUnit)}`,
      `Delivery country: ${data.deliveryCountry ?? 'Not specified'}`,
      '',
      data.message ? `Message:\n${data.message}\n` : '',
      `View and reply: ${data.ctaUrl}`,
      '',
      // I18N-4 phase 3 — propage locale au footer.
      renderFooterText({ ...data, locale: 'en' }),
    ];
    return lines.filter((l) => l !== null).join('\n');
  },

  html(data) {
    const safe = {
      sellerDisplayName: escapeHtml(data.sellerDisplayName),
      buyerCompanyName: escapeHtml(data.buyerCompanyName),
      offerTitle: escapeHtml(data.offerTitle),
      quantity: escapeHtml(fmtQuantity(data.requestedQuantity, data.requestedUnit)),
      deliveryCountry: escapeHtml(data.deliveryCountry ?? 'Not specified'),
      message: data.message ? escapeHtml(data.message).replace(/\n/g, '<br>') : null,
      ctaUrl: escapeHtml(data.ctaUrl),
    };
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>New quote request — ${safe.offerTitle}</title>
</head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f2937;">
<div style="max-width:600px;margin:0 auto;padding:24px;">
  <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a;">New quote request</h1>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">Hello ${safe.sellerDisplayName},</p>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">
    You have received a new quote request on offer
    <strong>${safe.offerTitle}</strong>.
  </p>
  <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;margin:0 0 16px;">
    <tr>
      <td style="padding:12px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Buyer</td>
      <td style="padding:12px 16px;font-size:13px;color:#111827;border-bottom:1px solid #f3f4f6;">${safe.buyerCompanyName}</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Quantity</td>
      <td style="padding:12px 16px;font-size:13px;color:#111827;border-bottom:1px solid #f3f4f6;">${safe.quantity}</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;font-size:13px;color:#6b7280;">Delivery country</td>
      <td style="padding:12px 16px;font-size:13px;color:#111827;">${safe.deliveryCountry}</td>
    </tr>
  </table>
  ${
    safe.message
      ? `<div style="background:#f9fafb;border-left:3px solid #3b82f6;padding:12px 16px;margin:0 0 16px;font-size:13px;line-height:1.5;color:#374151;">${safe.message}</div>`
      : ''
  }
  <div style="text-align:center;margin:24px 0;">
    <a href="${safe.ctaUrl}" style="display:inline-block;padding:12px 24px;background:#0ea5e9;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;">View and reply</a>
  </div>
  ${renderFooterHtml({ ...data, locale: 'en' })}
</div>
</body>
</html>`;
  },
};
