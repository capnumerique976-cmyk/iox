// MP-NOTIF-1 phase 1 — Registry des templates emails.
//
// Pour ajouter un template :
//   1. Créer `<id>.template.ts` exportant `RfqXxxTemplateData` + une const
//      `<idCamel>Template` typée `EmailTemplate<XxxData>`.
//   2. Ajouter une entrée à `TEMPLATES` ci-dessous (typage strict, pas de cast).
//   3. Ajouter un spec `<id>.template.spec.ts` (subject + html + text).
//   4. Mettre à jour `docs/marketplace/MP_NOTIF_1_PHASE_1.md`.
//   5. Documenter la shape `templateData` dans le service appelant.

import type { EmailTemplate } from '../notif-email.types';
import { rfqCreatedToSellerTemplate } from './rfq-created-to-seller.template';
import { rfqMessageCreatedTemplate } from './rfq-message-created.template';

const REGISTRY = {
  'rfq-created-to-seller': rfqCreatedToSellerTemplate,
  'rfq-message-created': rfqMessageCreatedTemplate,
} as const;

export type TemplateId = keyof typeof REGISTRY;

export function getTemplate(id: string): EmailTemplate | null {
  if (id in REGISTRY) {
    return REGISTRY[id as TemplateId] as EmailTemplate;
  }
  return null;
}

export function listTemplateIds(): TemplateId[] {
  return Object.keys(REGISTRY) as TemplateId[];
}
