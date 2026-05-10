/**
 * IOX — Labels humains pour les statuts de publication.
 *
 * Source unique pour traduire les enum backend (DRAFT, IN_REVIEW, …)
 * en texte compréhensible par des utilisateurs non-tech.
 */

/** Labels de publication pour les produits et offres marketplace. */
export const PUBLICATION_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Brouillon',
  IN_REVIEW: 'En revue',
  APPROVED: 'Approuvé',
  PUBLISHED: 'Publié',
  REJECTED: 'Refusé',
  SUSPENDED: 'Suspendu',
  ARCHIVED: 'Archivé',
};

/**
 * Retourne le label humain pour un statut de publication.
 * Fallback : retourne le statut brut si inconnu.
 */
export function publicationStatusLabel(status: string): string {
  return PUBLICATION_STATUS_LABEL[status] ?? status;
}

/** Labels pour le statut du profil vendeur. */
export const SELLER_PROFILE_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Brouillon',
  PENDING_REVIEW: 'En attente de validation',
  APPROVED: 'Approuvé',
  SUSPENDED: 'Suspendu',
  REJECTED: 'Refusé',
};

export function sellerProfileStatusLabel(status: string): string {
  return SELLER_PROFILE_STATUS_LABEL[status] ?? status;
}

/** Labels pour les statuts de demande de devis (RFQ). */
export const RFQ_STATUS_LABEL: Record<string, string> = {
  NEW: 'Nouveau',
  QUALIFIED: 'Qualifié',
  QUOTED: 'Devis envoyé',
  ACCEPTED: 'Accepté',
  REJECTED: 'Refusé',
  CANCELLED: 'Annulé',
  COMPLETED: 'Terminé',
  EXPIRED: 'Expiré',
};

export function rfqStatusLabel(status: string): string {
  return RFQ_STATUS_LABEL[status] ?? status;
}

/** Labels pour le statut de verification des documents. */
export const VERIFICATION_STATUS_LABEL: Record<string, string> = {
  PENDING: 'En attente',
  VERIFIED: 'Verifie',
  REJECTED: 'Refuse',
  EXPIRED: 'Expire',
};

export function verificationStatusLabel(status: string): string {
  return VERIFICATION_STATUS_LABEL[status] ?? status;
}
