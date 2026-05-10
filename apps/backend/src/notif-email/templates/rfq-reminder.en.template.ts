// M56 — Template email EN : relance buyer RFQ QUOTED > 7 jours.
// Mirror EN du template FR `rfq-reminder.template.ts`.
import type { EmailTemplate } from '../notif-email.types';
import {
  renderTransitionHtml,
  renderTransitionText,
  type RfqTransitionTemplateData,
} from './rfq-transition.helper';

const COPY = {
  title: 'Reminder: your quote is waiting for you',
  intro:
    'Your quote for offer "{offerTitle}" from {senderDisplayName} has been available for more than 7 days. Don\'t miss this opportunity — review it and start the negotiation now.',
  accentColor: '#f59e0b',
  ctaLabel: 'View quote now',
  locale: 'en' as const,
} as const;

export const rfqReminderEnTemplate: EmailTemplate<RfqTransitionTemplateData> = {
  id: 'rfq-reminder',
  subject: (data) => `Reminder — your quote for "${data.offerTitle}" is waiting`,
  text: (data) => renderTransitionText(data, COPY),
  html: (data) => renderTransitionHtml(data, COPY),
};
