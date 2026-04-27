// MP-NOTIF-2 phase 2 — Email buyer : "Devis disponible".
//
// Déclenché par `QuoteRequestsService.updateStatus(QUALIFIED → QUOTED)`.

import type { EmailTemplate } from '../notif-email.types';
import {
  renderTransitionHtml,
  renderTransitionText,
  type RfqTransitionTemplateData,
} from './rfq-transition.helper';

const COPY = {
  title: 'Devis disponible pour votre demande',
  intro:
    "{senderDisplayName} vient de publier un devis pour votre demande sur l'offre \"{offerTitle}\". Vous pouvez le consulter et engager la négociation.",
  accentColor: '#0ea5e9',
  ctaLabel: 'Consulter le devis',
} as const;

export const rfqQuotedTemplate: EmailTemplate<RfqTransitionTemplateData> = {
  id: 'rfq-quoted',
  subject: (data) => `Devis disponible pour votre demande — ${data.offerTitle}`,
  text: (data) => renderTransitionText(data, COPY),
  html: (data) => renderTransitionHtml(data, COPY),
};
