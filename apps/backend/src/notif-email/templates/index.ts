// MP-NOTIF-1 phase 1 — Registry des templates emails.
// I18N-4 — Multi-locale : `getTemplate(id, locale?)` résout vers la
// variante locale si présente, fallback FR sinon.
//
// Pour ajouter un template :
//   1. Créer `<id>.template.ts` (FR référence) exportant `RfqXxxTemplateData`
//      + une const `<idCamel>Template` typée `EmailTemplate<XxxData>`.
//   2. (Optionnel) Créer `<id>.en.template.ts` mirror EN.
//   3. Ajouter une entrée à `REGISTRY` ci-dessous.
//   4. Ajouter un spec `<id>.template.spec.ts` (subject + html + text).
//   5. Mettre à jour la doc.
//   6. Documenter la shape `templateData` dans le service appelant.

import type { EmailTemplate } from '../notif-email.types';
import { rfqCreatedToSellerTemplate } from './rfq-created-to-seller.template';
import { rfqCreatedToSellerEnTemplate } from './rfq-created-to-seller.en.template';
import { rfqMessageCreatedTemplate } from './rfq-message-created.template';
import { rfqMessageCreatedEnTemplate } from './rfq-message-created.en.template';
import { rfqQualifiedTemplate } from './rfq-qualified.template';
import { rfqQualifiedEnTemplate } from './rfq-qualified.en.template';
import { rfqQuotedTemplate } from './rfq-quoted.template';
import { rfqQuotedEnTemplate } from './rfq-quoted.en.template';
import { rfqWonTemplate } from './rfq-won.template';
import { rfqWonEnTemplate } from './rfq-won.en.template';
import { rfqLostTemplate } from './rfq-lost.template';
import { rfqLostEnTemplate } from './rfq-lost.en.template';
// PAY-1 phase 1 LOT 3 — Email confirmation paiement.
import { paymentConfirmedToBuyerTemplate } from './payment-confirmed-to-buyer.template';
import { paymentConfirmedToBuyerEnTemplate } from './payment-confirmed-to-buyer.en.template';

// I18N-4 — Type structure : id → { fr: required, en?: optional }.
// Si la variante EN n'existe pas, fallback FR (graceful degradation).
type LocaleVariants = {
  fr: EmailTemplate;
  en?: EmailTemplate;
};

const REGISTRY: Record<string, LocaleVariants> = {
  // I18N-4 phase 3 — variante EN ajoutée pour rfq-created-to-seller.
  'rfq-created-to-seller': {
    fr: rfqCreatedToSellerTemplate as EmailTemplate,
    en: rfqCreatedToSellerEnTemplate as EmailTemplate,
  },
  'rfq-message-created': {
    fr: rfqMessageCreatedTemplate as EmailTemplate,
    en: rfqMessageCreatedEnTemplate as EmailTemplate,
  },
  // MP-NOTIF-2 phase 2 — transitions RFQ status.
  // I18N-4 phase 2 — variantes EN ajoutées pour rfq-qualified + rfq-quoted.
  // I18N-4 phase 3 — variantes EN ajoutées pour rfq-won + rfq-lost (clôt I18N-4).
  'rfq-qualified': {
    fr: rfqQualifiedTemplate as EmailTemplate,
    en: rfqQualifiedEnTemplate as EmailTemplate,
  },
  'rfq-quoted': {
    fr: rfqQuotedTemplate as EmailTemplate,
    en: rfqQuotedEnTemplate as EmailTemplate,
  },
  'rfq-won': {
    fr: rfqWonTemplate as EmailTemplate,
    en: rfqWonEnTemplate as EmailTemplate,
  },
  'rfq-lost': {
    fr: rfqLostTemplate as EmailTemplate,
    en: rfqLostEnTemplate as EmailTemplate,
  },
  // PAY-1 phase 1 LOT 3 — Confirmation paiement.
  'payment-confirmed-to-buyer': {
    fr: paymentConfirmedToBuyerTemplate as EmailTemplate,
    en: paymentConfirmedToBuyerEnTemplate as EmailTemplate,
  },
};

export type TemplateId = keyof typeof REGISTRY;

/**
 * Résout un template par id (et optionnellement locale).
 *
 * - Si `locale === 'en'` ET la variante EN existe → retourne EN.
 * - Sinon → retourne la variante FR (référence).
 * - Si l'id est inconnu → retourne null.
 */
export function getTemplate(id: string, locale?: string): EmailTemplate | null {
  const variants = REGISTRY[id];
  if (!variants) return null;
  if (locale === 'en' && variants.en) return variants.en;
  return variants.fr;
}

export function listTemplateIds(): string[] {
  return Object.keys(REGISTRY);
}

/**
 * I18N-4 — Liste des locales disponibles pour un templateId.
 * Utile pour audit / debug.
 */
export function listLocalesForTemplate(id: string): string[] {
  const variants = REGISTRY[id];
  if (!variants) return [];
  return Object.keys(variants);
}
