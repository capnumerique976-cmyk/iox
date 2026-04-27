// MP-NOTIF-2 phase 2 — Email buyer : "Demande confirmée (WON)".
//
// Déclenché par `QuoteRequestsService.updateStatus(* → WON)`.

import type { EmailTemplate } from '../notif-email.types';
import {
  renderTransitionHtml,
  renderTransitionText,
  type RfqTransitionTemplateData,
} from './rfq-transition.helper';

const COPY = {
  title: 'Bonne nouvelle, votre demande est confirmée',
  intro:
    "{senderDisplayName} a confirmé votre commande sur l'offre \"{offerTitle}\". Les prochaines étapes (contractualisation, logistique) vous seront communiquées prochainement.",
  accentColor: '#10b981',
  ctaLabel: 'Voir ma commande',
} as const;

export const rfqWonTemplate: EmailTemplate<RfqTransitionTemplateData> = {
  id: 'rfq-won',
  subject: (data) => `Bonne nouvelle, votre demande est confirmée — ${data.offerTitle}`,
  text: (data) => renderTransitionText(data, COPY),
  html: (data) => renderTransitionHtml(data, COPY),
};
