// BÊTA-PRIVÉE-PREP — Email seller : "Bienvenue sur IOX Marketplace".
//
// Envoyé manuellement (ou via script) lors de l'onboarding d'un seller
// par un agent MCH terrain. HTML inline-styles, max-width 600px.
// Texte brut équivalent pour clients sans HTML / accessibilité.

import type { EmailTemplate } from '../notif-email.types';
import { renderFooterHtml, renderFooterText } from './footer';

export interface SellerWelcomeTemplateData {
  sellerDisplayName: string;
  onboardingUrl: string;
  supportEmail?: string;
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

export const sellerWelcomeTemplate: EmailTemplate<SellerWelcomeTemplateData> = {
  id: 'seller-welcome',

  subject(data) {
    return `Bienvenue sur IOX Marketplace, ${data.sellerDisplayName} !`;
  },

  text(data) {
    const supportEmail = data.supportEmail ?? 'support@iox.mch';
    const lines = [
      `Bonjour ${data.sellerDisplayName},`,
      '',
      'Bienvenue sur IOX Marketplace — la plateforme de mise en relation des producteurs de l\'Océan Indien avec les acheteurs internationaux.',
      '',
      'Votre compte vendeur a été créé avec succès. Pour commencer à vendre vos produits, complétez votre profil :',
      '',
      `Compléter mon profil : ${data.onboardingUrl}`,
      '',
      'Étapes suivantes :',
      '1. Complétez les informations de votre entreprise',
      '2. Ajoutez vos produits et leurs fiches techniques',
      '3. Configurez vos offres et conditions de vente',
      '4. Publiez votre vitrine sur la marketplace',
      '',
      `Pour toute question, contactez notre équipe : ${supportEmail}`,
      '',
      renderFooterText(data),
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
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Bienvenue sur IOX Marketplace</title>
</head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f2937;">
<div style="max-width:600px;margin:0 auto;padding:24px;">
  <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a;">Bienvenue sur IOX Marketplace</h1>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">Bonjour ${safe.sellerDisplayName},</p>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">
    Bienvenue sur <strong>IOX Marketplace</strong> — la plateforme de mise en relation
    des producteurs de l'Oc&eacute;an Indien avec les acheteurs internationaux.
  </p>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">
    Votre compte vendeur a &eacute;t&eacute; cr&eacute;&eacute; avec succ&egrave;s.
    Pour commencer &agrave; vendre vos produits, compl&eacute;tez votre profil :
  </p>
  <div style="text-align:center;margin:24px 0;">
    <a href="${safe.onboardingUrl}" style="display:inline-block;padding:12px 24px;background:#0ea5e9;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;">Compl&eacute;ter mon profil</a>
  </div>
  <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;margin:0 0 16px;">
    <tr>
      <td style="padding:12px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">1.</td>
      <td style="padding:12px 16px;font-size:13px;color:#111827;border-bottom:1px solid #f3f4f6;">Compl&eacute;tez les informations de votre entreprise</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">2.</td>
      <td style="padding:12px 16px;font-size:13px;color:#111827;border-bottom:1px solid #f3f4f6;">Ajoutez vos produits et leurs fiches techniques</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">3.</td>
      <td style="padding:12px 16px;font-size:13px;color:#111827;border-bottom:1px solid #f3f4f6;">Configurez vos offres et conditions de vente</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;font-size:13px;color:#6b7280;">4.</td>
      <td style="padding:12px 16px;font-size:13px;color:#111827;">Publiez votre vitrine sur la marketplace</td>
    </tr>
  </table>
  <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#6b7280;">
    Pour toute question, contactez notre &eacute;quipe :
    <a href="mailto:${safe.supportEmail}" style="color:#0ea5e9;text-decoration:underline;">${safe.supportEmail}</a>
  </p>
  ${renderFooterHtml(data)}
</div>
</body>
</html>`;
  },
};
