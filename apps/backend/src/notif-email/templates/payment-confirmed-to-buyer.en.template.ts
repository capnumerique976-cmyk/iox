// PAY-1 phase 1 LOT 3 — Email : "Payment confirmed" (EN). Mirror du FR.

import type { EmailTemplate } from '../notif-email.types';
import { renderFooterHtml, renderFooterText } from './footer';
import type { PaymentConfirmedToBuyerTemplateData } from './payment-confirmed-to-buyer.template';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const paymentConfirmedToBuyerEnTemplate: EmailTemplate<PaymentConfirmedToBuyerTemplateData> = {
  id: 'payment-confirmed-to-buyer',

  subject(data) {
    return `Payment confirmed — ${data.offerTitle}`;
  },

  text(data) {
    return [
      `Hello ${data.buyerDisplayName},`,
      '',
      `Your payment of ${data.amountFormatted} for "${data.offerTitle}"`,
      `from ${data.sellerDisplayName} has been confirmed.`,
      '',
      `Payment reference: ${data.paymentId}`,
      '',
      `Track your order: ${data.ctaUrl}`,
      '',
      renderFooterText({ ...data, locale: 'en' }),
    ].join('\n');
  },

  html(data) {
    const safe = {
      buyer: escapeHtml(data.buyerDisplayName),
      seller: escapeHtml(data.sellerDisplayName),
      offerTitle: escapeHtml(data.offerTitle),
      amount: escapeHtml(data.amountFormatted),
      paymentId: escapeHtml(data.paymentId),
      ctaUrl: escapeHtml(data.ctaUrl),
    };
    return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Payment confirmed — ${safe.offerTitle}</title></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f2937;">
<div style="max-width:600px;margin:0 auto;padding:24px;">
  <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a;">Payment confirmed ✅</h1>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">Hello ${safe.buyer},</p>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">
    Your payment of <strong>${safe.amount}</strong> for
    <strong>${safe.offerTitle}</strong> from <strong>${safe.seller}</strong> has been confirmed.
  </p>
  <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;margin:0 0 16px;">
    <tr>
      <td style="padding:12px 16px;font-size:13px;color:#6b7280;">Payment reference</td>
      <td style="padding:12px 16px;font-size:13px;color:#111827;font-family:monospace;">${safe.paymentId}</td>
    </tr>
  </table>
  <div style="text-align:center;margin:24px 0;">
    <a href="${safe.ctaUrl}" style="display:inline-block;padding:12px 24px;background:#10b981;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;">Track my order</a>
  </div>
  ${renderFooterHtml({ ...data, locale: 'en' })}
</div>
</body>
</html>`;
  },
};
