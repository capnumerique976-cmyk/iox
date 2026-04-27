// MP-NOTIF-2 phase 2 — Helpers communs aux 4 templates de transition RFQ.
//
// Les 4 templates `rfq-{qualified,quoted,won,lost}` partagent la même
// structure : titre + corps court + note seller optionnelle + CTA +
// footer. Ce helper évite la duplication.

import { renderFooterHtml, renderFooterText } from './footer';

export interface RfqTransitionTemplateData {
  recipientDisplayName: string;
  senderDisplayName: string;
  offerTitle: string;
  note: string | null;
  ctaUrl: string;
  /** MP-NOTIF-2 — injecté automatiquement par NotifEmailService. */
  unsubscribeUrl?: string;
  [key: string]: unknown;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface TransitionCopy {
  /** Titre H1 de l'email (FR). */
  title: string;
  /** Phrase d'introduction (FR). */
  intro: string;
  /** Couleur de l'accent (CTA, bordure de note). */
  accentColor: string;
  /** Libellé du bouton CTA. */
  ctaLabel: string;
}

export function renderTransitionText(data: RfqTransitionTemplateData, copy: TransitionCopy): string {
  const lines = [
    `Bonjour ${data.recipientDisplayName},`,
    '',
    copy.intro
      .replace('{senderDisplayName}', data.senderDisplayName)
      .replace('{offerTitle}', data.offerTitle),
    '',
  ];
  if (data.note && data.note.trim().length > 0) {
    lines.push('Note du vendeur :');
    lines.push(data.note);
    lines.push('');
  }
  lines.push(`${copy.ctaLabel} : ${data.ctaUrl}`);
  lines.push('');
  lines.push(renderFooterText(data));
  return lines.join('\n');
}

export function renderTransitionHtml(data: RfqTransitionTemplateData, copy: TransitionCopy): string {
  const safe = {
    recipient: escapeHtml(data.recipientDisplayName),
    sender: escapeHtml(data.senderDisplayName),
    offerTitle: escapeHtml(data.offerTitle),
    note: data.note ? escapeHtml(data.note).replace(/\n/g, '<br>') : null,
    ctaUrl: escapeHtml(data.ctaUrl),
    accent: copy.accentColor,
    title: escapeHtml(copy.title),
    intro: escapeHtml(
      copy.intro.replace('{senderDisplayName}', data.senderDisplayName).replace(
        '{offerTitle}',
        data.offerTitle,
      ),
    ),
    ctaLabel: escapeHtml(copy.ctaLabel),
  };
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${safe.title} — ${safe.offerTitle}</title>
</head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f2937;">
<div style="max-width:600px;margin:0 auto;padding:24px;">
  <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a;">${safe.title}</h1>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">Bonjour ${safe.recipient},</p>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">${safe.intro}</p>
  ${
    safe.note
      ? `<div style="background:#f9fafb;border-left:3px solid ${safe.accent};padding:12px 16px;margin:0 0 16px;font-size:13px;line-height:1.5;color:#374151;"><strong>Note du vendeur :</strong><br>${safe.note}</div>`
      : ''
  }
  <div style="text-align:center;margin:24px 0;">
    <a href="${safe.ctaUrl}" style="display:inline-block;padding:12px 24px;background:${safe.accent};color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;">${safe.ctaLabel}</a>
  </div>
  ${renderFooterHtml(data)}
</div>
</body>
</html>`;
}
