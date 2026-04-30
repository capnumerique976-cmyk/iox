// I18N-4 phase 2 — Email EN buyer : "Quote available".
// Mirror du template FR `rfq-quoted.template.ts`.

import type { EmailTemplate } from '../notif-email.types';
import {
  renderTransitionHtml,
  renderTransitionText,
  type RfqTransitionTemplateData,
} from './rfq-transition.helper';

const COPY = {
  title: 'Quote available for your request',
  intro:
    "{senderDisplayName} just published a quote for your request on offer \"{offerTitle}\". You can review it and start the negotiation.",
  accentColor: '#0ea5e9',
  ctaLabel: 'Review quote',
  locale: 'en' as const,
} as const;

export const rfqQuotedEnTemplate: EmailTemplate<RfqTransitionTemplateData> = {
  id: 'rfq-quoted',
  subject: (data) => `Quote available for your request — ${data.offerTitle}`,
  text: (data) => renderTransitionText(data, COPY),
  html: (data) => renderTransitionHtml(data, COPY),
};
