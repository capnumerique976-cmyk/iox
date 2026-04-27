// MP-NOTIF-1 phase 1 — Email seller : "Nouvelle demande de devis".
//
// Déclenché quand un buyer crée une `QuoteRequest` (`QuoteRequestsService.create`).
// Pas d'image externe, pas de logo (phase 2). HTML inline-styles, max-width 600px.
// Texte brut équivalent pour clients sans HTML / accessibilité.

import type { EmailTemplate } from '../notif-email.types';
import { renderFooterHtml, renderFooterText } from './footer';

export interface RfqCreatedToSellerTemplateData {
  sellerDisplayName: string;
  buyerCompanyName: string;
  offerTitle: string;
  requestedQuantity: string | number | null;
  requestedUnit: string | null;
  deliveryCountry: string | null;
  message: string | null;
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

function fmtQuantity(qty: string | number | null, unit: string | null): string {
  if (qty == null || qty === '') return 'Non précisée';
  const unitStr = unit ? ` ${unit}` : '';
  return `${String(qty)}${unitStr}`;
}

export const rfqCreatedToSellerTemplate: EmailTemplate<RfqCreatedToSellerTemplateData> = {
  id: 'rfq-created-to-seller',

  subject(data) {
    return `Nouvelle demande de devis pour : ${data.offerTitle}`;
  },

  text(data) {
    const lines = [
      `Bonjour ${data.sellerDisplayName},`,
      '',
      `Vous avez reçu une nouvelle demande de devis sur l'offre "${data.offerTitle}".`,
      '',
      `Acheteur : ${data.buyerCompanyName}`,
      `Quantité demandée : ${fmtQuantity(data.requestedQuantity, data.requestedUnit)}`,
      `Pays de livraison : ${data.deliveryCountry ?? 'Non précisé'}`,
      '',
      data.message ? `Message :\n${data.message}\n` : '',
      `Consulter et répondre : ${data.ctaUrl}`,
      '',
      renderFooterText(data),
    ];
    return lines.filter((l) => l !== null).join('\n');
  },

  html(data) {
    const safe = {
      sellerDisplayName: escapeHtml(data.sellerDisplayName),
      buyerCompanyName: escapeHtml(data.buyerCompanyName),
      offerTitle: escapeHtml(data.offerTitle),
      quantity: escapeHtml(fmtQuantity(data.requestedQuantity, data.requestedUnit)),
      deliveryCountry: escapeHtml(data.deliveryCountry ?? 'Non précisé'),
      message: data.message ? escapeHtml(data.message).replace(/\n/g, '<br>') : null,
      ctaUrl: escapeHtml(data.ctaUrl),
    };
    return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Nouvelle demande de devis — ${safe.offerTitle}</title>
</head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f2937;">
<div style="max-width:600px;margin:0 auto;padding:24px;">
  <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a;">Nouvelle demande de devis</h1>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">Bonjour ${safe.sellerDisplayName},</p>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">
    Vous avez reçu une nouvelle demande de devis sur l'offre
    <strong>${safe.offerTitle}</strong>.
  </p>
  <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;margin:0 0 16px;">
    <tr>
      <td style="padding:12px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Acheteur</td>
      <td style="padding:12px 16px;font-size:13px;color:#111827;border-bottom:1px solid #f3f4f6;">${safe.buyerCompanyName}</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Quantité</td>
      <td style="padding:12px 16px;font-size:13px;color:#111827;border-bottom:1px solid #f3f4f6;">${safe.quantity}</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;font-size:13px;color:#6b7280;">Pays de livraison</td>
      <td style="padding:12px 16px;font-size:13px;color:#111827;">${safe.deliveryCountry}</td>
    </tr>
  </table>
  ${
    safe.message
      ? `<div style="background:#f9fafb;border-left:3px solid #3b82f6;padding:12px 16px;margin:0 0 16px;font-size:13px;line-height:1.5;color:#374151;">${safe.message}</div>`
      : ''
  }
  <div style="text-align:center;margin:24px 0;">
    <a href="${safe.ctaUrl}" style="display:inline-block;padding:12px 24px;background:#0ea5e9;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;">Consulter et répondre</a>
  </div>
  ${renderFooterHtml(data)}
</div>
</body>
</html>`;
  },
};
