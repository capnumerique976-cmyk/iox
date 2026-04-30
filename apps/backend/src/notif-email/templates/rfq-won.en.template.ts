// I18N-4 phase 3 — Email EN buyer : "Request confirmed (WON)".
// Mirror du template FR `rfq-won.template.ts`. Ton positif.

import type { EmailTemplate } from '../notif-email.types';
import {
  renderTransitionHtml,
  renderTransitionText,
  type RfqTransitionTemplateData,
} from './rfq-transition.helper';

const COPY = {
  title: 'Good news, your request is confirmed',
  intro:
    "{senderDisplayName} has confirmed your order on offer \"{offerTitle}\". Next steps (contracting, logistics) will be communicated shortly.",
  accentColor: '#10b981',
  ctaLabel: 'View my order',
  locale: 'en' as const,
} as const;

export const rfqWonEnTemplate: EmailTemplate<RfqTransitionTemplateData> = {
  id: 'rfq-won',
  subject: (data) => `Good news, your request is confirmed — ${data.offerTitle}`,
  text: (data) => renderTransitionText(data, COPY),
  html: (data) => renderTransitionHtml(data, COPY),
};
