// BÊTA-PRIVÉE-PREP — Email EN seller : "Welcome to IOX Marketplace".
// Mirror du template FR `seller-welcome.template.ts`.

import type { EmailTemplate } from '../notif-email.types';
import { renderFooterHtml, renderFooterText } from './footer';
import type { SellerWelcomeTemplateData } from './seller-welcome.template';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const sellerWelcomeEnTemplate: EmailTemplate<SellerWelcomeTemplateData> = {
  id: 'seller-welcome',

  subject(data) {
    return `Welcome to IOX Marketplace, ${data.sellerDisplayName}!`;
  },

  text(data) {
    const supportEmail = data.supportEmail ?? 'support@iox.mch';
    const lines = [
      `Hello ${data.sellerDisplayName},`,
      '',
      'Welcome to IOX Marketplace — the platform connecting Indian Ocean producers with international buyers.',
      '',
      'Your seller account has been created successfully. To start selling your products, complete your profile:',
      '',
      `Complete my profile: ${data.onboardingUrl}`,
      '',
      'Next steps:',
      '1. Complete your company information',
      '2. Add your products and technical sheets',
      '3. Configure your offers and terms of sale',
      '4. Publish your storefront on the marketplace',
      '',
      `For any questions, contact our team: ${supportEmail}`,
      '',
      renderFooterText({ ...data, locale: 'en' }),
    ];
    return lines.join('\n');
  },

  html(data) {
    const safe = {
      sellerDisplayName: escapeHtml(data.sellerDisplayName),
      onboardingUrl: escapeHtml(data.onboardingUrl),
      supportEmail: escapeHtml(data.supportEmail ?? 'support@iox.mch'),
    };
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Welcome to IOX Marketplace</title>
</head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f2937;">
<div style="max-width:600px;margin:0 auto;padding:24px;">
  <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a;">Welcome to IOX Marketplace</h1>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">Hello ${safe.sellerDisplayName},</p>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">
    Welcome to <strong>IOX Marketplace</strong> — the platform connecting
    Indian Ocean producers with international buyers.
  </p>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">
    Your seller account has been created successfully.
    To start selling your products, complete your profile:
  </p>
  <div style="text-align:center;margin:24px 0;">
    <a href="${safe.onboardingUrl}" style="display:inline-block;padding:12px 24px;background:#0ea5e9;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;">Complete my profile</a>
  </div>
  <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;margin:0 0 16px;">
    <tr>
      <td style="padding:12px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">1.</td>
      <td style="padding:12px 16px;font-size:13px;color:#111827;border-bottom:1px solid #f3f4f6;">Complete your company information</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">2.</td>
      <td style="padding:12px 16px;font-size:13px;color:#111827;border-bottom:1px solid #f3f4f6;">Add your products and technical sheets</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">3.</td>
      <td style="padding:12px 16px;font-size:13px;color:#111827;border-bottom:1px solid #f3f4f6;">Configure your offers and terms of sale</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;font-size:13px;color:#6b7280;">4.</td>
      <td style="padding:12px 16px;font-size:13px;color:#111827;">Publish your storefront on the marketplace</td>
    </tr>
  </table>
  <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#6b7280;">
    For any questions, contact our team:
    <a href="mailto:${safe.supportEmail}" style="color:#0ea5e9;text-decoration:underline;">${safe.supportEmail}</a>
  </p>
  ${renderFooterHtml({ ...data, locale: 'en' })}
</div>
</body>
</html>`;
  },
};
