// MP-NOTIF-2 phase 2 — Email buyer : "Mise à jour LOST".
//
// Déclenché par `QuoteRequestsService.updateStatus(* → LOST)`. Ton
// neutre — pas d'accent négatif marqué pour préserver la relation.

import type { EmailTemplate } from '../notif-email.types';
import {
  renderTransitionHtml,
  renderTransitionText,
  type RfqTransitionTemplateData,
} from './rfq-transition.helper';

const COPY = {
  title: 'Mise à jour sur votre demande',
  intro:
    "{senderDisplayName} a clôturé votre demande de devis sur l'offre \"{offerTitle}\" sans pouvoir la concrétiser cette fois. N'hésitez pas à parcourir les autres offres du catalogue.",
  accentColor: '#6b7280',
  ctaLabel: 'Parcourir le catalogue',
} as const;

export const rfqLostTemplate: EmailTemplate<RfqTransitionTemplateData> = {
  id: 'rfq-lost',
  subject: (data) => `Mise à jour sur votre demande — ${data.offerTitle}`,
  text: (data) => renderTransitionText(data, COPY),
  html: (data) => renderTransitionHtml(data, COPY),
};
