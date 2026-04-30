// I18N-4 phase 2 — Email EN buyer : "Quote request qualified".
// Mirror du template FR `rfq-qualified.template.ts`.

import type { EmailTemplate } from '../notif-email.types';
import {
  renderTransitionHtml,
  renderTransitionText,
  type RfqTransitionTemplateData,
} from './rfq-transition.helper';

const COPY = {
  title: 'Your quote request has been qualified',
  intro:
    "{senderDisplayName} has qualified your quote request on offer \"{offerTitle}\". The seller is now preparing a firm quote.",
  accentColor: '#0ea5e9',
  ctaLabel: 'Track my request',
  locale: 'en' as const,
} as const;

export const rfqQualifiedEnTemplate: EmailTemplate<RfqTransitionTemplateData> = {
  id: 'rfq-qualified',
  subject: (data) => `Your quote request has been qualified — ${data.offerTitle}`,
  text: (data) => renderTransitionText(data, COPY),
  html: (data) => renderTransitionHtml(data, COPY),
};
