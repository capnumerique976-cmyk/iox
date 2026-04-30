// PAY-1 phase 1 LOT 3 — Email : "Paiement confirmé" (FR).
//
// Déclenché par le webhook handler sur payment_intent.succeeded
// (cf. PaymentsWebhookService).

import type { EmailTemplate } from '../notif-email.types';
import { renderFooterHtml, renderFooterText } from './footer';

export interface PaymentConfirmedToBuyerTemplateData {
  buyerDisplayName: string;
  sellerDisplayName: string;
  offerTitle: string;
  amountFormatted: string; // ex: "100,00 €"
  paymentId: string;
  ctaUrl: string;
  /** MP-NOTIF-2 — injecté automatiquement par NotifEmailService. */
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

export const paymentConfirmedToBuyerTemplate: EmailTemplate<PaymentConfirmedToBuyerTemplateData> = {
  id: 'payment-confirmed-to-buyer',

  subject(data) {
    return `Paiement confirmé — ${data.offerTitle}`;
  },

  text(data) {
    return [
      `Bonjour ${data.buyerDisplayName},`,
      '',
      `Votre paiement de ${data.amountFormatted} pour la commande "${data.offerTitle}"`,
      `auprès de ${data.sellerDisplayName} a été confirmé.`,
      '',
      `Référence paiement : ${data.paymentId}`,
      '',
      `Suivre votre commande : ${data.ctaUrl}`,
      '',
      renderFooterText(data),
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
<html lang="fr">
<head><meta charset="utf-8"><title>Paiement confirmé — ${safe.offerTitle}</title></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f2937;">
<div style="max-width:600px;margin:0 auto;padding:24px;">
  <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a;">Paiement confirmé ✅</h1>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">Bonjour ${safe.buyer},</p>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">
    Votre paiement de <strong>${safe.amount}</strong> pour la commande
    <strong>${safe.offerTitle}</strong> auprès de <strong>${safe.seller}</strong> a été confirmé.
  </p>
  <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;margin:0 0 16px;">
    <tr>
      <td style="padding:12px 16px;font-size:13px;color:#6b7280;">Référence paiement</td>
      <td style="padding:12px 16px;font-size:13px;color:#111827;font-family:monospace;">${safe.paymentId}</td>
    </tr>
  </table>
  <div style="text-align:center;margin:24px 0;">
    <a href="${safe.ctaUrl}" style="display:inline-block;padding:12px 24px;background:#10b981;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;">Suivre ma commande</a>
  </div>
  ${renderFooterHtml(data)}
</div>
</body>
</html>`;
  },
};
