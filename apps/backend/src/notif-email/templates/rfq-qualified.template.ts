// MP-NOTIF-2 phase 2 — Email buyer : "Demande qualifiée".
//
// Déclenché par `QuoteRequestsService.updateStatus(NEW → QUALIFIED)`.

import type { EmailTemplate } from '../notif-email.types';
import {
  renderTransitionHtml,
  renderTransitionText,
  type RfqTransitionTemplateData,
} from './rfq-transition.helper';

const COPY = {
  title: 'Votre demande de devis a été qualifiée',
  intro:
    "{senderDisplayName} a qualifié votre demande de devis sur l'offre \"{offerTitle}\". Le vendeur prépare maintenant un devis ferme.",
  accentColor: '#0ea5e9',
  ctaLabel: 'Suivre ma demande',
} as const;

export const rfqQualifiedTemplate: EmailTemplate<RfqTransitionTemplateData> = {
  id: 'rfq-qualified',
  subject: (data) => `Votre demande de devis a été qualifiée — ${data.offerTitle}`,
  text: (data) => renderTransitionText(data, COPY),
  html: (data) => renderTransitionHtml(data, COPY),
};
