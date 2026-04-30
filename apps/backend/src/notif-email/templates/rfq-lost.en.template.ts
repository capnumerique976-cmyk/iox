// I18N-4 phase 3 — Email EN buyer : "Update on your request (LOST)".
// Mirror du template FR `rfq-lost.template.ts`. Ton neutre — préserver
// la relation buyer-seller, éviter les mots négatifs ("rejected",
// "denied").

import type { EmailTemplate } from '../notif-email.types';
import {
  renderTransitionHtml,
  renderTransitionText,
  type RfqTransitionTemplateData,
} from './rfq-transition.helper';

const COPY = {
  title: 'Update on your request',
  intro:
    "{senderDisplayName} has closed your quote request on offer \"{offerTitle}\" without being able to fulfill it this time. Feel free to browse other offers in the catalog.",
  accentColor: '#6b7280',
  ctaLabel: 'Browse catalog',
  locale: 'en' as const,
} as const;

export const rfqLostEnTemplate: EmailTemplate<RfqTransitionTemplateData> = {
  id: 'rfq-lost',
  subject: (data) => `Update on your request — ${data.offerTitle}`,
  text: (data) => renderTransitionText(data, COPY),
  html: (data) => renderTransitionHtml(data, COPY),
};
