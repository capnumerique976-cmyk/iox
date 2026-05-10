// M56 — Template email FR : relance buyer RFQ QUOTED > 7 jours.
import type { EmailTemplate } from '../notif-email.types';
import {
  renderTransitionHtml,
  renderTransitionText,
  type RfqTransitionTemplateData,
} from './rfq-transition.helper';

const COPY = {
  title: 'Rappel : votre devis est disponible',
  intro:
    'Votre devis pour l\'offre "{offerTitle}" proposé par {senderDisplayName} est disponible depuis plus de 7 jours. Ne laissez pas passer cette opportunité — consultez-le et engagez la négociation dès maintenant.',
  accentColor: '#f59e0b',
  ctaLabel: 'Voir le devis maintenant',
} as const;

export const rfqReminderTemplate: EmailTemplate<RfqTransitionTemplateData> = {
  id: 'rfq-reminder',
  subject: (data) => `Rappel — votre devis pour "${data.offerTitle}" vous attend`,
  text: (data) => renderTransitionText(data, COPY),
  html: (data) => renderTransitionHtml(data, COPY),
};
